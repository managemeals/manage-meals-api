import { FastifyInstance } from "fastify";
import {
    IDbCategory,
    IDbDeletes,
    IDbMealPlan,
    IDbRecipe,
    IDbShoppingList,
    IDbTag,
    IDbUser,
    TDbMock,
} from "../../../../types.js";
import { faker } from "@faker-js/faker";
import { random, sample, sampleSize } from "lodash-es";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";

const mock = async (fastify: FastifyInstance, options: Object) => {
    const tagsDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbTag>("tags");

    const categoriesDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbCategory>("categories");

    const usersDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbUser>("users");

    const recipesDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbRecipe>("recipes");

    const deletesDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbDeletes>("deletes");

    const mealPlansDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbMealPlan>("mealplans");

    const shoppingListsDbCollection = fastify.mongo.client
        .db(fastify.config.MONGO_DB)
        .collection<IDbShoppingList>("shoppinglists");

    fastify.post("/", async (request, reply) => {
        const today = new Date();

        // Users
        const users: TDbMock<IDbUser>[] = [];
        const hash = await fastify.bcrypt.hash("secret");
        users.push({
            uuid: crypto.randomUUID(),
            name: "Demo",
            email: "demo@example.com",
            password: hash,
            createdAt: faker.date.past({ years: 3 }),
            updatedAt: today,
            emailVerified: true,
            isAdmin: false,
            isBanned: false,
            isMock: true,
            subscriptionType: "FREE",
        });
        if (fastify.config.MULTIPLE_MOCK_USERS) {
            for (let i = 0; i < 100; i++) {
                users.push({
                    uuid: crypto.randomUUID(),
                    name: faker.person.fullName(),
                    email: faker.internet.email(),
                    password: hash,
                    createdAt: faker.date.past({ years: 3 }),
                    updatedAt: today,
                    emailVerified: true,
                    isAdmin: false,
                    isBanned: false,
                    isMock: true,
                    subscriptionType: "FREE",
                });
            }
        }
        try {
            await usersDbCollection.insertMany(users);
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error creating user mocks");
        }

        // Tags
        const mockTags = [
            "Vegan",
            "Chicken",
            "Steak",
            "Fish",
            "Juice",
            "Pulses",
            "Italian",
            "Fast food",
            "Healthy",
            "Weekend",
            "Weeknight",
            "Easy",
            "Quick",
            "Hard",
        ];
        const tags: TDbMock<IDbTag>[] = [];
        for (let i = 0; i < mockTags.length; i++) {
            tags.push({
                uuid: crypto.randomUUID(),
                slug: fastify.slugify(mockTags[i]),
                createdAt: faker.date.past({ years: 3 }),
                updatedAt: today,
                name: mockTags[i],
                createdByUuid: sample(users)?.uuid || "",
                isMock: true,
            });
        }
        try {
            await tagsDbCollection.insertMany(tags);
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error creating tag mocks");
        }

        // Categories
        const mockCategories = [
            "Starter",
            "Main",
            "Dessert",
            "Brunch",
            "Side dish",
            "Sauce",
            "Drink",
            "Breakfast",
        ];
        const categories: TDbMock<IDbCategory>[] = [];
        for (let i = 0; i < mockCategories.length; i++) {
            categories.push({
                uuid: crypto.randomUUID(),
                slug: fastify.slugify(mockCategories[i]),
                createdAt: faker.date.past({ years: 3 }),
                updatedAt: today,
                name: mockCategories[i],
                createdByUuid: sample(users)?.uuid || "",
                isMock: true,
            });
        }
        try {
            await categoriesDbCollection.insertMany(categories);
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error creating category mocks");
        }

        // Recipes
        const maxRecipes = 1000;
        const mockRecipesRes = await fetch(
            "https://whatacdn.fra1.cdn.digitaloceanspaces.com/mmeals/mocks/recipes_raw_nosource_ar.json",
        );
        const mockRecipes: any = await mockRecipesRes.json();
        const recipes: TDbMock<IDbRecipe>[] = [];
        let currIndex = 0;
        for (let key in mockRecipes) {
            if (currIndex >= maxRecipes) {
                break;
            }
            const currRecipe = mockRecipes[key];
            if (!currRecipe || !currRecipe.title) {
                continue;
            }
            const recipeingredients = (currRecipe.ingredients || [])
                .map((ingr: string) => ingr.replace("ADVERTISEMENT", "").trim())
                .filter((ingr: string) => ingr !== "");
            recipes.push({
                uuid: crypto.randomUUID(),
                slug: `${fastify.slugify(currRecipe.title)}-${nanoid(6)}`,
                createdByUuid: sample(users)?.uuid || "",
                createdAt: faker.date.past({ years: 3 }),
                updatedAt: today,
                categoryUuids: sampleSize(categories, random(1, 4)).map(
                    (c) => c.uuid || "",
                ),
                tagUuids: sampleSize(tags, random(1, 6)).map(
                    (t) => t.uuid || "",
                ),
                rating: random(0, 5),
                data: {
                    author: faker.person.fullName(),
                    canonical_url: `https://www.bbcgoodfood.com/${faker.number.int({ min: 1, max: 10 })}`,
                    category: sample(mockCategories),
                    cook_time: faker.string.numeric(2),
                    cuisine: faker.location.country(),
                    description: faker.lorem.paragraphs(),
                    host: "bbcgoodfood",
                    image: faker.image.urlPicsumPhotos({
                        width: 1000,
                        height: 1000,
                    }),
                    ingredient_groups: [
                        {
                            ingredients: recipeingredients,
                            purpose: faker.lorem.sentence(),
                        },
                    ],
                    ingredients: recipeingredients,
                    instructions: currRecipe.instructions,
                    instructions_list: (currRecipe.instructions || "")
                        .split("\n")
                        .filter((instr: string) => instr !== ""),
                    language: "en",
                    nutrients: {
                        calories: "808 kcal",
                        carbohydrateContent: "44 g",
                        cholesterolContent: "235 mg",
                        fatContent: "56 g",
                        fiberContent: "2 g",
                        proteinContent: "34 g",
                        saturatedFatContent: "27 g",
                        sodiumContent: "736 mg",
                        sugarContent: "2 g",
                        unsaturatedFatContent: "1 g",
                    },
                    prep_time: faker.string.numeric(2),
                    ratings: faker.string.numeric(1),
                    site_name: "bbcgoodfood",
                    title: currRecipe.title,
                    total_time: faker.string.numeric(2),
                    yields: `${faker.string.numeric(1)} servings`,
                },
                isMock: true,
            });
            currIndex++;
        }
        try {
            await recipesDbCollection.insertMany(recipes);
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error creating recipe mocks");
        }

        // Meal plans
        const mealPlans: TDbMock<IDbMealPlan>[] = [];
        for (let i = 0; i < 2000; i++) {
            mealPlans.push({
                uuid: crypto.randomUUID(),
                createdAt: faker.date.past({ years: 3 }),
                updatedAt: today,
                date: addDays(today, i),
                createdByUuid: sample(users)?.uuid || "",
                mealTypes: [
                    {
                        mealType: "Lunch",
                        categoryUuids: sampleSize(categories, random(1, 2)).map(
                            (c) => c.uuid || "",
                        ),
                        tagUuids: sampleSize(tags, random(1, 3)).map(
                            (t) => t.uuid || "",
                        ),
                        recipeUuid: sample(recipes)?.uuid || "",
                    },
                    {
                        mealType: "Dinner",
                        categoryUuids: sampleSize(categories, random(1, 2)).map(
                            (c) => c.uuid || "",
                        ),
                        tagUuids: sampleSize(tags, random(1, 3)).map(
                            (t) => t.uuid || "",
                        ),
                        recipeUuid: sample(recipes)?.uuid || "",
                    },
                ],
                isMock: true,
            });
        }
        try {
            await mealPlansDbCollection.insertMany(mealPlans);
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error creating meal plan mocks");
        }

        // Shopping lists
        const shoppingLists: TDbMock<IDbShoppingList>[] = [];
        for (let i = 0; i < 20; i++) {
            const title = `Shopping List ${i + 1}`;
            shoppingLists.push({
                uuid: crypto.randomUUID(),
                createdAt: faker.date.past({ years: 3 }),
                updatedAt: faker.date.past({ years: 3 }),
                createdByUuid: sample(users)?.uuid || "",
                recipeUuids: sampleSize(recipes, random(1, 4)).map(
                    (r) => r.uuid || "",
                ),
                title,
                slug: `${fastify.slugify(title)}-${nanoid(10)}`,
                ingredients: sampleSize(recipes, random(1, 4))
                    .map((r) => r.data?.ingredients || [])
                    .flat(),
                isMock: true,
            });
        }
        try {
            await shoppingListsDbCollection.insertMany(shoppingLists);
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error creating shopping list mocks");
        }

        return {};
    });

    fastify.delete("/", async (request, reply) => {
        const today = new Date();

        // Users
        try {
            await usersDbCollection.deleteMany({
                isMock: true,
            });
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error deleting user mocks");
        }

        // Tags
        try {
            await tagsDbCollection.deleteMany({
                isMock: true,
            });
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error deleting tag mocks");
        }

        // Categories
        try {
            await categoriesDbCollection.deleteMany({
                isMock: true,
            });
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error deleting category mocks");
        }

        // Recipes
        const deleteCursor = recipesDbCollection.find({
            isMock: true,
        });
        let deleteRecipes = [];
        try {
            deleteRecipes = await deleteCursor.toArray();
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error gettings deleting recipe mocks");
        }

        try {
            await deletesDbCollection.insertMany(
                deleteRecipes.map((r) => ({
                    collection: "recipes",
                    uuid: r.uuid,
                    deletedAt: today,
                })),
            );
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error inserting deleting recipe mocks");
        }

        try {
            await recipesDbCollection.deleteMany({
                isMock: true,
            });
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error deleting recipe mocks");
        }

        // Meal plans
        try {
            await mealPlansDbCollection.deleteMany({
                isMock: true,
            });
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error deleting meal plan mocks");
        }

        // Shopping lists
        try {
            await shoppingListsDbCollection.deleteMany({
                isMock: true,
            });
        } catch (e) {
            fastify.log.error(e);
            throw new Error("Error deleting shopping list mocks");
        }

        return {};
    });
};

export default mock;
