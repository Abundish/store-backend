#!/bin/sh

# echo "Running database migrations..."
# yarn medusa db:migrate

echo "Starting Medusa production server..."
cd .medusa/server && npm run start