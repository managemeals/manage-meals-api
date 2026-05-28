const SHARE_RECIPE_PATH = /^\/share\/recipes\/([^/?#]+)\/?$/;

export function parseShareRecipeSlug(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(SHARE_RECIPE_PATH);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
