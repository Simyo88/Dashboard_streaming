const SUPABASE_URL = "https://fmlinbvtvjacitrvetmb.supabase.co";
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYWJlZDJiNjNjZmVmZjQwMzAwZmQxZmJiZmZjN2FjYiIsIm5iZiI6MTc3ODQyNDczMy42NjUsInN1YiI6IjZhMDA5YjlkM2U5ODRiOTM2NmVjMjBhNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.-dkvM50nAGc7oQjIqTfgDcGKV--lvti4DY2tRl7MHu0";

async function getTmdbPoster(title, type) {
  try {
    const t = type === "series" ? "tv" : "movie";
    const url = "https://api.themoviedb.org/3/search/" + t + "?query=" + encodeURIComponent(title) + "&language=de-DE";
    const res = await fetch(url, { headers: { Authorization: "Bearer " + TMDB_TOKEN } });
    const data = await res.json();
    const result = (data.results || [])[0];
    return result && result.poster_path ? "https://image.tmdb.org/t/p/w300" + result.poster_path : null;
  } catch(e) { return null; }
}
const SUPABASE_KEY = "sb_publishable_pVVXVBPplJqarZ_RYbcy0A_OgjXPHOz";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};

const LISTS = {
  done_series: ["Nine Perfect Strangers","Rabbit Hole","Mobland","Landman","Elementary","Frasier","King of Queens","Paris Has Fallen","Silo","Your Friends & Neighbours","Daredevil: Born Again","The Residence","The White Lotus","High Potential","The Day of the Jackal","Dark Matter","Aus Mangel an Beweisen","Arcane","Hacks","Tehran","Eine Frage der Chemie","Drops of God","The Gentlemen","In ewiger Schuld","Fargo","Mr. & Mrs. Smith","Extraordinary","The Peripheral","Altered Carbon","The Diplomat","Upload","Somebody Somewhere","Line of Duty","One Piece","Killing Eve","Der Pass","Heartstopper","Succession","American Born Chinese","Boston Legal","The Good Fight","Fleishman Is in Trouble","Citadel","Severance","The Night Agent","The Recruit","The Last of Us","The Consultant","The Rehearsal","Wednesday","Vigil","She-Hulk","Ms. Marvel","For Life","Resident Alien","Love Victor","Anatomy of a Scandal","Money Heist","My Holo Love","Clickbait","Welcome to Earth","Love & Anarchy","Humans","Sex Education","13 Reasons Why","The Kominsky Method","Elite","Broadchurch","The Fall","White Collar","The Blacklist","Suits","Sherlock","The Good Wife","Stranger Things","Designated Survivor","Girlboss","Riverdale","Person of Interest","Berlin Station","Ozark","The Killing","Unbreakable Kimmy Schmidt","Queen of the South","Lie to Me","The End of the F***ing World","Everything Sucks!","The Rain","Santa Clarita Diet","Good Girls","Safe","Deadwind","Sick Note","Bodyguard","You","Bad Banks","The Politician","Living with Yourself","Goliath","Homeland","Jack Ryan","Sneaky Pete","StartUp","Hanna","Deutschland 83","Deutschland 86","Beat","Patriot","Red Oaks","Lucifer","Bosch","Pastewka","Fleabag","Absentia","The Bold Type","The Marvelous Mrs. Maisel","The Undoing","Westworld","Riviera","New Amsterdam","Damages","3 Body Problem","John Sugar","Fallout","Follow the Money","Red Eye"],
  watching_series: ["Your Friends & Neighbours","One Day","Daredevil: Born Again","Trauma","Weak Hero Class","Forecasting Love and Weather","Veep","The Lincoln Lawyer","Loki","Physical","True Detective","Billions","Shrinking","Bodies","Ted Lasso","Atypical","Dickinson","Silo","Slow Horses","Only Murders in the Building","Ein neuer Sommer","Shogun","For All Mankind","The Bear","Beef","Formula 1: Drive to Survive","Cobra Kai","Ghosts","The Staircase","Industry","The Franchise","Bad Sisters","Cha Cha Real Smooth","Severance"],
  done_movies: ["Apex","Papillon","Road House","Barbie","Oppenheimer","The Gorge","The Fall Guy","Monkey Man","Triangle of Sadness","Everything Everywhere All at Once","Easy Money","Beverly Hills Cop: Axel F","Eye in the Sky","Searching","Mission: Impossible","Mission: Impossible 2","Mission: Impossible III","Mission: Impossible - Ghost Protocol","Mission: Impossible - Rogue Nation","Mission: Impossible - Fallout","Mission: Impossible - Dead Reckoning Part One","The Bourne Identity","The Bourne Supremacy","The Bourne Legacy","Jason Bourne","The Bourne Ultimatum","The Equalizer","The Equalizer 2","The Equalizer 3","Bullet Train","Inception","Snatch","The Fast and the Furious","2 Fast 2 Furious","Fast & Furious: Tokyo Drift","Fast & Furious","Fast Five","Fast & Furious 6","Furious 7","The Fate of the Furious","Spider-Man","Spider-Man 2","Spider-Man: Homecoming","Leave the World Behind","The Curious Case of Benjamin Button","The Peanut Butter Falcon","Dune","Glass Onion","The Sixth Sense","The Amazing Spider-Man","I Am Legend","The Expendables","The Expendables 2","The Expendables 3","Django Unchained","Salt","Ambulance","Nobody","Extraction","The Gray Man","John Wick","John Wick: Chapter 2","John Wick: Chapter 3 - Parabellum","John Wick: Chapter 4","Tenet","Looper","Gone Girl","Knives Out","Nightcrawler","The Adam Project","Extraction 2","Don't Look Up","Red Notice","Triple Frontier","Saltburn","Palm Springs","Wolfs","The Menu"],
  want: ["The Studio","Dope Thief","Mad Max: Fury Road","Sonne und Beton","Lady Bird","Ripley","Arrival","Poor Things","Split","Justified","Fair Play","Undercover","Ferry: Die Serie","Babylon","Ford v Ferrari","Reptile","The Card Counter","Memories of Murder","The Wire","Peaky Blinders","Foundation","Pachinko","Mare of Easttown","Daisy Jones & The Six","Ferrari","The Bear","Ted Lasso","Bad Sisters","For All Mankind","Severance","Kaos","Ginny & Georgia","Skins","Dopesick","Maid","True Story","Borgen","Black Bird","Cherry","Home Before Dark"],
  sunday: ["Als du mich sahst","One Day"]
};

async function tmdbSearch(query, type) {
  const t = type === "series" ? "tv" : type === "movie" ? "movie" : "multi";
  const url = "https://api.themoviedb.org/3/search/" + t + "?query=" + encodeURIComponent(query) + "&language=de-DE";
  const res = await fetch(url, { headers: { Authorization: "Bearer " + TMDB_TOKEN } });
  const data = await res.json();
  return (data.results || [])[0] || null;
}

async function upsertToSupabase(titleData, status) {
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/titles`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(titleData)
  });
  if (!r1.ok) {
    const err = await r1.text();
    throw new Error("titles upsert failed: " + err);
  }

  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/watch_status`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      title_id: titleData.id,
      status,
      updated_at: new Date().toISOString()
    })
  });
  if (!r2.ok) {
    const err = await r2.text();
    throw new Error("watch_status upsert failed: " + err);
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response("", { headers: CORS });
  }

  const allTasks = [
    ...LISTS.done_series.map(t => ({ title: t, type: "series", status: "done" })),
    ...LISTS.watching_series.map(t => ({ title: t, type: "series", status: "watching" })),
    ...LISTS.done_movies.map(t => ({ title: t, type: "movie", status: "done" })),
    ...LISTS.want.map(t => ({ title: t, type: null, status: "want" })),
    ...LISTS.sunday.map(t => ({ title: t, type: null, status: "want" })),
  ];

  const url = new URL(context.request.url);
  const batch = parseInt(url.searchParams.get("batch") || "0");
  const batchSize = 15;
  const tasks = allTasks.slice(batch * batchSize, (batch + 1) * batchSize);
  const hasMore = (batch + 1) * batchSize < allTasks.length;

  const imported = [];
  const failed = [];

  for (let i = 0; i < tasks.length; i += 5) {
    const batch = tasks.slice(i, i + 5);
    await Promise.all(batch.map(async (task) => {
      try {
        const result = await tmdbSearch(task.title, task.type);
        if (result) {
          const mediaType = result.media_type || (task.type === "series" ? "tv" : task.type) || (result.name ? "tv" : "movie");
          const normalType = mediaType === "tv" ? "series" : "movie";
          const id = normalType + "-" + result.id;
          const poster = result.poster_path ? "https://image.tmdb.org/t/p/w300" + result.poster_path : null;
          await upsertToSupabase({
            id,
            tmdb_id: result.id,
            media_type: normalType,
            title: result.title || result.name || task.title,
            poster_path: poster,
            vote_average: result.vote_average || null,
            overview: result.overview || null
          }, task.status);
          imported.push({ id, title: result.title || result.name || task.title, status: task.status });
        } else {
          failed.push({ title: task.title, reason: "Nicht gefunden" });
        }
      } catch(e) {
        failed.push({ title: task.title, reason: e.message });
      }
    }));
    await new Promise(r => setTimeout(r, 300));
  }

  return new Response(JSON.stringify({
    success: imported.length,
    failed: failed.length,
    total: allTasks.length,
    batch,
    hasMore,
    nextUrl: hasMore ? "/api/import?batch=" + (batch + 1) : null,
    failed_titles: failed
  }), { headers: CORS });
}
