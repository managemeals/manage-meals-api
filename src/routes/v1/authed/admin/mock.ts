import { FastifyInstance } from "fastify";
import {
  ICategory,
  IDbUser,
  IRecipe,
  ITag,
  TDbMock,
} from "../../../../types.js";
import { faker } from "@faker-js/faker";
import { sample, sampleSize } from "lodash-es";
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

  fastify.post("/", async (request, reply) => {
    // Users
    const users: TDbMock<IDbUser>[] = [];
    const hash = await fastify.bcrypt.hash("secret");
    for (let i = 0; i < 10; i++) {
      users.push({
        uuid: crypto.randomUUID(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: hash,
        createdAt: faker.date.anytime(),
        emailVerified: true,
        isAdmin: false,
        isMock: true,
      });
    }
    try {
      await usersDbCollection.insertMany(users);
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error creating user mocks");
    }

    // Tags
    const tags: TDbMock<ITag>[] = [];
    for (let i = 0; i < 400; i++) {
      const tagName = `${faker.commerce.productAdjective()}-${nanoid(6)}`;
      tags.push({
        uuid: crypto.randomUUID(),
        slug: fastify.slugify(tagName),
        name: tagName,
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
    const categories: TDbMock<ICategory>[] = [];
    for (let i = 0; i < 400; i++) {
      const categoryName = `${faker.commerce.product()}-${nanoid(6)}`;
      categories.push({
        uuid: crypto.randomUUID(),
        slug: fastify.slugify(categoryName),
        name: categoryName,
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
    // const recipeImgs = [
    //   "https://whatacdn.fra1.cdn.digitaloceanspaces.com/mmeals/recipes/images/c5c9d249-ca08-40e9-8bb8-497d2a819d43.jpeg",
    //   "https://whatacdn.fra1.cdn.digitaloceanspaces.com/mmeals/recipes/images/a6494438-5338-4599-a9e5-0f587e61b976.jpeg",
    //   "https://whatacdn.fra1.cdn.digitaloceanspaces.com/mmeals/recipes/images/e6e9b9d5-8a88-4012-8027-c5f6e486137a.jpeg",
    // ];
    const recipes: TDbMock<IRecipe>[] = [];
    for (let i = 0; i < 5000; i++) {
      const recipeName = faker.commerce.productDescription();
      recipes.push({
        uuid: crypto.randomUUID(),
        slug: `${fastify.slugify(recipeName)}-${nanoid(6)}`,
        createdByUuid: sample(users)?.uuid || "",
        createdAt: faker.date.anytime().toString(),
        categoryUuids: sampleSize(categories, 3).map((c) => c.uuid || ""),
        tagUuids: sampleSize(tags, 6).map((t) => t.uuid || ""),
        data: {
          author: faker.person.fullName(),
          canonical_url: faker.internet.url(),
          category: faker.animal.fish(),
          cook_time: faker.string.numeric(2),
          cuisine: faker.location.country(),
          description: faker.lorem.paragraphs(),
          host: faker.internet.url(),
          image: faker.image.urlPicsumPhotos(),
          ingredient_groups: [
            {
              ingredients: [
                "1 (16 ounce) package thick-cut bacon",
                "1 (16 ounce) package penne pasta",
                "⅓ cup olive oil",
                "¼ cup butter",
                "3 tablespoons minced garlic",
                "3 teaspoons ground black pepper, divided",
                "3 skinless, boneless chicken breasts, sliced",
                "2 cups heavy whipping cream",
                "1 cup grated Parmesan-Romano cheese blend",
                "1 cup shredded Colby Jack cheese blend",
                "3 eggs, beaten",
              ],
              purpose: faker.lorem.sentence(),
            },
          ],
          ingredients: [
            "1 (16 ounce) package thick-cut bacon",
            "1 (16 ounce) package penne pasta",
            "⅓ cup olive oil",
            "¼ cup butter",
            "3 tablespoons minced garlic",
            "3 teaspoons ground black pepper, divided",
            "3 skinless, boneless chicken breasts, sliced",
            "2 cups heavy whipping cream",
            "1 cup grated Parmesan-Romano cheese blend",
            "1 cup shredded Colby Jack cheese blend",
            "3 eggs, beaten",
          ],
          instructions:
            "Place bacon in a large skillet and cook over medium-high heat, turning occasionally, until evenly browned, about 10 minutes. Drain bacon slices on paper towels. Chop into small pieces when cool enough to handle.\nBring a large pot of lightly salted water to a boil. Add penne and olive oil; cook, stirring occasionally, until tender yet firm to the bite, about 8 minutes.\nWhile pasta is cooking, melt butter in a large, deep skillet over low heat. Add chopped bacon, garlic, and 1 teaspoon pepper; sauté until fragrant, 2 to 3 minutes. Increase heat to medium, add chicken, and cook until chicken is no longer pink in the center and the juices run clear, 5 to 7 minutes.\nAdd whipping cream, Parmesan-Romano cheese, and remaining 2 teaspoons pepper to the skillet. Stir and cook until heated through, about 3 minutes. Add Colby-Jack cheese and stir until melted. Stir in beaten eggs and bring to a simmer. Add drained pasta and stir until coated with sauce.",
          instructions_list: [
            "Place bacon in a large skillet and cook over medium-high heat, turning occasionally, until evenly browned, about 10 minutes. Drain bacon slices on paper towels. Chop into small pieces when cool enough to handle.",
            "Bring a large pot of lightly salted water to a boil. Add penne and olive oil; cook, stirring occasionally, until tender yet firm to the bite, about 8 minutes.",
            "While pasta is cooking, melt butter in a large, deep skillet over low heat. Add chopped bacon, garlic, and 1 teaspoon pepper; sauté until fragrant, 2 to 3 minutes. Increase heat to medium, add chicken, and cook until chicken is no longer pink in the center and the juices run clear, 5 to 7 minutes.",
            "Add whipping cream, Parmesan-Romano cheese, and remaining 2 teaspoons pepper to the skillet. Stir and cook until heated through, about 3 minutes. Add Colby-Jack cheese and stir until melted. Stir in beaten eggs and bring to a simmer. Add drained pasta and stir until coated with sauce.",
          ],
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
          site_name: faker.company.name(),
          title: recipeName,
          total_time: faker.string.numeric(2),
          yields: `${faker.string.numeric(1)} servings`,
        },
        isMock: true,
      });
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
