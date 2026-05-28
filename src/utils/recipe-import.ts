import { isAxiosError } from "axios";
import type { IRecipeData } from "../types.js";

export const RECIPE_IMPORT_UNSUPPORTED_MESSAGE =
  "We couldn't import a recipe from this URL. Make sure it links directly to a recipe page — some websites aren't supported yet.";

export const RECIPE_IMPORT_UNAVAILABLE_MESSAGE =
  "Recipe import is temporarily unavailable. Please try again in a moment.";

export function isImportableRecipeData(
  recipeJson: IRecipeData | null | undefined,
): boolean {
  if (!recipeJson || !Object.keys(recipeJson).length) {
    return false;
  }

  return Boolean(
    recipeJson.instructions ||
    recipeJson.instructions_list?.length ||
    recipeJson.ingredients?.length,
  );
}

export function getRecipeImportFailureMessage(error?: unknown): string {
  if (isAxiosError(error)) {
    const code = error.code;
    if (
      code === "ECONNREFUSED" ||
      code === "ECONNABORTED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND"
    ) {
      return RECIPE_IMPORT_UNAVAILABLE_MESSAGE;
    }

    const status = error.response?.status;
    if (status === 503 || status === 504) {
      return RECIPE_IMPORT_UNAVAILABLE_MESSAGE;
    }
  }

  return RECIPE_IMPORT_UNSUPPORTED_MESSAGE;
}
