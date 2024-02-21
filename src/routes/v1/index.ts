import { FastifyInstance } from "fastify";
import auth from "./auth.js";

const v1 = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(auth, { prefix: "/auth" });
};

export default v1;
