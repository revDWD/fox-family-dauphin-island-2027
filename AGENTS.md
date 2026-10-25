# AGENTS.md

Context for AI agents working on the Fox Family Dauphin Island 2027 vacation site. Read this before editing.

## What this is
A static, mobile-first family vacation dashboard on GitHub Pages. Vanilla JS and CSS: **no build step, no npm, no server, no framework**. Repo `DWDyck/fox-family-dauphin-island-2027`, live at https://dwdyck.github.io/fox-family-dauphin-island-2027/. Users are non-technical family members on phones; simplicity and quick scanning beat features.

## Navigation (exactly four tabs; do not add more)
`F.NAV` in `js/util.js`: 🏖️ This Week (`home`), 🗺️ Map, 🌤️ Weather, 🏠 Houses & Family (`houses`). The Calendar page (`#/calendar/<date>`) is not a tab; the weekly table links to it (`F.EXTRA_PAGES`). `#/meals` redirects home. Hash router: `#/route/arg`. Old `#/family`, `#/gallery`, `#/photos`, `#/memories` redirect via `ALIASES` in `app.js`. `#/check` is a hidden data-validation page linked from the footer. Emoji appear only in nav and page titles; elsewhere use the SVG icon set (`F.icon`).

## Files
```
.pages.yml        Pages CMS form definitions for data/*.json (the editing UI; sign in at app.pagescms.org)
index.html        shell, inline theme script (sets data-theme before paint), script order
styles.css        all CSS: 1 tokens, 2 base, 3 header/nav, 4 layout, 5 components, 6 wide screens/print
sw.js             service worker (network first). Bump VERSION on every deploy; list new files in CORE
data/             config, houses, locations, families, schedule  (content only, JSON)
js/boot.js        fetches data/*.json, builds window.FOX (ids from names, name->id references), then loads the other scripts in order
js/util.js        namespace window.FOX (F), date helpers, lookups, F.NAV, icons, builds F.days/F.events
js/components.js  shared HTML builders: agendaRow, dayList, eventCard, mealBoard, ICS and copy handlers
js/weather.js     Open-Meteo client + NOAA tide predictions (cached in localStorage), F.weatherNow tile, #/weather page
js/pages.js       calendar and map pages (+ F.ui helpers)
js/home.js        This Week: title card + weekly table only
js/houses.js      merged houses + families
js/check.js       data validation (#/check)
js/app.js         router, nav render, theme and text-size toggles
```
Script load order matters; `boot.js` loads util, components, weather, check, pages, home, houses, app in that order after the data. `index.html` only includes `boot.js`. Pages register as `F.pages[name] = (app, arg) => {...}` and set `app.innerHTML`.

## Data model
- `data/schedule.json` is the **only** source of dates. Days `{date:'YYYY-MM-DD', title?, noDinner?, dinnerNote?, events:[...]}` (boot.js turns noDinner/dinnerNote into `dinner:false|'text'`) with no gaps; events `{id,title,time:'6:30 PM',category,status,location,host,mealType,description,notes}`. Trip start/end/count derive from it (`F.trip`). Trip: Sat 2027-06-19 to Sat 2027-06-26.
- References are by **name** in the JSON (event `location` = house or place name, `host` = family name, family `house` = house name); `boot.js` slugifies names into ids and resolves them. Unmatched names are reported by `#/check`. Ids are not stored.
- Dinner = meal not breakfast/lunch at 3 PM or later (`F.isDinner`).
- There are intentionally NO photos or memories (removed: privacy, public repo, hard to add). Do not re-add image upload or galleries. Family avatars are initials only. Places have an optional `url` (http/https only; anything else is dropped by `boot.js` and warned on `#/check`).
- Sample data (addresses) is placeholder. Repo is public: there are intentionally NO door/gate/Wi-Fi code fields; never add them.

## Conventions
- **Dates**: strings only; use `F.parse/ymd/addDays/daysBetween/today/shortDate/longDate` etc. Never `new Date('YYYY-MM-DD')` or ad hoc formatting. `F.today()` uses `America/Chicago` and honors `?today=YYYY-MM-DD`. `F.nowMinutes()`/`F.nextEvent()` give island time.
- **CSS**: colours only via tokens in section 1 (light `:root`, one dark block `:root[data-theme=dark]`). Use spacing tokens `--s1..--s6`, 48px minimum touch targets, respect `prefers-reduced-motion`. Dark theme is warm coastal: deep ocean, Gulf turquoise `--accent`, coral `--coral`, sand.
- Always `esc()` interpolated text; build HTML strings in the existing style.
- Accessibility: landmarks, `aria-current` on nav, labelled regions, visible focus, text not colour alone (tentative = dashed edge + label).
- Home page: title card (countdown) then the weekly meal board (horizontally scrollable on phones, min-width 600px, sticky day column). Nothing else.
- Edit emoji with `\u{...}` escapes in JS; PowerShell mangles emoji in files.

## Editing UI (Pages CMS)
Content is edited with Pages CMS (https://app.pagescms.org) using `.pages.yml`; it commits JSON straight to `main`. If you add or rename a data field, update `.pages.yml`, `js/boot.js` and `js/check.js` together. Pages CMS rewrites a JSON file from its defined fields only, so any field not in `.pages.yml` can be lost on the next save. There are intentionally no contact fields (phone/email) or door/Wi-Fi/gate codes. `config.lastUpdated` was removed (the footer stamp shows only if it is set).

### Pages CMS decisions and open items
- **Why Pages CMS:** the owner is non-technical and found the earlier local `admin.html` (File System Access API, folder picking, manual git) confusing. A hosted editor that commits to GitHub removes folder and git steps. It is free and open source; editors sign in with GitHub and need write access to the repo (first use installs the Pages CMS GitHub App on the repo).
- **Why names, not ids:** Pages CMS has no dropdown over entries of a single list file (`reference` needs a collection of files, and GitHub Pages cannot list a folder), so references are typed names. Changing a house/place/family name breaks references to it until they are updated; `#/check` shows them.
- **Not yet verified against the real service:** the Pages CMS sign-in flow, whether `.pages.yml` loads cleanly. Verify these on the first real edit and fix `.pages.yml` or the workflow if needed.
- **Data must be fetched:** `boot.js` uses `fetch`, so the site needs HTTP(S); `file://` does not work. Test with a static server.
- **Ideas not built:** ICS export of the schedule, a shared photo album link (deliberately not on the site), moving to a private repo (Netlify/Cloudflare Pages/Vercel free tiers) if privacy is needed.

## Develop and test
No tooling required.
1. `node --check` each JS file. Validate `data/*.json` parse.
2. Serve statically (e.g. a tiny Node server, port 8123); open `index.html?today=2027-06-22` to preview a trip day (also test a pre-trip and post-trip date).
3. Headless Edge screenshots (`msedge --headless=new --window-size=500,1000 --screenshot=...`) at about 500 and 1100 px, light and dark.
4. Open `#/check` and confirm no errors.

## Deploy
Commit and push to `main`; Pages builds in 1-5 minutes (`gh run list -R DWDyck/fox-family-dauphin-island-2027`). Bump `VERSION` in `sw.js` (currently `fox-2027-v14`) so phones refresh. `git push` writes to stderr and may exit non-zero even on success; verify with `git status -sb`. Commits use the trailer `Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>`.

## External services
Open-Meteo (weather, no key), NOAA CO-OPS (high/low tide predictions on the Weather page; station in `config.tides`, default Dauphin Island 8735180; no key), OpenStreetMap tiles and Leaflet from unpkg (map, loaded lazily, pinned with SRI hashes), Nominatim (geocoding addresses lacking lat/lng, cached). All degrade gracefully offline.

## History
v1 theme and weather; v2 meal board; v3 dashboard refactor (7-item nav, Latest Updates removed, merged pages, coastal theme); v4 weekly board moved to top; v5 home reduced to title card + table, tabs reordered, Meals tab removed; v6 data moved to JSON with Pages CMS editing, admin.html removed; v14 Photos & Memories tab and the photo Action removed (privacy), Weather page shows today's tides in the top card and no longer lists the next 7 days, place `url` field, shareable `#/map/type:beach` and `#/calendar/filter:meal` links, service worker falls back to cache after 3.5 s. See `REVIEW.md` for the design and date-handling review.
