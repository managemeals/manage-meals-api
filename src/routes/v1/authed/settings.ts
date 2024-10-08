import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IDbCategory,
  IDbDeletes,
  IDbMealPlan,
  IDbRecipe,
  IDbShareRecipe,
  IDbShoppingList,
  IDbTag,
  IDbUser,
  IUserPatch,
  TUser,
  TUserPatch,
} from "../../../types.js";

const settings = async (fastify: FastifyInstance, options: Object) => {
  const tagsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbTag>("tags");

  const categoriesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbCategory>("categories");

  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbUser>("users");

  const recipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbRecipe>("recipes");

  const deletesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbDeletes>("deletes");

  const mealPlansDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbMealPlan>("mealplans");

  const shoppingListsDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbShoppingList>("shoppinglists");

  const shareRecipesDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbShareRecipe>("sharerecipes");

  fastify.get(
    "/user",
    { schema: { response: { 200: TUser } } },
    async (request, reply) => {
      let user: IDbUser | null;
      try {
        user = await usersDbCollection.findOne<IDbUser>({
          uuid: request.user?.uuid,
        });
        if (!user) {
          fastify.log.error("Request user not found");
          reply.code(404);
          throw new Error("Error getting user");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting user");
      }

      return user;
    }
  );

  fastify.patch(
    "/user",
    { schema: { body: TUserPatch } },
    async (request: FastifyRequest<{ Body: IUserPatch }>, reply) => {
      const { name, email, password } = request.body;

      let user: IDbUser | null;
      try {
        user = await usersDbCollection.findOne<IDbUser>({
          uuid: request.user?.uuid,
        });
        if (!user) {
          fastify.log.error("Request user not found");
          reply.code(404);
          throw new Error("Error patching user");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching user");
      }

      const setObj: any = {
        updatedAt: new Date(),
      };

      if (name) {
        setObj["name"] = name;
      }

      if (email && email !== user.email) {
        setObj["email"] = email;
        setObj["emailVerified"] = !fastify.config.EMAIL_VERIFY_ENABLED;
      }

      if (password) {
        const hash = await fastify.bcrypt.hash(password);
        setObj["password"] = hash;
      }

      try {
        await usersDbCollection.updateOne(
          { uuid: request.user?.uuid },
          {
            $set: setObj,
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching user");
      }

      if (
        "emailVerified" in setObj &&
        setObj.emailVerified === false &&
        fastify.config.EMAIL_VERIFY_ENABLED
      ) {
        const verifyToken = fastify.jwt.sign(
          { email },
          fastify.config.EMAIL_VERIFY_JWT_SECRET,
          { expiresIn: fastify.config.EMAIL_VERIFY_JWT_EXPIRE_SEC }
        );

        const appUrl = fastify.config.APP_URL;
        fastify.amqp.channel.sendToQueue(
          "email",
          Buffer.from(
            JSON.stringify({
              to: email,
              from: fastify.config.SMTP_DEFAULT_FROM,
              subject: "Verify email",
              html: `Hi, please <a href="${appUrl}/auth/email-verify?token=${verifyToken}">click here</a> to verify your email.<br/><br/>Or visit this link: <a href="${appUrl}/auth/email-verify?token=${verifyToken}">${appUrl}/auth/email-verify?token=${verifyToken}</a><br/><br/>Best,<br/>ManageMeals`,
            })
          )
        );
      }

      return {};
    }
  );

  fastify.delete(
    "/user",
    async (request: FastifyRequest<{ Body: IUserPatch }>, reply) => {
      const today = new Date();

      // Tags
      try {
        await tagsDbCollection.deleteMany({
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting tags");
      }

      // Categories
      try {
        await categoriesDbCollection.deleteMany({
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting categories");
      }

      // Recipes
      const deleteCursor = recipesDbCollection.find({
        createdByUuid: request.user?.uuid,
      });
      let deleteRecipes = [];
      try {
        deleteRecipes = await deleteCursor.toArray();
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error gettings delete recipes");
      }

      if (deleteRecipes.length) {
        try {
          await deletesDbCollection.insertMany(
            deleteRecipes.map((r) => ({
              collection: "recipes",
              uuid: r.uuid,
              deletedAt: today,
            }))
          );
        } catch (e) {
          fastify.log.error(e);
          throw new Error("Error inserting deleted recipes");
        }
      }

      try {
        await recipesDbCollection.deleteMany({
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting recipes");
      }

      // Meal plans
      try {
        await mealPlansDbCollection.deleteMany({
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting meal plans");
      }

      // Shopping lists
      try {
        await shoppingListsDbCollection.deleteMany({
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting shopping lists");
      }

      // Recipe shares
      try {
        await shareRecipesDbCollection.deleteMany({
          createdByUuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting recipe shares");
      }

      // User
      try {
        await usersDbCollection.deleteOne({
          uuid: request.user?.uuid,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error deleting user");
      }
    }
  );
};

export default settings;
