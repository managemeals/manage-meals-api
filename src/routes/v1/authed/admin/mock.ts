import { FastifyInstance } from "fastify";
import {
  ICategory,
  IDbUser,
  IRecipe,
  ITag,
  TDbMock,
} from "../../../../types.js";
import { faker } from "@faker-js/faker";
import { random, sample, sampleSize } from "lodash-es";
import { nanoid } from "nanoid";

const mock = async (fastify: FastifyInstance, options: Object) => {
  const tagsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("tags");

  const categoriesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("categories");

  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("users");

  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("recipes");

  const deletesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("deletes");

  fastify.post("/", async (request, reply) => {
    // Users
    const users: TDbMock<IDbUser>[] = [];
    const hash = await fastify.bcrypt.hash("secret");
    users.push({
      uuid: crypto.randomUUID(),
      name: "Alice",
      email: "alice@example.com",
      password: hash,
      createdAt: faker.date.past(),
      updatedAt: new Date(),
      emailVerified: true,
      isAdmin: false,
      isMock: true,
    });
    try {
      await usersDbCollection.insertMany(users);
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error creating user mocks");
    }

    // Tags
    const mockTags = [
      "Vegan",
      "Chicken",
      "Steak",
      "Fish",
      "Juice",
      "Pulses",
      "Italian",
      "Fast food",
      "Healthy",
      "Weekend",
      "Weeknight",
      "Easy",
      "Quick",
      "Hard",
    ];
    const tags: TDbMock<ITag>[] = [];
    for (let i = 0; i < mockTags.length; i++) {
      tags.push({
        uuid: crypto.randomUUID(),
        slug: fastify.slugify(mockTags[i]),
        // @ts-expect-error JS date in db
        createdAt: faker.date.past(),
        // @ts-expect-error JS date in db
        updatedAt: new Date(),
        name: mockTags[i],
        createdByUuid: sample(users)?.uuid || "",
        isMock: true,
      });
    }
    try {
      await tagsDbCollection.insertMany(tags);
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error creating tag mocks");
    }

    // Categories
    const mockCategories = [
      "Starter",
      "Main",
      "Dessert",
      "Brunch",
      "Side dish",
      "Sauce",
      "Drink",
      "Breakfast",
    ];
    const categories: TDbMock<ICategory>[] = [];
    for (let i = 0; i < mockCategories.length; i++) {
      categories.push({
        uuid: crypto.randomUUID(),
        slug: fastify.slugify(mockCategories[i]),
        // @ts-expect-error JS date in db
        createdAt: faker.date.past(),
        // @ts-expect-error JS date in db
        updatedAt: new Date(),
        name: mockCategories[i],
        createdByUuid: sample(users)?.uuid || "",
        isMock: true,
      });
    }
    try {
      await categoriesDbCollection.insertMany(categories);
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error creating category mocks");
    }

    // Recipes
    const maxRecipes = 5000;
    const mockRecipesRes = await fetch(
      "https://whatacdn.fra1.cdn.digitaloceanspaces.com/mmeals/mocks/recipes_raw_nosource_ar.json"
    );
    const mockRecipes: any = await mockRecipesRes.json();
    const recipes: TDbMock<IRecipe>[] = [];
    let currIndex = 0;
    for (let key in mockRecipes) {
      if (currIndex >= maxRecipes) {
        break;
      }
      const currRecipe = mockRecipes[key];
      if (!currRecipe || !currRecipe.title) {
        continue;
      }
      const recipeingredients = (currRecipe.ingredients || [])
        .map((ingr: string) => ingr.replace("ADVERTISEMENT", "").trim())
        .filter((ingr: string) => ingr !== "");
      recipes.push({
        uuid: crypto.randomUUID(),
        slug: `${fastify.slugify(currRecipe.title)}-${nanoid(6)}`,
        createdByUuid: sample(users)?.uuid || "",
        // @ts-expect-error JS date in db
        createdAt: faker.date.past(),
        // @ts-expect-error JS date in db
        updatedAt: new Date(),
        categoryUuids: sampleSize(categories, random(1, 4)).map(
          (c) => c.uuid || ""
        ),
        tagUuids: sampleSize(tags, random(1, 6)).map((t) => t.uuid || ""),
        rating: random(0, 5),
        data: {
          author: faker.person.fullName(),
          canonical_url: "https://www.bbcgoodfood.com/",
          category: sample(mockCategories),
          cook_time: faker.string.numeric(2),
          cuisine: faker.location.country(),
          description: faker.lorem.paragraphs(),
          host: "bbcgoodfood",
          image: faker.image.urlPicsumPhotos(),
          ingredient_groups: [
            {
              ingredients: recipeingredients,
              purpose: faker.lorem.sentence(),
            },
          ],
          ingredients: recipeingredients,
          instructions: currRecipe.instructions,
          instructions_list: (currRecipe.instructions || "")
            .split("\n")
            .filter((instr: string) => instr !== ""),
          language: "en",
          nutrients: {
            calories: "808 kcal",
            carbohydrateContent: "44 g",
            cholesterolContent: "235 mg",
            fatContent: "56 g",
            fiberContent: "2 g",
            proteinContent: "34 g",
            saturatedFatContent: "27 g",
            sodiumContent: "736 mg",
            sugarContent: "2 g",
            unsaturatedFatContent: "1 g",
          },
          prep_time: faker.string.numeric(2),
          ratings: faker.string.numeric(1),
          site_name: "bbcgoodfood",
          title: currRecipe.title,
          total_time: faker.string.numeric(2),
          yields: `${faker.string.numeric(1)} servings`,
        },
        isMock: true,
      });
      currIndex++;
    }
    try {
      await recipesDbCollection.insertMany(recipes);
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error creating recipe mocks");
    }

    return {};
  });

  fastify.delete("/", async (request, reply) => {
    // Users
    try {
      await usersDbCollection.deleteMany({
        isMock: true,
      });
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error deleting user mocks");
    }

    // Tags
    try {
      await tagsDbCollection.deleteMany({
        isMock: true,
      });
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error deleting tag mocks");
    }

    // Categories
    try {
      await categoriesDbCollection.deleteMany({
        isMock: true,
      });
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error deleting category mocks");
    }

    // Recipes
    const deleteCursor = recipesDbCollection.find({
      isMock: true,
    });
    let deleteRecipes = [];
    try {
      deleteRecipes = await deleteCursor.toArray();
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error gettings deleting recipe mocks");
    }

    try {
      await deletesDbCollection.insertMany(
        deleteRecipes.map((r) => ({
          collection: "recipes",
          uuid: r.uuid,
          deletedAt: new Date(),
        }))
      );
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error inserting deleting recipe mocks");
    }

    try {
      await recipesDbCollection.deleteMany({
        isMock: true,
      });
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error deleting recipe mocks");
    }

    return {};
  });
};

export default mock;
