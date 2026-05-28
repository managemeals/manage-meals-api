const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
];

/** Normalize imported recipe URLs so duplicates group together in charts. */
export function normalizeCanonicalUrl(
  url: string | undefined | null,
): string | null {
  if (!url?.trim()) {
    return null;
  }

  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";

    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    parsed.hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    parsed.protocol = "https:";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";

    const search = parsed.searchParams.toString();
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

export function importHostFromRecipeData(data: {
  host?: string;
  canonical_url?: string;
}): string | null {
  if (data.host?.trim()) {
    return data.host.trim().replace(/^www\./i, "").toLowerCase();
  }

  const canonical = normalizeCanonicalUrl(data.canonical_url);
  if (!canonical) {
    return null;
  }

  try {
    return new URL(canonical).hostname;
  } catch {
    return null;
  }
}

/** Used in MongoDB aggregations; keep in sync with normalizeCanonicalUrl. */
export const mongoCanonicalKeyExpr = {
  $function: {
    body: `function (url) {
      if (!url || !String(url).trim()) return null;
      try {
        var parsed = new URL(String(url).trim());
        parsed.hash = "";
        var tracking = ${JSON.stringify(TRACKING_PARAMS)};
        tracking.forEach(function (p) { parsed.searchParams.delete(p); });
        var host = parsed.hostname.replace(/^www\\./i, "").toLowerCase();
        var path = parsed.pathname.replace(/\\/+$/, "") || "/";
        var search = parsed.searchParams.toString();
        return "https://" + host + path + (search ? "?" + search : "");
      } catch (e) {
        return String(url).trim().toLowerCase().replace(/\\/+$/, "");
      }
    }`,
    args: ["$data.canonical_url"],
    lang: "js",
  },
};

/** Used in MongoDB aggregations; keep in sync with importHostFromRecipeData. */
export const mongoImportHostExpr = {
  $function: {
    body: `function (host, url) {
      if (host && String(host).trim()) {
        return String(host).trim().replace(/^www\\./i, "").toLowerCase();
      }
      if (!url || !String(url).trim()) return null;
      try {
        var parsed = new URL(String(url).trim());
        return parsed.hostname.replace(/^www\\./i, "").toLowerCase();
      } catch (e) {
        return null;
      }
    }`,
    args: ["$data.host", "$data.canonical_url"],
    lang: "js",
  },
};
