import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IDbMealPlan,
  IDbRecipe,
  IMealPlan,
  IMealPlanFilter,
  IMealPlanMealType,
  IRecipe,
  IUUID,
  TMealPlan,
  TMealPlanFilter,
  TMealPlans,
  TUUID,
} from "../../../../types.js";
import { differenceInDays, endOfDay, startOfDay } from "date-fns";

const mealPlans = async (fastify: FastifyInstance, options: Object) => {
  const mealPlansDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbMealPlan>("mealplans");

  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbRecipe>("recipes");

  fastify.get(
    "/",
    { schema: { querystring: TMealPlanFilter, response: { 200: TMealPlans } } },
    async (
      request: FastifyRequest<{ Querystring: IMealPlanFilter }>,
      reply
    ) => {
      const { dates } = request.query;

      if (dates.length !== 2) {
        reply.code(400);
        throw new Error("Date querystring must contain two dates");
      }

      const fromDate = new Date(dates[0]);
      const toDate = new Date(dates[1]);
      const daysDiff = differenceInDays(toDate, fromDate);

      if (daysDiff < 0 || daysDiff > 100) {
        reply.code(400);
        throw new Error("Invalid date format");
      }

      const pipeline = [
        {
          $match: {
            date: {
              $gte: startOfDay(fromDate),
              $lte: endOfDay(toDate),
            },
            createdByUuid: request.user?.uuid,
          },
        },
        {
          $unwind: {
            path: "$mealTypes",
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "mealTypes.tagUuids",
            foreignField: "uuid",
            as: "mealTypes.tags",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "mealTypes.categoryUuids",
            foreignField: "uuid",
            as: "mealTypes.categories",
          },
        },
        {
          $lookup: {
            from: "recipes",
            localField: "mealTypes.recipeUuid",
            foreignField: "uuid",
            as: "mealTypes.recipe",
          },
        },
        {
          $unwind: {
            path: "$mealTypes.recipe",
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "mealTypes.recipe.tagUuids",
            foreignField: "uuid",
            as: "mealTypes.recipe.tags",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "mealTypes.recipe.categoryUuids",
            foreignField: "uuid",
            as: "mealTypes.recipe.categories",
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
            date: {
              $first: "$date",
            },
            mealTypes: {
              $push: "$mealTypes",
            },
          },
        },
        {
          $sort: {
            date: 1,
          },
        },
      ];

      let mealPlans: IMealPlan[] = [];
      const cursor = mealPlansDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          mealPlans.push(doc as IMealPlan);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting meal plan");
      }

      return mealPlans;
    }
  );

  fastify.post(
    "/",
    { schema: { body: TMealPlan } },
    async (request: FastifyRequest<{ Body: IMealPlan }>, reply) => {
      const { date, mealTypes } = request.body;

      const mealTypeDuplicates = mealTypes
        .map((mtm, i) => {
          return mealTypes.find((mtf, j) => {
            return i !== j && mtm.mealType === mtf.mealType;
          });
        })
        .filter(Boolean);

      if (mealTypeDuplicates.length) {
        reply.code(400);
        throw new Error("Meal types have to be unique");
      }

      if (mealTypes.some((mt) => !mt.mealType)) {
        reply.code(400);
        throw new Error("Meal type must have a value");
      }

      const qDate = new Date(date);

      const recipeMealTypes: IMealPlanMealType[] = [];

      for (const mealType of mealTypes) {
        const matchObj: any = {
          createdByUuid: request.user?.uuid,
        };
        if (mealType.tagUuids && mealType.tagUuids.length) {
          matchObj.tagUuids = {
            $all: mealType.tagUuids,
          };
        }
        if (mealType.categoryUuids && mealType.categoryUuids.length) {
          matchObj.categoryUuids = {
            $all: mealType.categoryUuids,
          };
        }
        const recipePipeline = [
          {
            $match: matchObj,
          },
          {
            $sample: {
              size: 1,
            },
          },
        ];
        const cursor = recipesDbCollection.aggregate(recipePipeline);
        try {
          for await (const doc of cursor) {
            recipeMealTypes.push({
              ...mealType,
              recipeUuid: (doc as IRecipe).uuid,
            });
          }
        } catch (e) {
          fastify.log.error(e);
          throw new Error("Error creating meal plan");
        }
      }

      const uuid = crypto.randomUUID();
      try {
        await mealPlansDbCollection.updateOne(
          {
            date: {
              $gte: startOfDay(qDate),
              $lte: endOfDay(qDate),
            },
            createdByUuid: request.user?.uuid,
          },
          {
            $set: {
              updatedAt: new Date(),
              mealTypes: recipeMealTypes,
            },
            $setOnInsert: {
              date: new Date(qDate),
              createdByUuid: request.user?.uuid,
              createdAt: new Date(),
              uuid,
            },
          },
          { upsert: true }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error creating meal plan");
      }

      return {
        uuid,
      };
    }
  );

  fastify.patch(
    "/:uuid",
    { schema: { params: TUUID, body: TMealPlan } },
    async (
      request: FastifyRequest<{ Params: IUUID; Body: IMealPlan }>,
      reply
    ) => {
      const { uuid } = request.params;
      const { mealTypes } = request.body;

      const mealTypeDuplicates = mealTypes
        .map((mtm, i) => {
          return mealTypes.find((mtf, j) => {
            return i !== j && mtm.mealType === mtf.mealType;
          });
        })
        .filter(Boolean);

      if (mealTypeDuplicates.length) {
        reply.code(400);
        throw new Error("Meal types have to be unique");
      }

      if (mealTypes.some((mt) => !mt.mealType)) {
        reply.code(400);
        throw new Error("Meal type must have a value");
      }

      let mealPlan: IMealPlan | null;
      try {
        mealPlan = await mealPlansDbCollection.findOne<IMealPlan>({
          uuid,
          createdByUuid: request.user?.uuid,
        });
        if (!mealPlan) {
          fastify.log.error(`Meal plan ${uuid} not found`);
          reply.code(404);
          throw new Error("Error patching meal plan");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching meal plan");
      }

      const recipeMealTypes: IMealPlanMealType[] = [];

      for (const mealType of mealTypes) {
        const matchObj: any = {
          createdByUuid: request.user?.uuid,
        };
        if (mealType.tagUuids && mealType.tagUuids.length) {
          matchObj.tagUuids = {
            $all: mealType.tagUuids,
          };
        }
        if (mealType.categoryUuids && mealType.categoryUuids.length) {
          matchObj.categoryUuids = {
            $all: mealType.categoryUuids,
          };
        }
        const recipePipeline = [
          {
            $match: matchObj,
          },
          {
            $sample: {
              size: 1,
            },
          },
        ];
        const cursor = recipesDbCollection.aggregate(recipePipeline);
        try {
          for await (const doc of cursor) {
            recipeMealTypes.push({
              ...mealType,
              recipeUuid: (doc as IRecipe).uuid,
            });
          }
        } catch (e) {
          fastify.log.error(e);
          throw new Error("Error patching meal plan");
        }
      }

      const patchedMealTypes = mealPlan.mealTypes.map((mt) => {
        const patchMealType = recipeMealTypes.find(
          (pmt) => pmt.mealType === mt.mealType
        );
        if (patchMealType) {
          return patchMealType;
        }
        return mt;
      });

      const newMealTypes = recipeMealTypes.filter((mt) => {
        return !patchedMealTypes.find((pmt) => pmt.mealType === mt.mealType);
      });

      patchedMealTypes.push(...newMealTypes);

      try {
        await mealPlansDbCollection.updateOne(
          {
            uuid,
            createdByUuid: request.user?.uuid,
          },
          {
            $set: {
              updatedAt: new Date(),
              mealTypes: patchedMealTypes,
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching meal plan");
      }

      return {};
    }
  );

  fastify.get(
    "/latest",
    { schema: { response: { 200: TMealPlan } } },
    async (request, reply) => {
      const pipeline = [
        {
          $match: {
            createdByUuid: request.user?.uuid,
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
        {
          $limit: 1,
        },
      ];

      let mealPlans: IMealPlan[] = [];
      const cursor = mealPlansDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          mealPlans.push(doc as IMealPlan);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting latest meal plan");
      }

      if (!mealPlans.length) {
        fastify.log.error(`Meal plan latest not found`);
        reply.code(404);
        throw new Error("Error getting latest meal plan");
      }

      return mealPlans[0];
    }
  );

  fastify.get(
    "/:uuid",
    { schema: { params: TUUID, response: { 200: TMealPlan } } },
    async (request: FastifyRequest<{ Params: IUUID }>, reply) => {
      const { uuid } = request.params;

      const pipeline = [
        {
          $match: {
            uuid,
            createdByUuid: request.user?.uuid,
          },
        },
        {
          $unwind: {
            path: "$mealTypes",
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "mealTypes.tagUuids",
            foreignField: "uuid",
            as: "mealTypes.tags",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "mealTypes.categoryUuids",
            foreignField: "uuid",
            as: "mealTypes.categories",
          },
        },
        {
          $lookup: {
            from: "recipes",
            localField: "mealTypes.recipeUuid",
            foreignField: "uuid",
            as: "mealTypes.recipe",
          },
        },
        {
          $unwind: {
            path: "$mealTypes.recipe",
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "mealTypes.recipe.tagUuids",
            foreignField: "uuid",
            as: "mealTypes.recipe.tags",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "mealTypes.recipe.categoryUuids",
            foreignField: "uuid",
            as: "mealTypes.recipe.categories",
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
            date: {
              $first: "$date",
            },
            mealTypes: {
              $push: "$mealTypes",
            },
          },
        },
      ];

      let mealPlans: IMealPlan[] = [];
      const cursor = mealPlansDbCollection.aggregate(pipeline);
      try {
        for await (const doc of cursor) {
          mealPlans.push(doc as IMealPlan);
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting meal plan");
      }

      if (!mealPlans.length) {
        fastify.log.error(`Meal plan ${uuid} not found`);
        reply.code(404);
        throw new Error("Error getting meal plan");
      }

      return mealPlans[0];
    }
  );

  fastify.delete(
    "/:uuid",
    { schema: { params: TUUID } },
    async (request: FastifyRequest<{ Params: IUUID }>, reply) => {
      const { uuid } = request.params;

      try {
        await mealPlansDbCollection.deleteOne({
          uuid,
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting meal plan");
      }

      return {};
    }
  );
};

export default mealPlans;
