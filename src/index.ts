import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import app from "./app.js";

const fastify = Fastify({
  logger: true,
  disableRequestLogging: true,
}).withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(app);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
