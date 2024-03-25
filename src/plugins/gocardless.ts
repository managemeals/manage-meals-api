import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { Environments } from "gocardless-nodejs/constants.js";
import { GoCardlessClient } from "gocardless-nodejs/client.js";
import { IGoCardlessOptions, TGoCardlessEnvironment } from "../types.js";

const fastifyGocardless = fastifyPlugin(
  async (fastify: FastifyInstance, options: IGoCardlessOptions) => {
    const client = new GoCardlessClient(
      options.accessToken,
      options.environment === "LIVE" ? Environments.Live : Environments.Sandbox
    );

    fastify.decorate("gocardless", client);
  }
);

export { fastifyGocardless };

const gocardless = async (fastify: FastifyInstance, options: Object) => {
  await fastify.register(fastifyGocardless, {
    accessToken: fastify.config.GOCARDLESS_ACCESS_TOKEN,
    environment: fastify.config.GOCARDLESS_ENV as TGoCardlessEnvironment,
  });
};

export default fastifyPlugin(gocardless);
