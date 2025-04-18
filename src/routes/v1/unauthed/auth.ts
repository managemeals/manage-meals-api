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
    TUUID,
    IGoogleUserInfo,
    IOauthTokenRes,
    TState,
    IState,
    IAccessRefresh,
} from "../../../types.js";
import { generatePassword } from "../../../utils/crypto.js";

const auth = async (fastify: FastifyInstance, options: Object) => {
    const usersDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbUser>("users");

    fastify.post(
        "/email-verify",
        { schema: { body: TToken } },
        async (request: FastifyRequest<{ Body: IToken }>, reply) => {
            if (!fastify.config.EMAIL_VERIFY_ENABLED) {
                throw new Error("Email verification is not enabled");
            }

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
                            updatedAt: new Date(),
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
            if (!fastify.config.EMAIL_VERIFY_ENABLED) {
                throw new Error("Email verification is not enabled");
            }

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
            if (!fastify.config.SMTP_HOST) {
                throw new Error("SMTP not set up");
            }

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
                const match = await fastify.bcrypt.compare(
                    password,
                    user.password,
                );
                if (!match) {
                    fastify.log.error("Incorrect password");
                    reply.code(403);
                    throw new Error("Error logging in");
                }
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error logging in");
            }

            // Check if user is allowed to login
            if (!user.emailVerified) {
                fastify.log.error(`Email ${email} not verified`);
                reply.code(403);
                throw new Error("Email not verified");
            }

            if (user.isBanned) {
                fastify.log.error(`User ${email} is banned`);
                reply.code(403);
                throw new Error("User is banned");
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

            // Check if user is allowed to refresh token
            if (!user.emailVerified) {
                fastify.log.error(`Email ${user.email} not verified`);
                reply.code(403);
                throw new Error("Email not verified");
            }

            if (user.isBanned) {
                fastify.log.error(`User ${user.email} is banned`);
                reply.code(403);
                throw new Error("User is banned");
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
        { schema: { body: TRegister, response: { 200: TUUID } } },
        async (request: FastifyRequest<{ Body: IRegister }>, reply) => {
            if (!fastify.config.USER_REGISTER_ENABLED) {
                throw new Error("User register is not enabled");
            }

            const { name, email, password } = request.body;

            const hash = await fastify.bcrypt.hash(password);
            const uuid = crypto.randomUUID();

            try {
                await usersDbCollection.insertOne({
                    uuid,
                    name,
                    email,
                    password: hash,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    emailVerified: !fastify.config.EMAIL_VERIFY_ENABLED,
                    isAdmin: false,
                    isBanned: false,
                    subscriptionType: "FREE",
                });
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error registering");
            }

            if (fastify.config.EMAIL_VERIFY_ENABLED) {
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
            }

            if (fastify.config.PROCESS_USER_POST_REGISTER) {
                fastify.amqp.channel.sendToQueue(
                    "user_register",
                    Buffer.from(
                        JSON.stringify({
                            uuid,
                        }),
                    ),
                );
            }

            return {
                uuid,
            };
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
                            updatedAt: new Date(),
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

    fastify.post(
        "/oauth/exchange-token",
        { schema: { body: TState } },
        async (request: FastifyRequest<{ Body: IState }>, reply) => {
            const { state } = request.body;

            let tokens: IAccessRefresh | null;
            try {
                const cacheVal = await fastify.redis.get(state);
                if (!cacheVal) {
                    throw new Error("State not found in cache");
                }
                tokens = JSON.parse(cacheVal);
                await fastify.redis.del(state);
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error exchanging state for tokens");
            }

            if (!tokens) {
                throw new Error("Error exchanging state for tokens");
            }

            return tokens;
        },
    );

    fastify.get(
        "/oauth/google/callback",
        {},
        async (request: FastifyRequest, reply) => {
            // Use token to get user info from Google API
            let userInfo: IGoogleUserInfo;
            try {
                const { token } =
                    (await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
                        request,
                    )) as IOauthTokenRes;

                const res = await fastify.axios.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    {
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token.access_token}`,
                        },
                    },
                );
                userInfo = res.data as IGoogleUserInfo;
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error handling Google OAuth2 callback");
            }

            // Check if user exists
            let user: IDbUser | null;
            try {
                user = await usersDbCollection.findOne<IDbUser>({
                    email: userInfo.email,
                });
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error handling Google OAuth2 callback");
            }

            // If user didn't exist, create one
            if (!user) {
                const hash = await fastify.bcrypt.hash(generatePassword(42));
                const uuid = crypto.randomUUID();

                user = {
                    uuid,
                    name: userInfo.name,
                    email: userInfo.email,
                    password: hash,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    emailVerified: true,
                    isAdmin: false,
                    isBanned: false,
                    subscriptionType: "FREE",
                };

                try {
                    await usersDbCollection.insertOne(user);
                } catch (e) {
                    fastify.log.error(e);
                    throw new Error("Error handling Google OAuth2 callback");
                }

                if (fastify.config.PROCESS_USER_POST_REGISTER) {
                    fastify.amqp.channel.sendToQueue(
                        "user_register",
                        Buffer.from(
                            JSON.stringify({
                                uuid,
                            }),
                        ),
                    );
                }
            }

            if (user.isBanned) {
                fastify.log.error(`User ${user.email} is banned`);
                reply.code(403);
                throw new Error("User is banned");
            }

            // Generate tokens and store in cache
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

            const cacheKey = `oauth_${crypto.randomUUID()}`;
            try {
                await fastify.redis.set(
                    cacheKey,
                    JSON.stringify({
                        accessToken,
                        refreshToken,
                    }),
                    "EX",
                    300, // 5 minutes
                );
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error handling Google OAuth2 callback");
            }

            return reply.redirect(
                `${fastify.config.OAUTH_FRONTEND_CALLBACK_URL}?state=${cacheKey}`,
            );
        },
    );

    // fastify.get(
    //     "/oauth/facebook/callback",
    //     {},
    //     async (request: FastifyRequest, reply) => {
    //         const token =
    //             await fastify.facebookOAuth2.getAccessTokenFromAuthorizationCodeFlow(
    //                 request,
    //             );

    //         console.log(token);

    //         return {};
    //     },
    // );
};

export default auth;
