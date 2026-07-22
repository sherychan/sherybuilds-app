# PQ34 — Party Quest: 34 Years

A birthday side-scroller. Static site, no build step.

## Structure

    index.html          the whole game: markup, CSS, config and engine (~93 KB)
    assets/img/         42 memory photos + 42 pixel-art pairs + 26 reel photos
    assets/audio/       ellinia.mp3, audition.mp3
    vercel.json         cache headers

## Editing

All copy lives in the first `<script>` block in `index.html`, under `window.CONFIG`:
names and job titles, the summit and final messages, `WALLET_LINES`,
`MEMORIES` (photo + falling item + caption) and `REEL`.

The second `<script>` block is the engine. `SLIMES` must always sum to
`MEMORIES.length` (currently 42).

## Swapping a photo

Replace the file in `assets/img/` keeping the same name. Each memory needs both
`mXX.jpg` (full size, ~1000 px) and `mXX_px.png` (104 px wide, nearest-neighbour,
~28 colours) — the pixel version is what the slime drops before the reveal.
`m01` is the exception: it is pixel art at full size, so it is `m01.png`.

## Local preview

    python3 -m http.server 8000

Then open http://localhost:8000 — opening `index.html` directly with `file://`
will not load the assets.
