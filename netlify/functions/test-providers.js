exports.handler = async function(event, context) {
  const query = `
    query GetProviders($country: Country!) {
      packages(country: $country, platform: WEB) {
        id
        shortName
        technicalName
        clearName
        __typename
      }
    }
  `;

  try {
    const res = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      body: JSON.stringify({
        query,
        variables: { country: "DE" }
      })
    });

    const data = await res.json();
    const packages = data?.data?.packages || [];
    
    // Filter nach relevanten Anbietern
    const relevant = ["Netflix", "Amazon", "Disney", "Apple", "WOW", "HBO", "RTL", "Joyn", "Max"];
    const filtered = packages.filter(p => 
      relevant.some(r => p.clearName?.includes(r) || p.shortName?.includes(r))
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ all_relevant: filtered, total_packages: packages.length }, null, 2)
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: e.message })
    };
  }
};
