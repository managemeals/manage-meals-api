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
