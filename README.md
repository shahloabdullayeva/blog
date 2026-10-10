# shahlo.blog

My personal site — [shahlo.blog](https://shahlo.blog). A plain static website, no build step.

## Sections

- **diary** — dated journal entries
- **library** — poems and translations
- **music** — songs with a synced-lyrics player
- **links**, **projects**, **contact**

## How it works

Everything is plain HTML, one small `app.js`, and `style.css`. Content lives as
Markdown files plus JSON manifests that list them:

- `posts/` — diary entries (`YYYY-MM-DD.md`), listed in `posts/index.json`
- `poems/`, `translations/` — same idea
- `music/index.json` — one entry per song; lyrics are fetched live from
  [lrclib.net](https://lrclib.net) and synced to the YouTube video

Pages load their list from the matching manifest at runtime, so adding content
just means dropping in a file and adding a line to the JSON.

## New look

The "new look" link in the header switches on a sky that follows the visitor's
local time, live weather and a few holidays; "classic look" switches it back.
It is off unless pressed, and the choice is kept in the browser's
`localStorage`. `sky.js` is only fetched when the look is on. It asks
[geojs.io](https://get.geojs.io) for the visitor's city and
[open-meteo.com](https://open-meteo.com) for the weather, at most once per
half hour. The song player and the 404 page stay on the classic look.
