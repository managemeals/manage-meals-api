import { FastifyInstance } from "fastify";
import tags from "./tags.js";
import categories from "./categories.js";
import { JwtEmailPayload, User } from "../../../types.js";
import recipes from "./recipes.js";

const authed = async (fastify: FastifyInstance, options: Object) => {
  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("users");

  fastify.decorateRequest("user", null);

  fastify.addHook("preHandler", async (request, reply) => {
    const { authorization } = request.headers;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      reply.code(401);
      throw new Error("Missing Authorization header");
    }

    const token = authorization.substring(7);
    let jwtPayload: JwtEmailPayload;
    try {
      jwtPayload = fastify.jwt.verify<JwtEmailPayload>(
        token,
        fastify.config.ACCESS_JWT_SECRET
      );
    } catch (e) {
      fastify.log.error(e);
      reply.code(401);
      throw new Error("Invalid Authorization header");
    }

    let user: User | null;
    try {
      user = await usersDbCollection.findOne<User>({ email: jwtPayload.email });
      if (!user) {
        fastify.log.error(`User ${jwtPayload.email} not found`);
        reply.code(401);
        throw new Error("Error authorizing");
      }
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error authorizing");
    }

    request.user = user;
  });

  await fastify.register(tags, { prefix: "/tags" });
  await fastify.register(categories, { prefix: "/categories" });
  await fastify.register(recipes, { prefix: "/recipes" });
};

export default authed;
