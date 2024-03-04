import { FastifyInstance, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";
import {
  ICategoriesTags,
  IRecipe,
  IRecipeData,
  IRecipeFilter,
  ISlug,
  IUrl,
  TCategoriesTags,
  TPaginated,
  TRecipe,
  TRecipeFilter,
  TRecipes,
  TSlug,
  TUrl,
} from "../../../types.js";

const recipes = async (fastify: FastifyInstance, options: Object) => {
  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("recipes");

  const deletesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("deletes");

  fastify.get(
    "/",
    {
      schema: {
        querystring: TRecipeFilter,
        response: { 200: TPaginated(TRecipes) },
      },
    },
    async (request: FastifyRequest<{ Querystring: IRecipeFilter }>, reply) => {
      const { page, categories, tags, sort } = request.query;
      let skipPage = page ? page - 1 : 0;
      if (skipPage < 0) {
        skipPage = 0;
      }

      const matchObj: any = {
        createdByUuid: request.user?.uuid,
      };

      if (tags && tags.length && tags[0] !== "") {
        matchObj["tagUuids"] = {
          $all: tags,
        };
      }

      if (categories && categories.length && categories[0] !== "") {
        matchObj["categoryUuids"] = {
          $all: categories,
        };
      }

      let sortObj: any = {
        slug: 1,
      };

      if (sort) {
        switch (sort) {
          case "createdAt":
            sortObj = {
              createdAt: 1,
            };
            break;
          case "-createdAt":
            sortObj = {
              createdAt: -1,
            };
            break;
        }
      }

      const recipesPipeline = [
        {
          $match: matchObj,
        },
        {
          $sort: sortObj,
        },
        {
          $skip: skipPage * fastify.config.ITEMS_PER_PAGE,
        },
        {
          $limit: fastify.config.ITEMS_PER_PAGE,
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

      let recipes: IRecipe[] = [];
      const recipesCursor = recipesDbCollection.aggregate(recipesPipeline);
      try {
        for await (const doc of recipesCursor) {
          recipes.push(doc as IRecipe);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error gettings recipes");
      }

      const totalPipeline = [
        {
          $match: matchObj,
        },
        {
          $count: "count",
        },
      ];
      let total = 0;
      const totalCursor = recipesDbCollection.aggregate(totalPipeline);
      try {
        for await (const doc of totalCursor) {
          total = doc.count;
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting recipes total");
      }

      return {
        page: page || 1,
        total,
        data: recipes,
      };
    },
  );

  fastify.post(
    "/import",
    {
      schema: {
        querystring: TUrl,
        body: TCategoriesTags,
        response: { 200: TSlug },
      },
    },
    async (
      request: FastifyRequest<{
        Body: ICategoriesTags;
        Querystring: IUrl;
      }>,
      reply,
    ) => {
      const { url } = request.query;
      const { tagUuids, categoryUuids } = request.body;

      fastify.log.info(`Importing recipe URL: ${url}`);

      let recipeJson: IRecipeData;
      try {
        const scraperRes = await fetch(
          `${fastify.config.RECIPE_SCRAPER_URL}?url=${url}`,
        );
        recipeJson = (await scraperRes.json()) as IRecipeData;
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

      const recipeUuid = crypto.randomUUID();
      const recipeSlug = `${fastify.slugify(recipeJson.title || "")}-${nanoid(8)}`;
      try {
        await recipesDbCollection.insertOne({
          uuid: recipeUuid,
          slug: recipeSlug,
          createdByUuid: request.user?.uuid,
          createdAt: new Date(),
          updatedAt: new Date(),
          categoryUuids: categoryUuids || [],
          tagUuids: tagUuids || [],
          rating: 0,
          data: recipeJson,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error importing recipe");
      }

      if (recipeJson.image) {
        fastify.amqp.channel.sendToQueue(
          "recipe_image",
          Buffer.from(
            JSON.stringify({
              uuid: recipeUuid,
              image: recipeJson.image,
            }),
          ),
        );
      }

      return { slug: recipeSlug };
    },
  );

  fastify.get(
    "/:slug",
    { schema: { params: TSlug, response: { 200: TRecipe } } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      const pipeline = [
        {
          $match: {
            slug,
            createdByUuid: request.user?.uuid,
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

      let recipes: IRecipe[] = [];
      const cursor = recipesDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          recipes.push(doc as IRecipe);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting recipe");
      }

      if (!recipes.length) {
        fastify.log.error(`Recipe ${slug} not found`);
        reply.code(404);
        throw new Error("Error getting recipe");
      }

      return recipes[0];
    },
  );

  fastify.delete(
    "/:slug",
    { schema: { params: TSlug } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      let recipe: IRecipe | null;
      try {
        recipe = await recipesDbCollection.findOne<IRecipe>({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!recipe) {
          fastify.log.error(`Recipe ${slug} not found`);
          reply.code(404);
          throw new Error("Error deleting recipe");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting recipe");
      }

      try {
        await recipesDbCollection.deleteOne({
          slug,
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting recipe");
      }

      try {
        await deletesDbCollection.insertOne({
          collection: "recipes",
          uuid: recipe.uuid,
          deletedAt: new Date(),
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting recipe");
      }

      return {};
    },
  );

  fastify.put(
    "/:slug",
    { schema: { params: TSlug, body: TRecipe } },
    async (
      request: FastifyRequest<{ Params: ISlug; Body: IRecipe }>,
      reply,
    ) => {
      const { slug } = request.params;
      const { categoryUuids, tagUuids, rating, data } = request.body;

      try {
        const dbRes = await recipesDbCollection.updateOne(
          {
            slug,
            createdByUuid: request.user?.uuid,
          },
          {
            $set: {
              updatedAt: new Date(),
              categoryUuids,
              tagUuids,
              rating,
              data,
            },
          },
        );
        if (!dbRes.matchedCount) {
          fastify.log.error(`Recipe ${slug} not found`);
          reply.code(404);
          throw new Error("Error patching recipe");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching recipe");
      }

      return {};
    },
  );
};

export default recipes;
