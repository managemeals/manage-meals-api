import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import amqplib from "amqplib";

interface IFastifyAmqpOptions {
  url: string;
  socketOptions?: any;
}

const fastifyAmqp = fastifyPlugin(
  async (fastify: FastifyInstance, options: IFastifyAmqpOptions) => {
    const connection = await amqplib.connect(
      options.url,
      (({ url, ...o }) => o)(options)
    );

    const channel = await connection.createChannel();

    fastify
      .decorate("amqp", {
        connection,
        channel,
      })
      .addHook("onClose", async (instance: FastifyInstance) => {
        await instance.amqp.connection.close();
      });
  }
);

export { fastifyAmqp };

const amqp = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyAmqp, {
    url: fastify.config.RABBITMQ_URL,
  });
};

export default fastifyPlugin(amqp);
