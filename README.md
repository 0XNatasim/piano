# 🎹 Piano Lessons

A lightweight, install-free follow-along tool for playing songs on a **real,
physical piano** — falling note-bars scroll down a Guitar Hero-style highway
toward a keyboard reference, lighting up the exact key to play the instant
each note should sound. Pick a **category**, choose a **song**, and follow along.

## Features

- **Category selection** — Beginner Basics, Classical, Holiday, Pop & Fun.
- **Song selection** — each song shows its difficulty, note count and tempo.
- **Falling notes** — notes scroll down the screen in real time and land on a
  glowing hit line, sized by duration and positioned by pitch, just like a
  Guitar Hero / Synthesia highway.
- **Passive keyboard reference** — a keyboard strip at the bottom lights up
  each key as its note arrives. It's a visual guide only — nothing on screen
  is clickable to make sound, since you're meant to play on your own piano.
- **Speed & volume** controls (speed can be changed live, mid-song) plus a
  progress bar.
- **No build step, no dependencies, no audio files** — the piano is
  synthesized live with the Web Audio API (harmonic oscillator bank, a
  brightness-decay filter envelope, and a touch of reverb) so there's a
  reference tone to follow without needing sample libraries.

## Run it

It's a static site — just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
index.html        # markup + script/style includes
css/styles.css    # all styling (dark theme, falling-notes highway, keyboard reference)
js/songs.js       # song library + note-sequence data
js/audio.js       # Web Audio piano synthesizer
js/app.js         # screen flow, falling-notes engine, keyboard-reference layout
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
