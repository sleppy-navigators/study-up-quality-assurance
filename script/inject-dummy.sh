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
      local import_query
      import_query="LOAD DATA LOCAL INFILE '/import-data/$(basename "$csv_file")' INTO TABLE \`$table_name\` FIELDS TERMINATED BY ',' IGNORE 1 LINES;"
      dc_exec "$container_name" mysql --local-infile=1 -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "$import_query"
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

  log "Finding container for service key: ${MYSQL_SERVICE_KEY}..."
  local mysql_container_name
  mysql_container_name=$(docker ps --format '{{.Names}}' | grep "${MYSQL_SERVICE_KEY}" | head -n 1)
  if [ -z "$mysql_container_name" ]; then
    log "ERROR: Container for service with key '${MYSQL_SERVICE_KEY}' not found or not running."
    log "Please ensure services are running, e.g., with 'docker compose -f ${COMPOSE_FILE} up -d'."
    exit 1
  fi
  log "Found container: ${mysql_container_name}"

  log "Finding container for service key: ${MONGO_SERVICE_KEY}..."
  local mongo_container_name
  mongo_container_name=$(docker ps --format '{{.Names}}' | grep "${MONGO_SERVICE_KEY}" | head -n 1)
  if [ -z "$mongo_container_name" ]; then
    log "ERROR: Container for service with key '${MONGO_SERVICE_KEY}' not found or not running."
    log "Please ensure services are running, e.g., with 'docker compose -f ${COMPOSE_FILE} up -d'."
    exit 1
  fi
  log "Found container: ${mongo_container_name}"

  import_mysql "$mysql_container_name"
  import_mongo "$mongo_container_name"
  log "All dummy data imported successfully."
}

main "$@"
