/* ============================================================
   Mathe App - Oberfläche, Fortschritt, PWA
   ============================================================ */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* ===================== Speicher ===================== */
  const KEY = 'mathe-app.v1';
  const OLD_KEY = 'ida-mathe-app.v1';   /* früherer Name - Fortschritt übernehmen */
  const DEFAULTS = {
    settings: {
      grade: 1, theme: 'stadt-tag', inputMode: 'keypad', sfx: true, music: true,
      /* Start-Tempo je Klassenstufe - die Kleinen starten langsamer */
      speedByGrade: { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3 }
    },
    stats: {
      totalCorrect: 0, totalStars: 0, maxCombo: 0, maxLevel: 1, bestScore: 0,
      bestKills: 0, games: 0, gradesPlayed: {}, bestByGrade: {}
    },
    badges: {}
  };

  let DB = JSON.parse(JSON.stringify(DEFAULTS));

  function load() {
    try {
      let raw = localStorage.getItem(KEY);
      if (!raw) {
        const old = localStorage.getItem(OLD_KEY);
        if (old) { raw = old; localStorage.setItem(KEY, old); localStorage.removeItem(OLD_KEY); }
      }
      if (raw) {
        const p = JSON.parse(raw);
        DB.settings = Object.assign({}, DEFAULTS.settings, p.settings || {});
        DB.settings.speedByGrade = Object.assign({}, DEFAULTS.settings.speedByGrade, (p.settings || {}).speedByGrade || {});
        DB.stats = Object.assign({}, DEFAULTS.stats, p.stats || {});
        DB.badges = p.badges || {};
      }
    } catch (e) { /* Speicher nicht verfügbar - läuft trotzdem */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* egal */ }
  }

  /* ===================== Ränge & Abzeichen ===================== */
  const RANKS = [
    { min: 0, ic: '🐣', name: 'Rechen-Küken' },
    { min: 50, ic: '🧮', name: 'Zahlen-Pilot' },
    { min: 150, ic: '🛰️', name: 'Formel-Flieger' },
    { min: 300, ic: '🚀', name: 'Mathe-Rakete' },
    { min: 600, ic: '🌟', name: 'Zahlen-Kapitän' },
    { min: 1200, ic: '🪐', name: 'Universal-Genie' }
  ];

  const BADGES = [
    { id: 'start', ic: '🚀', name: 'Startrampe', desc: '10 Aufgaben richtig gelöst', test: s => s.totalCorrect >= 10 },
    { id: 'combo5', ic: '🔥', name: 'Combo-Kanone', desc: '5er-Combo geschafft', test: s => s.maxCombo >= 5 },
    { id: 'combo10', ic: '⚡', name: 'Blitzrechner', desc: '10er-Combo geschafft', test: s => s.maxCombo >= 10 },
    { id: 'score500', ic: '💰', name: 'Punktejäger', desc: '500 Punkte in einer Runde', test: s => s.bestScore >= 500 },
    { id: 'score2000', ic: '👑', name: 'Mathe-Profi', desc: '2000 Punkte in einer Runde', test: s => s.bestScore >= 2000 },
    { id: 'level5', ic: '🛸', name: 'Höhenflug', desc: 'Level 5 erreicht', test: s => s.maxLevel >= 5 },
    { id: 'stars100', ic: '⭐', name: 'Sternensammler', desc: '100 Sternchen gesammelt', test: s => s.totalStars >= 100 },
    { id: 'alien', ic: '👾', name: 'Alien-Schreck', desc: '20 Treffer im Raumschiff-Bonus', test: s => s.bestKills >= 20 },
    { id: 'klasse6', ic: '🎓', name: 'Klassenbester', desc: 'Eine Runde in Klasse 6 gespielt', test: s => !!s.gradesPlayed[6] },
    { id: 'marathon', ic: '🏅', name: 'Ausdauer-Ass', desc: '100 Aufgaben insgesamt richtig', test: s => s.totalCorrect >= 100 }
  ];

  function rankFor(correct) {
    let r = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (correct >= RANKS[i].min) { r = RANKS[i]; next = RANKS[i + 1] || null; }
    }
    return { rank: r, next };
  }

  function checkBadges() {
    const fresh = [];
    BADGES.forEach(b => {
      if (!DB.badges[b.id] && b.test(DB.stats)) { DB.badges[b.id] = Date.now(); fresh.push(b); }
    });
    if (fresh.length) save();
    return fresh;
  }

  /* ===================== Screens ===================== */
  let openScreen = 'menu';
  function show(id) {
    $$('.overlay').forEach(o => o.classList.remove('show'));
    if (id) { $('#' + id).classList.add('show'); }
    openScreen = id || '';
    /* Zurück im Menü ist ein guter Moment für ein wartendes Update */
    if (id === 'menu') setTimeout(maybeApplyUpdate, 300);
  }
  function inGameChrome(on) {
    $('#hud').hidden = !on;
    $('#controls').hidden = !on;
  }

  let toastTimer = null;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
  }

  /* ===================== HUD ===================== */
  let heartSlots = 3;
  function renderHearts(lives, maxShown) {
    const total = Math.max(3, maxShown || lives);
    const el = $('#hearts');
    if (el.children.length !== total) {
      el.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const s = document.createElement('span');
        s.textContent = '❤️';
        el.appendChild(s);
      }
    }
    Array.from(el.children).forEach((c, i) => {
      const gone = i >= lives;
      if (gone !== c.classList.contains('gone')) {
        c.classList.toggle('gone', gone);
        if (!gone) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
      }
    });
    heartSlots = total;
  }

  function onHud(s) {
    renderHearts(s.lives, Math.max(heartSlots, s.lives));
    $('#hudStars').textContent = s.stars;
    $('#hudLevel').textContent = s.level;
    $('#hudScore').textContent = s.score;
    const cw = $('#hudComboWrap');
    const mult = s.combo >= 15 ? 4 : s.combo >= 10 ? 3 : s.combo >= 5 ? 2 : 1;
    cw.hidden = mult < 2;
    $('#hudCombo').textContent = mult;
    const done = Game.config.bonusEvery - s.untilBonus;
    $('#bonusFill').style.width = (done / Game.config.bonusEvery * 100) + '%';
    $('#bonusText').textContent = 'BONUS in ' + s.untilBonus;

    const left = Math.max(0, Math.ceil(s.timeLeft || 0));
    $('#hudTime').textContent = mmss(left);
    const tw = $('#hudTimeWrap');
    tw.classList.toggle('warn', left <= 120 && left > 30);
    tw.classList.toggle('danger', left <= 30);
  }

  function mmss(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  /* ===================== Eingabe ===================== */
  let answer = '';
  let negative = false;

  function renderAnswer() {
    const d = $('#answerDisplay');
    if (!answer) { d.textContent = 'Zahl eingeben'; d.classList.add('empty'); }
    else { d.textContent = (negative ? '−' : '') + answer; d.classList.remove('empty'); }
    $('#btnFire').disabled = !answer;
  }

  function key(k) {
    if (Game.state !== 'playing') return;
    Sound.play('type');
    if (k === 'del') { answer = answer.slice(0, -1); if (!answer) negative = false; }
    else if (k === 'neg') { negative = !negative; }
    else if (answer.length < 6) { answer = (answer === '0' ? '' : answer) + k; }
    renderAnswer();
  }

  function fireAnswer() {
    if (!answer || Game.state !== 'playing') return;
    const v = parseInt(answer, 10) * (negative ? -1 : 1);
    Game.fire(v);
    answer = ''; negative = false;
    renderAnswer();
  }

  let lastChoices = '';
  function onChoices(arr) {
    if (DB.settings.inputMode !== 'choice') return;
    const sig = arr.join(',');
    if (sig === lastChoices) return;
    lastChoices = sig;
    const box = $('#choices');
    box.innerHTML = '';
    arr.forEach(v => {
      const b = document.createElement('button');
      b.textContent = MathGen.sgn(v);
      b.addEventListener('click', () => { Game.fire(v); });
      box.appendChild(b);
    });
  }

  function applyInputMode() {
    const choice = DB.settings.inputMode === 'choice';
    $('#padWrap').hidden = choice;
    $('#choiceWrap').hidden = !choice;
    $('#miniHint').hidden = true;
    document.querySelector('.bonus-meter').hidden = false;
    lastChoices = '';
    syncInset();
  }

  /* Die Schutzlinie muss über der Steuerung liegen - Höhe messen und melden. */
  function syncInset() {
    requestAnimationFrame(() => {
      const c = $('#controls');
      Game.setBottomInset(c.hidden ? 20 : c.offsetHeight);
    });
  }

  /* ===================== Spielstart ===================== */
  function countdown(done) {
    const el = $('#countdown');
    const span = el.querySelector('span');
    const seq = ['3', '2', '1', 'LOS!'];
    let i = 0;
    el.hidden = false;
    const step = () => {
      if (i >= seq.length) { el.hidden = true; done(); return; }
      span.textContent = seq[i];
      span.style.animation = 'none'; void span.offsetWidth; span.style.animation = '';
      Sound.play(i === seq.length - 1 ? 'levelup' : 'click');
      i++;
      setTimeout(step, i === seq.length ? 450 : 620);
    };
    step();
  }

  function startGame() {
    Sound.resume();
    show(null);
    inGameChrome(true);
    applyInputMode();
    answer = ''; negative = false; renderAnswer();
    heartSlots = 3;
    $('#hearts').innerHTML = '';
    Game.setTheme(DB.settings.theme);
    countdown(() => {
      Game.start({
        grade: DB.settings.grade, theme: DB.settings.theme,
        inputMode: DB.settings.inputMode, speed: curSpeed()
      });
    });
  }

  /* ===================== Bonus-Station ===================== */
  let bonusInfo = null;
  function onBonus(info) {
    bonusInfo = info;
    refreshBonus();
    show('bonus');
  }

  function refreshBonus() {
    const stars = Game.stars, lives = Game.lives, max = Game.maxLives;
    const c = Game.config;
    $('#bonusStars').textContent = stars;
    $('#priceHeart').textContent = c.heartCost;
    $('#priceMini').textContent = c.miniCost;
    const heartOk = stars >= c.heartCost && lives < max;
    const timeOk = Game.enoughTimeForMini();
    $('#buyHeart').disabled = !heartOk;
    $('#buyMini').disabled = stars < c.miniCost || !timeOk;
    let note = '';
    if (!timeOk) note = 'Für das Bonuslevel reicht die Rundenzeit nicht mehr – noch ' + mmss(Math.ceil(Game.timeLeft)) + '.';
    else if (lives >= max) note = 'Deine Herzen sind schon voll! ❤️';
    else if (stars < c.heartCost) note = 'Sammle weiter Sternchen – für jede richtige Aufgabe gibt es mindestens eines.';
    $('#bonusNote').textContent = note;
  }

  /* ===================== Game Over ===================== */
  function onGameOver(r) {
    inGameChrome(false);
    const st = DB.stats;
    st.totalCorrect += r.correct;
    st.totalStars += r.stars;
    st.maxCombo = Math.max(st.maxCombo, r.bestCombo);
    st.maxLevel = Math.max(st.maxLevel, r.level);
    st.bestScore = Math.max(st.bestScore, r.score);
    st.games++;
    st.gradesPlayed[r.grade] = true;
    st.bestByGrade[r.grade] = Math.max(st.bestByGrade[r.grade] || 0, r.score);
    save();

    const fresh = checkBadges();
    const isBest = r.score >= st.bestScore && r.score > 0;
    const timeUp = r.reason === 'time';

    $('#goTitle').textContent = timeUp
      ? (isBest ? '⏱ Zeit um – neuer Rekord!' : '⏱ Zeit ist um!')
      : (isBest ? '🏆 Neuer Rekord!' : 'Game Over');
    $('#goHint').textContent = timeUp
      ? 'Die 10 Minuten sind voll. Super gespielt – Augen ausruhen und später weitermachen!'
      : '';
    $('#goHint').hidden = !timeUp;
    $('#goScore').textContent = r.score;
    $('#goStats').innerHTML = [
      ['✅ ' + r.correct, 'richtig gelöst'],
      ['🔥 x' + r.bestCombo, 'beste Combo'],
      ['⭐ ' + r.stars, 'Sternchen'],
      ['⏱ ' + mmss(r.seconds), 'gespielt']
    ].map(x => '<div><b>' + x[0] + '</b><small>' + x[1] + '</small></div>').join('');
    $('#goBadges').innerHTML = fresh.map(b => '<div>' + b.ic + ' Neues Abzeichen: <b>' + b.name + '</b></div>').join('');
    if (fresh.length) setTimeout(() => Sound.play('badge'), 700);
    show('gameover');
    renderMenuInfo();
  }

  /* ===================== Menü-Infos ===================== */
  function renderMenuInfo() {
    const g = DB.settings.grade;
    $('#chipGrade').textContent = MathGen.GRADE_INFO[g].name;
    const sp = Game.speeds[curSpeed() - 1];
    $('#chipSpeed').textContent = sp ? sp.icon + ' ' + sp.name : '';
    const th = Backgrounds.list().find(t => t.id === DB.settings.theme);
    $('#chipTheme').textContent = th ? th.icon + ' ' + th.name : '';
    $('#chipMode').textContent = DB.settings.inputMode === 'choice' ? '🎯 Auswahl' : '🔢 Zahlenfeld';

    const { rank, next } = rankFor(DB.stats.totalCorrect);
    $('#rankIcon').textContent = rank.ic;
    $('#rankName').textContent = rank.name;
    if (next) {
      const span = next.min - rank.min;
      const done = DB.stats.totalCorrect - rank.min;
      $('#rankFill').style.width = Math.min(100, done / span * 100) + '%';
      $('#rankNext').textContent = 'Noch ' + (next.min - DB.stats.totalCorrect) + ' richtige Aufgaben bis "' + next.name + '"';
    } else {
      $('#rankFill').style.width = '100%';
      $('#rankNext').textContent = 'Höchster Rang erreicht – Wahnsinn!';
    }
  }

  function renderBadges() {
    $('#badgeList').innerHTML = BADGES.map(b =>
      '<div class="badge' + (DB.badges[b.id] ? ' on' : '') + '">' +
      '<div class="ic">' + b.ic + '</div><div><strong>' + b.name + '</strong><small>' + b.desc + '</small></div></div>'
    ).join('');
  }

  function renderScores() {
    const rows = [];
    for (let g = 1; g <= 6; g++) {
      rows.push('<div class="score-row"><span>' + MathGen.GRADE_INFO[g].name + '</span><b>' +
        (DB.stats.bestByGrade[g] || 0) + '</b></div>');
    }
    $('#scoreList').innerHTML = rows.join('');
    $('#statList').innerHTML = [
      ['Richtige Aufgaben gesamt', DB.stats.totalCorrect],
      ['Gesammelte Sternchen', DB.stats.totalStars],
      ['Beste Combo', 'x' + DB.stats.maxCombo],
      ['Höchstes Level', DB.stats.maxLevel],
      ['Beste Bonus-Treffer', DB.stats.bestKills],
      ['Gespielte Runden', DB.stats.games]
    ].map(x => '<div class="stat-row"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>').join('');
  }

  /* ===================== Einstellungen ===================== */
  function buildGrades() {
    const grid = $('#gradeGrid');
    grid.innerHTML = '';
    for (let g = 1; g <= 6; g++) {
      const b = document.createElement('button');
      b.textContent = g + '.';
      b.dataset.grade = g;
      b.addEventListener('click', () => {
        DB.settings.grade = g; save();
        Sound.play('click');
        syncGrades(); renderMenuInfo();
      });
      grid.appendChild(b);
    }
    syncGrades();
  }
  function syncGrades() {
    $$('#gradeGrid button').forEach(b => b.classList.toggle('active', +b.dataset.grade === DB.settings.grade));
    $('#gradeDesc').textContent = MathGen.GRADE_INFO[DB.settings.grade].desc;
    syncSpeeds();
  }

  /* ---- Start-Tempo (pro Klassenstufe gemerkt) ---- */
  function curSpeed() {
    const v = DB.settings.speedByGrade[DB.settings.grade];
    return Math.min(5, Math.max(1, v || 3));
  }

  function buildSpeeds() {
    const grid = $('#speedGrid');
    grid.innerHTML = '';
    Game.speeds.forEach(sp => {
      const b = document.createElement('button');
      b.dataset.speed = sp.id;
      b.innerHTML = '<b>' + sp.icon + '</b><small>' + sp.name + '</small>';
      b.addEventListener('click', () => {
        DB.settings.speedByGrade[DB.settings.grade] = sp.id;
        save();
        Sound.play('click');
        syncSpeeds(); renderMenuInfo();
      });
      grid.appendChild(b);
    });
    syncSpeeds();
  }

  function syncSpeeds() {
    const cur = curSpeed();
    $$('#speedGrid button').forEach(b => b.classList.toggle('active', +b.dataset.speed === cur));
    const sp = Game.speeds[cur - 1];
    $('#speedForGrade').textContent = '· ' + MathGen.GRADE_INFO[DB.settings.grade].name;
    $('#speedDesc').textContent = sp
      ? sp.icon + ' ' + sp.name + ' – ' + sp.desc + '. Ab hier wird es mit jedem Level und jeder Spielminute schneller.'
      : '';
  }

  function buildThemes() {
    const grid = $('#themeGrid');
    grid.innerHTML = '';
    Backgrounds.list().forEach(t => {
      const card = document.createElement('button');
      card.className = 'theme-card';
      card.dataset.theme = t.id;
      const cv = document.createElement('canvas');
      cv.width = 220; cv.height = 130;
      card.appendChild(cv);
      const label = document.createElement('span');
      label.textContent = t.icon + ' ' + t.name;
      card.appendChild(label);
      card.addEventListener('click', () => {
        DB.settings.theme = t.id; save();
        Sound.play('click');
        Game.setTheme(t.id);
        syncThemes(); renderMenuInfo();
      });
      grid.appendChild(card);
      try { Backgrounds.preview(cv.getContext('2d'), t.id, 220, 130); } catch (e) { /* egal */ }
    });
    syncThemes();
  }
  function syncThemes() {
    $$('#themeGrid .theme-card').forEach(c => c.classList.toggle('active', c.dataset.theme === DB.settings.theme));
  }

  function syncSound() {
    $('#swSfx').checked = DB.settings.sfx;
    $('#swMusic').checked = DB.settings.music;
    Sound.setSfx(DB.settings.sfx);
    Sound.setMusic(DB.settings.music);
  }

  /* ===================== Verdrahtung ===================== */
  function wire() {
    /* Menü */
    $('#btnPlay').addEventListener('click', () => { Sound.play('start'); startGame(); });
    $('#btnSettings').addEventListener('click', () => { Sound.play('click'); show('settings'); });
    $('#btnBadges').addEventListener('click', () => { Sound.play('click'); renderBadges(); show('badges'); });
    $('#btnScores').addEventListener('click', () => { Sound.play('click'); renderScores(); show('scores'); });
    $$('[data-close]').forEach(b => b.addEventListener('click', () => { Sound.play('back'); show('menu'); renderMenuInfo(); }));

    /* Einstellungen */
    $$('#modeSeg button').forEach(b => b.addEventListener('click', () => {
      DB.settings.inputMode = b.dataset.mode; save();
      Sound.play('click');
      $$('#modeSeg button').forEach(x => x.classList.toggle('active', x === b));
      applyInputMode(); renderMenuInfo();
    }));
    $('#swSfx').addEventListener('change', e => { DB.settings.sfx = e.target.checked; save(); Sound.setSfx(e.target.checked); Sound.play('click'); });
    $('#swMusic').addEventListener('change', e => {
      DB.settings.music = e.target.checked; save(); Sound.setMusic(e.target.checked);
      if (e.target.checked && Game.state === 'playing') Sound.startMusic();
    });
    $('#btnReset').addEventListener('click', () => {
      if (!confirm('Wirklich alle Punkte, Abzeichen und Bestwerte löschen?')) return;
      DB.stats = JSON.parse(JSON.stringify(DEFAULTS.stats));
      DB.badges = {};
      DB.settings.speedByGrade = JSON.parse(JSON.stringify(DEFAULTS.settings.speedByGrade));
      save(); syncSpeeds(); renderMenuInfo(); toast('Fortschritt gelöscht');
    });

    /* Tastenfeld */
    $$('#keypad button').forEach(b => b.addEventListener('click', () => key(b.dataset.k)));
    $('#btnFire').addEventListener('click', fireAnswer);

    /* Pause */
    $('#btnPause').addEventListener('click', () => { Game.pause(); Sound.play('back'); show('pause'); });
    $('#btnResume').addEventListener('click', () => { Sound.play('click'); show(null); Game.resume(); });
    $('#btnQuit').addEventListener('click', () => {
      Sound.play('back'); Game.quit(); inGameChrome(false); show('menu'); renderMenuInfo();
    });

    /* Bonus-Station */
    $('#buyHeart').addEventListener('click', () => {
      if (Game.buyHeart()) { toast('Extra-Herz gekauft! ❤️'); refreshBonus(); }
    });
    $('#buyMini').addEventListener('click', () => {
      if (Game.startMini(true)) {
        show(null);
        inGameChrome(true);
        $('#padWrap').hidden = true; $('#choiceWrap').hidden = true; $('#miniHint').hidden = false;
        syncInset();
      }
    });
    $('#bonusContinue').addEventListener('click', () => {
      Sound.play('click');
      show(null); inGameChrome(true);
      $('#miniHint').hidden = true;
      applyInputMode();
      Game.resumeFromBonus();
      if (DB.settings.music) Sound.startMusic();
    });

    $('#miniOk').addEventListener('click', () => { Sound.play('click'); refreshBonus(); show('bonus'); });

    /* Game Over */
    $('#btnAgain').addEventListener('click', () => { Sound.play('start'); startGame(); });
    $('#btnMenu').addEventListener('click', () => { Sound.play('back'); show('menu'); renderMenuInfo(); });

    /* Tastatur */
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (Game.state === 'playing' || Game.state === 'mini') { Game.pause(); show('pause'); }
        else if (openScreen === 'pause') { show(null); Game.resume(); }
        return;
      }
      if (Game.state !== 'playing' || DB.settings.inputMode !== 'keypad') return;
      if (e.key >= '0' && e.key <= '9') { key(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { key('del'); e.preventDefault(); }
      else if (e.key === '-') { key('neg'); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { fireAnswer(); e.preventDefault(); }
    });

    /* Erstes Antippen schaltet den Ton frei (Browser-Regel) */
    const unlock = () => { Sound.init(); Sound.resume(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);

    window.addEventListener('resize', syncInset);
    window.addEventListener('orientationchange', () => setTimeout(syncInset, 250));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (Game.state === 'playing' || Game.state === 'mini')) { Game.pause(); show('pause'); }
    });
  }

  /* ===================== PWA & automatische Updates =====================
     Ablauf: Beim Start (und bei jedem Zurückholen der App) wird geprüft, ob
     eine neue Version auf dem Server liegt. Der neue Service Worker über-
     nimmt sofort (skipWaiting), danach lädt die Seite einmal neu - aber nie
     mitten im Spiel, sondern erst zurück im Menü.                          */
  let swReg = null;
  let updatePending = false;
  let reloading = false;

  function applyUpdate() {
    if (reloading) return;
    reloading = true;
    $('#appVersion').parentElement.classList.add('updating');
    toast('🔄 Neue Version wird geladen …');
    setTimeout(() => location.reload(), 600);
  }

  /* Im Spiel nicht stören - Update erst im Menü einspielen */
  function maybeApplyUpdate() {
    if (!updatePending) return;
    const busy = Game.state === 'playing' || Game.state === 'mini' || Game.state === 'paused';
    if (!busy) applyUpdate();
  }

  /* Der laufende Service Worker sagt selbst, welche Version er ist. */
  function showVersion() {
    const el = $('#appVersion');
    if (!('serviceWorker' in navigator)) { el.textContent = APP_FALLBACK_VERSION; return; }
    const ask = target => {
      if (!target) return false;
      const ch = new MessageChannel();
      ch.port1.onmessage = e => { if (e.data && e.data.version) el.textContent = e.data.version; };
      try { target.postMessage({ type: 'version' }, [ch.port2]); return true; } catch (e) { return false; }
    };
    if (!ask(navigator.serviceWorker.controller)) {
      navigator.serviceWorker.ready.then(reg => ask(reg.active)).catch(() => { });
    }
  }

  const APP_FALLBACK_VERSION = '1.2.0';

  function pwa() {
    $('#appVersion').textContent = APP_FALLBACK_VERSION;

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .then(reg => {
          swReg = reg;
          showVersion();

          /* Ein neuer Service Worker wurde gefunden */
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                updatePending = true;
                maybeApplyUpdate();
              }
            });
          });

          /* Bei jedem Öffnen und Zurückholen der App nach Updates schauen */
          const check = () => { if (!reloading) reg.update().catch(() => { }); };
          check();
          window.addEventListener('focus', check);
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) { check(); maybeApplyUpdate(); }
          });
          setInterval(check, 15 * 60 * 1000);
        })
        .catch(() => { /* ohne Service Worker läuft die App weiterhin, nur ohne Offline-Modus */ });

      /* Der neue Worker hat übernommen - jetzt einmal frisch laden.
         Beim allerersten Besuch gibt es noch keinen alten Worker, dann
         ist kein Neuladen nötig. */
      let hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) { hadController = true; showVersion(); return; }
        updatePending = true;
        maybeApplyUpdate();
      });
      navigator.serviceWorker.ready.then(() => showVersion()).catch(() => { });
    }

    let deferred = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); deferred = e;
      $('#btnInstall').hidden = false;
    });
    $('#btnInstall').addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      $('#btnInstall').hidden = true;
    });
  }

  /* ===================== Start ===================== */
  function boot() {
    load();
    Game.init($('#stage'), {
      onHud,
      onChoices,
      onBonus,
      onGameOver,
      onToast: toast,
      onMiniStart: () => { document.querySelector('.bonus-meter').hidden = true; },
      onMiniEnd: r => {
        DB.stats.bestKills = Math.max(DB.stats.bestKills, r.kills);
        DB.stats.totalStars += r.stars;
        save();
        checkBadges();
        $('#miniStats').innerHTML = [
          ['👾 ' + r.kills, 'Aliens getroffen'],
          ['💯 +' + r.score, 'Extra-Punkte'],
          ['⭐ +' + r.stars, 'Sternchen'],
          [r.heart ? '❤️ +1' : '—', r.heart ? 'Bonus-Herz!' : 'kein Bonus-Herz']
        ].map(x => '<div><b>' + x[0] + '</b><small>' + x[1] + '</small></div>').join('');
        $('#miniHint').hidden = true;
        show('miniresult');
      }
    });

    $$('#modeSeg button').forEach(x => x.classList.toggle('active', x.dataset.mode === DB.settings.inputMode));
    buildGrades();
    buildSpeeds();
    buildThemes();
    syncSound();
    Backgrounds.use(DB.settings.theme);
    renderMenuInfo();
    renderAnswer();
    wire();
    pwa();
    show('menu');
    inGameChrome(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
