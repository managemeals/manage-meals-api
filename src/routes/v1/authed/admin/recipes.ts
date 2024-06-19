import { FastifyInstance } from "fastify";
import { IDbRecipe, IRecipe, TRecipes } from "../../../../types.js";

const recipes = async (fastify: FastifyInstance, options: Object) => {
  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbRecipe>("recipes");

  fastify.get(
    "/latest",
    { schema: { response: { 200: TRecipes } } },
    async (request, reply) => {
      const pipeline = [
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $limit: 5,
        },
      ];

      let recipes: IRecipe[] = [];
      const cursor = recipesDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          recipes.push(doc as IRecipe);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error gettings recipes");
      }

      return recipes;
    }
  );
};

export default recipes;
