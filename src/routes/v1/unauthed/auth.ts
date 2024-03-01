import { FastifyInstance, FastifyRequest } from "fastify";
import {
  IEmail,
  IEmailPass,
  IDbUser,
  IJwtEmailPayload,
  IJwtUUIDPayload,
  IToken,
  ITokenPass,
  TAccessRefresh,
  TEmail,
  TEmailPass,
  TToken,
  TTokenPass,
  TRegister,
  IRegister,
} from "../../../types.js";

const auth = async (fastify: FastifyInstance, options: Object) => {
  const usersDbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("users");

  fastify.post(
    "/email-verify",
    { schema: { body: TToken } },
    async (request: FastifyRequest<{ Body: IToken }>, reply) => {
      const { token } = request.body;

      let jwtPayload: IJwtEmailPayload;
      try {
        jwtPayload = fastify.jwt.verify<IJwtEmailPayload>(
          token,
          fastify.config.EMAIL_VERIFY_JWT_SECRET,
        );
      } catch (e) {
        fastify.log.error(e);
        reply.code(403);
        throw new Error("Error verifying token");
      }

      try {
        await usersDbCollection.updateOne(
          {
            email: jwtPayload.email,
          },
          {
            $set: {
              emailVerified: true,
            },
          },
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error verifying email");
      }

      return {};
    },
  );

  fastify.post(
    "/email-verify-resend",
    { schema: { body: TEmail } },
    async (request: FastifyRequest<{ Body: IEmail }>, reply) => {
      const { email } = request.body;

      let user: IDbUser | null;
      try {
        user = await usersDbCollection.findOne<IDbUser>({ email });
        if (!user) {
          fastify.log.error(`User ${email} not found`);
          reply.code(403);
          throw new Error("Error sending verify email");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error sending verify email");
      }

      const verifyToken = fastify.jwt.sign(
        { email },
        fastify.config.EMAIL_VERIFY_JWT_SECRET,
        { expiresIn: fastify.config.EMAIL_VERIFY_JWT_EXPIRE_SEC },
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
          }),
        ),
      );

      return {};
    },
  );

  fastify.post(
    "/forgot-password",
    { schema: { body: TEmail } },
    async (request: FastifyRequest<{ Body: IEmail }>, reply) => {
      const { email } = request.body;

      let user: IDbUser | null;
      try {
        user = await usersDbCollection.findOne<IDbUser>({ email });
        if (!user) {
          fastify.log.error(`User ${email} not found`);
          reply.code(403);
          throw new Error("Error resetting password");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error resetting password");
      }

      const resetToken = fastify.jwt.sign(
        { email: user.email },
        fastify.config.RESET_PASS_JWT_SECRET,
        { expiresIn: fastify.config.RESET_PASS_JWT_EXPIRE_SEC },
      );

      const appUrl = fastify.config.APP_URL;
      fastify.amqp.channel.sendToQueue(
        "email",
        Buffer.from(
          JSON.stringify({
            to: email,
            from: fastify.config.SMTP_DEFAULT_FROM,
            subject: "Reset password",
            html: `Hi, please <a href="${appUrl}/auth/reset-password?token=${resetToken}">click here</a> to reset your password.<br/><br/>Or visit this link: <a href="${appUrl}/auth/reset-password?token=${resetToken}">${appUrl}/auth/reset-password?token=${resetToken}</a><br/><br/>Best,<br/>ManageMeals`,
          }),
        ),
      );

      return {};
    },
  );

  fastify.post(
    "/login",
    { schema: { body: TEmailPass, response: { 200: TAccessRefresh } } },
    async (request: FastifyRequest<{ Body: IEmailPass }>, reply) => {
      const { email, password } = request.body;

      let user: IDbUser | null;
      try {
        user = await usersDbCollection.findOne<IDbUser>({ email });
        if (!user) {
          fastify.log.error(`User ${email} not found`);
          reply.code(403);
          throw new Error("Error logging in");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error logging in");
      }

      try {
        const match = await fastify.bcrypt.compare(password, user.password);
        if (!match) {
          fastify.log.error("Incorrect password");
          reply.code(403);
          throw new Error("Error logging in");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error logging in");
      }

      if (!user.emailVerified) {
        fastify.log.error(`Email ${email} not verified`);
        reply.code(403);
        throw new Error("Email not verified");
      }

      const accessToken = fastify.jwt.sign(
        { uuid: user.uuid },
        fastify.config.ACCESS_JWT_SECRET,
        { expiresIn: fastify.config.AUTH_ACCESS_TOKEN_EXPIRE_SEC },
      );
      const refreshToken = fastify.jwt.sign(
        { uuid: user.uuid },
        fastify.config.REFRESH_JWT_SECRET,
        { expiresIn: fastify.config.AUTH_REFRESH_TOKEN_EXPIRE_SEC },
      );

      return {
        accessToken,
        refreshToken,
      };
    },
  );

  fastify.post(
    "/refresh-token",
    { schema: { body: TToken, response: { 200: TAccessRefresh } } },
    async (request: FastifyRequest<{ Body: IToken }>, reply) => {
      const { token } = request.body;

      let jwtPayload: IJwtUUIDPayload;
      try {
        jwtPayload = fastify.jwt.verify<IJwtUUIDPayload>(
          token,
          fastify.config.REFRESH_JWT_SECRET,
        );
      } catch (e) {
        fastify.log.error(e);
        reply.code(403);
        throw new Error("Error refreshing token");
      }

      let user: IDbUser | null;
      try {
        user = await usersDbCollection.findOne<IDbUser>({
          uuid: jwtPayload.uuid,
        });
        if (!user) {
          fastify.log.error(`User ${jwtPayload.uuid} not found`);
          reply.code(403);
          throw new Error("Error refreshing token");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error refreshing token");
      }

      // Check if user is banned etc.
      if (!user.emailVerified) {
        fastify.log.error(`Email ${user.email} not verified`);
        reply.code(403);
        throw new Error("Email not verified");
      }

      const accessToken = fastify.jwt.sign(
        { uuid: jwtPayload.uuid },
        fastify.config.ACCESS_JWT_SECRET,
        { expiresIn: fastify.config.AUTH_ACCESS_TOKEN_EXPIRE_SEC },
      );
      const refreshToken = fastify.jwt.sign(
        { uuid: jwtPayload.uuid },
        fastify.config.REFRESH_JWT_SECRET,
        { expiresIn: fastify.config.AUTH_REFRESH_TOKEN_EXPIRE_SEC },
      );

      return {
        accessToken,
        refreshToken,
      };
    },
  );

  fastify.post(
    "/register",
    { schema: { body: TRegister } },
    async (request: FastifyRequest<{ Body: IRegister }>, reply) => {
      const { name, email, password } = request.body;

      const hash = await fastify.bcrypt.hash(password);

      try {
        await usersDbCollection.insertOne({
          uuid: crypto.randomUUID(),
          name,
          email,
          password: hash,
          createdAt: new Date(),
          emailVerified: false,
          isAdmin: false,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error registering");
      }

      const verifyToken = fastify.jwt.sign(
        { email },
        fastify.config.EMAIL_VERIFY_JWT_SECRET,
        { expiresIn: fastify.config.EMAIL_VERIFY_JWT_EXPIRE_SEC },
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
          }),
        ),
      );

      return {};
    },
  );

  fastify.post(
    "/reset-password",
    { schema: { body: TTokenPass } },
    async (request: FastifyRequest<{ Body: ITokenPass }>, reply) => {
      const { token, password } = request.body;

      let jwtPayload: IJwtEmailPayload;
      try {
        jwtPayload = fastify.jwt.verify<IJwtEmailPayload>(
          token,
          fastify.config.RESET_PASS_JWT_SECRET,
        );
      } catch (e) {
        fastify.log.error(e);
        reply.code(403);
        throw new Error("Error resetting password");
      }

      const hash = await fastify.bcrypt.hash(password);

      try {
        await usersDbCollection.updateOne(
          {
            email: jwtPayload.email,
          },
          {
            $set: {
              password: hash,
            },
          },
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error resetting password");
      }

      return {};
    },
  );
};

export default auth;
