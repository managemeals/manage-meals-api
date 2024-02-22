import { FastifyInstance } from "fastify";
import auth from "./auth.js";

const unauthed = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(auth, { prefix: "/auth" });
};

export default unauthed;
