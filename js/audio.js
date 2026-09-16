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
     Chiptune-Hintergrundmusik

     Drei Stücke à 8 Takte (64 Achtel) - doppelt so lang wie vorher.
     Jedes hat eine eigene Akkordfolge, Melodie, Basslinie und ein
     einfaches Schlagzeug. Pro Runde wird zufällig eines gewählt,
     nie zweimal dasselbe hintereinander.
     ============================================================ */
  const NOTE = {
    'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
    'C3': 130.81, 'CS3': 138.59, 'D3': 146.83, 'DS3': 155.56, 'E3': 164.81, 'F3': 174.61,
    'FS3': 185.00, 'G3': 196.00, 'GS3': 207.65, 'A3': 220.00, 'AS3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'CS4': 277.18, 'D4': 293.66, 'DS4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'FS4': 369.99, 'G4': 392.00, 'GS4': 415.30, 'A4': 440.00, 'AS4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'CS5': 554.37, 'D5': 587.33, 'DS5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'FS5': 739.99, 'G5': 783.99, 'GS5': 830.61, 'A5': 880.00, 'AS5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'G6': 1567.98
  };

  function seq(str) {
    return str.trim().split(/\s+/).map(t => (t === '.' ? 0 : (NOTE[t] || 0)));
  }
  function chordSeq(list) {
    return list.map(c => ({ bass: NOTE[c.b], arp: c.a.map(n => NOTE[n]) }));
  }

  const TRACKS = [
    {
      /* 1) Sternenflug - freundlich, C-Dur */
      name: 'Sternenflug', tempo: 128,
      chords: chordSeq([
        { b: 'C3', a: ['C4', 'E4', 'G4', 'E4'] },
        { b: 'G2', a: ['G3', 'B3', 'D4', 'B3'] },
        { b: 'A2', a: ['A3', 'C4', 'E4', 'C4'] },
        { b: 'F2', a: ['F3', 'A3', 'C4', 'A3'] },
        { b: 'C3', a: ['C4', 'E4', 'G4', 'E4'] },
        { b: 'G2', a: ['G3', 'B3', 'D4', 'B3'] },
        { b: 'F2', a: ['F3', 'A3', 'C4', 'A3'] },
        { b: 'G2', a: ['G3', 'B3', 'D4', 'G4'] }
      ]),
      melody: seq(`
        E5 .  G5 .  E5 D5 .  .
        D5 .  B4 .  D5 .  .  .
        C5 .  E5 .  A4 .  C5 .
        F5 .  E5 D5 C5 .  .  .
        E5 .  G5 .  C6 .  B5 .
        D5 .  G5 .  B5 .  A5 .
        C5 .  F5 .  A5 .  G5 .
        B4 .  D5 .  G5 .  .  .
      `),
      drums: 'k...h...k..kh...k...h...k..kh..s' + 'k...h...k..kh...k..sh...k.k.hs..'
    },
    {
      /* 2) Turbo-Rechner - treibend, a-Moll */
      name: 'Turbo-Rechner', tempo: 144,
      chords: chordSeq([
        { b: 'A2', a: ['A3', 'C4', 'E4', 'C4'] },
        { b: 'F2', a: ['F3', 'A3', 'C4', 'A3'] },
        { b: 'C3', a: ['C4', 'E4', 'G4', 'E4'] },
        { b: 'G2', a: ['G3', 'B3', 'D4', 'B3'] },
        { b: 'A2', a: ['A3', 'C4', 'E4', 'A4'] },
        { b: 'F2', a: ['F3', 'A3', 'C4', 'F4'] },
        { b: 'G2', a: ['G3', 'B3', 'D4', 'G4'] },
        { b: 'A2', a: ['A3', 'E4', 'A4', 'E4'] }
      ]),
      melody: seq(`
        A5 .  A5 G5 E5 .  .  D5
        F5 .  F5 E5 C5 .  .  .
        E5 .  G5 .  C6 .  B5 G5
        D5 .  B4 .  G4 .  .  .
        A5 A5 .  C6 B5 .  A5 .
        F5 F5 .  A5 G5 .  F5 .
        G5 .  B5 .  D6 .  B5 .
        A5 .  E5 .  A4 .  .  .
      `),
      drums: 'k.h.s.h.k.h.s.h.k.h.s.h.k.hks.h.' + 'k.h.s.h.k.h.s.h.k.h.s.h.kkh.s.hh'
    },
    {
      /* 3) Mondspaziergang - ruhig, F-Dur */
      name: 'Mondspaziergang', tempo: 112,
      chords: chordSeq([
        { b: 'F2', a: ['F3', 'A3', 'C4', 'A3'] },
        { b: 'D3', a: ['D3', 'F3', 'A3', 'F3'] },
        { b: 'AS3', a: ['AS3', 'D4', 'F4', 'D4'] },
        { b: 'C3', a: ['C4', 'E4', 'G4', 'E4'] },
        { b: 'F2', a: ['F3', 'A3', 'C4', 'F4'] },
        { b: 'D3', a: ['D3', 'A3', 'D4', 'A3'] },
        { b: 'AS3', a: ['AS3', 'F4', 'AS4', 'F4'] },
        { b: 'C3', a: ['C4', 'G4', 'C5', 'G4'] }
      ]),
      melody: seq(`
        F5 .  .  A5 .  G5 .  .
        D5 .  .  F5 .  E5 .  .
        AS4 . D5 .  F5 .  D5 .
        C5 .  E5 .  G5 .  .  .
        A5 .  .  C6 .  AS5 . .
        F5 .  .  A5 .  G5 .  .
        D5 .  F5 .  AS5 . A5 .
        G5 .  E5 .  C5 .  .  .
      `),
      drums: 'k.......h.......k.......h......s' + 'k.......h.......k...h...k.h.s...'
    }
  ];

  const STEPS = 64;
  let musicTimer = null;
  let step = 0;
  let nextTime = 0;
  let track = TRACKS[0];
  let lastTrack = -1;
  let tempoScale = 1;
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

  /* einfaches Schlagzeug aus Rauschen und einem tiefen Sinus */
  function drum(kind, time) {
    if (kind === 'k') {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      g.gain.setValueAtTime(0.5, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      osc.connect(g); g.connect(masterMusic);
      osc.start(time); osc.stop(time + 0.18);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    if (kind === 's') {
      filt.type = 'bandpass'; filt.frequency.value = 1900; filt.Q.value = 0.8;
      g.gain.setValueAtTime(0.28, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
      src.connect(filt); filt.connect(g); g.connect(masterMusic);
      src.start(time); src.stop(time + 0.15);
    } else {
      filt.type = 'highpass'; filt.frequency.value = 7000;
      g.gain.setValueAtTime(0.1, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
      src.connect(filt); filt.connect(g); g.connect(masterMusic);
      src.start(time); src.stop(time + 0.06);
    }
  }

  function scheduler() {
    if (!ready || !musicPlaying) return;
    const spb = 60 / (track.tempo * tempoScale) / 2;   /* Achtel */
    while (nextTime < ctx.currentTime + 0.25) {
      const pos = step % STEPS;
      const bar = Math.floor(pos / 8);
      const ch = track.chords[bar];
      const inBar = pos % 8;

      if (inBar === 0 || inBar === 4) musicNote(ch.bass, nextTime, spb * 1.7, 'triangle', 0.5);
      if (inBar === 6) musicNote(ch.bass * 1.5, nextTime, spb * 0.8, 'triangle', 0.32);

      musicNote(ch.arp[inBar % ch.arp.length], nextTime, spb * 0.72, 'square', 0.15);

      const m = track.melody[pos];
      if (m) musicNote(m, nextTime, spb * 1.35, 'square', 0.13);

      const d = track.drums.charAt(pos);
      if (d && d !== '.') drum(d, nextTime);

      nextTime += spb;
      step++;
    }
  }

  /* wählt ein Stück - möglichst nicht dasselbe wie zuletzt */
  function pickTrack(index) {
    if (typeof index === 'number' && TRACKS[index]) return index;
    let i = Math.floor(Math.random() * TRACKS.length);
    if (TRACKS.length > 1 && i === lastTrack) i = (i + 1) % TRACKS.length;
    return i;
  }

  function startMusic(index) {
    if (!ready) init();
    if (!ready || !state.music) return;
    resume();
    if (musicPlaying) return;
    const i = pickTrack(index);
    lastTrack = i;
    track = TRACKS[i];
    tempoScale = 1;
    musicPlaying = true;
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    masterMusic.gain.cancelScheduledValues(ctx.currentTime);
    masterMusic.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterMusic.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 1.2);
    musicTimer = setInterval(scheduler, 40);
  }

  /* Das Spiel meldet hier sein Tempo - die Musik zieht sanft mit. */
  function setTempo(t) {
    tempoScale = Math.max(0.85, Math.min(1.35, (t || 132) / 132));
  }

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
    get isMusicPlaying() { return musicPlaying; },
    get trackName() { return track ? track.name : ''; },
    get tracks() { return TRACKS.map(t => t.name); },
    /* Nur zum Testen: Länge eines Durchlaufs in Sekunden */
    loopSeconds(i) { const t = TRACKS[i == null ? 0 : i]; return STEPS * (60 / t.tempo / 2); }
  };
})(window);
