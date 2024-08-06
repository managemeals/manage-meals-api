import { FastifyInstance, FastifyRequest } from "fastify";
import { IContact, TContact } from "../../../types.js";

const help = async (fastify: FastifyInstance, options: Object) => {
  fastify.post(
    "/contact",
    { schema: { body: TContact } },
    async (request: FastifyRequest<{ Body: IContact }>, reply) => {
      const { subject, message } = request.body;

      if (fastify.config.SMTP_DEFAULT_FROM) {
        fastify.amqp.channel.sendToQueue(
          "email",
          Buffer.from(
            JSON.stringify({
              to: fastify.config.HELP_CONTACT_EMAIL,
              from: fastify.config.SMTP_DEFAULT_FROM,
              subject: `Help - ${subject}`,
              html: `<strong>From</strong>: ${request.user?.email}<br/><strong>Message</strong>: ${message}`,
            })
          )
        );
      }

      return {};
    }
  );
};

export default help;
