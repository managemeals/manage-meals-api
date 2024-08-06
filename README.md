# ManageMeals API

This is the ManageMeals backend, what powers https://managemeals.com. It's a Fastify app.

## Self-hosting

See the [wiki](https://github.com/managemeals/manage-meals-api/wiki/Self%E2%80%90hosting).

## Development

Setup the environment variables:

```bash
cp .env.docker.example .env.docker
cp .env.example .env
```

Then there are two `docker-compose` files, one which only starts the required services (MongoDB, Redis, etc.), and one which starts the API itself.

To start the infrastructure only, first create a `docker-compose.infra.override.yaml` file to expose some ports, with the contents:

```yaml
services:
  mongo:
    ports:
      - 27017:27017

  mongo-express:
    ports:
      - 8081:8081

  redis:
    ports:
      - 6379:6379

  recipe-scraper-01:
    ports:
      - 8101:8000

  recipe-scraper-02:
    ports:
      - 8102:8000

  recipe-scraper-lb:
    ports:
      - 8109:80

  typesense:
    ports:
      - 8008:8108

  rabbitmq:
    ports:
      - 5672:5672
      - 15672:15672
```

Then start it up:

```bash
make up-infra
```

Then start the API:

```bash
npm run dev
```

### Queue

#### Local development

Comment out the consumer in the `docker-compose.infra.yaml` and run this:

```sh
eval $(cat ../.env) node consumer.js
```

### Search

#### Local development

Comment out the sync in the `docker-compose.infra.yaml` and run this:

```sh
eval $(cat ../.env) node sync.js
```

### Webhooks

#### Local development

Comment out the handler in the `docker-compose.infra.yaml` and run this:

```sh
eval $(cat ../.env) node handler.js
```

### Scraper

#### Local development

```sh
docker build -f scraper.Dockerfile -t scraper . && docker run -p 8000:8000 \
	-e CACHE_REDIS_HOST='localhost' \
	-e CACHE_REDIS_PORT='5000' \
	-e CACHE_REDIS_DB='test' \
	-e CACHE_REDIS_URL='localhost' \
	-e CACHE_KEY_PREFIX='mm' \
	-e PPLX_API_KEY='secret' \
	-e DEFAULT_RECIPE_IMG="https://example.com" \
	scraper
```

## Production

Here the second `docker-compose` file comes in, the one that builds the API.

First create a `docker-compose.app.override.yaml` file to expose ports, with the contents:

```yaml
services:
  manage-meals-app-01:
    ports:
      - 8201:3000

  manage-meals-app-02:
    ports:
      - 8202:3000

  manage-meals-app-lb:
    ports:
      - 8209:80
```

Then everything can be started up as containers:

```bash
make up-app
```

### MongoDB

#### Creating indexes

```bash
mongosh --username root

show dbs

use manage_meals

show collections

db.tags.createIndex({ uuid: 1 }, { unique: true });

db.tags.createIndex({ slug: 1, createdByUuid: 1 }, { unique: true });
```

#### Creating backups

Run as a cron job.

```bash
docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	exec -i mongo mongodump --uri "mongodb://user:pass@mongo:27017/db" --authenticationDatabase admin --gzip --archive > /mnt/netdrive/mmeals/backups/mongo/prod-`date +"%Y-%m-%d-%H-%M"`.tar.gz
```

#### Restoring a backup

```bash
docker cp ~/Downloads/prod-2024-04-25-06-26.tar.gz 281d976c63f2:/tmp/prod-2024-04-25-06-26.tar.gz

docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	exec -i mongo mongorestore -v --uri "mongodb://user:pass@mongo:27017" --authenticationDatabase admin --gzip --drop --nsInclude "db.*" --archive="/tmp/prod-2024-04-25-06-26.tar.gz"
```
