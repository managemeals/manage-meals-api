import { FastifyInstance, FastifyRequest } from "fastify";
import {
  ICategory,
  ISlug,
  TCategories,
  TCategory,
  TSlug,
} from "../../../types.js";

const categories = async (fastify: FastifyInstance, options: Object) => {
  const categoriesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("categories");

  const deletesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("deletes");

  fastify.get(
    "/",
    { schema: { response: { 200: TCategories } } },
    async (request, reply) => {
      const cursor = categoriesDbCollection.find(
        {
          createdByUuid: request.user?.uuid,
        },
        { sort: { name: 1 } },
      );
      let categories = [];
      try {
        categories = await cursor.toArray();
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error gettings categories");
      }

      return categories;
    },
  );

  fastify.post(
    "/",
    { schema: { body: TCategory } },
    async (request: FastifyRequest<{ Body: ICategory }>, reply) => {
      const { name } = request.body;

      try {
        await categoriesDbCollection.insertOne({
          uuid: crypto.randomUUID(),
          slug: fastify.slugify(name),
          name,
          createdByUuid: request.user?.uuid,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (e: unknown) {
        if (
          e instanceof Error &&
          e.name.startsWith("Mongo") &&
          e.message.startsWith("E11000")
        ) {
          fastify.log.error(e);
          throw new Error("Category with slug already exists");
        }
        fastify.log.error(e);
        throw new Error("Error creating category");
      }

      return {};
    },
  );

  fastify.get(
    "/:slug",
    { schema: { params: TSlug, response: { 200: TCategory } } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      let category: ICategory | null;
      try {
        category = await categoriesDbCollection.findOne<ICategory>({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!category) {
          fastify.log.error(`Category ${slug} not found`);
          reply.code(404);
          throw new Error("Error getting category");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting category");
      }

      return category;
    },
  );

  fastify.patch(
    "/:slug",
    { schema: { params: TSlug, body: TCategory } },
    async (
      request: FastifyRequest<{
        Body: ICategory;
        Params: ISlug;
      }>,
      reply,
    ) => {
      const { slug } = request.params;
      const { name } = request.body;

      try {
        const dbRes = await categoriesDbCollection.updateOne(
          {
            slug,
            createdByUuid: request.user?.uuid,
          },
          {
            $set: {
              name,
              updatedAt: new Date(),
            },
          },
        );
        if (!dbRes.matchedCount) {
          fastify.log.error(`Category ${slug} not found`);
          reply.code(404);
          throw new Error("Error patching category");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching category");
      }

      return {};
    },
  );

  fastify.delete(
    "/:slug",
    { schema: { params: TSlug } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      let category: ICategory | null;
      try {
        category = await categoriesDbCollection.findOne<ICategory>({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!category) {
          fastify.log.error(`Category ${slug} not found`);
          reply.code(404);
          throw new Error("Error deleting category");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting category");
      }

      try {
        await categoriesDbCollection.deleteOne({
          slug,
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting category");
      }

      try {
        await deletesDbCollection.insertOne({
          collection: "categories",
          uuid: category.uuid,
          deletedAt: new Date(),
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting category");
      }

      return {};
    },
  );
};

export default categories;
