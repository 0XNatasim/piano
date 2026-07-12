/*
 * Piano-ish synthesizer built on the Web Audio API.
 * No audio files required. Each note runs through a small bank of harmonic
 * oscillators into a lowpass filter whose cutoff sweeps down after the
 * attack (bright hammer strike settling into a mellower tone), plus a touch
 * of algorithmic reverb — this reads much closer to a real piano than a
 * single bare oscillator with a flat envelope.
 */

const SEMITONE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_INDEX = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4,
  F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9,
  "A#": 10, Bb: 10, B: 11,
};

/** Convert a scientific-pitch note name (e.g. "C#4") to a MIDI note number. */
function noteToMidi(name) {
  const match = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!match) return null;
  const semitone = NOTE_INDEX[match[1]];
  const octave = parseInt(match[2], 10);
  return semitone + (octave + 1) * 12;
}

/** Convert a MIDI note number back to a scientific-pitch note name. */
function midiToNote(midi) {
  const name = SEMITONE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/** Convert a scientific-pitch note name to a frequency in Hz. */
function noteToFrequency(name) {
  const midi = noteToMidi(name);
  if (midi == null) return null;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class PianoAudio {
  constructor() {
    this.ctx = null;
    this.dry = null;
    this.wet = null;
    this.reverbInput = null;
    this.volume = 0.8;
  }

  /** Lazily build the audio graph (must happen after a user gesture). */
  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      this.ctx = ctx;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 20;
      compressor.ratio.value = 3.5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.22;
      compressor.connect(ctx.destination);

      this.dry = ctx.createGain();
      this.dry.gain.value = this.volume;
      this.dry.connect(compressor);

      this.wet = ctx.createGain();
      this.wet.gain.value = this.volume * 0.22;
      const convolver = ctx.createConvolver();
      convolver.buffer = this._impulseResponse(ctx, 1.4, 2.4);
      convolver.connect(this.wet);
      this.wet.connect(compressor);
      this.reverbInput = convolver;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  /** Synthetic decaying-noise "room" impulse — cheap but effective reverb. */
  _impulseResponse(ctx, seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  setVolume(v) {
    this.volume = v;
    if (this.dry) this.dry.gain.value = v;
    if (this.wet) this.wet.gain.value = v * 0.22;
  }

  /** Play a note (name or raw Hz frequency) for roughly `duration` seconds. */
  play(name, duration = 0.6) {
    const ctx = this.ensure();
    const freq = typeof name === "number" ? name : noteToFrequency(name);
    if (!freq) return;

    const now = ctx.currentTime;
    const sustain = Math.min(Math.max(duration, 0.25), 3.5);
    const releaseEnd = now + sustain + 0.35;

    const voice = ctx.createGain();
    voice.gain.value = 0.0001;
    voice.connect(this.dry);
    voice.connect(this.reverbInput);

    // Filter envelope: bright hammer strike settling into a mellower tone.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.4;
    filter.frequency.setValueAtTime(Math.min(freq * 9, 8500), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 2.2, 350), releaseEnd);
    filter.connect(voice);

    const harmonics = [
      { mult: 1, gain: 1.0 },
      { mult: 2, gain: 0.5 },
      { mult: 3, gain: 0.26 },
      { mult: 4, gain: 0.13 },
      { mult: 5, gain: 0.06 },
    ];
    const oscs = harmonics.map((h) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq * h.mult;
      const g = ctx.createGain();
      g.gain.value = h.gain;
      osc.connect(g);
      g.connect(filter);
      return osc;
    });

    // A slightly detuned unison partial adds warmth, like real piano strings.
    const chorus = ctx.createOscillator();
    chorus.type = "triangle";
    chorus.frequency.value = freq;
    chorus.detune.value = 6;
    const chorusGain = ctx.createGain();
    chorusGain.gain.value = 0.45;
    chorus.connect(chorusGain);
    chorusGain.connect(filter);
    oscs.push(chorus);

    // Amplitude envelope: fast attack, quick initial decay, long tail release.
    voice.gain.setValueAtTime(0.0001, now);
    voice.gain.exponentialRampToValueAtTime(0.9, now + 0.006);
    voice.gain.exponentialRampToValueAtTime(0.32, now + 0.15);
    voice.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    // Short filtered noise burst for the percussive hammer "thunk".
    const noiseDur = 0.018;
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 1500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.05;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(voice);

    oscs.forEach((osc) => { osc.start(now); osc.stop(releaseEnd + 0.1); });
    noise.start(now);
  }
}

const pianoAudio = new PianoAudio();
