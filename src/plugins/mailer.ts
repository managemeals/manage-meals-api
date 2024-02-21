import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import nodemailer from "nodemailer";
import SMTPPool from "nodemailer/lib/smtp-pool/index.js";

const fastifyMailer = fastifyPlugin(
  async (fastify: FastifyInstance, options: SMTPPool.Options) => {
    const transporter = nodemailer.createTransport(options);

    fastify
      .decorate("mailer", transporter)
      .addHook("onClose", (instance: FastifyInstance) => {
        instance.mailer.close();
      });
  }
);

export { fastifyMailer };

const mailer = async (fastify: FastifyInstance, options: Object) => {
  fastify.register(fastifyMailer, {
    pool: true,
    host: fastify.config.SMTP_HOST,
    port: fastify.config.SMTP_PORT,
    secure: false,
    auth: {
      user: fastify.config.SMTP_USER,
      pass: fastify.config.SMTP_PASS,
    },
  });
};

export default fastifyPlugin(mailer);
