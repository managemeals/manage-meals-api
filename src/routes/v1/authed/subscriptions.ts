import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IDbUser,
  TAuthorisationUrl,
  TSubscriptionUpcomingPayments,
} from "../../../types.js";

const subscriptions = async (fastify: FastifyInstance, options: Object) => {
  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbUser>("users");

  fastify.post("/", async (request, reply) => {
    if (request.user?.gcSubscriptionId) {
      fastify.log.error(
        `User ${request.user?.email} already has a subscription`
      );
      reply.code(400);
      throw new Error("Error creating subscription, already subscribed");
    }

    let mandateId = request.user?.gcDdMandateId;
    if (!mandateId) {
      try {
        const mandates = await fastify.gocardless.mandates.list();
        const mandate = mandates.mandates.find(
          (m: any) => (m.metadata?.useruuid || "") === request.user?.uuid
        );
        if (!mandate) {
          throw new Error(`No mandate for UUID ${request.user?.uuid} found`);
        }
        mandateId = mandate.id;
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error creating subscription");
      }
    }

    let subscriptionId = "";
    try {
      const subscription = await fastify.gocardless.subscriptions.create({
        amount: "290",
        currency: "GBP",
        name: "ManageMeals montly",
        interval_unit: "monthly",
        links: {
          mandate: mandateId,
        },
      });
      subscriptionId = subscription.id;
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error creating subscription");
    }

    try {
      await usersDbCollection.updateOne(
        { uuid: request.user?.uuid },
        {
          $set: {
            updatedAt: new Date(),
            gcDdMandateId: mandateId || "",
            gcSubscriptionId: subscriptionId || "",
            subscriptionType: "PREMIUM",
          },
        }
      );
    } catch (e) {
      fastify.log.error(e);
    }

    return {};
  });

  fastify.get(
    "/mandate",
    { schema: { response: { 200: TAuthorisationUrl } } },
    async (request, reply) => {
      if (request.user?.gcDdMandateId) {
        fastify.log.error(
          `User ${request.user.email} already has a GC mandate`
        );
        reply.code(400);
        throw new Error("Error creating mandate, already has one");
      }

      let authorisationUrl = "";
      try {
        const billingRequest = await fastify.gocardless.billingRequests.create({
          mandate_request: {
            currency: "GBP",
            metadata: {
              useruuid: request.user?.uuid,
            },
          },
        });

        const billingRequestFlow =
          await fastify.gocardless.billingRequestFlows.create({
            redirect_uri: fastify.config.GOCARDLESS_REDIRECT_URI,
            exit_uri: fastify.config.GOCARDLESS_EXIT_URI,
            prefilled_customer: {
              email: request.user?.email,
            },
            links: {
              billing_request: billingRequest.id || "",
            },
          });

        authorisationUrl = billingRequestFlow?.authorisation_url || "";
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error creating mandate");
      }

      return {
        authorisationUrl,
      };
    }
  );

  fastify.post("/cancel", async (request, reply) => {
    try {
      if (!request.user?.gcSubscriptionId) {
        throw new Error("User has no subscription ID");
      }
      await fastify.gocardless.subscriptions.cancel(
        request.user?.gcSubscriptionId
      );
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error cancelling subscription");
    }

    try {
      await usersDbCollection.updateOne(
        {
          uuid: request.user?.uuid,
        },
        {
          $set: {
            updatedAt: new Date(),
            gcSubscriptionId: undefined,
            subscriptionType: "FREE",
          },
        }
      );
    } catch (e) {
      fastify.log.error(e);
      throw new Error("Error updating user");
    }

    return {};
  });

  fastify.get(
    "/payments",
    { schema: { response: { 200: TSubscriptionUpcomingPayments } } },
    async (request, reply) => {
      let subscription: any;
      try {
        if (!request.user?.gcSubscriptionId) {
          throw new Error("User has no subscription ID");
        }
        subscription = await fastify.gocardless.subscriptions.find(
          request.user?.gcSubscriptionId
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting subscription");
      }

      return subscription.upcoming_payments.map((payment: any) => ({
        chargeDate: payment.charge_date,
        amount: payment.amount,
      }));
    }
  );
};

export default subscriptions;
