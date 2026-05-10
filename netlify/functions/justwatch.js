const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYWJlZDJiNjNjZmVmZjQwMzAwZmQxZmJiZmZjN2FjYiIsIm5iZiI6MTc3ODQyNDczMy42NjUsInN1YiI6IjZhMDA5YjlkM2U5ODRiOTM2NmVjMjBhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.-dkvM50nAGc7oQjIqTfgDcGKV--lvti4DY2tRl7MHu0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

async function jwQuery(query, variables) {
  const res = await fetch("https://apis.justwatch.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

async function tmdbSearch(title, year) {
  const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=de-DE${year ? "&year=" + year : ""}`;
  const res = await fetch(url, { headers: { Authorization: "Bearer " + TMDB_TOKEN } });
  const data = await res.json();
  return (data.results || [])[0] || null;
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  const params = event.queryStringParameters || {};
  const action = params.action || "popular";
  const slug = params.slug || "nfx";
  const page = parseInt(params.page || "1");
  const type = params.type || "all";
  const query = params.query || "";

  try {
    if (action === "search") {
      const gql = `
        query Search($country: Country!, $language: Language!, $query: String!) {
          searchTitles(searchInput: {query: $query}, country: $country, language: $language, first: 20) {
            edges {
              node {
                content(country: $country, language: $language) {
                  title
                  originalTitle
                  fullPath
                  posterUrl
                  releaseYear
                  scoring { imdbScore imdbVotes }
                  genres { translation }
                }
                offers(country: $country, platform: WEB) {
                  package { shortName clearName }
                  monetizationType
                }
                objectType
                objectId
              }
            }
          }
        }
      `;
      const data = await jwQuery(gql, { country: "DE", language: "de", query });
      const items = (data?.data?.searchTitles?.edges || []).map(e => formatItem(e.node));
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(items) };
    }

    // Popular titles per provider
    const contentFilter = type === "series" ? '["SHOW"]' : type === "movie" ? '["MOVIE"]' : '["SHOW","MOVIE"]';
    const gql = `
      query Popular($country: Country!, $language: Language!, $slug: [String!]!) {
        popularTitles(
          country: $country
          filter: { packages: $slug, objectTypes: ${contentFilter} }
          first: 40
          after: ""
        ) {
          totalCount
          edges {
            node {
              content(country: $country, language: $language) {
                title
                originalTitle
                fullPath
                posterUrl
                releaseYear
                shortDescription
                scoring { imdbScore imdbVotes tmdbScore }
                genres { translation }
                runtime
                productionCountries
              }
              offers(country: $country, platform: WEB) {
                package { shortName clearName }
                monetizationType
              }
              objectType
              objectId
              ... on Show {
                seenlistEntry { createdAt }
                tvShowTrackingEntry { createdAt }
                seasons { content(country: $country, language: $language) { seasonNumber episodeCount } }
              }
            }
          }
        }
      }
    `;

    const data = await jwQuery(gql, { country: "DE", language: "de", slug: [slug] });
    const edges = data?.data?.popularTitles?.edges || [];
    const total = data?.data?.popularTitles?.totalCount || 0;
    const items = edges.map(e => formatItem(e.node));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ items, total })
    };
  } catch(e) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: e.message }) };
  }
};

function formatItem(node) {
  const c = node.content || {};
  const flatrate = (node.offers || [])
    .filter(o => o.monetizationType === "FLATRATE")
    .map(o => ({ slug: o.package.shortName, name: o.package.clearName }))
    .filter((o, i, arr) => arr.findIndex(x => x.slug === o.slug) === i);

  const seasons = (node.seasons || [])
    .map(s => s.content)
    .filter(Boolean)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

  return {
    id: node.objectId,
    type: node.objectType === "SHOW" ? "series" : "movie",
    title: c.title || c.originalTitle || "",
    originalTitle: c.originalTitle || "",
    poster: c.posterUrl ? c.posterUrl.replace("{profile}", "s332").replace("{format}", "jpg") : null,
    year: c.releaseYear || null,
    overview: c.shortDescription || "",
    imdbScore: c.scoring?.imdbScore || null,
    tmdbScore: c.scoring?.tmdbScore || null,
    genres: (c.genres || []).map(g => g.translation).slice(0, 2),
    runtime: c.runtime || null,
    providers: flatrate,
    seasons: seasons.map(s => ({ number: s.seasonNumber, episodes: s.episodeCount }))
  };
}
