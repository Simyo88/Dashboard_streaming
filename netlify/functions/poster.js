exports.handler = async function(event) {
  const path = event.queryStringParameters?.path;
  if (!path) return { statusCode: 400, body: "Missing path" };

  const url = "https://www.justwatch.com" + path;
  
  try {
    const res = await fetch(url, {
      headers: {
        "Referer": "https://www.justwatch.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    
    if (!res.ok) return { statusCode: 404, body: "Not found" };
    
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
      },
      body: base64,
      isBase64Encoded: true
    };
  } catch(e) {
    return { statusCode: 500, body: e.message };
  }
};
