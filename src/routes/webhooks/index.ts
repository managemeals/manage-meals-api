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

  fastify.post("/paypal", async (request: any, reply: any) => {
    let payPalToken = "";
    try {
      const res = await fastify.axios.post(
        `${fastify.config.PAYPAL_API_URL}/v1/oauth2/token`,
        "grant_type=client_credentials",
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          auth: {
            username: fastify.config.PAYPAL_APP_CLIENT_ID,
            password: fastify.config.PAYPAL_APP_SECRET,
          },
        }
      );
      payPalToken = res.data.access_token;
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error getting PayPal token");
    }

    try {
      const res = await fastify.axios.post(
        `${fastify.config.PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: request.headers["paypal-auth-algo"],
          cert_url: request.headers["paypal-cert-url"],
          transmission_id: request.headers["paypal-transmission-id"],
          transmission_sig: request.headers["paypal-transmission-sig"],
          transmission_time: request.headers["paypal-transmission-time"],
          webhook_id: request.body.id,
          webhook_event: request.body,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${payPalToken}`,
          },
        }
      );
      if (res.data.verification_status !== "SUCCESS") {
        throw new Error("Invalid webhook signature");
      }
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error verifying PayPal webhook signature");
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
