import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const fastifyS3 = fastifyPlugin(
  async (fastify: FastifyInstance, options: S3ClientConfig) => {
    const client = new S3Client(options);

    fastify.decorate("s3", client);
  }
);

export { fastifyS3 };

const s3 = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyS3, {
    region: fastify.config.S3_REGION,
    endpoint: fastify.config.S3_ENDPOINT,
    credentials: {
      accessKeyId: fastify.config.S3_KEY,
      secretAccessKey: fastify.config.S3_SECRET,
    },
  });
};

export default fastifyPlugin(s3);
