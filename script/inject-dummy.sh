#!/bin/bash

set -euo pipefail

# --- Logging helpers ---
readonly C_RESET='\033[0m'
readonly C_BLUE='\033[0;34m'
readonly C_RED='\033[0;31m'
readonly C_GREEN='\033[0;32m'

log_step() {
    echo -e "${C_BLUE}==> $1${C_RESET}"
}

log_info() {
    echo -e "    $1"
}

log_success() {
    echo -e "${C_GREEN}  -> $1${C_RESET}"
}

log_error() {
    echo -e "${C_RED}ERROR: $1${C_RESET}" >&2
}

# Configuration
readonly MYSQL_USER="root"
readonly MYSQL_PASSWORD="root"
readonly MYSQL_DATABASE="study_up"
readonly MONGO_USER="root"
readonly MONGO_PASSWORD="root"
readonly MONGO_DATABASE="study_up_chat"
readonly MONGO_AUTH_SOURCE="admin"
readonly DATA_DIR="./out/dummy"

check_data_dir() {
  if [ ! -d "$DATA_DIR" ]; then
    log_error "Directory $DATA_DIR does not exist."
    exit 1
  fi
}

import_mysql() {
  log_step "Importing data into MySQL from host..."

  mysql --host=127.0.0.1 --port=3306 -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SET FOREIGN_KEY_CHECKS=0;" > /dev/null

  for csv_file in "$DATA_DIR"/*.csv; do
    if [ -f "$csv_file" ]; then
      local table_name
      table_name=$(basename "$csv_file" .csv)
      log_info "Importing $csv_file to table $table_name..."
      mysqlimport --host=127.0.0.1 --port=3306 --local --ignore-lines=1 --fields-terminated-by=',' -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" "$csv_file"
    fi
  done

  mysql --host=127.0.0.1 --port=3306 -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SET FOREIGN_KEY_CHECKS=1;" > /dev/null

  log_success "MySQL import finished."
}

import_mongo() {
  log_step "Importing data into MongoDB from host..."
  local mongo_uri="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@localhost:27017/${MONGO_DATABASE}?authSource=${MONGO_AUTH_SOURCE}"

  for json_file in "$DATA_DIR"/*.json; do
    if [ -f "$json_file" ]; then
      local collection_name
      collection_name=$(basename "$json_file" .json)
      log_info "Importing $json_file to collection $collection_name..."
      mongoimport --uri "$mongo_uri" --collection "$collection_name" --file "$json_file" --drop > /dev/null
    fi
  done

  log_success "MongoDB import finished."
}

main() {
  check_data_dir
  import_mysql
  import_mongo
  log_step "All dummy data imported successfully."
}

main "$@"
