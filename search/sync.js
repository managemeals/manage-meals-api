import { MongoClient } from "mongodb";
import Typesense from "typesense";
import cron from "node-cron";

// Mongo setup
const mongoClient = new MongoClient(process.env.MONGO_URL);
await mongoClient.connect();
const db = mongoClient.db(process.env.MONGO_DB);
const syncsDbColl = db.collection("syncs");
const recipesDbColl = db.collection("recipes");
const deletesDbColl = db.collection("deletes");

// Typesense setup
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST,
      port: process.env.TYPESENSE_PORT,
      protocol: "http",
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 30,
});
const recipesCollection = "recipes";

// Every minute
cron.schedule("* * * * *", async () => {
  console.log("Starting search sync");

  // Get lastSyncedAt time, default to some old date to make
  // sure it runs if there is no lastSyncedAt time
  let lastSyncedAt = new Date("2020-01-01");
  try {
    const syncedDoc = await syncsDbColl.findOne({
      name: "Search",
    });
    if (syncedDoc) {
      lastSyncedAt = syncedDoc.lastSyncedAt;
    }
  } catch (e) {
    console.log(e);
    return;
  }

  // Get recipes with updatedAt newer than lastSyncedAt
  const recipesPipeline = [
    {
      $match: {
        updatedAt: {
          $gte: lastSyncedAt,
        },
      },
    },
    {
      $lookup: {
        from: "tags",
        localField: "tagUuids",
        foreignField: "uuid",
        as: "tags",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "categoryUuids",
        foreignField: "uuid",
        as: "categories",
      },
    },
  ];
  const recipesCursor = recipesDbColl.aggregate(recipesPipeline);
  let recipes = [];
  try {
    for await (const doc of recipesCursor) {
      recipes.push(doc);
    }
  } catch (e) {
    console.log(e);
    return;
  }

  // await typesenseClient.collections(recipesCollection).delete();

  // Check if recipes collection exists
  let createRecipesSchema = false;
  try {
    await typesenseClient.collections(recipesCollection).retrieve();
  } catch (e) {
    if (e instanceof Error && e.name === "ObjectNotFound") {
      createRecipesSchema = true;
    } else {
      console.log(e);
      return;
    }
  }

  // Create recipes collection if it does not exist
  if (createRecipesSchema) {
    const recipeSchema = {
      name: recipesCollection,
      fields: [
        { name: "id", type: "string" },
        { name: "slug", type: "string" },
        { name: "createdByUuid", type: "string" },
        { name: "rating", type: "int32" },
        { name: "title", type: "string" },
        { name: "categories", type: "string[]", facet: true },
        { name: "tags", type: "string[]", facet: true },
      ],
      default_sorting_field: "rating",
    };
    try {
      await typesenseClient.collections().create(recipeSchema);
      console.log("Created recipes schema");
    } catch (e) {
      console.log(e);
      return;
    }
  }

  // Index recipes
  const mappedRecipes = recipes.map((r) => ({
    id: r.uuid,
    slug: r.slug,
    createdByUuid: r.createdByUuid,
    rating: r.rating || 0,
    title: r.data.title || [],
    ingredients: r.data.ingredients || [],
    categories: r.categories.map((rc) => rc.name),
    tags: r.tags.map((rt) => rt.name),
    imageUrl: r.data.image || "",
    description: r.data.description || "",
  }));
  if (mappedRecipes.length) {
    try {
      await typesenseClient
        .collections(recipesCollection)
        .documents()
        .import(mappedRecipes, { action: "upsert" });
    } catch (e) {
      console.log(e);
      return;
    }
    console.log(`Imported ${mappedRecipes.length} recipes`);
  }

  // Delete recipes
  const deletedRecipesCursor = deletesDbColl.find({
    collection: "recipes",
    deletedAt: {
      $gte: lastSyncedAt,
    },
  });
  let deletedRecipesIds = [];
  try {
    const deletedRecipes = await deletedRecipesCursor.toArray();
    deletedRecipesIds = deletedRecipes.map((dr) => dr.uuid);
  } catch (e) {
    console.log(e);
    return;
  }

  if (deletedRecipesIds.length) {
    try {
      await typesenseClient
        .collections(recipesCollection)
        .documents()
        .delete({ filter_by: `id:[${deletedRecipesIds.join(",")}]` });
    } catch (e) {
      console.log(e);
      return;
    }
    console.log(`Deleted ${deletedRecipesIds.length} recipes`);
  }

  // Save last synced time
  try {
    await syncsDbColl.updateOne(
      { name: "Search" },
      { $set: { lastSyncedAt: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    console.log(e);
    return;
  }

  console.log("Finished search sync");
});
