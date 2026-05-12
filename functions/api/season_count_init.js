const SUPABASE_URL = "https://fmlinbvtvjacitrvetmb.supabase.co";
const SUPABASE_KEY = "sb_publishable_pVVXVBPplJqarZ_RYbcy0A_OgjXPHOz";
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYWJlZDJiNjNjZmVmZjQwMzAwZmQxZmJiZmZjN2FjYiIsIm5iZiI6MTc3ODQyNDczMy42NjUsInN1YiI6IjZhMDA5YjlkM2U5ODRiOTM2NmVjMjBhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.-dkvM50nAGc7oQjIqTfgDcGKV--lvti4DY2tRl7MHu0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};

async function getSeasonCount(tmdbId) {
  try {
    const res = await fetch(
      "https://api.themoviedb.org/3/tv/" + tmdbId + "?language=de-DE",
      { headers: { Authorization: "Bearer " + TMDB_TOKEN } }
    );
    const data = await res.json();
    const seasons = (data.seasons || []).filter(s => s.season_number > 0);
    return seasons.length || null;
  } catch(e) {
    return null;
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response("", { headers: CORS });
  }

  // Alle Serien aus Supabase holen (nur media_type = series)
  const res = await fetch(
    SUPABASE_URL + "/rest/v1/titles?media_type=eq.series&select=id,tmdb_id,title,season_count",
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      }
    }
  );
  const series = await res.json();

  if (!Array.isArray(series)) {
    return new Response(JSON.stringify({ error: "Supabase-Fehler", raw: series }), { headers: CORS });
  }

  const updated = [];
  const skipped = [];
  const failed = [];

  // Batch-Größe 15 (Cloudflare Subrequest-Limit)
  for (let i = 0; i < series.length; i += 15) {
    const batch = series.slice(i, i + 15);
    await Promise.all(batch.map(async (row) => {
      if (!row.tmdb_id) { failed.push({ id: row.id, reason: "Keine tmdb_id" }); return; }
      const count = await getSeasonCount(row.tmdb_id);
      if (count === null) { failed.push({ id: row.id, title: row.title, reason: "TMDB-Fehler" }); return; }
      if (row.season_count === count) { skipped.push({ id: row.id, title: row.title, count }); return; }

      // In Supabase speichern
      const upd = await fetch(
        SUPABASE_URL + "/rest/v1/titles?id=eq." + encodeURIComponent(row.id),
        {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ season_count: count })
        }
      );
      if (upd.ok) {
        updated.push({ id: row.id, title: row.title, count });
      } else {
        failed.push({ id: row.id, title: row.title, reason: "Update fehlgeschlagen" });
      }
    }));
    // Kurze Pause zwischen Batches
    await new Promise(r => setTimeout(r, 300));
  }

  return new Response(JSON.stringify({
    total: series.length,
    updated: updated.length,
    skipped: skipped.length,
    failed: failed.length,
    updated_titles: updated,
    failed_titles: failed
  }, null, 2), { headers: CORS });
}
