FROM node:20-alpine

WORKDIR /app/queue

COPY ["./queue/package.json", "./queue/package-lock.json*", "./"]

RUN npm ci

COPY queue /app/queue

CMD ["node", "consumer.js"]
