import { MongoClient } from "mongodb";
import cron from "node-cron";

// Mongo setup
const mongoClient = new MongoClient(process.env.MONGO_URL);
await mongoClient.connect();
const db = mongoClient.db(process.env.MONGO_DB);
const syncsDbColl = db.collection("syncs");
const webhooksDbColl = db.collection("webhooks");
const usersDbColl = db.collection("users");

// Every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log("Starting webhook handler");

  // Get lastSyncedAt time, default to some old date to make
  // sure it runs if there is no lastSyncedAt time
  let lastSyncedAt = new Date("2012-01-01");
  try {
    const syncedDoc = await syncsDbColl.findOne({
      name: "Webhook",
    });
    if (syncedDoc) {
      lastSyncedAt = syncedDoc.lastSyncedAt;
    }
  } catch (e) {
    console.log(e);
    return;
  }

  // Get webhooks with createdAt newer than lastSyncedAt
  const webhooksCursor = webhooksDbColl.find({
    createdAt: {
      $gte: lastSyncedAt,
    },
  });

  let webhooks = [];
  try {
    webhooks = await webhooksCursor.toArray();
  } catch (e) {
    console.log(e);
    return;
  }

  console.log(`${webhooks.length} new webhooks`);

  for (const webhook of webhooks) {
    // GoCardless
    if (webhook.events) {
      const mandateCancelledEvent = webhook.events.find(
        (ev) => ev.resource_type === "mandates" && ev.action === "cancelled"
      );
      if (!mandateCancelledEvent || !mandateCancelledEvent.links.mandate) {
        continue;
      }
      console.log("Mandate cancelled:", mandateCancelledEvent);
      try {
        const dbUser = await usersDbColl.findOne({
          gcDdMandateId: mandateCancelledEvent.links.mandate,
        });
        if (!dbUser) {
          console.log(
            "User not found, gcDdMandateId:",
            mandateCancelledEvent.links.mandate
          );
          continue;
        }
      } catch (e) {
        console.log(e);
        continue;
      }
      try {
        await usersDbColl.updateOne(
          {
            gcDdMandateId: mandateCancelledEvent.links.mandate,
          },
          {
            $set: {
              updatedAt: new Date(),
              gcDdMandateId: undefined,
              gcSubscriptionId: undefined,
              subscriptionType: "FREE",
            },
          }
        );
      } catch (e) {
        console.log(e);
        continue;
      }
    }

    // PayPal
    if (
      webhook.event_type &&
      webhook.event_type === "BILLING.SUBSCRIPTION.CANCELLED"
    ) {
      console.log("PayPal subscription cancelled:", webhook.resource.id);
      try {
        const dbUser = await usersDbColl.findOne({
          ppSubscriptionId: webhook.resource.id,
        });
        if (!dbUser) {
          console.log("User not found, ppSubscriptionId:", webhook.resource.id);
          continue;
        }
      } catch (e) {
        console.log(e);
        continue;
      }
      try {
        await usersDbColl.updateOne(
          {
            ppSubscriptionId: webhook.resource.id,
          },
          {
            $set: {
              updatedAt: new Date(),
              ppSubscriptionId: undefined,
              subscriptionType: "FREE",
            },
          }
        );
      } catch (e) {
        console.log(e);
        continue;
      }
    }
  }

  // Save last synced time
  try {
    await syncsDbColl.updateOne(
      { name: "Webhook" },
      { $set: { lastSyncedAt: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    console.log(e);
    return;
  }

  console.log("Finished webhook handler");
});
