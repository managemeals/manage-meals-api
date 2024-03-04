import { Static, TSchema, Type } from "@sinclair/typebox";

export interface IJwtUUIDPayload {
  uuid: string;
}

export interface IJwtEmailPayload {
  email: string;
}

export interface IDbUser {
  uuid: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  emailVerified: boolean;
  password: string;
  isAdmin: boolean;
}

export interface IDbMock {
  isMock: boolean;
}

export type TDbMock<T> = IDbMock & T;

export const TUser = Type.Object({
  uuid: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  email: Type.Optional(Type.String({ format: "email" })),
});

export type IUser = Static<typeof TUser>;

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

export const TSlug = Type.Object({
  slug: Type.String(),
});

export type ISlug = Static<typeof TSlug>;

export const TPage = Type.Object({
  page: Type.Optional(Type.Number()),
});

export type IPage = Static<typeof TPage>;

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
});

export const TRecipes = Type.Array(TRecipe);

export type IRecipe = Static<typeof TRecipe>;

export const TPaginated = <T extends TSchema>(T: T) =>
  Type.Object({
    page: Type.Number(),
    total: Type.Number(),
    data: T,
  });
