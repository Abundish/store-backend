FROM node:20-alpine

WORKDIR /server

# Layer 1: root deps (cached unless package.json changes)
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Layer 2: source + build
COPY . .
RUN npm run build

# Layer 3: production deps for built output (cached unless package-lock changes)
WORKDIR /server/.medusa/server
RUN npm install --production

WORKDIR /server
EXPOSE 9000 5173
ENTRYPOINT ["./start.sh"]