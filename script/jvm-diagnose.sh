#!/bin/bash

set -euo pipefail

# --- Logging helpers ---
readonly C_RESET='\033[0m'
readonly C_BLUE='\033[0;34m'
readonly C_YELLOW='\033[0;33m'
readonly C_RED='\033[0;31m'
readonly C_GREEN='\033[0;32m'

log_step() {
    echo -e "${C_BLUE}==> $1${C_RESET}"
}

log_info() {
    echo -e "    $1"
}

log_success() {
    echo -e "${C_GREEN}  -> Success: $1${C_RESET}"
}

log_warn() {
    echo -e "${C_YELLOW}WARN: $1${C_RESET}" >&2
}

log_error() {
    echo -e "${C_RED}ERROR: $1${C_RESET}" >&2
}

# --- Configuration ---
readonly APP_CONTAINER_KEY="app-qa-core"
readonly APP_JAR_NAME="app.jar"
readonly OUTPUT_DIR_BASE="./out/jvm-diagnose"

readonly THREAD_DUMP_COUNT=5
readonly THREAD_DUMP_INTERVAL_SECONDS=10
readonly JSTAT_INTERVAL="1s"
readonly JSTAT_COUNT=5

# --- Helper Functions ---

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

    log_info "Running ${tool_name}..."
    if dc_exec "$container_name" "$cmd"; then
        return 0
    else
        log_warn "'${tool_name}' failed. The tool might not be available or permissions are insufficient."
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
    log_info "Collecting heap dump..."
    if run_tool "jmap" "$container_name" "jmap -dump:live,format=b,file=${tmp_heap_file} ${pid}"; then
        docker cp "${container_name}:${tmp_heap_file}" "${output_dir}/heap.hprof"
        dc_exec "$container_name" "rm ${tmp_heap_file}"
        log_success "heap.hprof"
    fi
}

collect_thread_dumps() {
    local container_name="$1"
    local pid="$2"
    local output_dir="$3"

    for i in $(seq 1 "${THREAD_DUMP_COUNT}"); do
        local dump_file
        dump_file="${output_dir}/threaddump_$(date +%H%M%S).txt"
        log_step "Collecting thread dump #${i}/${THREAD_DUMP_COUNT}..."
        run_tool "jstack" "$container_name" "jstack -l ${pid}" > "$dump_file" 2>/dev/null || true

        if ((i < THREAD_DUMP_COUNT)); then
            sleep "${THREAD_DUMP_INTERVAL_SECONDS}"
        fi
    done
    log_success "Collection complete."
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
    log_step "Diagnostic information will be saved to: $(realpath "$OUTPUT_DIR")"

    log_step "Finding target process..."
    local container_name
    container_name=$(docker ps --format '{{.Names}}' | grep "$APP_CONTAINER_KEY" | head -n 1)
    if [ -z "$container_name" ]; then
        log_error "Container containing '$APP_CONTAINER_KEY' not found. Aborting."
        exit 1
    fi
    log_info "Target container: $container_name"

    local java_pid
    # jps is guaranteed to be installed, so we can simplify the PID acquisition process.
    java_pid=$(dc_exec "$container_name" "jps -l | grep ${APP_JAR_NAME} | cut -d' ' -f1")

    if [ -z "$java_pid" ]; then
        log_error "Java process for '${APP_JAR_NAME}' not found in container. Aborting."
        exit 1
    fi
    log_info "Java PID: $java_pid"

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
        log_step "[$((i+1))/${total_steps}] ${diagnostic_descriptions[$i]}"
        "${diagnostic_steps[$i]}" "$container_name" "$java_pid" "$OUTPUT_DIR"
    done

    log_step "Diagnostic script finished."
}

main "$@" 
