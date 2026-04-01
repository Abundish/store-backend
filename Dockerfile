FROM node:20-alpine

WORKDIR /server

COPY package.json package-lock.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

# Install production deps for the built output at build time
RUN cd .medusa/server && npm install

EXPOSE 9000 5173

ENTRYPOINT ["./start.sh"]