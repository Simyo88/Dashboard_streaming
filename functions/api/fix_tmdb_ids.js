const SUPABASE_URL = "https://fmlinbvtvjacitrvetmb.supabase.co";
const SUPABASE_KEY = "sb_publishable_pVVXVBPplJqarZ_RYbcy0A_OgjXPHOz";
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYWJlZDJiNjNjZmVmZjQwMzAwZmQxZmJiZmZjN2FjYiIsIm5iZiI6MTc3ODQyNDczMy42NjUsInN1YiI6IjZhMDA5YjlkM2U5ODRiOTM2NmVjMjBhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.-dkvM50nAGc7oQjIqTfgDcGKV--lvti4DY2tRl7MHu0";

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
const PAGE_SIZE = 10;

async function getTmdbId(title, mediaType) {
  const type = mediaType === "series" ? "tv" : "movie";
  // Erst auf Englisch suchen, dann auf Deutsch als Fallback
  for (const lang of ["en-US", "de-DE"]) {
    try {
      const res = await fetch(
        "https://api.themoviedb.org/3/search/" + type + "?query=" + encodeURIComponent(title) + "&language=" + lang,
        { headers: { Authorization: "Bearer " + TMDB_TOKEN } }
      );
      const data = await res.json();
      const result = (data.results || [])[0];
      if (result) return result.id;
    } catch(e) { continue; }
  }
  return null;
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return new Response("", { headers: CORS });

  const url = new URL(context.request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const res = await fetch(
    SUPABASE_URL + "/rest/v1/titles?media_type=eq.series&select=id,title,tmdb_id&offset=" + offset + "&limit=" + PAGE_SIZE,
    { headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Prefer": "count=exact" } }
  );

  const series = await res.json();
  const total = res.headers.get("content-range") ? parseInt(res.headers.get("content-range").split("/")[1]) : null;

  if (!Array.isArray(series)) return new Response(JSON.stringify({ error: "Supabase-Fehler", raw: series }), { headers: CORS });

  const updated = [], skipped = [], failed = [];

  await Promise.all(series.map(async (row) => {
    const newId = await getTmdbId(row.title, "series");
    if (!newId) { failed.push({ title: row.title, reason: "TMDB nicht gefunden" }); return; }
    if (newId === row.tmdb_id) { skipped.push({ title: row.title, tmdb_id: newId }); return; }

    const upd = await fetch(
      SUPABASE_URL + "/rest/v1/titles?id=eq." + encodeURIComponent(row.id),
      {
        method: "PATCH",
        headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ tmdb_id: newId })
      }
    );
    if (upd.ok) updated.push({ title: row.title, old_id: row.tmdb_id, new_id: newId });
    else failed.push({ title: row.title, reason: "Update fehlgeschlagen" });
  }));

  const nextOffset = offset + PAGE_SIZE;
  const hasMore = total !== null ? nextOffset < total : series.length === PAGE_SIZE;

  return new Response(JSON.stringify({
    offset, total, this_batch: series.length,
    updated: updated.length, skipped: skipped.length, failed: failed.length,
    has_more: hasMore,
    next_url: hasMore ? "/api/fix_tmdb_ids?offset=" + nextOffset : null,
    updated_titles: updated,
    failed_titles: failed
  }, null, 2), { headers: CORS });
}
