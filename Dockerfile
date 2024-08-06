FROM node:20-alpine

WORKDIR /app

ENV APP_ENV=production

COPY ["package.json", "package-lock.json*", "./"]

RUN npm ci

COPY . .

RUN npm run build

CMD ["node", "build"]
