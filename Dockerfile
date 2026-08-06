FROM node:20-alpine

WORKDIR /server

# Layer 1: root deps (cached unless package.json / lockfile changes)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Layer 2: source + build
COPY . .
ARG MEDUSA_BACKEND_URL
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
RUN npm run build

# Layer 3: production deps for built output (no lockfile in .medusa/server)
WORKDIR /server/.medusa/server
RUN npm install --omit=dev --legacy-peer-deps

WORKDIR /server
EXPOSE 9000 5173
ENTRYPOINT ["./start.sh"]
