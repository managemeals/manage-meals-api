import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IDbDeletes,
  IDbShoppingList,
  IShoppingList,
  ISlug,
  TShoppingList,
  TShoppingLists,
  TSlug,
} from "../../../../types.js";
import { nanoid } from "nanoid";

const shoppingLists = async (fastify: FastifyInstance, options: Object) => {
  const shoppingListsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbShoppingList>("shoppinglists");

  const deletesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbDeletes>("deletes");

  fastify.post(
    "/",
    { schema: { body: TShoppingList } },
    async (request: FastifyRequest<{ Body: IShoppingList }>, reply) => {
      const { title, ingredients, recipeUuids } = request.body;

      const slug = `${fastify.slugify(title, {
        maxLength: 89,
      })}-${nanoid(10)}`;

      try {
        await shoppingListsDbCollection.insertOne({
          uuid: crypto.randomUUID(),
          slug,
          createdByUuid: request.user?.uuid,
          createdAt: new Date(),
          updatedAt: new Date(),
          title,
          ingredients: ingredients || [],
          recipeUuids: recipeUuids || [],
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error creating shopping list");
      }

      return { slug };
    }
  );

  fastify.put(
    "/:slug",
    { schema: { params: TSlug, body: TShoppingList } },
    async (
      request: FastifyRequest<{ Params: ISlug; Body: IShoppingList }>,
      reply
    ) => {
      const { slug } = request.params;
      const { title, ingredients, recipeUuids } = request.body;

      try {
        const dbRes = await shoppingListsDbCollection.updateOne(
          {
            slug,
            createdByUuid: request.user?.uuid,
          },
          {
            $set: {
              updatedAt: new Date(),
              title,
              ingredients: ingredients || [],
              recipeUuids: recipeUuids || [],
            },
          }
        );
        if (!dbRes.matchedCount) {
          fastify.log.error(`Shopping list ${slug} not found`);
          reply.code(404);
          throw new Error("Error patching shopping list");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching shopping list");
      }

      return {};
    }
  );

  fastify.get(
    "/",
    { schema: { response: { 200: TShoppingLists } } },
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

      let shoppingLists: IShoppingList[] = [];
      const cursor = shoppingListsDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          shoppingLists.push(doc as IShoppingList);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting shopping lists");
      }

      return shoppingLists;
    }
  );

  fastify.get(
    "/:slug",
    { schema: { params: TSlug } },
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
        {
          $unwind: {
            path: "$recipes",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "recipes.categoryUuids",
            foreignField: "uuid",
            as: "recipes.categories",
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "recipes.tagUuids",
            foreignField: "uuid",
            as: "recipes.tags",
          },
        },
        {
          $group: {
            _id: "$_id",
            uuid: {
              $first: "$uuid",
            },
            createdByUuid: {
              $first: "$createdByUuid",
            },
            createdAt: {
              $first: "$createdAt",
            },
            updatedAt: {
              $first: "$updatedAt",
            },
            recipeUuids: {
              $first: "$recipeUuids",
            },
            title: {
              $first: "$title",
            },
            slug: {
              $first: "$slug",
            },
            ingredients: {
              $first: "$ingredients",
            },
            isMock: {
              $first: "$isMock",
            },
            recipes: {
              $push: "$recipes",
            },
          },
        },
      ];

      let shoppingLists: IShoppingList[] = [];
      const cursor = shoppingListsDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          shoppingLists.push(doc as IShoppingList);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting shopping list");
      }

      if (!shoppingLists.length) {
        fastify.log.error(`Shopping list ${slug} not found`);
        reply.code(404);
        throw new Error("Error getting shopping list");
      }

      let shoppingList = { ...shoppingLists[0] };

      shoppingList = {
        ...shoppingList,
        recipes: (shoppingList.recipes || []).filter((r) => r.uuid),
      };

      return shoppingList;
    }
  );

  fastify.delete(
    "/:slug",
    { schema: { params: TSlug } },
    async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
      const { slug } = request.params;

      let shoppingList: IShoppingList | null;
      try {
        shoppingList = await shoppingListsDbCollection.findOne<IShoppingList>({
          slug,
          createdByUuid: request.user?.uuid,
        });
        if (!shoppingList) {
          fastify.log.error(`Shopping list ${slug} not found`);
          reply.code(404);
          throw new Error("Error deleting shopping list");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting shopping list");
      }

      try {
        await shoppingListsDbCollection.deleteOne({
          slug,
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting shopping list");
      }

      try {
        await deletesDbCollection.insertOne({
          collection: "shoppinglists",
          uuid: shoppingList.uuid,
          deletedAt: new Date(),
        });
      } catch (e) {
        fastify.log.error(e);
      }

      return {};
    }
  );
};

export default shoppingLists;
