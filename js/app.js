/*
 * Piano Lessons — app controller.
 * Flow: pick a category -> pick a song -> follow the falling notes.
 *
 * This is a follow-along tool for a real, physical piano: notes fall from
 * the top of the stage toward a keyboard reference at the bottom (the way
 * a Guitar Hero-style highway works), and the reference key lights up the
 * instant each note should be played. Nothing on screen is meant to be
 * clicked to make sound — it's just a guide.
 */

// Visual scroll speed for falling notes, in pixels per second.
const PX_PER_SEC = 130;

// Minimum visible keyboard span, in semitones, so short-range songs still
// get a legible width instead of a single cramped octave.
const MIN_RANGE_SEMITONES = 14;

const WHITE_KEY_MIN_PX = 26;
const WHITE_KEY_MAX_PX = 54;
const WHITE_SEMITONES = new Set([0, 2, 4, 5, 7, 9, 11]);
function isWhiteMidi(m) { return WHITE_SEMITONES.has(((m % 12) + 12) % 12); }

const state = {
  category: null,
  song: null,
  playing: false,
  tempoScale: 1,
  elapsedBase: 0,
  playStartPerf: 0,
  rafId: null,
  timeline: null,
  totalDuration: 0,
  layout: null,
  hitLineY: 0,
  keyMap: {}, // note name -> reference key element
};

const app = document.getElementById("app");

// ---------------------------------------------------------------------------
// Screen: category selection
// ---------------------------------------------------------------------------
function renderCategories() {
  pausePlayback();
  app.className = "screen screen-menu";
  app.innerHTML = `
    <header class="app-head">
      <h1>🎹 Piano Lessons</h1>
      <p class="subtitle">Learn songs one falling note at a time</p>
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
  pausePlayback();
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
      renderPlayer();
    };
  });
}

// ---------------------------------------------------------------------------
// Screen: player (falling notes + keyboard reference)
// ---------------------------------------------------------------------------
function renderPlayer() {
  pausePlayback();
  state.tempoScale = 1;
  state.elapsedBase = 0;
  state.timeline = null;
  state.keyMap = {};

  app.className = "screen screen-player";
  app.innerHTML = `
    <div class="player-top">
      <button class="back-btn" id="back">← Back</button>
      <div class="now-playing">
        <span class="np-title">${state.song.title}</span>
        <span class="np-cat">${state.category.icon} ${state.category.name}</span>
      </div>
      <span class="head-spacer"></span>
    </div>

    <div class="progress"><div class="progress-fill" id="progress"></div></div>

    <div class="falling-wrap" id="fallingWrap">
      <div class="falling-stage" id="fallingStage">
        <div class="falling-track" id="fallingTrack"></div>
        <div class="hit-line"></div>
      </div>
      <div class="keyboard-reference" id="keyboardRef"></div>
    </div>
    <p class="real-piano-hint">Play along on your own piano — the key lights up as each note reaches the line</p>

    <div class="controls">
      <button class="ctrl-btn" id="restart" title="Restart">⟲</button>
      <button class="play-btn" id="play">▶</button>
      <label class="slider-group">Speed
        <input type="range" id="tempo" min="0.5" max="1.5" step="0.1" value="1">
      </label>
      <label class="slider-group">Vol
        <input type="range" id="vol" min="0" max="1" step="0.05" value="0.8">
      </label>
    </div>
  `;

  setupFallingVisualizer();

  app.querySelector("#back").onclick = renderSongs;
  app.querySelector("#restart").onclick = restartPlayback;
  app.querySelector("#play").onclick = togglePlay;
  app.querySelector("#tempo").oninput = (e) => onTempoChange(2 - parseFloat(e.target.value));
  app.querySelector("#vol").oninput = (e) => pianoAudio.setVolume(parseFloat(e.target.value));
}

// ---------------------------------------------------------------------------
// Keyboard-span layout (shared by the reference row and the falling bars)
// ---------------------------------------------------------------------------
function getKeyRange(song) {
  const midis = song.steps.filter((s) => !s.rest).map((s) => noteToMidi(s.note));
  if (midis.length === 0) return { lo: 55, hi: 69 };
  let lo = Math.min(...midis) - 1;
  let hi = Math.max(...midis) + 1;
  while (hi - lo < MIN_RANGE_SEMITONES) {
    hi++;
    if (hi - lo < MIN_RANGE_SEMITONES) lo--;
  }
  return { lo, hi };
}

function buildLayout(lo, hi, containerWidth) {
  let loW = lo;
  let hiW = hi;
  while (!isWhiteMidi(loW)) loW--;
  while (!isWhiteMidi(hiW)) hiW++;

  const whiteMidis = [];
  for (let m = loW; m <= hiW; m++) if (isWhiteMidi(m)) whiteMidis.push(m);

  const whiteCount = Math.max(1, whiteMidis.length);
  let whiteWidth = containerWidth / whiteCount;
  whiteWidth = Math.min(Math.max(whiteWidth, WHITE_KEY_MIN_PX), WHITE_KEY_MAX_PX);
  const blackWidth = whiteWidth * 0.6;
  const totalWidth = whiteCount * whiteWidth;

  const keys = {};
  whiteMidis.forEach((m, i) => {
    keys[midiToNote(m)] = { left: i * whiteWidth, width: whiteWidth, isBlack: false };
    const blackMidi = m + 1;
    if (!isWhiteMidi(blackMidi)) {
      keys[midiToNote(blackMidi)] = {
        left: (i + 1) * whiteWidth - blackWidth / 2,
        width: blackWidth,
        isBlack: true,
      };
    }
  });

  return { whiteWidth, blackWidth, totalWidth, whiteCount, keys };
}

function setupFallingVisualizer() {
  const wrap = document.getElementById("fallingWrap");
  const stage = document.getElementById("fallingStage");
  const kbRef = document.getElementById("keyboardRef");
  if (!wrap || !stage || !kbRef) return;

  const containerWidth = wrap.clientWidth || 320;
  const range = getKeyRange(state.song);
  const layout = buildLayout(range.lo, range.hi, containerWidth);
  state.layout = layout;

  stage.style.width = `${layout.totalWidth}px`;
  kbRef.style.width = `${layout.totalWidth}px`;

  kbRef.innerHTML = "";
  state.keyMap = {};
  const entries = Object.entries(layout.keys);
  entries.filter(([, k]) => !k.isBlack).forEach(([note, k]) => {
    const el = document.createElement("div");
    el.className = "key-ref white-ref";
    el.style.left = `${k.left}px`;
    el.style.width = `${k.width}px`;
    el.innerHTML = `<span class="key-ref-label">${note.replace(/\d/, "")}</span>`;
    kbRef.appendChild(el);
    state.keyMap[note] = el;
  });
  entries.filter(([, k]) => k.isBlack).forEach(([note, k]) => {
    const el = document.createElement("div");
    el.className = "key-ref black-ref";
    el.style.left = `${k.left}px`;
    el.style.width = `${k.width}px`;
    kbRef.appendChild(el);
    state.keyMap[note] = el;
  });

  state.hitLineY = stage.clientHeight;
  rebuildBars();
}

// ---------------------------------------------------------------------------
// Timeline + falling bars
// ---------------------------------------------------------------------------
function buildTimeline(song, tempoScale) {
  const beatSec = (60 / song.tempo) * tempoScale;
  let t = 0;
  const timeline = song.steps.map((step) => {
    const dur = step.beats * beatSec;
    const entry = step.rest
      ? { rest: true, start: t, dur }
      : { note: step.note, start: t, dur, _triggered: false };
    t += dur;
    return entry;
  });
  return { timeline, total: t };
}

function rebuildBars() {
  const track = document.getElementById("fallingTrack");
  if (!track || !state.layout) return;
  track.innerHTML = "";

  const { timeline, total } = buildTimeline(state.song, state.tempoScale);
  state.timeline = timeline;
  state.totalDuration = total;

  const gap = 4;
  timeline.forEach((n) => {
    if (n.rest) return;
    const lane = state.layout.keys[n.note];
    if (!lane) return;
    const heightPx = Math.max(10, n.dur * PX_PER_SEC - gap);
    const bar = document.createElement("div");
    bar.className = "note-bar" + (lane.isBlack ? " note-bar-black" : "");
    bar.style.left = `${lane.left + 2}px`;
    bar.style.width = `${lane.width - 4}px`;
    bar.style.height = `${heightPx}px`;
    bar.style.top = `${state.hitLineY - n.start * PX_PER_SEC - heightPx}px`;
    if (lane.width > 30) {
      bar.innerHTML = `<span class="note-bar-label">${n.note.replace(/\d/, "")}</span>`;
    }
    track.appendChild(bar);
  });

  track.style.transform = "translateY(0px)";
}

// ---------------------------------------------------------------------------
// Playback engine — one elapsed-time clock drives the scroll transform,
// the audio triggers, the key-reference highlight, and the progress bar.
// ---------------------------------------------------------------------------
function togglePlay() {
  if (state.playing) pausePlayback();
  else startPlayback();
}

function startPlayback() {
  pianoAudio.ensure();
  if (!state.timeline) rebuildBars();
  state.playing = true;
  const playBtn = document.getElementById("play");
  if (playBtn) playBtn.textContent = "⏸";
  state.playStartPerf = performance.now();
  state.rafId = requestAnimationFrame(tick);
}

function pausePlayback() {
  state.playing = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  const playBtn = document.getElementById("play");
  if (playBtn) playBtn.textContent = "▶";
}

function restartPlayback() {
  pausePlayback();
  state.elapsedBase = 0;
  rebuildBars();
  clearHighlights();
  updateProgress(0);
}

function tick() {
  if (!state.playing) return;
  const elapsed = state.elapsedBase + (performance.now() - state.playStartPerf) / 1000;

  seekVisualTo(elapsed);

  const activeNotes = new Set();
  for (const n of state.timeline) {
    if (n.rest) continue;
    if (elapsed >= n.start && elapsed < n.start + n.dur) {
      activeNotes.add(n.note);
      if (!n._triggered) {
        n._triggered = true;
        pianoAudio.play(n.note, n.dur);
      }
    }
  }
  Object.entries(state.keyMap).forEach(([note, el]) => {
    el.classList.toggle("active", activeNotes.has(note));
  });

  updateProgress((elapsed / state.totalDuration) * 100);

  if (elapsed >= state.totalDuration + 0.6) {
    finishSong();
    return;
  }
  state.rafId = requestAnimationFrame(tick);
}

function finishSong() {
  pausePlayback();
  state.elapsedBase = 0;
  clearHighlights();
  seekVisualTo(0);
  if (state.timeline) state.timeline.forEach((n) => { if (!n.rest) n._triggered = false; });
  updateProgress(0);
}

function onTempoChange(newScale) {
  const oldScale = state.tempoScale;
  if (newScale === oldScale) return;

  const wasPlaying = state.playing;
  const elapsedNow = wasPlaying
    ? state.elapsedBase + (performance.now() - state.playStartPerf) / 1000
    : state.elapsedBase;
  const rescaled = elapsedNow * (newScale / oldScale);

  state.tempoScale = newScale;
  rebuildBars();
  state.timeline.forEach((n) => { if (!n.rest && n.start <= rescaled) n._triggered = true; });
  state.elapsedBase = rescaled;
  seekVisualTo(rescaled);
  if (wasPlaying) state.playStartPerf = performance.now();
}

function seekVisualTo(elapsedSeconds) {
  const track = document.getElementById("fallingTrack");
  if (track) track.style.transform = `translateY(${elapsedSeconds * PX_PER_SEC}px)`;
}

function clearHighlights() {
  Object.values(state.keyMap).forEach((el) => el.classList.remove("active"));
}

function updateProgress(pct) {
  const fill = document.getElementById("progress");
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

// ---------------------------------------------------------------------------
// Responsive: rebuild the layout (and keep playback in sync) on resize.
// ---------------------------------------------------------------------------
let resizeTimer = null;
window.addEventListener("resize", () => {
  if (!app.className.includes("screen-player")) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const wasPlaying = state.playing;
    const elapsedNow = wasPlaying
      ? state.elapsedBase + (performance.now() - state.playStartPerf) / 1000
      : state.elapsedBase;

    pausePlayback();
    setupFallingVisualizer();
    state.timeline.forEach((n) => { if (!n.rest && n.start <= elapsedNow) n._triggered = true; });
    state.elapsedBase = elapsedNow;
    seekVisualTo(elapsedNow);

    if (wasPlaying) {
      state.playStartPerf = performance.now();
      state.playing = true;
      const playBtn = document.getElementById("play");
      if (playBtn) playBtn.textContent = "⏸";
      state.rafId = requestAnimationFrame(tick);
    }
  }, 150);
});

// Space bar toggles play/pause while on the player screen.
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && app.className.includes("screen-player")) {
    e.preventDefault();
    togglePlay();
  }
});

// Boot
renderCategories();
