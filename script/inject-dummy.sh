#!/bin/bash

set -euo pipefail

# Configuration
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

check_data_dir() {
  if [ ! -d "$DATA_DIR" ]; then
    log "Error: Directory $DATA_DIR does not exist."
    exit 1
  fi
}

import_mysql() {
  log "Importing data into MySQL from host..."

  mysql --host=127.0.0.1 --port=3306 -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SET FOREIGN_KEY_CHECKS=0;"

  for csv_file in "$DATA_DIR"/*.csv; do
    if [ -f "$csv_file" ]; then
      local table_name
      table_name=$(basename "$csv_file" .csv)
      log "Importing $csv_file to table $table_name..."
      mysqlimport --host=127.0.0.1 --port=3306 --local --ignore-lines=1 --fields-terminated-by=',' -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" "$csv_file"
    fi
  done

  mysql --host=127.0.0.1 --port=3306 -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SET FOREIGN_KEY_CHECKS=1;"

  log "MySQL import finished."
}

import_mongo() {
  log "Importing data into MongoDB from host..."
  local mongo_uri="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@localhost:27017/${MONGO_DATABASE}?authSource=${MONGO_AUTH_SOURCE}"

  for json_file in "$DATA_DIR"/*.json; do
    if [ -f "$json_file" ]; then
      local collection_name
      collection_name=$(basename "$json_file" .json)
      log "Importing $json_file to collection $collection_name..."
      mongoimport --uri "$mongo_uri" --collection "$collection_name" --file "$json_file" --drop
    fi
  done

  log "MongoDB import finished."
}

main() {
  check_data_dir
  import_mysql
  import_mongo
  log "All dummy data imported successfully."
}

main "$@"
