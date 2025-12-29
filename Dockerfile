FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY . .

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server.js"]
