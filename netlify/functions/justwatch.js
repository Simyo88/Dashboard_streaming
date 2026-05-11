const CORS_HEADERS = {
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
            fullPath
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
    poster = p.startsWith("http") ? p : "https://images.justwatch.com" + p;
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

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  const params = event.queryStringParameters || {};
  const action = params.action || "popular";
  const slug = params.slug || "nfx";
  const type = params.type || "all";
  const query = params.query || "";

  try {
    if (action === "search") {
      const data = await jwQuery(SEARCH_QUERY, { country: "DE", language: "de", query });
      if (data.errors) {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ error: data.errors[0].message, items: [] }) };
      }
      const edges = data?.data?.searchTitles?.edges || [];
      const items = edges.map(e => formatItem(e.node));
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(items) };
    }

    const data = await jwQuery(POPULAR_QUERY, { country: "DE", language: "de", slugs: [slug] });

    if (data.errors) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ items: [], total: 0, error: data.errors[0].message }) };
    }

    const edges = data?.data?.popularTitles?.edges || [];
    const total = data?.data?.popularTitles?.totalCount || 0;
    let items = edges.map(e => formatItem(e.node));

    if (type === "series") items = items.filter(i => i.type === "series");
    if (type === "movie") items = items.filter(i => i.type === "movie");

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ items, total })
    };

  } catch(e) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: e.message, items: [], total: 0 })
    };
  }
};
