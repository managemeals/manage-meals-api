export interface JwtEmailPayload {
  email: string;
}

export interface User {
  uuid: string;
  createdAt: Date;
  name: string;
  email: string;
  emailVerified: boolean;
  password: string;
}

export interface Tag {
  uuid: string;
  slug: string;
  name: string;
  createdByUuid: string;
}

interface RecipeNutrient {
  calories?: string;
  carbohydrateContent?: string;
  cholesterolContent?: string;
  fatContent?: string;
  fiberContent?: string;
  proteinContent?: string;
  saturatedFatContent?: string;
  sodiumContent?: string;
  sugarContent?: string;
  unsaturatedFatContent?: string;
}

interface RecipeIngredientGroup {
  ingredients: string[];
  purpose: string;
}

interface RecipeData {
  author: string;
  canonical_url: string;
  category?: string;
  cook_time?: number;
  cuisine?: string;
  description: string;
  host: string;
  image: string;
  ingredient_groups: RecipeIngredientGroup[];
  ingredients: string[];
  instructions: string;
  instructions_list: string[];
  language: string;
  nutrients: RecipeNutrient;
  prep_time?: number;
  ratings?: number;
  site_name: string;
  title: string;
  total_time: number;
  yields: string;
}

export interface Recipe {
  uuid: string;
  slug: string;
  createdByUuid: string;
  createdAt: Date;
  categoryUuids: string[];
  tagUuids: string[];
  data: RecipeData;
}
