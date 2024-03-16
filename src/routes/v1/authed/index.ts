import { FastifyInstance } from "fastify";
import tags from "./tags.js";
import categories from "./categories.js";
import recipes from "./recipes.js";
import settings from "./settings.js";
import { IDbUser, IJwtUUIDPayload } from "../../../types.js";
import admin from "./admin/index.js";
import search from "./search.js";
import help from "./help.js";

const authed = async (fastify: FastifyInstance, options: Object) => {
  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("users");

  const CACHE_PREFIX = "authed_";

  fastify.decorateRequest("user", null);

  fastify.addHook("preHandler", async (request, reply) => {
    const { authorization } = request.headers;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      reply.code(401);
      throw new Error("Missing Authorization header");
    }

    const token = authorization.substring(7);
    let jwtPayload: IJwtUUIDPayload;
    try {
      jwtPayload = fastify.jwt.verify<IJwtUUIDPayload>(
        token,
        fastify.config.ACCESS_JWT_SECRET
      );
    } catch (e) {
      fastify.log.error(e);
      reply.code(401);
      throw new Error("Invalid Authorization header");
    }

    let user: IDbUser | null;
    const cacheUser = await fastify.redis.get(
      `${CACHE_PREFIX}${jwtPayload.uuid}`
    );
    if (cacheUser) {
      user = JSON.parse(cacheUser) as IDbUser;
    } else {
      try {
        user = await usersDbCollection.findOne<IDbUser>({
          uuid: jwtPayload.uuid,
        });
        if (!user) {
          fastify.log.error(`User ${jwtPayload.uuid} not found`);
          reply.code(401);
          throw new Error("Error authorizing");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error authorizing");
      }
      try {
        await fastify.redis.set(
          `${CACHE_PREFIX}${jwtPayload.uuid}`,
          JSON.stringify(user),
          "EX",
          30
        );
      } catch (e) {
        fastify.log.error(e);
      }
    }

    request.user = user;
  });

  await fastify.register(admin, { prefix: "/admin" });
  await fastify.register(settings, { prefix: "/settings" });
  await fastify.register(tags, { prefix: "/tags" });
  await fastify.register(categories, { prefix: "/categories" });
  await fastify.register(recipes, { prefix: "/recipes" });
  await fastify.register(search, { prefix: "/search" });
  await fastify.register(help, { prefix: "/help" });
};

export default authed;
