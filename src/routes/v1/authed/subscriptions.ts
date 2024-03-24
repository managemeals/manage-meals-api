import { FastifyInstance } from "fastify";
import { IDbUser, TSubscriptionUpcomingPayments } from "../../../types.js";

const subscriptions = async (fastify: FastifyInstance, options: Object) => {
  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbUser>("users");

  fastify.post("/cancel", async (request, reply) => {
    try {
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
