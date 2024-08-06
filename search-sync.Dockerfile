FROM node:20-alpine

WORKDIR /app/search

COPY ["./search/package.json", "./search/package-lock.json*", "./"]

RUN npm ci

COPY search /app/search

CMD ["node", "sync.js"]
