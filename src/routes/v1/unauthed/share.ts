import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IDbShareRecipe,
  IShareRecipe,
  ISlug,
  TShareRecipe,
  TSlug,
} from "../../../types.js";

const share = async (fastify: FastifyInstance, options: Object) => {
  const shareRecipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbShareRecipe>("sharerecipes");

  fastify.get(
    "/recipes/:slug",
    { schema: { params: TSlug, response: { 200: TShareRecipe } } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      const pipeline = [
        {
          $match: {
            slug,
          },
        },
        {
          $lookup: {
            from: "recipes",
            localField: "recipeUuid",
            foreignField: "uuid",
            as: "recipe",
          },
        },
        {
          $unwind: {
            path: "$recipe",
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "recipe.tagUuids",
            foreignField: "uuid",
            as: "recipe.tags",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "recipe.categoryUuids",
            foreignField: "uuid",
            as: "recipe.categories",
          },
        },
      ];

      let recipes: IShareRecipe[] = [];
      const cursor = shareRecipesDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          recipes.push(doc as IShareRecipe);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting share recipe");
      }

      if (!recipes.length) {
        fastify.log.error(`Share recipe ${slug} not found`);
        reply.code(404);
        throw new Error("Error getting share recipe");
      }

      return recipes[0];
    }
  );
};

export default share;
