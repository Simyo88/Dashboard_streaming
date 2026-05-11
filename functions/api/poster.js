export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.searchParams.get("path");
  
  if (!path) {
    return new Response("Missing path", { status: 400 });
  }

  const imageUrl = "https://www.justwatch.com" + path;
  
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "Referer": "https://www.justwatch.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!res.ok) {
      return new Response("Not found", { status: 404 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch(e) {
    return new Response(e.message, { status: 500 });
  }
}
