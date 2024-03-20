FROM node:20

WORKDIR /app/webhooks

COPY ["./webhooks/package.json", "./webhooks/package-lock.json*", "./"]

RUN npm install

COPY webhooks /app/webhooks

CMD ["node", "handler.js"]
