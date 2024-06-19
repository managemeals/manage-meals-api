import { FastifyInstance } from "fastify";
import {
  IDbCategory,
  IDbMealPlan,
  IDbRecipe,
  IDbShoppingList,
  IDbTag,
  IDbUser,
  TAdminStatus,
} from "../../../../types.js";

const status = async (fastify: FastifyInstance, options: Object) => {
  const tagsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbTag>("tags");

  const categoriesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbCategory>("categories");

  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbUser>("users");

  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbRecipe>("recipes");

  const mealPlansDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbMealPlan>("mealplans");

  const shoppingListsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbShoppingList>("shoppinglists");

  fastify.get(
    "/",
    { schema: { response: { 200: TAdminStatus } } },
    async (request, reply) => {
      // Common
      const totalPipeline = [
        {
          $count: "count",
        },
      ];

      // Users
      let totalUsers = 0;
      const totalUsersCursor = usersDbCollection.aggregate(totalPipeline);
      try {
        for await (const doc of totalUsersCursor) {
          totalUsers = doc.count;
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting total users");
      }

      // Recipes
      let totalRecipes = 0;
      const totalRecipesCursor = recipesDbCollection.aggregate(totalPipeline);
      try {
        for await (const doc of totalRecipesCursor) {
          totalRecipes = doc.count;
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting total recipes");
      }

      // Categories
      let totalCategories = 0;
      const totalCategoriesCursor =
        categoriesDbCollection.aggregate(totalPipeline);
      try {
        for await (const doc of totalCategoriesCursor) {
          totalCategories = doc.count;
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting total categories");
      }

      // Tags
      let totalTags = 0;
      const totalTagsCursor = tagsDbCollection.aggregate(totalPipeline);
      try {
        for await (const doc of totalTagsCursor) {
          totalTags = doc.count;
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting total tags");
      }

      // Shopping lists
      let totalShoppingLists = 0;
      const totalShoppingListsCursor =
        shoppingListsDbCollection.aggregate(totalPipeline);
      try {
        for await (const doc of totalShoppingListsCursor) {
          totalShoppingLists = doc.count;
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting total shopping lists");
      }

      // Meal plans
      let totalMealPlans = 0;
      const totalMealPlansCursor =
        mealPlansDbCollection.aggregate(totalPipeline);
      try {
        for await (const doc of totalMealPlansCursor) {
          totalMealPlans = doc.count;
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting total meal plans");
      }

      return {
        totalUsers,
        totalRecipes,
        totalCategories,
        totalTags,
        totalShoppingLists,
        totalMealPlans,
      };
    }
  );
};

export default status;
