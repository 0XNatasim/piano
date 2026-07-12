/*
 * Tiny piano synthesizer built on the Web Audio API.
 * No audio files required — each note is synthesized on the fly with a
 * short additive-harmonic tone and a percussive envelope so it reads as a
 * plucked/struck piano-ish sound.
 */

const NOTE_INDEX = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4,
  F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9,
  "A#": 10, Bb: 10, B: 11,
};

/** Convert a scientific-pitch note name (e.g. "C#4") to a frequency in Hz. */
function noteToFrequency(name) {
  const match = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!match) return null;
  const semitone = NOTE_INDEX[match[1]];
  const octave = parseInt(match[2], 10);
  // MIDI note number; A4 (MIDI 69) = 440 Hz.
  const midi = semitone + (octave + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class PianoAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
  }

  /** Lazily create the AudioContext (must happen after a user gesture). */
  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  /**
   * Play a note. `name` is a note name or a raw frequency number.
   * `duration` is in seconds. Returns immediately.
   */
  play(name, duration = 0.6) {
    const ctx = this.ensure();
    const freq = typeof name === "number" ? name : noteToFrequency(name);
    if (!freq) return;

    const now = ctx.currentTime;
    const voice = ctx.createGain();
    voice.connect(this.master);

    // Additive harmonics give the tone some body.
    const harmonics = [
      { mult: 1, gain: 1.0, type: "triangle" },
      { mult: 2, gain: 0.35, type: "sine" },
      { mult: 3, gain: 0.15, type: "sine" },
    ];
    const oscs = harmonics.map((h) => {
      const osc = ctx.createOscillator();
      osc.type = h.type;
      osc.frequency.value = freq * h.mult;
      const g = ctx.createGain();
      g.gain.value = h.gain;
      osc.connect(g);
      g.connect(voice);
      return osc;
    });

    // Percussive envelope: fast attack, exponential decay.
    const peak = 0.9;
    const end = now + Math.max(0.25, duration);
    voice.gain.setValueAtTime(0.0001, now);
    voice.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    voice.gain.exponentialRampToValueAtTime(0.0001, end);

    oscs.forEach((osc) => {
      osc.start(now);
      osc.stop(end + 0.05);
    });
  }
}

const pianoAudio = new PianoAudio();
