import { FastifyInstance, FastifyRequest, FastifySchema } from "fastify";
import { JwtEmailPayload, User } from "../../../types.js";

const auth = async (fastify: FastifyInstance, options: Object) => {
  const dbCollection = fastify.mongo.client
    .db(fastify.config.MONGO_DB)
    .collection("users");

  const emailVerifySchema: FastifySchema = {
    body: {
      type: "object",
      required: ["token"],
      properties: {
        token: { type: "string" },
      },
    },
  };

  interface EmailVerifyBody {
    token: string;
  }

  fastify.post(
    "/email-verify",
    { schema: emailVerifySchema },
    async (request: FastifyRequest<{ Body: EmailVerifyBody }>, reply) => {
      const { token } = request.body;

      let jwtPayload: JwtEmailPayload;
      try {
        jwtPayload = fastify.jwt.verify<JwtEmailPayload>(
          token,
          fastify.config.EMAIL_VERIFY_JWT_SECRET
        );
      } catch (e) {
        fastify.log.error(e);
        reply.code(403);
        throw new Error("Error verifying token");
      }

      try {
        await dbCollection.updateOne(
          {
            email: jwtPayload.email,
          },
          {
            $set: {
              emailVerified: true,
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error verifying email");
      }

      return {};
    }
  );

  const emailVerifyResendSchema: FastifySchema = {
    body: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email" },
      },
    },
  };

  interface EmailVerifyResendBody {
    email: string;
  }

  fastify.post(
    "/email-verify-resend",
    { schema: emailVerifyResendSchema },
    async (request: FastifyRequest<{ Body: EmailVerifyResendBody }>, reply) => {
      const { email } = request.body;

      let user: User | null;
      try {
        user = await dbCollection.findOne<User>({ email });
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
        { expiresIn: fastify.config.EMAIL_VERIFY_JWT_EXPIRE_SEC }
      );

      const appUrl = fastify.config.APP_URL;

      try {
        await fastify.mailer.sendMail({
          to: email,
          from: fastify.config.SMTP_DEFAULT_FROM,
          subject: "Verify email",
          html: `Hi, please <a href="${appUrl}/auth/email-verify?token=${verifyToken}">click here</a> to verify your email.<br/><br/>Or visit this link: <a href="${appUrl}/auth/email-verify?token=${verifyToken}">${appUrl}/auth/email-verify?token=${verifyToken}</a><br/><br/>Best,<br/>ManageMeals`,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error sending verify email");
      }

      return {};
    }
  );

  const forgotPasswordSchema: FastifySchema = {
    body: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email" },
      },
    },
  };

  interface ForgotPasswordBody {
    email: string;
  }

  fastify.post(
    "/forgot-password",
    { schema: forgotPasswordSchema },
    async (request: FastifyRequest<{ Body: ForgotPasswordBody }>, reply) => {
      const { email } = request.body;

      let user: User | null;
      try {
        user = await dbCollection.findOne<User>({ email });
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
        { expiresIn: fastify.config.RESET_PASS_JWT_EXPIRE_SEC }
      );

      const appUrl = fastify.config.APP_URL;

      try {
        await fastify.mailer.sendMail({
          to: email,
          from: fastify.config.SMTP_DEFAULT_FROM,
          subject: "Reset password",
          html: `Hi, please <a href="${appUrl}/auth/reset-password?token=${resetToken}">click here</a> to reset your password.<br/><br/>Or visit this link: <a href="${appUrl}/auth/reset-password?token=${resetToken}">${appUrl}/auth/reset-password?token=${resetToken}</a><br/><br/>Best,<br/>ManageMeals`,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error resetting password");
      }

      return {};
    }
  );

  const loginSchema: FastifySchema = {
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
      },
    },
  };

  interface LoginBody {
    email: string;
    password: string;
  }

  fastify.post(
    "/login",
    { schema: loginSchema },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply) => {
      const { email, password } = request.body;

      let user: User | null;
      try {
        user = await dbCollection.findOne<User>({ email });
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
        if (!user.emailVerified) {
          fastify.log.error(`Email ${email} not verified`);
          reply.code(403);
          throw new Error("Email not verified");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error logging in");
      }

      const accessToken = fastify.jwt.sign(
        { email },
        fastify.config.ACCESS_JWT_SECRET,
        { expiresIn: fastify.config.AUTH_ACCESS_TOKEN_EXPIRE_SEC }
      );
      const refreshToken = fastify.jwt.sign(
        { email },
        fastify.config.REFRESH_JWT_SECRET,
        { expiresIn: fastify.config.AUTH_REFRESH_TOKEN_EXPIRE_SEC }
      );

      return {
        accessToken,
        refreshToken,
      };
    }
  );

  const refreshTokenSchema: FastifySchema = {
    body: {
      type: "object",
      required: ["token"],
      properties: {
        token: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
      },
    },
  };

  interface RefreshTokenBody {
    token: string;
  }

  fastify.post(
    "/refresh-token",
    { schema: refreshTokenSchema },
    async (request: FastifyRequest<{ Body: RefreshTokenBody }>, reply) => {
      const { token } = request.body;

      let jwtPayload: JwtEmailPayload;
      try {
        jwtPayload = fastify.jwt.verify<JwtEmailPayload>(
          token,
          fastify.config.REFRESH_JWT_SECRET
        );
      } catch (e) {
        fastify.log.error(e);
        reply.code(403);
        throw new Error("Error refreshing token");
      }

      let user: User | null;
      try {
        user = await dbCollection.findOne<User>({ email: jwtPayload.email });
        if (!user) {
          fastify.log.error(`User ${jwtPayload.email} not found`);
          reply.code(403);
          throw new Error("Error refreshing token");
        }
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error refreshing token");
      }

      // TODO: Check if user is banned

      const accessToken = fastify.jwt.sign(
        { email: jwtPayload.email },
        fastify.config.ACCESS_JWT_SECRET,
        { expiresIn: fastify.config.AUTH_ACCESS_TOKEN_EXPIRE_SEC }
      );
      const refreshToken = fastify.jwt.sign(
        { email: jwtPayload.email },
        fastify.config.REFRESH_JWT_SECRET,
        { expiresIn: fastify.config.AUTH_REFRESH_TOKEN_EXPIRE_SEC }
      );

      return {
        accessToken,
        refreshToken,
      };
    }
  );

  const registerSchema: FastifySchema = {
    body: {
      type: "object",
      required: ["name", "email", "password"],
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
        password: {
          type: "string",
          minLength: fastify.config.PASSWORD_MIN_LENGTH,
        },
      },
    },
  };

  interface RegisterBody {
    name: string;
    email: string;
    password: string;
  }

  fastify.post(
    "/register",
    { schema: registerSchema },
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply) => {
      const { name, email, password } = request.body;

      const hash = await fastify.bcrypt.hash(password);

      try {
        await dbCollection.insertOne({
          uuid: crypto.randomUUID(),
          name,
          email,
          password: hash,
          createdAt: new Date(),
          emailVerified: false,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error registering");
      }

      const verifyToken = fastify.jwt.sign(
        { email },
        fastify.config.EMAIL_VERIFY_JWT_SECRET,
        { expiresIn: fastify.config.EMAIL_VERIFY_JWT_EXPIRE_SEC }
      );

      const appUrl = fastify.config.APP_URL;

      try {
        await fastify.mailer.sendMail({
          to: email,
          from: fastify.config.SMTP_DEFAULT_FROM,
          subject: "Verify email",
          html: `Hi, please <a href="${appUrl}/auth/email-verify?token=${verifyToken}">click here</a> to verify your email.<br/><br/>Or visit this link: <a href="${appUrl}/auth/email-verify?token=${verifyToken}">${appUrl}/auth/email-verify?token=${verifyToken}</a><br/><br/>Best,<br/>ManageMeals`,
        });
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error registering");
      }

      return {};
    }
  );

  const resetPasswordSchema: FastifySchema = {
    body: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: { type: "string" },
        password: {
          type: "string",
          minLength: fastify.config.PASSWORD_MIN_LENGTH,
        },
      },
    },
  };

  interface ResetPasswordBody {
    token: string;
    password: string;
  }

  fastify.post(
    "/reset-password",
    { schema: resetPasswordSchema },
    async (request: FastifyRequest<{ Body: ResetPasswordBody }>, reply) => {
      const { token, password } = request.body;

      let jwtPayload: JwtEmailPayload;
      try {
        jwtPayload = fastify.jwt.verify<JwtEmailPayload>(
          token,
          fastify.config.RESET_PASS_JWT_SECRET
        );
      } catch (e) {
        fastify.log.error(e);
        reply.code(403);
        throw new Error("Error resetting password");
      }

      const hash = await fastify.bcrypt.hash(password);

      try {
        await dbCollection.updateOne(
          {
            email: jwtPayload.email,
          },
          {
            $set: {
              password: hash,
            },
          }
        );
      } catch (e) {
        fastify.log.error(e);
        throw new Error("Error resetting password");
      }

      return {};
    }
  );
};

export default auth;
