const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYWJlZDJiNjNjZmVmZjQwMzAwZmQxZmJiZmZjN2FjYiIsIm5iZiI6MTc3ODQyNDczMy42NjUsInN1YiI6IjZhMDA5YjlkM2U5ODRiOTM2NmVjMjBhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.-dkvM50nAGc7oQjIqTfgDcGKV--lvti4DY2tRl7MHu0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

async function jwQuery(query, variables) {
  const res = await fetch("https://apis.justwatch.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

const POPULAR_QUERY = `
  query Popular($country: Country!, $language: Language!, $slugs: [String!]!) {
    popularTitles(
      country: $country
      filter: { packages: $slugs }
      first: 40
    ) {
      totalCount
      edges {
        node {
          content(country: $country, language: $language) {
            title
            posterUrl
            shortDescription
            scoring { imdbScore tmdbScore }
            genres { translation(language: $language) }
          }
          offers(country: $country, platform: WEB) {
            package { shortName clearName }
            monetizationType
          }
          objectType
          objectId
          ... on Show {
            seasons {
              content(country: $country, language: $language) {
                seasonNumber
              }
            }
          }
        }
      }
    }
  }
`;

const SEARCH_QUERY = `
  query Search($country: Country!, $language: Language!, $query: String!) {
    searchTitles(searchInput: {query: $query}, country: $country, language: $language, first: 20) {
      edges {
        node {
          content(country: $country, language: $language) {
            title
            posterUrl
            shortDescription
            scoring { imdbScore tmdbScore }
            genres { translation(language: $language) }
          }
          offers(country: $country, platform: WEB) {
            package { shortName clearName }
            monetizationType
          }
          objectType
          objectId
          ... on Show {
            seasons {
              content(country: $country, language: $language) {
                seasonNumber
              }
            }
          }
        }
      }
    }
  }
`;

function formatItem(node) {
  const c = node.content || {};
  const flatrate = (node.offers || [])
    .filter(o => o.monetizationType === "FLATRATE")
    .map(o => ({ slug: o.package.shortName, name: o.package.clearName }))
    .filter((o, i, arr) => arr.findIndex(x => x.slug === o.slug) === i);

  const seasons = (node.seasons || [])
    .map(s => s.content)
    .filter(Boolean)
    .filter(s => s.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .map(s => ({ number: s.seasonNumber, episodes: null }));

  let poster = null;
  if (c.posterUrl) {
    const p = c.posterUrl.replace("{profile}", "s332").replace("{format}", "jpg");
    poster = p.startsWith("http") ? p : "https://www.justwatch.com" + p;
  }

  return {
    id: node.objectId,
    type: node.objectType === "SHOW" ? "series" : "movie",
    title: c.title || "",
    poster,
    overview: c.shortDescription || "",
    imdbScore: c.scoring?.imdbScore || null,
    tmdbScore: c.scoring?.tmdbScore || null,
    genres: (c.genres || []).map(g => g.translation).filter(Boolean).slice(0, 2),
    providers: flatrate,
    seasons
  };
}

// Cloudflare Pages Functions export
export async function onRequest(context) {
  const { request } = context;
  
  if (request.method === "OPTIONS") {
    return new Response("", { headers: CORS });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "popular";
  const slug = url.searchParams.get("slug") || "nfx";
  const type = url.searchParams.get("type") || "all";
  const query = url.searchParams.get("query") || "";

  try {
    if (action === "search") {
      const data = await jwQuery(SEARCH_QUERY, { country: "DE", language: "de", query });
      if (data.errors) {
        return new Response(JSON.stringify({ error: data.errors[0].message, items: [] }), { headers: CORS });
      }
      const edges = data?.data?.searchTitles?.edges || [];
      const items = edges.map(e => formatItem(e.node));
      return new Response(JSON.stringify(items), { headers: CORS });
    }

    const data = await jwQuery(POPULAR_QUERY, { country: "DE", language: "de", slugs: [slug] });

    if (data.errors) {
      return new Response(JSON.stringify({ items: [], total: 0, error: data.errors[0].message }), { headers: CORS });
    }

    const edges = data?.data?.popularTitles?.edges || [];
    const total = data?.data?.popularTitles?.totalCount || 0;
    let items = edges.map(e => formatItem(e.node));

    if (type === "series") items = items.filter(i => i.type === "series");
    if (type === "movie") items = items.filter(i => i.type === "movie");

    return new Response(JSON.stringify({ items, total }), { headers: CORS });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message, items: [], total: 0 }), { status: 500, headers: CORS });
  }
}
