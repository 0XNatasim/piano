# 🎹 Piano Lessons

A lightweight, install-free web app for learning to play songs on a virtual
piano — inspired by falling-tile piano trainers. Pick a **category**, choose a
**song**, select your **note colors**, then play along on an on-screen keyboard.

## Features

- **Category selection** — Beginner Basics, Classical, Holiday, Pop & Fun.
- **Song selection** — each song shows its difficulty, note count and tempo.
- **Color selection** — six note-tile themes (Sunset, Ocean, Grape, Mint,
  Candy, Rainbow) that recolor the falling tiles and the glowing keys.
- **Two ways to learn**
  - **Play** ▶ — the song plays itself, highlighting each key in time.
  - **Practice** 🎯 — the next key glows and waits for you to press it before
    advancing, so you set your own pace.
- **Upcoming-note tiles** — the next notes appear as colored cards on the right,
  matching the piano-trainer style.
- **Playable keyboard** — two octaves (C4–C6). Tap/click keys, or use your
  computer keyboard (`A S D F G H J K L` = white keys, `Space` = play/pause).
- **Tempo & volume** controls, plus a progress bar.
- **No build step, no dependencies, no audio files** — the piano is synthesized
  live with the Web Audio API.

## Run it

It's a static site — just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
index.html        # markup + script/style includes
css/styles.css    # all styling (dark theme, keyboard, tiles)
js/songs.js       # song library + note-sequence data
js/audio.js       # Web Audio piano synthesizer
js/app.js         # screen flow, keyboard, playback engine
```

## Adding a song

Songs live in `js/songs.js`. Add an entry to a category's `songs` array using
the `notes(...)` helper — each row is a flat list of note names, and a number
right after a note sets that note's length in beats (default 1):

```js
{
  id: "my-song",
  title: "My Song",
  difficulty: "Easy",
  tempo: 110,
  steps: notes(
    ["C4", "E4", "G4", 2],   // C4, E4 = 1 beat each; G4 = 2 beats
    ["C5", 2]
  ),
}
```
