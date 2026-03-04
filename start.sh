   #!/bin/sh
   set -e

   echo "Running database migrations..."
   NODE_ENV=${NODE_ENV:-production} npx medusa db:migrate

   # Optional: only run this manually when you want to reseed
   # echo "Seeding database..."
   # NODE_ENV=${NODE_ENV:-production} npm run seed || echo "Seeding failed, continuing..."

   echo "Building Medusa (admin + backend)..."
   NODE_ENV=${NODE_ENV:-production} npx medusa build

   echo "Starting Medusa in production mode..."
   cd .medusa/server
   NODE_ENV=${NODE_ENV:-production} npx medusa start