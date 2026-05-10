exports.handler = async function(event, context) {
  const providers = [
    { name: "Netflix",      slug: "nfx" },
    { name: "Amazon Prime", slug: "amp" },
    { name: "Disney+",      slug: "dnp" },
    { name: "Apple TV+",    slug: "atp" },
    { name: "WOW",          slug: "sko" },
    { name: "HBO Max",      slug: "mxx" },
    { name: "RTL+",         slug: "tvn" },
    { name: "Joyn",         slug: "jyn" },
  ];

  const results = {};

  for (const provider of providers) {
    try {
      const query = `
        query GetPopularTitles($country: Country!, $language: Language!, $platform: [String!]!) {
          popularTitles(
            country: $country
            filter: { packages: $platform }
            first: 4
          ) {
            totalCount
            edges {
              node {
                content(country: $country, language: $language) {
                  title
                }
              }
            }
          }
        }
      `;

      const res = await fetch("https://apis.justwatch.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({
          query,
          variables: { country: "DE", language: "de", platform: [provider.slug] }
        })
      });

      const data = await res.json();
      const titles = data?.data?.popularTitles;
      results[provider.name] = {
        status: "OK",
        slug: provider.slug,
        total: titles?.totalCount || 0,
        sample: (titles?.edges || []).slice(0, 3).map(e => e.node.content.title)
      };
    } catch(e) {
      results[provider.name] = { status: "Fehler: " + e.message };
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(results, null, 2)
  };
};
