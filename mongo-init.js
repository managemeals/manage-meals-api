try {
  db.createCollection("users");
} catch {}
db.users.createIndex({ uuid: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });

try {
  db.createCollection("recipes");
} catch {}
db.recipes.createIndex({ uuid: 1 }, { unique: true });
db.recipes.createIndex({ slug: 1 }, { unique: true });
db.recipes.createIndex({ createdByUuid: 1, slug: 1 }, { unique: true });
db.recipes.createIndex({ createdByUuid: 1, tagUuids: 1 });
db.recipes.createIndex({ createdByUuid: 1, categoryUuids: 1 });
db.recipes.createIndex({ createdByUuid: 1, favorite: 1 });
db.recipes.createIndex({ createdByUuid: 1, createdAt: -1 });
db.recipes.createIndex({ "data.canonical_url": 1 }, { sparse: true });

try {
  db.createCollection("tags");
} catch {}
db.tags.createIndex({ uuid: 1 }, { unique: true });
db.tags.createIndex({ createdByUuid: 1, slug: 1 }, { unique: true });

try {
  db.createCollection("categories");
} catch {}
db.categories.createIndex({ uuid: 1 }, { unique: true });
db.categories.createIndex({ createdByUuid: 1, slug: 1 }, { unique: true });

try {
  db.createCollection("mealplans");
} catch {}
db.mealplans.createIndex({ uuid: 1 }, { unique: true });
db.mealplans.createIndex({ uuid: 1, createdByUuid: 1 });
db.mealplans.createIndex({ date: 1, createdByUuid: 1 });
db.mealplans.createIndex({ createdByUuid: 1, updatedAt: -1 });

try {
  db.createCollection("shoppinglists");
} catch {}
db.shoppinglists.createIndex({ uuid: 1 }, { unique: true });
db.shoppinglists.createIndex({ slug: 1, createdByUuid: 1 }, { unique: true });

try {
  db.createCollection("cookbooks");
} catch {}
db.cookbooks.createIndex({ uuid: 1 }, { unique: true });
db.cookbooks.createIndex({ slug: 1, createdByUuid: 1 }, { unique: true });
db.cookbooks.createIndex({ createdByUuid: 1, createdAt: -1 });

try {
  db.createCollection("sharerecipes");
} catch {}
db.sharerecipes.createIndex({ uuid: 1 }, { unique: true });
db.sharerecipes.createIndex({ slug: 1 }, { unique: true });
db.sharerecipes.createIndex({ slug: 1, createdByUuid: 1 });
db.sharerecipes.createIndex({ recipeUuid: 1, createdByUuid: 1 });
