import { FastifyInstance, FastifyRequest } from "fastify";
import {
    IDbRecipe,
    IRecipe,
    IRecipeFilter,
    ISlug,
    TPaginated,
    TRecipe,
    TRecipeFilter,
    TRecipes,
    TSlug,
} from "../../../../types.js";

const recipes = async (fastify: FastifyInstance, options: Object) => {
    const recipesDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbRecipe>("recipes");

    fastify.get(
        "/",
        {
            schema: {
                querystring: TRecipeFilter,
                response: { 200: TPaginated(TRecipes) },
            },
        },
        async (
            request: FastifyRequest<{ Querystring: IRecipeFilter }>,
            reply,
        ) => {
            const { page, categories, tags, sort } = request.query;
            let skipPage = page ? page - 1 : 0;
            if (skipPage < 0) {
                skipPage = 0;
            }

            const matchObj: any = {};

            if (tags && tags.length) {
                if (tags[0] === "[]") {
                    matchObj["tagUuids"] = {
                        $size: 0,
                    };
                } else if (tags[0] !== "") {
                    matchObj["tagUuids"] = {
                        $all: tags,
                    };
                }
            }

            if (categories && categories.length) {
                if (categories[0] === "[]") {
                    matchObj["categoryUuids"] = {
                        $size: 0,
                    };
                } else if (categories[0] !== "") {
                    matchObj["categoryUuids"] = {
                        $all: categories,
                    };
                }
            }

            let sortObj: any = {
                slug: 1,
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

            const recipesPipeline = [
                {
                    $match: matchObj,
                },
                {
                    $sort: sortObj,
                },
                {
                    $skip: skipPage * fastify.config.ITEMS_PER_PAGE,
                },
                {
                    $limit: fastify.config.ITEMS_PER_PAGE,
                },
                {
                    $lookup: {
                        from: "tags",
                        localField: "tagUuids",
                        foreignField: "uuid",
                        as: "tags",
                    },
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "categoryUuids",
                        foreignField: "uuid",
                        as: "categories",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "createdByUuid",
                        foreignField: "uuid",
                        as: "createdBy",
                    },
                },
                {
                    $unwind: {
                        path: "$createdBy",
                    },
                },
            ];

            let recipes: IRecipe[] = [];
            const recipesCursor =
                recipesDbCollection.aggregate(recipesPipeline);
            try {
                for await (const doc of recipesCursor) {
                    recipes.push(doc as IRecipe);
                }
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error gettings recipes");
            }

            const totalPipeline = [
                {
                    $match: matchObj,
                },
                {
                    $count: "count",
                },
            ];
            let total = 0;
            const totalCursor = recipesDbCollection.aggregate(totalPipeline);
            try {
                for await (const doc of totalCursor) {
                    total = doc.count;
                }
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error getting recipes total");
            }

            return {
                page: page || 1,
                total,
                perPage: fastify.config.ITEMS_PER_PAGE,
                data: recipes,
            };
        },
    );

    fastify.get(
        "/:slug",
        { schema: { params: TSlug, response: { 200: TRecipe } } },
        async (request: FastifyRequest<{ Params: ISlug }>, reply) => {
            const { slug } = request.params;

            const pipeline = [
                {
                    $match: {
                        slug,
                    },
                },
                {
                    $lookup: {
                        from: "tags",
                        localField: "tagUuids",
                        foreignField: "uuid",
                        as: "tags",
                    },
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "categoryUuids",
                        foreignField: "uuid",
                        as: "categories",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "createdByUuid",
                        foreignField: "uuid",
                        as: "createdBy",
                    },
                },
                {
                    $unwind: {
                        path: "$createdBy",
                    },
                },
            ];

            let recipes: IRecipe[] = [];
            const cursor = recipesDbCollection.aggregate(pipeline);
            try {
                for await (const doc of cursor) {
                    recipes.push(doc as IRecipe);
                }
            } catch (e) {
                fastify.log.error(e);
                throw new Error("Error getting recipe");
            }

            if (!recipes.length) {
                fastify.log.error(`Recipe ${slug} not found`);
                reply.code(404);
                throw new Error("Error getting recipe");
            }

            return recipes[0];
        },
    );
};

export default recipes;
