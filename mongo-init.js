db.createCollection("users");
db.users.createIndex({ uuid: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });

db.createCollection("recipes");
db.recipes.createIndex({ uuid: 1 }, { unique: true });
db.recipes.createIndex({ slug: 1 }, { unique: true });
db.recipes.createIndex({ createdByUuid: 1, slug: 1 }, { unique: true });
db.recipes.createIndex({ createdByUuid: 1, uuid: 1 });

db.createCollection("tags");
db.tags.createIndex({ uuid: 1 }, { unique: true });
db.tags.createIndex({ createdByUuid: 1, slug: 1 }, { unique: true });

db.createCollection("categories");
db.categories.createIndex({ uuid: 1 }, { unique: true });
db.categories.createIndex({ createdByUuid: 1, slug: 1 }, { unique: true });

db.createCollection("mealplans");
db.mealplans.createIndex({ uuid: 1 }, { unique: true });
db.mealplans.createIndex({ uuid: 1, createdByUuid: 1 });
db.mealplans.createIndex({ date: 1, createdByUuid: 1 });

db.createCollection("shoppinglists");
db.shoppinglists.createIndex({ uuid: 1 }, { unique: true });
db.shoppinglists.createIndex({ slug: 1, createdByUuid: 1 }, { unique: true });

db.createCollection("sharerecipes");
db.sharerecipes.createIndex({ uuid: 1 }, { unique: true });
db.sharerecipes.createIndex({ slug: 1 }, { unique: true });
db.sharerecipes.createIndex({ slug: 1, createdByUuid: 1 });
db.sharerecipes.createIndex({ recipeUuid: 1, createdByUuid: 1 });
