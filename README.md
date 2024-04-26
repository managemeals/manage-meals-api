# ManageMeals API

https://managemeals.com

## MongoDB

### Creating indexes

```sh
mongosh --username root

show dbs

use mmeals

show collections

db.tags.createIndex({ uuid: 1 }, { unique: true });

db.tags.createIndex({ slug: 1, createdByUuid: 1 }, { unique: true });
```

### Creating backups

```sh
docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	exec -i mongo mongodump --uri "mongodb://user:pass@mongo:27017/db" --authenticationDatabase admin --gzip --archive > /mnt/hetzner/ManageMeals/backups/mongo/prod-`date +"%Y-%m-%d-%H-%M"`.tar.gz
```

### Restoring a backup

```sh
docker cp /Users/hilmar/Downloads/prod-2024-04-25-06-26.tar.gz 281d976c63f2:/tmp/prod-2024-04-25-06-26.tar.gz

docker compose \
	-f docker-compose.infra.yaml \
	-f docker-compose.app.yaml \
	-f docker-compose.infra.override.yaml \
	-f docker-compose.app.override.yaml \
	exec -i mongo mongorestore -v --uri "mongodb://user:pass@mongo:27017" --authenticationDatabase admin --gzip --drop --nsInclude "db.*" --archive="/tmp/prod-2024-04-25-06-26.tar.gz"
```

## Queue

### Local development

Comment out the consumer in the `docker-compose.infra.yaml` and run this:

```sh
eval $(cat ../.env.local) node consumer.js
```

## Search

### Local development

Comment out the sync in the `docker-compose.infra.yaml` and run this:

```sh
eval $(cat ../.env.local) node sync.js
```

## Webhooks

### Local development

Comment out the handler in the `docker-compose.infra.yaml` and run this:

```sh
eval $(cat ../.env.local) node handler.js
```

## Scraper

### Local development

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
