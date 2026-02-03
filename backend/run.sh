#!/bin/bash

if [[ "$1" == "migration" ]]; then
    node src/db/migrations/runMigrations.ts
else
    echo "Invalid argument"
    exit 1
fi
