import { FastifyInstance } from "fastify";
import mealPlans from "./meal-plans.js";
import shoppingLists from "./shopping-lists.js";

const premium = async (fastify: FastifyInstance, options: Object) => {
  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.user || request.user.subscriptionType !== "PREMIUM") {
      reply.code(401);
      throw new Error("User does not have Premium subscription");
    }
  });

  await fastify.register(mealPlans, { prefix: "/meal-plans" });
  await fastify.register(shoppingLists, { prefix: "/shopping-lists" });
};

export default premium;
