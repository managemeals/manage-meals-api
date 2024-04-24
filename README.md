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
  scraper
```
