import { FastifyInstance, FastifyRequest } from "fastify";
import {
  TTag,
  ITag,
  TTags,
  ISlug,
  TSlug,
  IDbDeletes,
  IDbTag,
  IDbRecipe,
} from "../../../types.js";

const tags = async (fastify: FastifyInstance, options: Object) => {
  const tagsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbTag>("tags");

  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbRecipe>("recipes");

  const deletesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbDeletes>("deletes");

  fastify.get(
    "/",
    { schema: { response: { 200: TTags } } },
    async (request, reply) => {
      const cursor = tagsDbCollection.find(
        {
          createdByUuid: request.user?.uuid,
        },
        { sort: { slug: 1 } }
      );
      let tags = [];
      try {
        tags = await cursor.toArray();
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error gettings tags");
      }

      return tags;
    }
  );

  fastify.post(
    "/",
    {
      schema: {
        body: TTag,
      },
    },
    async (request: FastifyRequest<{ Body: ITag }>, reply) => {
      const { name } = request.body;

      const tagSlug = fastify.slugify(name, { maxLength: 100 });
      try {
        await tagsDbCollection.insertOne({
          uuid: crypto.randomUUID(),
          slug: tagSlug,
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
          throw new Error("Tag with slug already exists");
        }
        fastify.log.error(e);
        throw new Error("Error creating tag");
      }

      return { slug: tagSlug };
    }
  );

  fastify.get(
    "/:slug",
    { schema: { params: TSlug, response: { 200: TTag } } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      let tag: ITag | null;
      try {
        tag = await tagsDbCollection.findOne<ITag>({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!tag) {
          fastify.log.error(`Tag ${slug} not found`);
          reply.code(404);
          throw new Error("Error getting tag");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting tag");
      }

      return tag;
    }
  );

  fastify.patch(
    "/:slug",
    { schema: { params: TSlug, body: TTag } },
    async (
      request: FastifyRequest<{
        Body: ITag;
        Params: ISlug;
      }>,
      reply
    ) => {
      const { slug } = request.params;
      const { name } = request.body;

      try {
        const dbRes = await tagsDbCollection.updateOne(
          {
            slug,
            createdByUuid: request.user?.uuid,
          },
          {
            $set: {
              name,
              updatedAt: new Date(),
            },
          }
        );
        if (!dbRes.matchedCount) {
          fastify.log.error(`Tag ${slug} not found`);
          reply.code(404);
          throw new Error("Error patching tag");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching tag");
      }

      return {};
    }
  );

  fastify.delete(
    "/:slug",
    { schema: { params: TSlug } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      let tag: ITag | null;
      try {
        tag = await tagsDbCollection.findOne<ITag>({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!tag) {
          fastify.log.error(`Tag ${slug} not found`);
          reply.code(404);
          throw new Error("Error deleting tag");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting tag");
      }

      try {
        await tagsDbCollection.deleteOne({
          slug,
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting tag");
      }

      try {
        await recipesDbCollection.updateMany(
          {
            createdByUuid: request.user?.uuid,
          },
          {
            $pull: {
              tagUuids: tag.uuid,
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
      }

      try {
        await deletesDbCollection.insertOne({
          collection: "tags",
          uuid: tag.uuid,
          deletedAt: new Date(),
        });
      } catch (e) {
        fastify.log.error(e);
      }

      return {};
    }
  );
};

export default tags;
