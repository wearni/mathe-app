/* ============================================================
   Mathe App - 8-Bit Sound-Engine (WebAudio, ohne Dateien)
   ============================================================ */
(function (global) {
  'use strict';

  let ctx = null;
  let masterSfx = null;
  let masterMusic = null;
  let ready = false;

  const state = { sfx: true, music: true };

  function init() {
    if (ctx) return ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterSfx = ctx.createGain();
    masterSfx.gain.value = 0.32;
    masterSfx.connect(ctx.destination);
    masterMusic = ctx.createGain();
    masterMusic.gain.value = 0.0;
    masterMusic.connect(ctx.destination);
    ready = true;
    return ctx;
  }

  function resume() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ---------- Grundbaustein: ein Chip-Ton ---------- */
  function tone(opts) {
    if (!ready || !state.sfx) return;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    }
    const vol = opts.vol == null ? 0.3 : opts.vol;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(masterSfx);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* ---------- Rauschen für Explosionen ---------- */
  let noiseBuffer = null;
  function getNoise() {
    if (noiseBuffer) return noiseBuffer;
    const len = ctx.sampleRate * 0.6;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function noise(dur, vol, freq, delay) {
    if (!ready || !state.sfx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(freq || 1800, t0);
    filt.frequency.exponentialRampToValueAtTime(180, t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(gain); gain.connect(masterSfx);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* ---------- Effekte ---------- */
  const SFX = {
    click:    () => tone({ freq: 660, to: 880, dur: 0.06, type: 'square', vol: 0.22 }),
    type:     () => tone({ freq: 880, dur: 0.035, type: 'square', vol: 0.15 }),
    back:     () => tone({ freq: 400, to: 260, dur: 0.07, type: 'square', vol: 0.18 }),
    shoot:    () => { tone({ freq: 980, to: 380, dur: 0.1, type: 'square', vol: 0.22 }); noise(0.06, 0.1, 3000); },
    hit:      () => {
      tone({ freq: 520, to: 1240, dur: 0.09, type: 'square', vol: 0.26 });
      tone({ freq: 780, to: 1560, dur: 0.12, type: 'square', vol: 0.2, delay: 0.05 });
      noise(0.22, 0.24, 2400, 0.02);
    },
    wrong:    () => {
      tone({ freq: 300, to: 150, dur: 0.16, type: 'sawtooth', vol: 0.24 });
      tone({ freq: 150, to: 90, dur: 0.2, type: 'square', vol: 0.18, delay: 0.1 });
    },
    life:     () => {
      noise(0.5, 0.35, 1400);
      tone({ freq: 240, to: 60, dur: 0.5, type: 'sawtooth', vol: 0.26 });
      tone({ freq: 180, to: 50, dur: 0.55, type: 'square', vol: 0.18, delay: 0.06 });
    },
    heart:    () => {
      [660, 880, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.11, type: 'triangle', vol: 0.28, delay: i * 0.07 }));
    },
    combo:    (n) => {
      const base = 660 * Math.pow(1.06, Math.min(n, 12));
      tone({ freq: base, to: base * 1.5, dur: 0.1, type: 'triangle', vol: 0.22 });
    },
    levelup:  () => {
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        tone({ freq: f, dur: 0.13, type: 'square', vol: 0.26, delay: i * 0.075 }));
    },
    badge:    () => {
      [784, 988, 1174, 1568].forEach((f, i) =>
        tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.3, delay: i * 0.09 }));
    },
    gameover: () => {
      [523, 466, 392, 311, 196].forEach((f, i) =>
        tone({ freq: f, dur: 0.28, type: 'square', vol: 0.28, delay: i * 0.17 }));
      noise(0.7, 0.2, 900, 0.7);
    },
    start:    () => {
      [392, 523, 659, 784].forEach((f, i) =>
        tone({ freq: f, dur: 0.1, type: 'square', vol: 0.26, delay: i * 0.06 }));
    },
    golden:   () => {
      [1046, 1318, 1568, 2093].forEach((f, i) =>
        tone({ freq: f, dur: 0.1, type: 'square', vol: 0.24, delay: i * 0.05 }));
    }
  };

  function play(name, arg) {
    if (!ready) init();
    if (!ready || !state.sfx) return;
    resume();
    const fn = SFX[name];
    if (fn) { try { fn(arg); } catch (e) { /* ignore */ } }
  }

  /* ============================================================
     Chiptune-Hintergrundmusik: 4 Akkorde, Bass + Arpeggio + Lead
     ============================================================ */
  const NOTE = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00
  };

  /* I - V - vi - IV in C-Dur */
  const CHORDS = [
    { bass: NOTE.C3, arp: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.E4] },
    { bass: NOTE.G3, arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.B3] },
    { bass: NOTE.A3, arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.C4] },
    { bass: NOTE.F3, arp: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.A3] }
  ];
  const MELODY = [
    NOTE.E5, 0, NOTE.G5, 0, NOTE.E5, NOTE.D5, 0, 0,
    NOTE.D5, 0, NOTE.B4, 0, NOTE.D5, 0, 0, 0,
    NOTE.C5, 0, NOTE.E5, 0, NOTE.A4, 0, NOTE.C5, 0,
    NOTE.F5, 0, NOTE.E5, NOTE.D5, NOTE.C5, 0, 0, 0
  ];

  let musicTimer = null;
  let step = 0;
  let nextTime = 0;
  let tempo = 132;
  let musicPlaying = false;

  function musicNote(freq, time, dur, type, vol) {
    if (!freq) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain); gain.connect(masterMusic);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function scheduler() {
    if (!ready || !musicPlaying) return;
    const spb = 60 / tempo / 2; /* Achtel */
    while (nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % CHORDS.length;
      const ch = CHORDS[bar];
      const inBar = step % 8;
      /* Bass auf 1 und 5 */
      if (inBar === 0 || inBar === 4) musicNote(ch.bass, nextTime, spb * 1.6, 'triangle', 0.5);
      /* Arpeggio durchgehend */
      musicNote(ch.arp[inBar % ch.arp.length], nextTime, spb * 0.75, 'square', 0.16);
      /* Melodie */
      const m = MELODY[step % MELODY.length];
      if (m) musicNote(m, nextTime, spb * 1.3, 'square', 0.13);
      nextTime += spb;
      step++;
    }
  }

  function startMusic(speed) {
    if (!ready) init();
    if (!ready || !state.music) return;
    resume();
    tempo = speed || 132;
    if (musicPlaying) { return; }
    musicPlaying = true;
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    masterMusic.gain.cancelScheduledValues(ctx.currentTime);
    masterMusic.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterMusic.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 1.2);
    musicTimer = setInterval(scheduler, 40);
  }

  function setTempo(t) { tempo = t; }

  function stopMusic() {
    musicPlaying = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (ready && masterMusic) {
      masterMusic.gain.cancelScheduledValues(ctx.currentTime);
      masterMusic.gain.setValueAtTime(masterMusic.gain.value, ctx.currentTime);
      masterMusic.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    }
  }

  function setSfx(on) { state.sfx = !!on; }
  function setMusic(on) {
    state.music = !!on;
    if (!on) stopMusic();
  }

  global.Sound = {
    init, resume, play, startMusic, stopMusic, setTempo, setSfx, setMusic,
    get isMusicPlaying() { return musicPlaying; }
  };
})(window);
