const SUPABASE_URL = "https://fmlinbvtvjacitrvetmb.supabase.co";
const SUPABASE_KEY = "sb_publishable_pVVXVBPplJqarZ_RYbcy0A_OgjXPHOz";
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYWJlZDJiNjNjZmVmZjQwMzAwZmQxZmJiZmZjN2FjYiIsIm5iZiI6MTc3ODQyNDczMy42NjUsInN1YiI6IjZhMDA5YjlkM2U5ODRiOTM2NmVjMjBhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.-dkvM50nAGc7oQjIqTfgDcGKV--lvti4DY2tRl7MHu0";

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
const PAGE_SIZE = 20;

async function getYear(tmdbId, mediaType) {
  try {
    const endpoint = mediaType === "series" ? "tv" : "movie";
    const res = await fetch("https://api.themoviedb.org/3/" + endpoint + "/" + tmdbId + "?language=de-DE", {
      headers: { Authorization: "Bearer " + TMDB_TOKEN }
    });
    const data = await res.json();
    const dateStr = mediaType === "series" ? data.first_air_date : data.release_date;
    return dateStr ? parseInt(dateStr.slice(0, 4)) : null;
  } catch(e) { return null; }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return new Response("", { headers: CORS });

  const url = new URL(context.request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const res = await fetch(
    SUPABASE_URL + "/rest/v1/titles?select=id,tmdb_id,title,media_type,year&offset=" + offset + "&limit=" + PAGE_SIZE,
    { headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Prefer": "count=exact" } }
  );

  const titles = await res.json();
  const total = res.headers.get("content-range") ? parseInt(res.headers.get("content-range").split("/")[1]) : null;

  if (!Array.isArray(titles)) return new Response(JSON.stringify({ error: "Supabase-Fehler", raw: titles }), { headers: CORS });

  const updated = [], skipped = [], failed = [];

  await Promise.all(titles.map(async (row) => {
    if (row.year) { skipped.push({ title: row.title, year: row.year }); return; }
    if (!row.tmdb_id) { failed.push({ title: row.title, reason: "Keine tmdb_id" }); return; }

    const year = await getYear(row.tmdb_id, row.media_type);
    if (!year) { failed.push({ title: row.title, reason: "Kein Datum gefunden" }); return; }

    const upd = await fetch(SUPABASE_URL + "/rest/v1/titles?id=eq." + encodeURIComponent(row.id), {
      method: "PATCH",
      headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ year })
    });
    if (upd.ok) updated.push({ title: row.title, year });
    else failed.push({ title: row.title, reason: "Update fehlgeschlagen" });
  }));

  const nextOffset = offset + PAGE_SIZE;
  const hasMore = total !== null ? nextOffset < total : titles.length === PAGE_SIZE;

  return new Response(JSON.stringify({
    offset, total, this_batch: titles.length,
    updated: updated.length, skipped: skipped.length, failed: failed.length,
    has_more: hasMore,
    next_url: hasMore ? "/api/fetch_years?offset=" + nextOffset : null,
    updated_titles: updated,
    failed_titles: failed
  }, null, 2), { headers: CORS });
}
