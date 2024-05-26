import { FastifyInstance } from "fastify";
import mock from "./mock.js";

const admin = async (fastify: FastifyInstance, options: Object) => {
  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.user || !request.user.isAdmin) {
      reply.code(401);
      throw new Error("User does not have admin permissions");
    }
  });

  await fastify.register(mock, { prefix: "/mock" });
};

export default admin;
