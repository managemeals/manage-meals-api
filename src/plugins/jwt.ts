import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { JwtPayload, SignOptions, default as jwtLib } from "jsonwebtoken";

const fastifyJwt = fastifyPlugin(
  async (fastify: FastifyInstance, options: Object) => {
    const sign = (payload: object, secret: string, opts: SignOptions): string =>
      jwtLib.sign(payload, secret, opts);

    const verify = <T>(token: string, secret: string): T & JwtPayload =>
      jwtLib.verify(token, secret) as T & JwtPayload;

    fastify.decorate("jwt", {
      sign,
      verify,
    });
  }
);

export { fastifyJwt };

const jwt = async (fastify: FastifyInstance, options: Object) => {
  fastify.register(fastifyJwt);
};

export default fastifyPlugin(jwt);
