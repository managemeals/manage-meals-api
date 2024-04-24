import amqplib from "amqplib";
import nodemailer from "nodemailer";
import { MongoClient } from "mongodb";
import axios from "axios";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";
// import Typesense from "typesense";

// AMQP setup
const connection = await amqplib.connect(process.env.RABBITMQ_URL);
const channel = await connection.createChannel();

// Mailer setup
const transporter = nodemailer.createTransport({
  pool: true,
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Mongo setup
const mongoClient = new MongoClient(process.env.MONGO_URL);
await mongoClient.connect();
const db = mongoClient.db(process.env.MONGO_DB);

// S3 setup
const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

// Defaults
const DEFAULT_RECIPE_IMG = process.env.DEFAULT_RECIPE_IMG;

// Typesense setup
// const typesenseClient = new Typesense.Client({
//   nodes: [
//     {
//       host: process.env.TYPESENSE_HOST,
//       port: process.env.TYPESENSE_PORT,
//       protocol: "http",
//     },
//   ],
//   apiKey: process.env.TYPESENSE_API_KEY,
//   connectionTimeoutSeconds: 5,
// });

// Email queue
await channel.assertQueue("email");
channel.consume("email", (msg) => {
  if (!msg) {
    console.log("No msg in email queue");
    return;
  }
  let msgObj = {};
  try {
    msgObj = JSON.parse(msg.content.toString());
    transporter.sendMail(msgObj);
  } catch (e) {
    console.log(e);
    return;
  }
  channel.ack(msg);
  console.log(`Email sent to ${msgObj.to || "N/A"}`);
});

// Recipe image queue
await channel.assertQueue("recipe_image");
channel.consume("recipe_image", async (msg) => {
  if (!msg) {
    console.log("No msg in recipe_image queue");
    return;
  }
  let msgObj = {};
  let imgUrl = DEFAULT_RECIPE_IMG;
  try {
    msgObj = JSON.parse(msg.content.toString());
    const dbRecipe = await db
      .collection("recipes")
      .findOne({ uuid: msgObj.uuid });
    if (!dbRecipe) {
      throw new Error("Recipe not found");
    }
    if (msgObj.image !== imgUrl) {
      const imgRes = await axios.get(msgObj.image, {
        responseType: "arraybuffer",
      });
      if (!imgRes) {
        throw new Error("No image");
      }
      const contentType = imgRes.headers.get("content-type") || "image/png";
      const extension = mime.getExtension(contentType);
      const filename = `mmeals/recipes/images/${msgObj.uuid}.${extension}`;
      await s3Client.send(
        new PutObjectCommand({
          ACL: "public-read",
          Bucket: process.env.S3_BUCKET,
          Key: filename,
          Body: imgRes.data,
          ContentType: contentType,
        })
      );
      imgUrl = `https://whatacdn.fra1.cdn.digitaloceanspaces.com/${filename}`;
    }
  } catch (e) {
    console.log(e);
  }
  try {
    await db.collection("recipes").updateOne(
      { uuid: msgObj.uuid },
      {
        $set: {
          updatedAt: new Date(),
          "data.image": imgUrl,
        },
      }
    );
  } catch (e) {
    console.log(e);
    return;
  }
  channel.ack(msg);
  console.log(`Image saved to recipe ${msgObj.uuid}`);
});

// User register queue
await channel.assertQueue("user_register");
channel.consume("user_register", async (msg) => {
  if (!msg) {
    console.log("No msg in user_register queue");
    return;
  }
  let msgObj = {};
  try {
    msgObj = JSON.parse(msg.content.toString());
    await db.collection("categories").insertMany([
      {
        uuid: crypto.randomUUID(),
        slug: "starter",
        name: "Starter",
        createdByUuid: msgObj.uuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        uuid: crypto.randomUUID(),
        slug: "main",
        name: "Main",
        createdByUuid: msgObj.uuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        uuid: crypto.randomUUID(),
        slug: "dessert",
        name: "Dessert",
        createdByUuid: msgObj.uuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    await db.collection("tags").insertMany([
      {
        uuid: crypto.randomUUID(),
        slug: "meat",
        name: "Meat",
        createdByUuid: msgObj.uuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        uuid: crypto.randomUUID(),
        slug: "vegan",
        name: "Vegan",
        createdByUuid: msgObj.uuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        uuid: crypto.randomUUID(),
        slug: "pasta",
        name: "Pasta",
        createdByUuid: msgObj.uuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        uuid: crypto.randomUUID(),
        slug: "fish",
        name: "Fish",
        createdByUuid: msgObj.uuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        uuid: crypto.randomUUID(),
        slug: "quick",
        name: "Quick",
        createdByUuid: msgObj.uuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  } catch (e) {
    console.log(e);
    return;
  }
  channel.ack(msg);
  console.log(`Setup complete for user register ${msgObj.uuid}`);
});

console.log("Queue consumer is running!");
