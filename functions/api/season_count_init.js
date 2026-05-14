const SUPABASE_URL = "https://fmlinbvtvjacitrvetmb.supabase.co";
const SUPABASE_KEY = "sb_publishable_pVVXVBPplJqarZ_RYbcy0A_OgjXPHOz";
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYWJlZDJiNjNjZmVmZjQwMzAwZmQxZmJiZmZjN2FjYiIsIm5iZiI6MTc3ODQyNDczMy42NjUsInN1YiI6IjZhMDA5YjlkM2U5ODRiOTM2NmVjMjBhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.-dkvM50nAGc7oQjIqTfgDcGKV--lvti4DY2tRl7MHu0";

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
const PAGE_SIZE = 20;

async function getSeasonCount(tmdbId) {
  try {
    const res = await fetch("https://api.themoviedb.org/3/tv/" + tmdbId + "?language=de-DE",
      { headers: { Authorization: "Bearer " + TMDB_TOKEN } });
    const data = await res.json();
    return (data.seasons || []).filter(s => s.season_number > 0).length || null;
  } catch(e) { return null; }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") return new Response("", { headers: CORS });

  const url = new URL(context.request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const res = await fetch(
    SUPABASE_URL + "/rest/v1/titles?media_type=eq.series&select=id,tmdb_id,title,season_count,season_count_latest&offset=" + offset + "&limit=" + PAGE_SIZE,
    { headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Prefer": "count=exact" } }
  );
  const series = await res.json();
  const total = res.headers.get("content-range") ? parseInt(res.headers.get("content-range").split("/")[1]) : null;

  if (!Array.isArray(series)) return new Response(JSON.stringify({ error: "Supabase-Fehler", raw: series }), { headers: CORS });

  const updated = [], skipped = [], failed = [];

  await Promise.all(series.map(async (row) => {
    if (!row.tmdb_id) { failed.push({ id: row.id, reason: "Keine tmdb_id" }); return; }
    const count = await getSeasonCount(row.tmdb_id);
    if (!count) { failed.push({ title: row.title, reason: "TMDB-Fehler" }); return; }

    // season_count_latest immer aktualisieren
    // season_count nur setzen wenn noch leer (Erstbefüllung)
    const patch = { season_count_latest: count };
    if (!row.season_count) patch.season_count = count;

    if (row.season_count_latest === count && row.season_count) {
      skipped.push({ title: row.title, count }); return;
    }

    const upd = await fetch(SUPABASE_URL + "/rest/v1/titles?id=eq." + encodeURIComponent(row.id), {
      method: "PATCH",
      headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (upd.ok) updated.push({ title: row.title, season_count: row.season_count || count, season_count_latest: count });
    else failed.push({ title: row.title, reason: "Update fehlgeschlagen" });
  }));

  const nextOffset = offset + PAGE_SIZE;
  const hasMore = total !== null ? nextOffset < total : series.length === PAGE_SIZE;

  return new Response(JSON.stringify({
    offset, total, this_batch: series.length,
    updated: updated.length, skipped: skipped.length, failed: failed.length,
    has_more: hasMore, next_url: hasMore ? "/api/season_count_init?offset=" + nextOffset : null,
    updated_titles: updated, failed_titles: failed
  }, null, 2), { headers: CORS });
}
