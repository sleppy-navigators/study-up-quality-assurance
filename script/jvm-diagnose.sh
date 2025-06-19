#!/bin/bash

set -euo pipefail

# --- Configuration ---
readonly APP_CONTAINER_KEY="app-qa-core"
readonly APP_JAR_NAME="app.jar"
readonly OUTPUT_DIR_BASE="./out"

readonly THREAD_DUMP_COUNT=5
readonly THREAD_DUMP_INTERVAL_SECONDS=10
readonly JSTAT_INTERVAL="1s"
readonly JSTAT_COUNT=5

# --- Helper Functions ---

log() {
  echo "--- $1 ---"
}

# Executes a command within a Docker container.
# usage: dc_exec <container_name> <command>
dc_exec() {
  docker exec "$1" bash -c "$2"
}

# A wrapper to run a diagnostic tool, logging the result.
# usage: run_tool <tool_name> <container_name> <command>
run_tool() {
    local tool_name="$1"
    local container_name="$2"
    shift 2 # Remove tool_name and container_name from arguments
    local cmd="$*"

    echo "  - Running ${tool_name}..."
    if dc_exec "$container_name" "$cmd"; then
        return 0
    else
        echo "  -> WARN: '${tool_name}' failed. The tool might not be available or permissions are insufficient."
        return 1
    fi
}

# --- Diagnostic Steps ---

collect_heap_dump() {
    local container_name="$1"
    local pid="$2"
    local output_dir="$3"
    
    local tmp_heap_file="/tmp/heap.hprof"
    
    # NOTE: Generating a heap dump can trigger a Full GC, potentially altering subsequent GC-related metrics.
    # This is why heap dump collection is performed after all other GC statistics have been gathered.
    echo "  - Collecting heap dump..."
    if run_tool "jmap" "$container_name" "jmap -dump:live,format=b,file=${tmp_heap_file} ${pid}"; then
        docker cp "${container_name}:${tmp_heap_file}" "${output_dir}/heap.hprof"
        dc_exec "$container_name" "rm ${tmp_heap_file}"
        echo "  -> Success: heap.hprof"
    fi
}

collect_thread_dumps() {
    local container_name="$1"
    local pid="$2"
    local output_dir="$3"

    for i in $(seq 1 "${THREAD_DUMP_COUNT}"); do
        local dump_file
        dump_file="${output_dir}/threaddump_$(date +%H%M%S).txt"
        log "Collecting thread dump #${i}/${THREAD_DUMP_COUNT}..."
        run_tool "jstack" "$container_name" "jstack -l ${pid}" > "$dump_file" 2>/dev/null || true

        if ((i < THREAD_DUMP_COUNT)); then
            sleep "${THREAD_DUMP_INTERVAL_SECONDS}"
        fi
    done
    echo "  -> Collection complete."
}

collect_gc_stats_continuous() {
    local container_name="$1"
    local pid="$2"
    local output_dir="$3"

    local output_file="${output_dir}/jstat_gcutil.log"
    run_tool "jstat -gcutil" "$container_name" "jstat -gcutil ${pid} ${JSTAT_INTERVAL} ${JSTAT_COUNT}" > "$output_file" 2>/dev/null || true
}

collect_jstat_snapshots() {
    local container_name="$1"
    local pid="$2"
    local output_dir="$3"

    run_tool "jstat -gc" "$container_name" "jstat -gc ${pid}" > "${output_dir}/jstat_gc.txt" 2>/dev/null || true
    run_tool "jstat -gccapacity" "$container_name" "jstat -gccapacity ${pid}" > "${output_dir}/jstat_gccapacity.txt" 2>/dev/null || true
    run_tool "jstat -class" "$container_name" "jstat -class ${pid}" > "${output_dir}/jstat_class.txt" 2>/dev/null || true
    run_tool "jstat -compiler" "$container_name" "jstat -compiler ${pid}" > "${output_dir}/jstat_compiler.txt" 2>/dev/null || true
}

# --- Main Execution ---
main() {
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    OUTPUT_DIR="${OUTPUT_DIR_BASE}/diag-${TIMESTAMP}"
    mkdir -p "$OUTPUT_DIR"
    log "Diagnostic information will be saved to: $(realpath "$OUTPUT_DIR")"

    log "Finding target process..."
    local container_name
    container_name=$(docker ps --format '{{.Names}}' | grep "$APP_CONTAINER_KEY" | head -n 1)
    if [ -z "$container_name" ]; then
        log "ERROR: Container containing '$APP_CONTAINER_KEY' not found. Aborting."
        exit 1
    fi
    log "Target container: $container_name"

    local java_pid
    # jps is guaranteed to be installed, so we can simplify the PID acquisition process.
    java_pid=$(dc_exec "$container_name" "jps -l | grep ${APP_JAR_NAME} | cut -d' ' -f1")

    if [ -z "$java_pid" ]; then
        log "ERROR: Java process for '${APP_JAR_NAME}' not found in container. Aborting."
        exit 1
    fi
    log "Java PID: $java_pid"

    local diagnostic_steps=(
        "collect_jstat_snapshots"
        "collect_gc_stats_continuous"
        "collect_thread_dumps"
        "collect_heap_dump"
    )
    local diagnostic_descriptions=(
        "Collecting jstat snapshots"
        "Collecting GC statistics (every ${JSTAT_INTERVAL} for ${JSTAT_COUNT} times)"
        "Collecting ${THREAD_DUMP_COUNT} thread dumps (interval: ${THREAD_DUMP_INTERVAL_SECONDS}s)"
        "Collecting heap dump"
    )

    local total_steps=${#diagnostic_steps[@]}
    for i in "${!diagnostic_steps[@]}"; do
        log "[$((i+1))/${total_steps}] ${diagnostic_descriptions[$i]}"
        "${diagnostic_steps[$i]}" "$container_name" "$java_pid" "$OUTPUT_DIR"
    done

    log "Diagnostic script finished."
}

main "$@" 
