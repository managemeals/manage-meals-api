import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import {
  default as slugifyLib,
  Options as SlugifyLibOptions,
} from "@sindresorhus/slugify";

export interface SlugifyOptions extends SlugifyLibOptions {
  maxLength: number;
}

const slugifyImpl = (str: string, options?: SlugifyOptions): string => {
  let slugifyStr = slugifyLib(str, options);
  if (options?.maxLength) {
    slugifyStr = slugifyStr.substring(0, options.maxLength);
  }

  return slugifyStr;
};

const fastifySlugify = fastifyPlugin(
  async (fastify: FastifyInstance, options: Object) => {
    fastify.decorate("slugify", slugifyImpl);
  }
);

export { fastifySlugify };

const slugify = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifySlugify);
};

export default fastifyPlugin(slugify);
