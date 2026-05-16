# StreamBoard – CLAUDE.md

Persönliches Streaming-Dashboard. Zeigt populäre Titel je Streaming-Dienst (via JustWatch), verwaltet Watchlist/Serien-Status und erkennt neue Staffeln.

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (Single File: `index.html`) |
| Backend | Cloudflare Pages Functions (ES Modules, `export async function onRequest`) |
| Datenbank | Supabase (PostgreSQL) |
| Streaming-Daten | JustWatch GraphQL API (inoffiziell, kein API-Key) |
| Metadaten & Poster | TMDB REST API v3 |
| Hosting | Cloudflare Pages (Branch: `main`) |

---

## Dateistruktur

```
streamboard/
├── index.html                    ← gesamte App (UI + JS-Logik)
├── import.js                     ← client-seitig (ungenutzt / veraltet)
├── justwatch.js                  ← client-seitig (ungenutzt / veraltet)
└── functions/api/                ← Cloudflare Pages Functions (Routen: /api/*)
    ├── justwatch.js              ← /api/justwatch  – popular & search via JustWatch GraphQL
    ├── import.js                 ← /api/import     – Bulk-Import von Titeln in Supabase (batched)
    ├── poster.js                 ← /api/poster     ← Proxy für JustWatch-Posterbilder
    ├── fix_tmdb_ids.js           ← /api/fix_tmdb_ids        – korrigiert falsche tmdb_id in Supabase
    └── season_count_init.js      ← /api/season_count_init   – befüllt season_count/season_count_latest
```

> **Hinweis:** `import.js` und `justwatch.js` im Root-Verzeichnis sind Überbleibsel und werden nicht aktiv genutzt.

---

## Supabase

**URL:** `https://fmlinbvtvjacitrvetmb.supabase.co`  
**Publishable Key:** `sb_publishable_pVVXVBPplJqarZ_RYbcy0A_OgjXPHOz`  
**SDK:** `@supabase/supabase-js@2` (via CDN in `index.html`)

### Tabellen

**`titles`** – Stammdaten der Titel
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | text PK | Format: `series-<tmdb_id>` oder `movie-<tmdb_id>` |
| `tmdb_id` | int | TMDB-ID |
| `media_type` | text | `series` oder `movie` |
| `title` | text | Titel |
| `poster_path` | text | Voller Poster-URL (TMDB, `w300`) |
| `vote_average` | float | IMDb/TMDB-Score |
| `overview` | text | Beschreibung |
| `season_count` | int | Letzte bestätigte Staffelzahl (für NEU-Badge-Vergleich) |
| `season_count_latest` | int | Aktuell von TMDB gelesene Staffelzahl |

**`watch_status`** – Status je Titel
| Spalte | Typ | Beschreibung |
|---|---|---|
| `title_id` | text FK → titles.id | |
| `status` | text | `want`, `watching`, `aborted`, `done` |
| `updated_at` | timestamptz | |

**`season_status`** – Status je Staffel
| Spalte | Typ | Beschreibung |
|---|---|---|
| `title_id` | text FK → titles.id | |
| `season_number` | int | |
| `status` | text | `done` oder `none` |
| `updated_at` | timestamptz | |

---

## Cloudflare Pages Deployment

- Deployment passiert **automatisch** bei Push auf `main`
- Functions liegen in `functions/api/` → werden als `/api/*` Routes exponiert
- Kein Build-Step, kein Framework, kein Bundler – reines Static Hosting + Functions
- **Netlify wurde entfernt** (kein `netlify.toml`, kein `netlify/`-Ordner mehr)

---

## Streaming-Anbieter (PROVIDERS)

Feste Liste in `index.html`. Slugs kommen von JustWatch:

| Slug | Anbieter |
|---|---|
| `nfx` | Netflix |
| `amp` | Amazon Prime |
| `dnp` | Disney+ |
| `atp` | Apple TV+ |
| `sko` | WOW |
| `mxx` | HBO Max |
| `pmp` | Paramount+ |
| `tvn` | RTL+ |
| `jyn` | Joyn |

Blockierte Amazon-Channel-Slugs (werden ausgefiltert): `agm`, `qca`, `prv`, `amc`, `shd`, `stza`, `starz`, `hboa`, `sho`

---

## Wichtige Logik-Details

### Status-System
- 4 Stati: `want` (Watchlist), `watching` (Angefangen), `aborted` (Abgebrochen), `done` (Gesehen)
- Status-Buttons im Modal sind **Toggle**: nochmaliger Klick auf aktiven Button setzt Status auf `none`
- Serie auf `done` → alle Staffeln automatisch auf `done` gesetzt
- Letzte Staffel auf `done` → Gesamtstatus der Serie automatisch auf `done`

### NEU-Staffel-Badge
- `season_count` = zuletzt bestätigter Wert (wird nicht überschrieben bis User `done` klickt)
- `season_count_latest` = aktueller TMDB-Wert
- Wenn `season_count_latest > season_count` → NEU-Badge auf der Karte

### Daten-IDs
- Supabase-Key: `series-<tmdb_id>` / `movie-<tmdb_id>`  
- JustWatch liefert eigene `objectId` – wird **nicht** als Supabase-Key verwendet
- Im Entdecken-Tab hat ein Item noch keine `supabase_id`; diese entsteht erst beim ersten `setStatus`-Aufruf

### Watchlist-Darstellung
- Serien und Filme werden in **getrennten Abschnitten** angezeigt: „Serien (X)" und „Filme (X)"
- Gilt für alle Status-Tabs (want, watching, aborted, done)

---

## API-Endpunkte

### `GET /api/justwatch`
| Parameter | Werte | Beschreibung |
|---|---|---|
| `action` | `popular` (default), `search` | |
| `slug` | z. B. `nfx` | Anbieter-Filter (nur bei `popular`) |
| `type` | `all`, `series`, `movie` | Typ-Filter |
| `query` | Suchbegriff | Nur bei `action=search` |

### `GET /api/import`
Bulk-Import vordefinierter Titellisten in Supabase. Batched mit `?batch=0`, `?batch=1` usw. (15 Titel pro Batch).

### `GET /api/fix_tmdb_ids`
Korrigiert falsche `tmdb_id`-Einträge in Supabase. Paginiert mit `?offset=N` (10 pro Batch).

### `GET /api/season_count_init`
Befüllt `season_count` und `season_count_latest` für alle Serien. Paginiert mit `?offset=N` (20 pro Batch).

### `GET /api/poster`
Proxy für JustWatch-Posterbilder. Parameter: `?path=/pfad/zum/bild.jpg`

---

## Regeln & Hinweise für KI-Assistenz

1. **Wenig Deploys:** Änderungen bündeln, nicht für jede Kleinigkeit einen eigenen Commit/Push machen.
2. **Escape-Sequenzen prüfen:** HTML wird per String-Konkatenation gebaut. Vor jedem Edit sicherstellen, dass Anführungszeichen und Sonderzeichen korrekt escaped sind (einfache Quotes in Attributen, `\"` in `innerHTML`-Strings).
3. **Kein Framework einführen** – das Projekt ist bewusst framework-frei. Kein React, Vue, Bundler o. Ä.
4. **Cloudflare Functions Syntax:** Alle Functions müssen `export async function onRequest(context)` exportieren – kein CommonJS (`module.exports`).
5. **Supabase-Key ist publishable** – kein Service-Role-Key im Frontend verwenden.
6. **JustWatch-API ist inoffiziell** – kein Authentifizierungs-Token nötig, aber User-Agent-Header mitschicken.
7. **TMDB-Sprache:** Immer `language=de-DE` verwenden, außer bei `fix_tmdb_ids.js` (dort erst `en-US`, dann `de-DE` als Fallback).
8. **`import.js` / `justwatch.js` im Root** nicht anfassen – sind Altlasten, werden nicht deployed.

---

## Offene TODOs

- [ ] `import.js` und `justwatch.js` im Root-Verzeichnis aufräumen oder löschen
- [ ] Supabase-Abfrage in `loadMyList` liefert keine Provider-Daten → Streaming-Badges fehlen in Watchlist/Status-Tabs
- [ ] Chat-Funktion ruft Claude API direkt vom Browser auf (kein Proxy) – API-Key liegt im HTML
- [ ] Kein Error-State wenn Supabase nicht erreichbar ist (stille Fehler)
- [ ] `season_count_init` und `fix_tmdb_ids` müssen manuell aufgerufen werden – kein Cron-Job
