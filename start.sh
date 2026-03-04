#!/bin/sh

set -e

echo "Running database migrations..."
NODE_ENV=${NODE_ENV:-production} npx medusa db:migrate

# Optional: only for initial data / demos; usually you DON'T want this on every restart
# echo "Seeding database..."
# NODE_ENV=${NODE_ENV:-production} npm run seed || echo "Seeding failed, continuing..."

echo "Building Medusa (admin + backend)..."
NODE_ENV=${NODE_ENV:-production} npm run build

echo "Starting Medusa in production mode..."
NODE_ENV=${NODE_ENV:-production} npm run start