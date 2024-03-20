import { createHmac } from "crypto";
import { FastifyInstance, FastifyRequest } from "fastify";

const webhooks = async (fastify: FastifyInstance, options: Object) => {
  const webhooksDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("webhooks");

  fastify.post("/gocardless", async (request: any, reply: any) => {
    const webhookSignature = request.headers["webhook-signature"];
    if (!webhookSignature) {
      reply.code(498);
      return {};
    }
    const bodyHash = createHmac(
      "sha256",
      fastify.config.GOCARDLESS_WEBHOOK_SECRET
    )
      .update(JSON.stringify(request.body))
      .digest("hex");

    if (webhookSignature !== bodyHash) {
      reply.code(498);
      return {};
    }

    try {
      await webhooksDbCollection.insertOne({
        createdAt: new Date(),
        ...request.body,
      });
    } catch (e) {
      fastify.log.error(e);
    }

    reply.code(204);
    return {};
  });
};

export default webhooks;
