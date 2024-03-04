# ManageMeals API

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
