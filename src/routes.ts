import { FastifyInstance } from "fastify";

const routes = async (fastify: FastifyInstance, options: Object) => {
  fastify.get("/", (request, reply) => {
    reply.send({ bla: fastify.config.MONGO_URL });
  });
};

export default routes;
