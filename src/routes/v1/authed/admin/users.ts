import { FastifyInstance, FastifyRequest } from "fastify";
import {
    IDbUser,
    ISortFilter,
    IUUID,
    TSortFilter,
    TUUID,
    TUser,
    TUsers,
} from "../../../../types.js";

const users = async (fastify: FastifyInstance, options: Object) => {
    const usersDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbUser>("users");

    fastify.get(
        "/",
        { schema: { querystring: TSortFilter, response: { 200: TUsers } } },
        async (
            request: FastifyRequest<{ Querystring: ISortFilter }>,
            reply,
        ) => {
            const { sort } = request.query;

            let sortObj: any = {
                name: 1,
            };

            if (sort) {
                switch (sort) {
                    case "createdAt":
                        sortObj = {
                            createdAt: 1,
                        };
                        break;
                    case "-createdAt":
                        sortObj = {
                            createdAt: -1,
                        };
                        break;
                }
            }

            const cursor = usersDbCollection.find({}, { sort: sortObj });
            let users = [];
            try {
                users = await cursor.toArray();
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error gettings users");
            }

            return users;
        },
    );

    fastify.get(
        "/:uuid",
        { schema: { params: TUUID, response: { 200: TUser } } },
        async (request: FastifyRequest<{ Params: IUUID }>, reply) => {
            const { uuid } = request.params;

            try {
                const user = await usersDbCollection.findOne<IDbUser>({
                    uuid,
                });
                if (!user) {
                    fastify.log.error(`User ${uuid} not found`);
                    reply.code(404);
                    throw new Error("Error getting user");
                }
                return user;
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error gettings users");
            }
        },
    );
};

export default users;
