import { FastifyInstance } from "fastify";
import auth from "./auth.js";
import share from "./share.js";

const unauthed = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(auth, { prefix: "/auth" });
  await fastify.register(share, { prefix: "/share" });
};

export default unauthed;
