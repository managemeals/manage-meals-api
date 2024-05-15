import fastifyMultipart from "@fastify/multipart";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const multipart = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: fastify.config.MAX_FILE_SIZE_BYTES,
    },
  });
};

export default fastifyPlugin(multipart);
