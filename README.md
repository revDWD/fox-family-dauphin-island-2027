# Fox Family Dauphin Island 2027

**Live site: [dwdyck.github.io/fox-family-dauphin-island-2027](https://dwdyck.github.io/fox-family-dauphin-island-2027/)**

A mobile-first family vacation dashboard: the week's meals and plans in one table, live weather, houses and who is staying where, and a map. Installable, works offline after the first visit, with light, dark and auto themes. Plain HTML, CSS and JavaScript: no build, no database. Built as an experiment in using AI to make a genuinely useful family tool.

## Sections
🏖️ This Week · 🗺️ Map · 🌤️ Weather · 🏠 Houses & Family

## Update the content (no code, no git)
1. Open **[app.pagescms.org](https://app.pagescms.org)** (works on a phone) and sign in with GitHub.
2. Pick this repository the first time (it asks permission once). Bookmark the page.
3. Choose **Schedule**, **Families**, **Houses**, **Map places** or **Site settings**, change things in the form, and tap **Save**.

Save commits straight to the repo and the live site updates in 1–5 minutes (hard-refresh a phone if it looks stale). The forms are defined in `.pages.yml`.

Houses, places and families are matched by **name**, so type them exactly (an event's *Where* is a house or place name; *Host* is a family name). Then open the site's `#/check` page: it lists anything that doesn't match, in plain English.

Content lives in `data/*.json` (`schedule`, `houses`, `families`, `locations`, `config`); you can also edit those by hand on github.com. Preview a day with `?today=2027-06-22`.

### If something looks wrong
- **Site says it "could not load its information":** a data file has a typo. Open `data/<name>.json` on github.com, or undo the last change in the repo's commit history.
- **A name shows as "does not match" on `#/check`:** the house, place or family name is spelled differently from where it was created. Fix the spelling.
- **Edits don't appear:** wait a few minutes, then hard-refresh (phones: close and reopen the page). Check progress under the repo's *Actions* tab.
- **Photos:** the site deliberately has no photos or memories section (the repo is public). Share photos in a private shared album instead.

## Run locally
Open `index.html`, or serve the folder with any static server. Host on GitHub Pages from `main` / root.

## Good to know
- Everything is free: GitHub Pages hosting, Pages CMS, Open-Meteo weather, NOAA tide times, OpenStreetMap.
- Not yet tested end to end: the first Pages CMS sign-in. See AGENTS.md.
- Ideas for later: a calendar (ICS) export for phones.

## Privacy
This repo is public. The site deliberately has no door, gate or Wi-Fi code fields. Share those privately (text or group chat). The included data is sample placeholder content.

## For contributors and AI agents
See [AGENTS.md](AGENTS.md) for architecture, conventions and the test and deploy workflow, and [REVIEW.md](REVIEW.md) for the design and date-handling review.
