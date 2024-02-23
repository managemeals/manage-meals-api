import { FastifyInstance, FastifyRequest, FastifySchema } from "fastify";
import { Tag } from "../../../types.js";

const tags = async (fastify: FastifyInstance, options: Object) => {
  const tagsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("tags");

  const getTagsSchema: FastifySchema = {
    querystring: {
      type: "object",
      properties: {
        page: { type: "number" },
      },
    },
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            uuid: { type: "string" },
            slug: { type: "string" },
            name: { type: "string" },
          },
        },
      },
    },
  };

  interface IGetTagsQuerystring {
    page: number;
  }

  fastify.get(
    "/",
    { schema: getTagsSchema },
    async (
      request: FastifyRequest<{ Querystring: IGetTagsQuerystring }>,
      reply
    ) => {
      const page = request.query.page ? request.query.page - 1 : 0;
      const cursor = tagsDbCollection
        .find(
          {
            createdByUuid: request.user?.uuid,
          },
          { sort: { name: 1 } }
        )
        .skip(page * fastify.config.ITEMS_PER_PAGE)
        .limit(fastify.config.ITEMS_PER_PAGE);
      return cursor.toArray();
    }
  );

  const postTagsSchema: FastifySchema = {
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
      },
    },
  };

  interface IPostTagsBody {
    name: string;
  }

  fastify.post(
    "/",
    { schema: postTagsSchema },
    async (request: FastifyRequest<{ Body: IPostTagsBody }>, reply) => {
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
          throw new Error("Tag with slug already exists");
        }
        fastify.log.error(e);
        throw new Error("Error creating tag");
      }

      return {};
    }
  );

  const getTagSchema: FastifySchema = {
    params: {
      type: "object",
      properties: {
        slug: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          uuid: { type: "string" },
          slug: { type: "string" },
          name: { type: "string" },
        },
      },
    },
  };

  interface IGetTagParams {
    slug: string;
  }

  fastify.get(
    "/:slug",
    { schema: getTagSchema },
    async (request: FastifyRequest<{ Params: IGetTagParams }>, reply) => {
      return { slug: request.params.slug };
    }
  );

  const patchTagsSchema: FastifySchema = {
    params: {
      type: "object",
      properties: {
        slug: { type: "string" },
      },
    },
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
      },
    },
  };

  interface IPatchTagsBody {
    name: string;
  }

  interface IPatchTagParams {
    slug: string;
  }

  fastify.patch(
    "/:slug",
    { schema: patchTagsSchema },
    async (
      request: FastifyRequest<{
        Body: IPatchTagsBody;
        Params: IPatchTagParams;
      }>,
      reply
    ) => {
      const { slug } = request.params;
      const { name } = request.body;

      let tag: Tag | null;
      try {
        tag = await tagsDbCollection.findOne<Tag>({ slug });
        if (!tag) {
          fastify.log.error(`Tag ${slug} not found`);
          reply.code(404);
          throw new Error("Error patching tag");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching tag");
      }

      if (tag.createdByUuid !== request.user?.uuid) {
        fastify.log.error(
          `${request.user?.email} can not patch tag ${tag.slug}`
        );
        reply.code(403);
        throw new Error("Error patching tag");
      }

      try {
        await tagsDbCollection.updateOne(
          {
            slug,
          },
          {
            $set: {
              name,
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching tag");
      }

      return {};
    }
  );

  const deleteTagSchema: FastifySchema = {
    params: {
      type: "object",
      properties: {
        slug: { type: "string" },
      },
    },
  };

  interface IDeleteTagParams {
    slug: string;
  }

  fastify.delete(
    "/:slug",
    { schema: deleteTagSchema },
    async (request: FastifyRequest<{ Params: IDeleteTagParams }>, reply) => {
      const { slug } = request.params;

      let tag: Tag | null;
      try {
        tag = await tagsDbCollection.findOne<Tag>({ slug });
        if (!tag) {
          fastify.log.error(`Tag ${slug} not found`);
          reply.code(404);
          throw new Error("Error deleting tag");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting tag");
      }

      if (tag.createdByUuid !== request.user?.uuid) {
        fastify.log.error(
          `${request.user?.email} can not delete tag ${tag.slug}`
        );
        reply.code(403);
        throw new Error("Error deleting tag");
      }

      try {
        await tagsDbCollection.deleteOne({ slug });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting tag");
      }

      return {};
    }
  );
};

export default tags;
