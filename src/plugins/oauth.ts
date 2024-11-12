import fastifyOauth2 from "@fastify/oauth2";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

const oauth = async (fastify: FastifyInstance, options: Object) => {
    // await fastify.register(fastifyOauth2, {
    //     name: "facebookOAuth2",
    //     scope: ["email", "public_profile"],
    //     credentials: {
    //         client: {
    //             id: fastify.config.OAUTH_FACEBOOK_CLIENT_ID,
    //             secret: fastify.config.OAUTH_FACEBOOK_CLIENT_SECRET,
    //         },
    //         // @ts-expect-error this config is there
    //         auth: fastifyOauth2.FACEBOOK_CONFIGURATION,
    //     },
    //     startRedirectPath: "/v1/auth/oauth/facebook",
    //     callbackUri: fastify.config.OAUTH_FACEBOOK_CALLBACK_URI,
    // });

    await fastify.register(fastifyOauth2, {
        name: "googleOAuth2",
        scope: ["email", "profile"],
        credentials: {
            client: {
                id: fastify.config.OAUTH_GOOGLE_CLIENT_ID,
                secret: fastify.config.OAUTH_GOOGLE_CLIENT_SECRET,
            },
            // @ts-expect-error this config is there
            auth: fastifyOauth2.GOOGLE_CONFIGURATION,
        },
        startRedirectPath: "/v1/auth/oauth/google",
        callbackUri: fastify.config.OAUTH_GOOGLE_CALLBACK_URI,
    });
};

export default fastifyPlugin(oauth);
