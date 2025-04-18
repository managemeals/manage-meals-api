import { Static, TSchema, Type } from "@sinclair/typebox";

export interface IJwtUUIDPayload {
    uuid: string;
}

export interface IJwtEmailPayload {
    email: string;
}

export type SubscriptionType = "FREE" | "PREMIUM";

export interface IDbUser {
    uuid: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    email: string;
    emailVerified: boolean;
    password: string;
    isAdmin: boolean;
    isBanned: boolean;
    gcDdMandateId?: string;
    gcSubscriptionId?: string;
    subscriptionType: SubscriptionType;
    ppSubscriptionId?: string;
}

export interface IDbMock {
    isMock: boolean;
}

export type TDbMock<T> = IDbMock & T;

export const TUser = Type.Object({
    uuid: Type.Optional(Type.String()),
    name: Type.Optional(Type.String()),
    email: Type.Optional(Type.String({ format: "email" })),
    subscriptionType: Type.Optional(Type.String()),
    isAdmin: Type.Optional(Type.Boolean()),
    createdAt: Type.Optional(Type.String({ format: "date-time" })),
});

export const TUsers = Type.Array(TUser);

export type IUser = Static<typeof TUser>;

export const TSortFilter = Type.Object({
    sort: Type.Optional(Type.String()),
});

export type ISortFilter = Static<typeof TSortFilter>;

export const TLimitFilter = Type.Object({
    limit: Type.Optional(Type.Number()),
});

export type ILimitFilter = Static<typeof TLimitFilter>;

export const TEmail = Type.Object({
    email: Type.String({ format: "email" }),
});

export type IEmail = Static<typeof TEmail>;

export const TEmailPass = Type.Object({
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 6 }),
});

export type IEmailPass = Static<typeof TEmailPass>;

export const TTokenPass = Type.Object({
    token: Type.String(),
    password: Type.String({ minLength: 6 }),
});

export type ITokenPass = Static<typeof TTokenPass>;

export const TRegister = Type.Object({
    name: Type.String(),
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 6 }),
});

export type IRegister = Static<typeof TRegister>;

export const TUserPatch = Type.Object({
    name: Type.Optional(Type.String()),
    email: Type.Optional(Type.String({ format: "email" })),
    password: Type.Optional(Type.String({ minLength: 6 })),
});

export type IUserPatch = Static<typeof TUserPatch>;

export const TAccessRefresh = Type.Object({
    accessToken: Type.String(),
    refreshToken: Type.String(),
});

export type IAccessRefresh = Static<typeof TAccessRefresh>;

export const TToken = Type.Object({
    token: Type.String(),
});

export type IToken = Static<typeof TToken>;

export const TState = Type.Object({
    state: Type.String(),
});

export type IState = Static<typeof TState>;

export const TCategory = Type.Object({
    uuid: Type.Optional(Type.String()),
    slug: Type.Optional(Type.String()),
    createdAt: Type.Optional(Type.String({ format: "date-time" })),
    updatedAt: Type.Optional(Type.String({ format: "date-time" })),
    name: Type.String(),
    createdByUuid: Type.Optional(Type.String()),
});

export const TCategories = Type.Array(TCategory);

export type ICategory = Static<typeof TCategory>;

export interface IDbCategory
    extends Omit<ICategory, "createdAt" | "updatedAt"> {
    createdAt: Date;
    updatedAt: Date;
}

export const TTag = Type.Object({
    uuid: Type.Optional(Type.String()),
    slug: Type.Optional(Type.String()),
    createdAt: Type.Optional(Type.String({ format: "date-time" })),
    updatedAt: Type.Optional(Type.String({ format: "date-time" })),
    name: Type.String(),
    createdByUuid: Type.Optional(Type.String()),
});

export const TTags = Type.Array(TTag);

export type ITag = Static<typeof TTag>;

export interface IDbTag extends Omit<ITag, "createdAt" | "updatedAt"> {
    createdAt: Date;
    updatedAt: Date;
}

export const TSlug = Type.Object({
    slug: Type.String(),
});

export type ISlug = Static<typeof TSlug>;

export const TPage = Type.Object({
    page: Type.Optional(Type.Number()),
});

export type IPage = Static<typeof TPage>;

export const TSearch = Type.Object({
    q: Type.String(), // query
    c: Type.String(), // collection
    p: Type.Number(), // page
    f: Type.Optional(Type.String()), // filter
});

export type ISearch = Static<typeof TSearch>;

export const TRecipeFilter = Type.Object({
    page: Type.Optional(Type.Number()),
    sort: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    categories: Type.Optional(Type.Array(Type.String())),
});

export type IRecipeFilter = Static<typeof TRecipeFilter>;

export const TUrl = Type.Object({
    url: Type.String({ format: "uri" }),
});

export type IUrl = Static<typeof TUrl>;

export const TCategoriesTags = Type.Object({
    tagUuids: Type.Optional(Type.Array(Type.String())),
    categoryUuids: Type.Optional(Type.Array(Type.String())),
});

export type ICategoriesTags = Static<typeof TCategoriesTags>;

export const TRecipeNutrient = Type.Object({
    calories: Type.Optional(Type.String()),
    carbohydrateContent: Type.Optional(Type.String()),
    cholesterolContent: Type.Optional(Type.String()),
    fatContent: Type.Optional(Type.String()),
    fiberContent: Type.Optional(Type.String()),
    proteinContent: Type.Optional(Type.String()),
    saturatedFatContent: Type.Optional(Type.String()),
    sodiumContent: Type.Optional(Type.String()),
    sugarContent: Type.Optional(Type.String()),
    unsaturatedFatContent: Type.Optional(Type.String()),
});

export type IRecipeNutrient = Static<typeof TRecipeNutrient>;

export const TRecipeIngredientGroup = Type.Object({
    ingredients: Type.Optional(Type.Array(Type.String())),
    purpose: Type.Optional(Type.String()),
});

export type IRecipeIngredientGroup = Static<typeof TRecipeIngredientGroup>;

export const TRecipeData = Type.Object({
    author: Type.Optional(Type.String()),
    canonical_url: Type.Optional(Type.String()),
    category: Type.Optional(Type.String()),
    cook_time: Type.Optional(Type.String()),
    cuisine: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    host: Type.Optional(Type.String()),
    image: Type.Optional(Type.String()),
    ingredient_groups: Type.Optional(Type.Array(TRecipeIngredientGroup)),
    ingredients: Type.Optional(Type.Array(Type.String())),
    instructions: Type.Optional(Type.String()),
    instructions_list: Type.Optional(Type.Array(Type.String())),
    language: Type.Optional(Type.String()),
    nutrients: Type.Optional(TRecipeNutrient),
    prep_time: Type.Optional(Type.String()),
    ratings: Type.Optional(Type.String()),
    site_name: Type.Optional(Type.String()),
    title: Type.Optional(Type.String()),
    total_time: Type.Optional(Type.String()),
    yields: Type.Optional(Type.String()),
});

export type IRecipeData = Static<typeof TRecipeData>;

export const TRecipe = Type.Object({
    uuid: Type.Optional(Type.String()),
    slug: Type.Optional(Type.String()),
    createdByUuid: Type.Optional(Type.String()),
    createdAt: Type.Optional(Type.String({ format: "date-time" })),
    updatedAt: Type.Optional(Type.String({ format: "date-time" })),
    categoryUuids: Type.Optional(Type.Array(Type.String())),
    tagUuids: Type.Optional(Type.Array(Type.String())),
    categories: Type.Optional(Type.Array(TCategory)),
    tags: Type.Optional(Type.Array(TTag)),
    rating: Type.Optional(Type.Number()),
    data: Type.Optional(TRecipeData),
    createdBy: Type.Optional(TUser),
});

export const TRecipes = Type.Array(TRecipe);

export type IRecipe = Static<typeof TRecipe>;

export interface IDbRecipe extends Omit<IRecipe, "createdAt" | "updatedAt"> {
    createdAt: Date;
    updatedAt: Date;
}

export const TPaginated = <T extends TSchema>(T: T) =>
    Type.Object({
        page: Type.Number(),
        total: Type.Number(),
        perPage: Type.Number(),
        data: T,
    });

export const TContact = Type.Object({
    subject: Type.String(),
    message: Type.String(),
});

export type IContact = Static<typeof TContact>;

export type TGoCardlessEnvironment = "LIVE" | "SANDBOX";

export interface IGoCardlessOptions {
    accessToken: string;
    environment: TGoCardlessEnvironment;
}

export const TUUID = Type.Object({
    uuid: Type.String(),
});

export type IUUID = Static<typeof TUUID>;

export const TAuthorisationUrl = Type.Object({
    authorisationUrl: Type.String(),
});

export type IAuthorisationUrl = Static<typeof TAuthorisationUrl>;

export interface IDbDeletes {
    collection: string;
    uuid: string | undefined;
    deletedAt: Date;
}

export const TSubscriptionUpcomingPayment = Type.Object({
    chargeDate: Type.String({ format: "date-time" }),
    amount: Type.Number(),
});

export const TSubscriptionUpcomingPayments = Type.Array(
    TSubscriptionUpcomingPayment,
);

export type ISubscriptionUpcomingPayment = Static<
    typeof TSubscriptionUpcomingPayment
>;

export interface IGlobalConfig {
    isLbShutdown: boolean;
}

export const TMealPlanMealType = Type.Object({
    mealType: Type.String(),
    categoryUuids: Type.Array(Type.String()),
    tagUuids: Type.Array(Type.String()),
    categories: Type.Optional(Type.Array(TCategory)),
    tags: Type.Optional(Type.Array(TTag)),
    recipe: Type.Optional(TRecipe),
    recipeUuid: Type.Optional(Type.String()),
});

export type IMealPlanMealType = Static<typeof TMealPlanMealType>;

export const TMealPlan = Type.Object({
    uuid: Type.Optional(Type.String()),
    createdAt: Type.Optional(Type.String({ format: "date-time" })),
    updatedAt: Type.Optional(Type.String({ format: "date-time" })),
    createdByUuid: Type.Optional(Type.String()),
    date: Type.String({ format: "date-time" }),
    mealTypes: Type.Array(TMealPlanMealType),
});

export const TMealPlans = Type.Array(TMealPlan);

export type IMealPlan = Static<typeof TMealPlan>;

export interface IDbMealPlan
    extends Omit<IMealPlan, "createdAt" | "updatedAt" | "date"> {
    createdAt: Date;
    updatedAt: Date;
    date: Date;
}

export const TMealPlanFilter = Type.Object({
    dates: Type.Array(Type.String({ format: "date-time" })),
});

export type IMealPlanFilter = Static<typeof TMealPlanFilter>;

export const TShoppingList = Type.Object({
    uuid: Type.Optional(Type.String()),
    slug: Type.Optional(Type.String()),
    createdAt: Type.Optional(Type.String({ format: "date-time" })),
    updatedAt: Type.Optional(Type.String({ format: "date-time" })),
    createdByUuid: Type.Optional(Type.String()),
    title: Type.String(),
    ingredients: Type.Optional(Type.Array(Type.String())),
    recipeUuids: Type.Optional(Type.Array(Type.String())),
    recipes: Type.Optional(Type.Array(TRecipe)),
});

export const TShoppingLists = Type.Array(TShoppingList);

export type IShoppingList = Static<typeof TShoppingList>;

export interface IDbShoppingList
    extends Omit<IShoppingList, "createdAt" | "updatedAt"> {
    createdAt: Date;
    updatedAt: Date;
}

export const TAdminStatus = Type.Object({
    totalUsers: Type.Number(),
    totalRecipes: Type.Number(),
    totalCategories: Type.Number(),
    totalTags: Type.Number(),
    totalShoppingLists: Type.Number(),
    totalMealPlans: Type.Number(),
    totalShareRecipes: Type.Number(),
});

export const TShareRecipe = Type.Object({
    uuid: Type.Optional(Type.String()),
    slug: Type.Optional(Type.String()),
    createdAt: Type.Optional(Type.String({ format: "date-time" })),
    updatedAt: Type.Optional(Type.String({ format: "date-time" })),
    createdByUuid: Type.Optional(Type.String()),
    recipe: Type.Optional(TRecipe),
    recipeUuid: Type.String(),
});

export const TShareRecipes = Type.Array(TShareRecipe);

export type IShareRecipe = Static<typeof TShareRecipe>;

export interface IDbShareRecipe
    extends Omit<IShareRecipe, "createdAt" | "updatedAt"> {
    createdAt: Date;
    updatedAt: Date;
}

export const TPayPal = Type.Object({
    subscriptionId: Type.String(),
});

export type IPayPal = Static<typeof TPayPal>;

export interface IGoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
}

export interface IOauthToken {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token: string;
}

export interface IOauthTokenRes {
    token: IOauthToken;
}

export const TPopularRecipe = Type.Object({
    count: Type.Number(),
    url: Type.String(),
    recipe: TRecipe,
});

export const TPopularRecipes = Type.Array(TPopularRecipe);

export type IPopularRecipe = Static<typeof TPopularRecipe>;
