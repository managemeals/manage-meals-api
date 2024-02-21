import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { default as bcryptLib } from "bcrypt";

interface FastifyBcryptOpts {
  saltRounds: number;
}

const fastifyBcrypt = fastifyPlugin(
  async (fastify: FastifyInstance, options: FastifyBcryptOpts) => {
    const hash = async (pwd: string) => bcryptLib.hash(pwd, options.saltRounds);

    const compare = async (data: string, encrypted: string) =>
      bcryptLib.compare(data, encrypted);

    fastify.decorate("bcrypt", {
      hash,
      compare,
    });
  }
);

export { fastifyBcrypt };

const bcrypt = async (fastify: FastifyInstance, options: Object) => {
  fastify.register(fastifyBcrypt, {
    saltRounds: fastify.config.BCRYPT_SALT_ROUNDS,
  });
};

export default fastifyPlugin(bcrypt);
