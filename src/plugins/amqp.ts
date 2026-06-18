import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import amqplib from "amqplib";

interface IFastifyAmqpOptions {
  url: string;
  socketOptions?: any;
}

const RECONNECT_DELAY_MS = 5000;

const fastifyAmqp = fastifyPlugin(
  async (fastify: FastifyInstance, options: IFastifyAmqpOptions) => {
    const state: {
      connection: amqplib.Connection | null;
      channel: amqplib.Channel | null;
    } = {
      connection: null,
      channel: null,
    };

    async function connect() {
      try {
        const connection = await amqplib.connect(
          options.url,
          (({ url, ...o }) => o)(options),
        );
        state.connection = connection;

        connection.on("error", (err) => {
          fastify.log.error({ err }, "AMQP connection error");
        });
        connection.on("close", () => {
          fastify.log.warn("AMQP connection closed, reconnecting...");
          state.connection = null;
          state.channel = null;
          setTimeout(connect, RECONNECT_DELAY_MS);
        });

        await createChannel(connection);
      } catch (err) {
        fastify.log.error({ err }, "AMQP connect failed, retrying...");
        setTimeout(connect, RECONNECT_DELAY_MS);
      }
    }

    async function createChannel(connection: amqplib.Connection) {
      try {
        const channel = await connection.createChannel();
        state.channel = channel;

        channel.on("error", (err) => {
          fastify.log.error({ err }, "AMQP channel error");
        });
        channel.on("close", () => {
          fastify.log.warn("AMQP channel closed, recreating...");
          state.channel = null;
          if (state.connection) {
            setTimeout(
              () => createChannel(state.connection!),
              RECONNECT_DELAY_MS,
            );
          }
        });
      } catch (err) {
        fastify.log.error({ err }, "AMQP channel creation failed, retrying...");
        setTimeout(() => createChannel(connection), RECONNECT_DELAY_MS);
      }
    }

    await connect();

    fastify
      .decorate("amqp", {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        get connection() {
          return state.connection!;
        },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        get channel() {
          return state.channel!;
        },
      })
      .addHook("onClose", async () => {
        if (state.connection) {
          await state.connection.close();
        }
      });
  },
);

export { fastifyAmqp };

const amqp = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyAmqp, {
    url: fastify.config.RABBITMQ_URL,
  });
};

export default fastifyPlugin(amqp);
