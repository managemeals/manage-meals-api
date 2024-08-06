import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IDbUser,
  IPayPal,
  ISubscriptionUpcomingPayment,
  TAuthorisationUrl,
  TPayPal,
  TSubscriptionUpcomingPayments,
} from "../../../types.js";

const subscriptions = async (fastify: FastifyInstance, options: Object) => {
  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbUser>("users");

  fastify.post("/", async (request, reply) => {
    if (!fastify.config.GOCARDLESS_ACCESS_TOKEN) {
      throw new Error("Subscriptions are not set up");
    }

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
        amount: fastify.config.PREMIUM_PRICE_PENNIES.toString(),
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
      if (!fastify.config.GOCARDLESS_ACCESS_TOKEN) {
        throw new Error("Subscriptions are not set up");
      }

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
    if (
      request.user?.gcSubscriptionId &&
      fastify.config.GOCARDLESS_ACCESS_TOKEN
    ) {
      try {
        await fastify.gocardless.subscriptions.cancel(
          request.user.gcSubscriptionId
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error cancelling subscription");
      }
    }

    if (request.user?.ppSubscriptionId && fastify.config.PAYPAL_APP_CLIENT_ID) {
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
        await fastify.axios.post(
          `${fastify.config.PAYPAL_API_URL}/v1/billing/subscriptions/${request.user.ppSubscriptionId}/cancel`,
          {
            reason: "Don't need Premium features",
          },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${payPalToken}`,
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error cancelling subscription");
      }
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
            ppSubscriptionId: undefined,
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
      let upcomingPayments: ISubscriptionUpcomingPayment[] = [];

      if (
        request.user?.gcSubscriptionId &&
        fastify.config.GOCARDLESS_ACCESS_TOKEN
      ) {
        try {
          const subscription: any = await fastify.gocardless.subscriptions.find(
            request.user.gcSubscriptionId
          );
          upcomingPayments = subscription.upcoming_payments.map(
            (payment: any) => ({
              chargeDate: payment.charge_date,
              amount: payment.amount,
            })
          );
        } catch (e) {
          fastify.log.error(e);
        }
      }

      if (
        request.user?.ppSubscriptionId &&
        fastify.config.PAYPAL_APP_CLIENT_ID
      ) {
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
          const res = await fastify.axios.get(
            `${fastify.config.PAYPAL_API_URL}/v1/billing/subscriptions/${request.user.ppSubscriptionId}`,
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${payPalToken}`,
              },
            }
          );
          upcomingPayments = [
            {
              chargeDate: res.data.billing_info.next_billing_time,
              amount: fastify.config.PREMIUM_PRICE_PENNIES,
            },
          ];
        } catch (e) {
          fastify.log.error(e);
        }
      }

      return upcomingPayments;
    }
  );

  fastify.post(
    "/paypal",
    {
      schema: {
        body: TPayPal,
      },
    },
    async (request: FastifyRequest<{ Body: IPayPal }>, reply) => {
      if (!fastify.config.PAYPAL_APP_CLIENT_ID) {
        throw new Error("Subscriptions are not set up");
      }

      const { subscriptionId } = request.body;

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
        const res = await fastify.axios.get(
          `${fastify.config.PAYPAL_API_URL}/v1/billing/subscriptions/${subscriptionId}`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${payPalToken}`,
            },
          }
        );
        if (!res.data.status || res.data.status !== "ACTIVE") {
          throw new Error("Subscription status is not ACTIVE");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting PayPal subscription");
      }

      try {
        await usersDbCollection.updateOne(
          { uuid: request.user?.uuid },
          {
            $set: {
              updatedAt: new Date(),
              ppSubscriptionId: subscriptionId || "",
              subscriptionType: "PREMIUM",
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
      }

      return {};
    }
  );
};

export default subscriptions;
