import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IDbRecipe,
  IDbShareRecipe,
  IRecipe,
  IShareRecipe,
  ISlug,
  TShareRecipe,
  TSlug,
} from "../../../types.js";
import { nanoid } from "nanoid";

const share = async (fastify: FastifyInstance, options: Object) => {
  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbRecipe>("recipes");

  const shareRecipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbShareRecipe>("sharerecipes");

  fastify.post(
    "/recipes",
    { schema: { body: TShareRecipe } },
    async (request: FastifyRequest<{ Body: IShareRecipe }>, reply) => {
      const { recipeUuid } = request.body;

      let recipe: IRecipe | null;
      try {
        recipe = await recipesDbCollection.findOne<IRecipe>({
          uuid: recipeUuid,
          createdByUuid: request.user?.uuid,
        });
        if (!recipe) {
          fastify.log.error(`Recipe ${recipeUuid} not found`);
          reply.code(404);
          throw new Error("Error getting recipe");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting recipe");
      }

      const slug = `${fastify.slugify(recipe.slug || "", {
        maxLength: 89,
      })}-${nanoid(10)}`;

      try {
        await shareRecipesDbCollection.insertOne({
          uuid: crypto.randomUUID(),
          slug,
          createdByUuid: request.user?.uuid,
          createdAt: new Date(),
          updatedAt: new Date(),
          recipeUuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error creating share recipe");
      }

      return { slug };
    }
  );

  fastify.delete(
    "/recipes/:slug",
    { schema: { params: TSlug } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      let shareRecipe: IShareRecipe | null;
      try {
        shareRecipe = await shareRecipesDbCollection.findOne<IShareRecipe>({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!shareRecipe) {
          fastify.log.error(`Share recipe ${slug} not found`);
          reply.code(404);
          throw new Error("Error deleting share recipe");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting share recipe");
      }

      try {
        await shareRecipesDbCollection.deleteOne({
          slug,
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting share recipe");
      }

      return {};
    }
  );
};

export default share;
