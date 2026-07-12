/*
 * Piano Lessons — app controller.
 * Flow: pick a category -> pick a song -> pick a color theme -> play/practice.
 */

// ----- Color themes for note tiles + key highlights -----
const COLOR_THEMES = [
  { id: "sunset",  name: "Sunset",  swatch: "#ff8a3d", tile: "linear-gradient(180deg,#ffd23d,#ff8a3d)", glow: "#ffb347", key: "#ffcf4d" },
  { id: "ocean",   name: "Ocean",   swatch: "#2fa8ff", tile: "linear-gradient(180deg,#5fd0ff,#2f7bff)", glow: "#5fd0ff", key: "#57c1ff" },
  { id: "grape",   name: "Grape",   swatch: "#a55bff", tile: "linear-gradient(180deg,#c98bff,#7b3bff)", glow: "#b57bff", key: "#b98bff" },
  { id: "mint",    name: "Mint",    swatch: "#28d6a5", tile: "linear-gradient(180deg,#6bf0c8,#12b98a)", glow: "#4fe9be", key: "#4fe0b6" },
  { id: "candy",   name: "Candy",   swatch: "#ff5f9e", tile: "linear-gradient(180deg,#ff9ec4,#ff3d84)", glow: "#ff7fb0", key: "#ff86b6" },
  { id: "rainbow", name: "Rainbow", swatch: "linear-gradient(90deg,#ff5f6d,#ffc371,#5fd0ff,#a55bff)", tile: "rainbow", glow: "#ffffff", key: "#ffffff" },
];

const RAINBOW_COLORS = ["#ff5f6d", "#ff9f43", "#feca57", "#1dd1a1", "#54a0ff", "#a55bff", "#ff6bcb"];

// Keyboard span (2 octaves, covers every song in the library).
const KEYBOARD_START = "C4";
const KEYBOARD_END = "C6";

const state = {
  category: null,
  song: null,
  theme: COLOR_THEMES[0],
  practice: false,
  tempoScale: 1,
  playing: false,
  stepIndex: 0,
  timer: null,
  keyMap: {}, // note name -> key element
};

const app = document.getElementById("app");

// ---------------------------------------------------------------------------
// Screen: category selection
// ---------------------------------------------------------------------------
function renderCategories() {
  stopPlayback();
  app.className = "screen screen-menu";
  app.innerHTML = `
    <header class="app-head">
      <h1>🎹 Piano Lessons</h1>
      <p class="subtitle">Learn songs one glowing key at a time</p>
    </header>
    <h2 class="section-title">Choose a category</h2>
    <div class="card-grid">
      ${SONG_LIBRARY.map((cat) => `
        <button class="card cat-card" data-cat="${cat.id}">
          <span class="card-icon">${cat.icon}</span>
          <span class="card-title">${cat.name}</span>
          <span class="card-sub">${cat.songs.length} song${cat.songs.length > 1 ? "s" : ""}</span>
        </button>
      `).join("")}
    </div>
  `;
  app.querySelectorAll(".cat-card").forEach((btn) => {
    btn.onclick = () => {
      state.category = SONG_LIBRARY.find((c) => c.id === btn.dataset.cat);
      renderSongs();
    };
  });
}

// ---------------------------------------------------------------------------
// Screen: song selection
// ---------------------------------------------------------------------------
function renderSongs() {
  stopPlayback();
  app.className = "screen screen-menu";
  const cat = state.category;
  app.innerHTML = `
    <header class="app-head">
      <button class="back-btn" id="back">← Categories</button>
      <h1>${cat.icon} ${cat.name}</h1>
    </header>
    <h2 class="section-title">Choose a song</h2>
    <div class="song-list">
      ${cat.songs.map((song) => `
        <button class="song-row" data-song="${song.id}">
          <span class="song-info">
            <span class="song-title">${song.title}</span>
            <span class="song-meta">${song.steps.length} notes • ${song.tempo} BPM</span>
          </span>
          <span class="diff diff-${song.difficulty.toLowerCase()}">${song.difficulty}</span>
        </button>
      `).join("")}
    </div>
  `;
  app.querySelector("#back").onclick = renderCategories;
  app.querySelectorAll(".song-row").forEach((btn) => {
    btn.onclick = () => {
      state.song = cat.songs.find((s) => s.id === btn.dataset.song);
      renderColors();
    };
  });
}

// ---------------------------------------------------------------------------
// Screen: color theme selection
// ---------------------------------------------------------------------------
function renderColors() {
  stopPlayback();
  app.className = "screen screen-menu";
  app.innerHTML = `
    <header class="app-head">
      <button class="back-btn" id="back">← Songs</button>
      <h1>${state.song.title}</h1>
    </header>
    <h2 class="section-title">Pick your note colors</h2>
    <div class="color-grid">
      ${COLOR_THEMES.map((t) => `
        <button class="color-card ${t.id === state.theme.id ? "selected" : ""}" data-theme="${t.id}">
          <span class="swatch" style="background:${t.swatch}"></span>
          <span class="color-name">${t.name}</span>
        </button>
      `).join("")}
    </div>
    <button class="primary-btn" id="start">Start Playing →</button>
  `;
  app.querySelector("#back").onclick = renderSongs;
  app.querySelectorAll(".color-card").forEach((btn) => {
    btn.onclick = () => {
      state.theme = COLOR_THEMES.find((t) => t.id === btn.dataset.theme);
      app.querySelectorAll(".color-card").forEach((c) => c.classList.remove("selected"));
      btn.classList.add("selected");
    };
  });
  app.querySelector("#start").onclick = renderPlayer;
}

// ---------------------------------------------------------------------------
// Screen: player (keyboard + falling note tiles)
// ---------------------------------------------------------------------------
function renderPlayer() {
  stopPlayback();
  state.stepIndex = 0;
  app.className = "screen screen-player";
  app.innerHTML = `
    <div class="player-top">
      <button class="back-btn" id="back">← Back</button>
      <div class="now-playing">
        <span class="np-title">${state.song.title}</span>
        <span class="np-cat">${state.category.icon} ${state.category.name}</span>
      </div>
      <button class="icon-btn ${state.practice ? "active" : ""}" id="practice"
        title="Practice mode: wait for the correct key">🎯</button>
    </div>

    <div class="progress"><div class="progress-fill" id="progress"></div></div>

    <div class="stage">
      <div class="tiles-column" id="tiles"></div>
      <div class="stage-hint" id="hint"></div>
    </div>

    <div class="keyboard-wrap">
      <div class="keyboard" id="keyboard"></div>
    </div>

    <div class="controls">
      <button class="ctrl-btn" id="restart" title="Restart">⟲</button>
      <button class="play-btn" id="play">▶</button>
      <label class="slider-group">Tempo
        <input type="range" id="tempo" min="0.5" max="1.5" step="0.1" value="1">
      </label>
      <label class="slider-group">Vol
        <input type="range" id="vol" min="0" max="1" step="0.05" value="0.8">
      </label>
    </div>
  `;

  buildKeyboard();
  renderTiles();
  updateHint();

  app.querySelector("#back").onclick = renderColors;
  app.querySelector("#restart").onclick = () => {
    stopPlayback();
    state.stepIndex = 0;
    renderTiles();
    updateProgress();
    updateHint();
  };
  const playBtn = app.querySelector("#play");
  playBtn.onclick = togglePlay;

  app.querySelector("#practice").onclick = (e) => {
    state.practice = !state.practice;
    e.currentTarget.classList.toggle("active", state.practice);
    stopPlayback();
    updateHint();
  };

  app.querySelector("#tempo").oninput = (e) => {
    // Larger slider value = faster, so invert into a delay scale.
    state.tempoScale = 2 - parseFloat(e.target.value);
  };
  app.querySelector("#vol").oninput = (e) => pianoAudio.setVolume(parseFloat(e.target.value));

  applyThemeVars();
}

// ---------------------------------------------------------------------------
// Keyboard construction
// ---------------------------------------------------------------------------
const WHITE = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_AFTER = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };

function buildKeyboard() {
  const kb = app.querySelector("#keyboard");
  kb.innerHTML = "";
  state.keyMap = {};

  const startOct = parseInt(KEYBOARD_START.slice(-1), 10);
  const endOct = parseInt(KEYBOARD_END.slice(-1), 10);

  for (let oct = startOct; oct <= endOct; oct++) {
    for (const w of WHITE) {
      const noteName = `${w}${oct}`;
      if (noteName === KEYBOARD_END && w !== KEYBOARD_END.slice(0, -1)) continue;

      const keyWrap = document.createElement("div");
      keyWrap.className = "white-key-wrap";

      const white = document.createElement("button");
      white.className = "key white-key";
      white.dataset.note = noteName;
      white.innerHTML = `<span class="key-label">${noteName}</span>`;
      white.onclick = () => pressKey(noteName);
      keyWrap.appendChild(white);
      state.keyMap[noteName] = white;

      // Black key sits over the right edge of its white key.
      if (BLACK_AFTER[w] && !(oct === endOct && w === "B")) {
        const blackName = `${BLACK_AFTER[w]}${oct}`;
        if (oct < endOct || w !== KEYBOARD_END.slice(0, -1)) {
          const black = document.createElement("button");
          black.className = "key black-key";
          black.dataset.note = blackName;
          black.onclick = (e) => { e.stopPropagation(); pressKey(blackName); };
          keyWrap.appendChild(black);
          state.keyMap[blackName] = black;
        }
      }

      // Stop building once we reach the configured end note.
      if (noteName === KEYBOARD_END) { kb.appendChild(keyWrap); return; }
      kb.appendChild(keyWrap);
    }
  }
}

// ---------------------------------------------------------------------------
// Note tiles (upcoming notes shown as colored cards)
// ---------------------------------------------------------------------------
function tileColor(offset) {
  if (state.theme.tile === "rainbow") {
    return { background: RAINBOW_COLORS[(state.stepIndex + offset) % RAINBOW_COLORS.length] };
  }
  return { background: state.theme.tile };
}

function renderTiles() {
  const col = app.querySelector("#tiles");
  if (!col) return;
  col.innerHTML = "";
  const upcoming = state.song.steps.slice(state.stepIndex, state.stepIndex + 6);
  upcoming.forEach((step, i) => {
    const tile = document.createElement("div");
    tile.className = "tile" + (i === 0 ? " tile-next" : "");
    const c = tileColor(i);
    tile.style.background = c.background;
    tile.style.opacity = String(1 - i * 0.14);
    tile.textContent = step.note.replace(/(\d)/, "");
    tile.title = step.note;
    col.appendChild(tile);
  });
}

// ---------------------------------------------------------------------------
// Playback engine
// ---------------------------------------------------------------------------
function togglePlay() {
  if (state.practice) return; // practice advances on key press, not a timer
  if (state.playing) stopPlayback();
  else startPlayback();
}

function startPlayback() {
  pianoAudio.ensure();
  state.playing = true;
  const playBtn = app.querySelector("#play");
  if (playBtn) playBtn.textContent = "⏸";
  scheduleNext();
}

function scheduleNext() {
  if (!state.playing) return;
  if (state.stepIndex >= state.song.steps.length) {
    finishSong();
    return;
  }
  const step = state.song.steps[state.stepIndex];
  const beatMs = (60000 / state.song.tempo) * state.tempoScale;
  const durMs = step.beats * beatMs;

  playStep(step, durMs / 1000);
  highlightCurrent();
  renderTiles();
  updateProgress();

  state.timer = setTimeout(() => {
    state.stepIndex++;
    scheduleNext();
  }, durMs);
}

function playStep(step, durSec) {
  if (step.rest) return;
  pianoAudio.play(step.note, Math.min(durSec, 1.2));
}

function stopPlayback() {
  state.playing = false;
  if (state.timer) { clearTimeout(state.timer); state.timer = null; }
  const playBtn = app && app.querySelector("#play");
  if (playBtn) playBtn.textContent = "▶";
}

function finishSong() {
  stopPlayback();
  const hint = app.querySelector("#hint");
  if (hint) hint.textContent = "🎉 Nice! Song complete.";
  clearHighlights();
}

// ---------------------------------------------------------------------------
// Highlighting / interaction
// ---------------------------------------------------------------------------
function clearHighlights() {
  Object.values(state.keyMap).forEach((k) => k.classList.remove("active", "target"));
}

function highlightCurrent() {
  clearHighlights();
  const step = state.song.steps[state.stepIndex];
  if (!step || step.rest) return;
  const key = state.keyMap[step.note];
  if (key) {
    key.classList.add("active");
    // Briefly flash then leave a target ring.
    setTimeout(() => key.classList.remove("active"), 220);
  }
}

function updateHint() {
  const hint = app.querySelector("#hint");
  if (!hint) return;
  if (state.practice) {
    markTarget();
    const step = state.song.steps[state.stepIndex];
    hint.textContent = step ? `Press ${step.note}` : "🎉 Complete!";
  } else {
    clearHighlights();
    hint.textContent = "Press ▶ to hear it play, or tap the keys yourself";
  }
}

function markTarget() {
  clearHighlights();
  const step = state.song.steps[state.stepIndex];
  if (step && !step.rest && state.keyMap[step.note]) {
    state.keyMap[step.note].classList.add("target");
  }
}

function pressKey(noteName) {
  pianoAudio.play(noteName, 0.7);
  const key = state.keyMap[noteName];
  if (key) {
    key.classList.add("active");
    setTimeout(() => key.classList.remove("active"), 180);
  }

  if (state.practice) {
    const step = state.song.steps[state.stepIndex];
    if (step && step.note === noteName) {
      state.stepIndex++;
      renderTiles();
      updateProgress();
      if (state.stepIndex >= state.song.steps.length) {
        const hint = app.querySelector("#hint");
        if (hint) hint.textContent = "🎉 Perfect! You played the whole song.";
        clearHighlights();
      } else {
        updateHint();
      }
    }
  }
}

function updateProgress() {
  const fill = app.querySelector("#progress");
  if (fill) {
    const pct = (state.stepIndex / state.song.steps.length) * 100;
    fill.style.width = `${Math.min(100, pct)}%`;
  }
}

// ---------------------------------------------------------------------------
// Theme application
// ---------------------------------------------------------------------------
function applyThemeVars() {
  const root = document.documentElement;
  root.style.setProperty("--theme-glow", state.theme.glow);
  root.style.setProperty("--theme-key", state.theme.key);
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts (physical keyboard -> piano keys, home row = white keys)
// ---------------------------------------------------------------------------
const KEY_BINDINGS = { a: "C4", s: "D4", d: "E4", f: "F4", g: "G4", h: "A4", j: "B4", k: "C5", l: "D5" };
document.addEventListener("keydown", (e) => {
  if (state.category === null || app.className.indexOf("screen-player") === -1) return;
  if (e.repeat) return;
  const note = KEY_BINDINGS[e.key.toLowerCase()];
  if (note && state.keyMap[note]) pressKey(note);
  if (e.code === "Space") { e.preventDefault(); togglePlay(); }
});

// Boot
renderCategories();
