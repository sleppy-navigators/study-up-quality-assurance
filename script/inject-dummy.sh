#!/bin/bash

set -euo pipefail

# Configuration
readonly COMPOSE_FILE="compose.qa.yaml"
readonly MYSQL_SERVICE_KEY="app-qa-mysql"
readonly MONGO_SERVICE_KEY="app-qa-mongo"
readonly MYSQL_USER="root"
readonly MYSQL_PASSWORD="root"
readonly MYSQL_DATABASE="study_up"
readonly MONGO_USER="root"
readonly MONGO_PASSWORD="root"
readonly MONGO_DATABASE="study_up_chat"
readonly MONGO_AUTH_SOURCE="admin"
readonly DATA_DIR="./out/dummy"

# Helper function for logging
log() {
  echo "--- $1 ---"
}

# Helper function to find a container name. Exits if not found.
find_container_name() {
  local service_key="$1"
  log "Finding container for service key: ${service_key}..."

  local container_name
  container_name=$(docker ps --format '{{.Names}}' | grep "${service_key}" | head -n 1)

  if [ -z "$container_name" ]; then
    log "ERROR: Container for service with key '${service_key}' not found or not running."
    log "Please ensure services are running, e.g., with 'docker compose -f ${COMPOSE_FILE} up -d'."
    exit 1
  fi

  log "Found container: ${container_name}"
  echo "$container_name"
}

# Helper function to execute commands in a docker container
dc_exec() {
  docker exec -i "$@"
}

check_data_dir() {
  if [ ! -d "$DATA_DIR" ]; then
    log "Error: Directory $DATA_DIR does not exist."
    exit 1
  fi
}

import_mysql() {
  local container_name="$1"
  log "Importing data into MySQL..."

  dc_exec "$container_name" mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SET FOREIGN_KEY_CHECKS=0;"

  for csv_file in "$DATA_DIR"/*.csv; do
    if [ -f "$csv_file" ]; then
      local table_name
      table_name=$(basename "$csv_file" .csv)
      log "Importing $csv_file to table $table_name..."
      dc_exec "$container_name" mysqlimport --local --ignore-lines=1 --fields-terminated-by=',' -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" "/import-data/$(basename "$csv_file")"
    fi
  done

  dc_exec "$container_name" mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SET FOREIGN_KEY_CHECKS=1;"

  log "MySQL import finished."
}

import_mongo() {
  local container_name="$1"
  log "Importing data into MongoDB..."
  local mongo_uri="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@localhost:27017/${MONGO_DATABASE}?authSource=${MONGO_AUTH_SOURCE}"

  for json_file in "$DATA_DIR"/*.json; do
    if [ -f "$json_file" ]; then
      local collection_name
      collection_name=$(basename "$json_file" .json)
      log "Importing $json_file to collection $collection_name..."
      dc_exec "$container_name" mongoimport --uri "$mongo_uri" --collection "$collection_name" --file "/import-data/$(basename "$json_file")" --drop
    fi
  done

  log "MongoDB import finished."
}

main() {
  check_data_dir

  local mysql_container_name
  mysql_container_name=$(find_container_name "$MYSQL_SERVICE_KEY")

  local mongo_container_name
  mongo_container_name=$(find_container_name "$MONGO_SERVICE_KEY")

  import_mysql "$mysql_container_name"
  import_mongo "$mongo_container_name"
  log "All dummy data imported successfully."
}

main "$@"
