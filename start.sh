#!/bin/sh

# Run migrations
echo "Running database migrations..."
npx medusa db:migrate

# Seed database (optional)
echo "Seeding database..."
npm run seed || echo "Seeding failed, continuing..."

# Build admin (production)
echo "Building Medusa Admin..."
npx medusa build

# Start server in production mode
echo "Starting Medusa server..."
npm run start
