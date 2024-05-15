import { FastifyInstance, FastifyRequest } from "fastify";
import { IDbUser, IUserPatch, TUser, TUserPatch } from "../../../types.js";

const settings = async (fastify: FastifyInstance, options: Object) => {
  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection<IDbUser>("users");

  fastify.get(
    "/user",
    { schema: { response: { 200: TUser } } },
    async (request, reply) => {
      let user: IDbUser | null;
      try {
        user = await usersDbCollection.findOne<IDbUser>({
          uuid: request.user?.uuid,
        });
        if (!user) {
          fastify.log.error("Request user not found");
          reply.code(404);
          throw new Error("Error getting user");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error getting user");
      }

      return user;
    }
  );

  fastify.patch(
    "/user",
    { schema: { body: TUserPatch } },
    async (request: FastifyRequest<{ Body: IUserPatch }>, reply) => {
      const { name, email, password } = request.body;

      let user: IDbUser | null;
      try {
        user = await usersDbCollection.findOne<IDbUser>({
          uuid: request.user?.uuid,
        });
        if (!user) {
          fastify.log.error("Request user not found");
          reply.code(404);
          throw new Error("Error patching user");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching user");
      }

      const setObj: any = {
        updatedAt: new Date(),
      };

      if (name) {
        setObj["name"] = name;
      }

      if (email && email !== user.email) {
        setObj["email"] = email;
        setObj["emailVerified"] = false;
      }

      if (password) {
        const hash = await fastify.bcrypt.hash(password);
        setObj["password"] = hash;
      }

      try {
        await usersDbCollection.updateOne(
          { uuid: request.user?.uuid },
          {
            $set: setObj,
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error patching user");
      }

      if ("emailVerified" in setObj && setObj.emailVerified === false) {
        const verifyToken = fastify.jwt.sign(
          { email },
          fastify.config.EMAIL_VERIFY_JWT_SECRET,
          { expiresIn: fastify.config.EMAIL_VERIFY_JWT_EXPIRE_SEC }
        );

        const appUrl = fastify.config.APP_URL;
        fastify.amqp.channel.sendToQueue(
          "email",
          Buffer.from(
            JSON.stringify({
              to: email,
              from: fastify.config.SMTP_DEFAULT_FROM,
              subject: "Verify email",
              html: `Hi, please <a href="${appUrl}/auth/email-verify?token=${verifyToken}">click here</a> to verify your email.<br/><br/>Or visit this link: <a href="${appUrl}/auth/email-verify?token=${verifyToken}">${appUrl}/auth/email-verify?token=${verifyToken}</a><br/><br/>Best,<br/>ManageMeals`,
            })
          )
        );
      }

      return {};
    }
  );
};

export default settings;
