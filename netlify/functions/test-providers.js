exports.handler = async function(event, context) {
  const providers = [
    { name: "Netflix",      id: "8"   },
    { name: "Amazon Prime", id: "9"   },
    { name: "Disney+",      id: "337" },
    { name: "Apple TV+",    id: "350" },
    { name: "WOW",          id: "29"  },
    { name: "HBO Max",      id: "384" },
    { name: "RTL+",         id: "149" },
    { name: "Joyn",         id: "209" },
  ];

  const results = {};

  for (const provider of providers) {
    try {
      const body = JSON.stringify({
        page_size: 4,
        page: 1,
        content_types: ["show", "movie"],
        monetization_types: ["flatrate"],
        providers: [provider.id]
      });

      const res = await fetch("https://apis.justwatch.com/content/titles/de/popular", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body
      });

      if (res.ok) {
        const data = await res.json();
        results[provider.name] = {
          status: "OK",
          total: data.total_results || 0,
          sample: (data.items || []).slice(0, 2).map(i => i.title)
        };
      } else {
        results[provider.name] = { status: "HTTP " + res.status };
      }
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
