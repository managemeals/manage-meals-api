import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IDbCookbook,
  IDbDeletes,
  ICookbook,
  ICookbookPatch,
  ISlug,
  TCookbook,
  TCookbookPatch,
  TCookbooks,
  TSlug,
} from "../../../types.js";
import { nanoid } from "nanoid";

const cookbooks = async (fastify: FastifyInstance, options: Object) => {
  const cookbooksDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbCookbook>("cookbooks");

  const deletesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbDeletes>("deletes");

  fastify.post(
    "/",
    { schema: { body: TCookbook, response: { 200: TSlug } } },
    async (request: FastifyRequest<{ Body: ICookbook }>, reply) => {
      const { title, description, recipeUuids } = request.body;

      const slug = `${fastify.slugify(title, {
        maxLength: 89,
      })}-${nanoid(4)}`;

      try {
        await cookbooksDbCollection.insertOne({
          uuid: crypto.randomUUID(),
          slug,
          createdByUuid: request.user?.uuid,
          createdAt: new Date(),
          updatedAt: new Date(),
          title,
          description,
          recipeUuids: recipeUuids || [],
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error creating cookbook");
      }

      return { slug };
    },
  );

  fastify.patch(
    "/:slug",
    { schema: { params: TSlug, body: TCookbookPatch } },
    async (
      request: FastifyRequest<{ Params: ISlug; Body: ICookbookPatch }>,
      reply,
    ) => {
      const { slug } = request.params;
      const { title, description, recipeUuids } = request.body;

      const $set: Record<string, unknown> = { updatedAt: new Date() };
      if (title !== undefined) $set.title = title;
      if (description !== undefined) $set.description = description;
      if (recipeUuids !== undefined) $set.recipeUuids = recipeUuids;

      try {
        const dbRes = await cookbooksDbCollection.updateOne(
          {
            slug,
            createdByUuid: request.user?.uuid,
          },
          { $set },
        );
        if (!dbRes.matchedCount) {
          fastify.log.error(`Cookbook ${slug} not found`);
          reply.code(404);
          throw new Error("Error patching cookbook");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching cookbook");
      }

      return {};
    },
  );

  fastify.get(
    "/",
    { schema: { response: { 200: TCookbooks } } },
    async (request, reply) => {
      const pipeline = [
        {
          $match: {
            createdByUuid: request.user?.uuid,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $lookup: {
            from: "recipes",
            localField: "recipeUuids",
            foreignField: "uuid",
            as: "recipes",
          },
        },
      ];

      let cookbookList: ICookbook[] = [];
      const cursor = cookbooksDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          cookbookList.push(doc as ICookbook);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting cookbooks");
      }

      return cookbookList;
    },
  );

  fastify.get(
    "/:slug",
    { schema: { params: TSlug, response: { 200: TCookbook } } },
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
            from: "recipes",
            localField: "recipeUuids",
            foreignField: "uuid",
            as: "recipes",
          },
        },
      ];

      let cookbook: ICookbook | null = null;
      const cursor = cookbooksDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          cookbook = doc as ICookbook;
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting cookbook");
      }

      if (!cookbook) {
        fastify.log.error(`Cookbook ${slug} not found`);
        reply.code(404);
        throw new Error("Error getting cookbook");
      }

      return cookbook;
    },
  );

  fastify.delete(
    "/:slug",
    { schema: { params: TSlug } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      let cookbook: ICookbook | null;
      try {
        cookbook = await cookbooksDbCollection.findOne<ICookbook>({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!cookbook) {
          fastify.log.error(`Cookbook ${slug} not found`);
          reply.code(404);
          throw new Error("Error deleting cookbook");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting cookbook");
      }

      try {
        await cookbooksDbCollection.deleteOne({
          slug,
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting cookbook");
      }

      try {
        await deletesDbCollection.insertOne({
          collection: "cookbooks",
          uuid: cookbook.uuid,
          deletedAt: new Date(),
        });
      } catch (e) {
        fastify.log.error(e);
      }

      return {};
    },
  );
};

export default cookbooks;
