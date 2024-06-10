import { FastifyInstance, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";
import mime from "mime";
import {
  ICategoriesTags,
  IDbDeletes,
  IDbRecipe,
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
import { PutObjectCommand } from "@aws-sdk/client-s3";

const recipes = async (fastify: FastifyInstance, options: Object) => {
  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbRecipe>("recipes");

  const deletesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbDeletes>("deletes");

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

      if (tags && tags.length) {
        if (tags[0] === "[]") {
          matchObj["tagUuids"] = {
            $size: 0,
          };
        } else if (tags[0] !== "") {
          matchObj["tagUuids"] = {
            $all: tags,
          };
        }
      }

      if (categories && categories.length) {
        if (categories[0] === "[]") {
          matchObj["categoryUuids"] = {
            $size: 0,
          };
        } else if (categories[0] !== "") {
          matchObj["categoryUuids"] = {
            $all: categories,
          };
        }
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
        perPage: fastify.config.ITEMS_PER_PAGE,
        data: recipes,
      };
    }
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
      reply
    ) => {
      const { url } = request.query;
      const { tagUuids, categoryUuids } = request.body;

      fastify.log.info(`Importing recipe URL: ${url}`);

      if (
        (url.startsWith("https://youtube.com") ||
          url.startsWith("https://www.youtube.com")) &&
        request.user &&
        request.user.subscriptionType !== "PREMIUM"
      ) {
        reply.code(401);
        throw new Error(
          "Premium subscription required to import recipes from YouTube"
        );
      }

      let recipeJson: IRecipeData;
      try {
        const scraperRes = await fastify.axios.get(
          `${fastify.config.RECIPE_SCRAPER_URL}?url=${url}`,
          {
            timeout: 60000,
          }
        );
        recipeJson = scraperRes.data as IRecipeData;
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
      const recipeSlug = `${fastify.slugify(recipeJson.title || "", {
        maxLength: 91,
      })}-${nanoid(8)}`;
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
            })
          )
        );
      }

      return { slug: recipeSlug };
    }
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
    }
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
      }

      return {};
    }
  );

  fastify.post(
    "/",
    { schema: { body: TRecipe } },
    async (request: FastifyRequest<{ Body: IRecipe }>, reply) => {
      const { categoryUuids, tagUuids, rating, data } = request.body;

      if (!data?.title) {
        reply.code(400);
        throw new Error("Missing title");
      }

      const recipeUuid = crypto.randomUUID();
      const recipeSlug = `${fastify.slugify(data.title, {
        maxLength: 91,
      })}-${nanoid(8)}`;

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
          data: {
            ...data,
            image: fastify.config.DEFAULT_RECIPE_IMG,
          },
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error creating recipe");
      }

      return { slug: recipeSlug };
    }
  );

  fastify.put(
    "/:slug",
    { schema: { params: TSlug, body: TRecipe } },
    async (
      request: FastifyRequest<{ Params: ISlug; Body: IRecipe }>,
      reply
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
          }
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
    }
  );

  fastify.patch(
    "/:slug/image/file",
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
          throw new Error("Error patching recipe image");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching recipe image");
      }

      const file = await request.file();

      if (!file) {
        reply.code(404);
        throw new Error("No file in body");
      }

      if (!file.mimetype.startsWith("image")) {
        reply.code(404);
        throw new Error("Not an image");
      }

      let imgUrl = fastify.config.DEFAULT_RECIPE_IMG;

      try {
        const buffer = await file.toBuffer();
        const extension = mime.getExtension(file?.mimetype || "");
        const filename = `mmeals/recipes/upload-images/${recipe.uuid}-${nanoid(
          6
        )}.${extension}`;
        await fastify.s3.send(
          new PutObjectCommand({
            ACL: "public-read",
            Bucket: process.env.S3_BUCKET,
            Key: filename,
            Body: buffer,
            ContentType: file?.mimetype || "image/png",
          })
        );
        imgUrl = `https://whatacdn.fra1.cdn.digitaloceanspaces.com/${filename}`;
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching recipe image");
      }

      try {
        await recipesDbCollection.updateOne(
          { uuid: recipe.uuid },
          {
            $set: {
              updatedAt: new Date(),
              "data.image": imgUrl,
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching recipe image");
      }

      return {};
    }
  );

  fastify.patch(
    "/:slug/image/url",
    { schema: { body: TUrl, params: TSlug } },
    async (request: FastifyRequest<{ Body: IUrl; Params: ISlug }>, reply) => {
      const { url } = request.body;
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
          throw new Error("Error patching recipe image");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching recipe image");
      }

      let imgUrl = fastify.config.DEFAULT_RECIPE_IMG;

      try {
        const imgRes = await fastify.axios.get(url, {
          responseType: "arraybuffer",
        });
        if (!imgRes) {
          throw new Error(`No image at URL ${url}`);
        }
        const contentType = imgRes.headers["content-type"] || "image/png";
        const extension = mime.getExtension(contentType);
        const filename = `mmeals/recipes/upload-images/${recipe.uuid}-${nanoid(
          6
        )}.${extension}`;
        await fastify.s3.send(
          new PutObjectCommand({
            ACL: "public-read",
            Bucket: process.env.S3_BUCKET,
            Key: filename,
            Body: imgRes.data,
            ContentType: contentType,
          })
        );
        imgUrl = `https://whatacdn.fra1.cdn.digitaloceanspaces.com/${filename}`;
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching recipe image");
      }

      try {
        await recipesDbCollection.updateOne(
          { uuid: recipe.uuid },
          {
            $set: {
              updatedAt: new Date(),
              "data.image": imgUrl,
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching recipe image");
      }

      return {};
    }
  );
};

export default recipes;
