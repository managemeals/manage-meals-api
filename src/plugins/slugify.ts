import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { default as slugifyLib } from "@sindresorhus/slugify";

const fastifySlugify = fastifyPlugin(
  async (fastify: FastifyInstance, options: Object) => {
    fastify.decorate("slugify", slugifyLib);
  }
);

export { fastifySlugify };

const slugify = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifySlugify);
};

export default fastifyPlugin(slugify);
