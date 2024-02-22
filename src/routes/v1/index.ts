import { FastifyInstance } from "fastify";
import unauthed from "./unauthed/index.js";
import authed from "./authed/index.js";

const v1 = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(unauthed);
  await fastify.register(authed);
};

export default v1;
