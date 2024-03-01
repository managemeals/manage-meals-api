import { FastifyInstance, FastifyRequest } from "fastify";
import { TTag, ITag, TTags, ISlug, TSlug } from "../../../types.js";

const tags = async (fastify: FastifyInstance, options: Object) => {
  const tagsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("tags");

  fastify.get(
    "/",
    { schema: { response: { 200: TTags } } },
    async (request, reply) => {
      const cursor = tagsDbCollection.find(
        {
          createdByUuid: request.user?.uuid,
        },
        { sort: { name: 1 } },
      );
      let tags = [];
      try {
        tags = await cursor.toArray();
        console.log(tags);
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error gettings tags");
      }

      return tags;
    },
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

      try {
        await tagsDbCollection.insertOne({
          uuid: crypto.randomUUID(),
          slug: fastify.slugify(name),
          name,
          createdByUuid: request.user?.uuid,
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

      return {};
    },
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
    },
  );

  fastify.patch(
    "/:slug",
    { schema: { params: TSlug, body: TTag } },
    async (
      request: FastifyRequest<{
        Body: ITag;
        Params: ISlug;
      }>,
      reply,
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
            },
          },
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
    },
  );

  fastify.delete(
    "/:slug",
    { schema: { params: TSlug } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      try {
        const dbRes = await tagsDbCollection.deleteOne({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!dbRes.deletedCount) {
          fastify.log.error(`Tag ${slug} not deleted, maybe not found`);
          reply.code(404);
          throw new Error("Error deleting tag");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting tag");
      }

      return {};
    },
  );
};

export default tags;
