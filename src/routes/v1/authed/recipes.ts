import { FastifyInstance, FastifyRequest, FastifySchema } from "fastify";

const recipes = async (fastify: FastifyInstance, options: Object) => {
  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("recipes");

  const recipesSchema: FastifySchema = {};

  fastify.get(
    "/",
    { schema: recipesSchema },
    async (request: FastifyRequest<{ Body: any }>, reply) => {
      return { user: request.user || { ok: "nice" } };
    }
  );

  const postImportRecipeSchema: FastifySchema = {
    querystring: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", format: "uri" },
      },
    },
  };

  interface IPostImportRecipeQuerystring {
    url: string;
  }

  fastify.post(
    "/import",
    { schema: postImportRecipeSchema },
    async (
      request: FastifyRequest<{
        Body: any;
        Querystring: IPostImportRecipeQuerystring;
      }>,
      reply
    ) => {
      const { url } = request.query;

      fastify.log.info(`Importing recipe URL: ${url}`);

      let recipeJson: any;
      try {
        const scraperRes = await fetch(
          `${fastify.config.RECIPE_SCRAPER_URL}?url=${url}`
        );
        recipeJson = await scraperRes.json();
      } catch (e) {
        fastify.log.error(e);
        reply.code(400);
        throw new Error("Error importing recipe, invalid JSON");
      }

      if (
        !recipeJson ||
        !Object.keys(recipeJson).length ||
        (!recipeJson.instructions &&
          (!recipeJson.instructions_list ||
            !recipeJson.instructions_list.length) &&
          (!recipeJson.ingredients || !recipeJson.ingredients.length))
      ) {
        fastify.log.error("Recipe JSON empty");
        reply.code(400);
        throw new Error("Error importing recipe, invalid JSON");
      }

      try {
        await recipesDbCollection.insertOne({
          uuid: crypto.randomUUID(),
          slug: fastify.slugify(recipeJson.title),
          createdByUuid: request.user?.uuid,
          createdAt: new Date(),
          data: recipeJson,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error importing recipe");
      }

      return {};
    }
  );
};

export default recipes;
