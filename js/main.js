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
      grade: 1, theme: 'stadt-tag', inputMode: 'choice', sfx: true, music: true,
      /* Start-Tempo je Klassenstufe - die Kleinen starten langsamer */
      speedByGrade: { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3 },
      /* leer = alle Rechenarten dieser Klassenstufe sind an */
      opsByGrade: {},
      /* leer = alle Zahlenräume (1er, 10er, 100er, 1000er) sind an */
      rangeByGrade: {},
      /* arcade = fallende Aufgaben, safari = Jeep-Tour ohne Zeitdruck */
      playMode: 'arcade',
      nick: '', avatar: ''
    },
    /* Bildschirmzeit für das ganze Gerät, über alle Runden hinweg */
    time: { limitMin: 15, pauseMin: 30, usedSec: 0, lockUntil: 0, code: '' },
    scores: [],
    stats: {
      totalCorrect: 0, totalStars: 0, maxCombo: 0, maxLevel: 1, bestScore: 0,
      bestKills: 0, bestMiniStars: 0, miniPlayed: 0, games: 0, gradesPlayed: {}, bestByGrade: {}
    },
    badges: {}
  };

  let DB = JSON.parse(JSON.stringify(DEFAULTS));
  let lastEntryKey = '';   /* verhindert doppeltes Eintragen derselben Runde */

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
        DB.settings.opsByGrade = Object.assign({}, (p.settings || {}).opsByGrade || {});
        DB.settings.rangeByGrade = Object.assign({}, (p.settings || {}).rangeByGrade || {});
        DB.time = Object.assign({}, DEFAULTS.time, p.time || {});
        DB.stats = Object.assign({}, DEFAULTS.stats, p.stats || {});
        DB.scores = Array.isArray(p.scores) ? p.scores : [];
        /* ältere Einträge kennen das Merkmal noch nicht - die gelten als
           "noch nicht online" und werden beim Abgleich nachgereicht */
        DB.scores.forEach(e => { if (typeof e.online !== 'boolean') e.online = false; });
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
    { id: 'alien', ic: '👾', name: 'Bonus-Meister', desc: '5 Sternchen in einem Bonusspiel', test: s => (s.bestMiniStars || 0) >= 5 },
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
    /* Jeder Unterbildschirm bekommt einen Verlaufseintrag, damit der
       Zurück-Knopf ihn schließt statt die App zu verlassen. */
    if (id && id !== 'menu') armBack();
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
    /* Im Safari zählt der Balken die Stationen bis zum Camp */
    const every = s.mode === 'safari' ? Game.config.safariStations : Game.config.bonusEvery;
    const done = every - s.untilBonus;
    $('#bonusFill').style.width = (done / every * 100) + '%';
    $('#bonusText').textContent = (s.bonusLabel || 'BONUS in') + ' ' + s.untilBonus;
    $('.bonus-meter').title = s.mode === 'safari'
      ? 'Noch ' + s.untilBonus + ' Stationen bis zum Camp'
      : 'Noch ' + s.untilBonus + ' richtige Aufgaben bis zur Bonus-Station';

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

  /* Läuft gerade eine Runde? Arcade und Safari nehmen dieselben Eingaben
     entgegen - nur der Zustand heißt anders. */
  function inRound() { return Game.state === 'playing' || Game.state === 'safari'; }

  function key(k) {
    if (!inRound()) return;
    Sound.play('type');
    if (k === 'del') { answer = answer.slice(0, -1); if (!answer) negative = false; }
    else if (k === 'neg') { negative = !negative; }
    else if (answer.length < 6) { answer = (answer === '0' ? '' : answer) + k; }
    renderAnswer();
  }

  function fireAnswer() {
    if (!answer || !inRound()) return;
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
      b.addEventListener('click', () => { if (inRound()) Game.fire(v); });
      box.appendChild(b);
    });
  }

  function applyInputMode() {
    const choice = DB.settings.inputMode === 'choice';
    /* Im Safari wird nichts abgeschossen - der Jeep fährt einfach weiter */
    $('#btnFire').textContent = DB.settings.playMode === 'safari' ? 'ANTWORTEN 🚙' : 'ABSCHIESSEN 🚀';
    $('#padWrap').hidden = choice;
    $('#choiceWrap').hidden = !choice;
    $('#miniHint').hidden = true;
    $('#cannonPad').hidden = true;
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

  /* ===================== Pause und Zurück-Knopf ===================== */
  function openPause(asked) {
    $('#pauseTitle').textContent = asked ? 'Zurück?' : 'Pause';
    $('#pauseHint').textContent = asked
      ? 'Möchtest du weiterspielen oder zum Menü zurück?'
      : 'Kurz durchatmen – die Aufgaben warten.';
    show('pause');
  }

  function quitToMenu() {
    Game.quit();
    inGameChrome(false);
    save();                /* verbrauchte Bildschirmzeit sicher wegschreiben */
    show('menu');
    renderMenuInfo();
  }

  /* Der Zurück-Knopf (Android, Browser, Wischgeste) soll nicht mitten im
     Spiel die App verlassen, sondern erst nachfragen. Dafür liegt während
     einer Runde ein zusätzlicher Eintrag im Verlauf, der abgefangen wird. */
  let backArmed = false;
  function armBack() {
    if (backArmed) return;
    try { history.pushState({ matheApp: 1 }, ''); backArmed = true; } catch (e) { /* egal */ }
  }

  window.addEventListener('popstate', () => {
    backArmed = false;
    const st = Game.state;
    if (st === 'playing' || st === 'safari' || st === 'mini') {
      Game.pause();
      Sound.play('back');
      openPause(true);
      armBack();
      return;
    }
    if (st === 'paused') {          /* noch einmal zurück = wirklich zum Menü */
      Sound.play('back');
      quitToMenu();
      return;
    }
    if (st === 'bonus') {           /* Bonus-Station nicht aus Versehen überspringen */
      armBack();
      return;
    }
    if (openScreen && openScreen !== 'menu') {
      Sound.play('back');
      show('menu');
      renderMenuInfo();
      return;
    }
    /* Im Menü darf der Zurück-Knopf ganz normal wirken. */
  });

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
    /* Erst die Bildschirmzeit prüfen - danach erst der Countdown */
    if (isLocked()) { Sound.play('wrong'); showLocked(); return; }
    if (leftSec() <= 0) { Sound.play('wrong'); startLock(); showLocked(); return; }
    Sound.resume();
    show(null);
    inGameChrome(true);
    applyInputMode();
    answer = ''; negative = false; renderAnswer();
    heartSlots = 3;
    $('#hearts').innerHTML = '';
    Game.setTheme(DB.settings.theme);
    armBack();
    /* Im Safari gibt es nichts, wofür man sich bereitmachen müsste - der
       Countdown entfällt, sonst sähe man solange noch die alte Kulisse. */
    const go = () => {
      Game.start({
        grade: DB.settings.grade, theme: DB.settings.theme,
        inputMode: DB.settings.inputMode, speed: curSpeed(),
        ops: curOps(), ranges: curRanges(),
        mode: DB.settings.playMode, timeLeft: leftSec()
      });
    };
    if (DB.settings.playMode === 'safari') go(); else countdown(go);
  }

  /* ===================== Bonus-Station ===================== */
  function onBonus() {
    refreshBonus();
    show('bonus');
  }

  function refreshBonus() {
    const info = Game.bonusInfo;
    $('#bonusStars').textContent = info.stars;
    const safari = info.mode === 'safari';
    $('#bonus h2').textContent = safari ? '⛺ Camp erreicht! ⛺' : '★ Bonus-Station ★';
    $('#bonus .hint').textContent = safari
      ? 'Alle ' + Game.config.safariStations + ' Stationen geschafft! Jetzt darfst du deine Sternchen eintauschen.'
      : 'Für ' + Game.config.bonusEvery + ' richtig gelöste Aufgaben darfst du deine Sternchen eintauschen.';
    $('#bonusContinue').textContent = safari ? 'Nächste Etappe' : 'Weiterrechnen';

    /* Herz-Pakete */
    const hs = $('#heartShop');
    hs.innerHTML = '';
    info.packs.forEach(p => {
      const b = document.createElement('button');
      b.className = 'shop-card';
      b.disabled = !p.ok;
      b.innerHTML =
        '<div class="shop-icon hearts-row">' + '❤️'.repeat(Math.min(p.n, 3)) + (p.n > 3 ? '<br>' + '❤️'.repeat(p.n - 3) : '') + '</div>' +
        '<strong>' + p.n + (p.n === 1 ? ' Herz' : ' Herzen') + '</strong>' +
        '<small>' + p.per.toString().replace('.', ',') + ' ★ pro Herz</small>' +
        '<span class="price"><b>' + p.cost + '</b> ★</span>';
      b.addEventListener('click', () => {
        if (Game.buyHearts(p.n)) {
          toast(p.n === 1 ? 'Extra-Herz gekauft! ❤️' : p.n + ' Herzen gekauft! ❤️');
          refreshBonus();
        }
      });
      hs.appendChild(b);
    });

    /* Bonusspiele */
    const gs = $('#gameShop');
    gs.innerHTML = '';
    info.games.forEach(g => {
      const b = document.createElement('button');
      b.className = 'shop-card';
      b.disabled = !g.ok;
      b.innerHTML =
        '<div class="shop-icon">' + g.icon + '</div>' +
        '<strong>' + g.name + '</strong>' +
        '<small>' + g.desc + '</small>' +
        '<span class="price"><b>' + g.cost + '</b> ★</span>';
      b.addEventListener('click', () => startMiniGame(g.id));
      gs.appendChild(b);
    });

    let note = '';
    const anyTime = info.games.some(g => !g.noTime);
    const cheapest = Math.min.apply(null, info.packs.map(p => p.cost));
    if (!anyTime) note = 'Für ein Bonusspiel reicht die Rundenzeit nicht mehr – noch ' + mmss(Math.ceil(info.timeLeft)) + '.';
    else if (info.lives >= info.maxLives) note = 'Deine Herzen sind schon voll! ❤️';
    else if (info.stars < cheapest) note = 'Sammle weiter Sternchen – für jede richtige Aufgabe gibt es mindestens eines.';
    $('#bonusNote').textContent = note;
  }

  /* Bonusspiel starten und die passende Steuerung unten einblenden */
  function startMiniGame(id) {
    if (!Game.startMini(id, true)) return;
    show(null);
    inGameChrome(true);
    $('#padWrap').hidden = true;
    $('#choiceWrap').hidden = true;
    const cannon = id === 'kanone';
    $('#cannonPad').hidden = !cannon;
    $('#miniHint').hidden = cannon;
    $('#miniHintText').textContent = id === 'dosen'
      ? '🥫 Vom Ball aus in Wurfrichtung ziehen und loslassen!'
      : '🚀 Ziehe mit dem Finger (oder ◀ ▶) – geschossen wird automatisch!';
    syncInset();
  }

  /* Regler der Kanone */
  let cannonInst = null;
  function wireCannon() {
    const a = $('#angleSlider'), p = $('#powerSlider');
    const sync = () => {
      $('#angleVal').textContent = a.value + '°';
      $('#powerVal').textContent = p.value;
      if (cannonInst) { cannonInst.setAngle(+a.value); cannonInst.setPower(+p.value); }
    };
    a.addEventListener('input', sync);
    p.addEventListener('input', sync);
    $('#cannonFire').addEventListener('click', () => { if (cannonInst) cannonInst.fire(); });
    sync();
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
      ? 'Die ' + minWord(DB.time.limitMin | 0) + ' Bildschirmzeit sind aufgebraucht. Super gespielt!'
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
    prepareEntry(r);
    if (fresh.length) setTimeout(() => Sound.play('badge'), 700);
    show('gameover');
    /* Zeit aufgebraucht: Pause beginnt, "Nochmal" gibt es erst danach */
    if (timeUp) { startLock(); tickLock(); }
    $('#btnAgain').hidden = timeUp && isLocked();
    renderMenuInfo();
    renderTimeStrip();
  }

  /* ===================== Menü-Infos ===================== */
  function renderMenuInfo() {
    const g = DB.settings.grade;
    $('#chipGrade').textContent = MathGen.GRADE_INFO[g].name;
    const opsAll = allOps().length, opsOn = curOps().length;
    $('#chipOps').textContent = opsOn === opsAll
      ? 'Alle Rechenarten' : opsOn + '/' + opsAll + ' Rechenarten';
    const rAll = MathGen.RANGES, rOn = curRanges();
    $('#chipRange').textContent = rOn.length === rAll.length
      ? 'Alle Zahlenräume'
      : rAll.filter(r => rOn.indexOf(r.id) >= 0).map(r => r.name).join(' + ');
    const sp = Game.speeds[curSpeed() - 1];
    $('#chipSpeed').textContent = sp ? sp.icon + ' ' + sp.name : '';
    $('#chipMode').textContent = DB.settings.inputMode === 'choice' ? '🎯 Auswahl' : '🔢 Zahlenfeld';

    syncPlayMode();
    renderTimeStrip();

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

  /* ---------- Bestenlisten ---------- */
  function scoreRow(e, i, mine, note) {
    return '<div class="online-row' + (mine ? ' mine' : '') + (note ? ' waiting' : '') + '">' +
      '<span class="rank">' + (i + 1) + '.</span>' +
      '<img alt="" src="' + Pixel.avatarDataUrl(e.avatar, 5) + '">' +
      '<span class="who"><b>' + escapeHtml(e.name) + '</b><small>Klasse ' + (e.grade || '?') +
      (note ? ' · ' + note : '') + '</small></span>' +
      '<span class="pts">' + (e.score | 0) + '</span></div>';
  }

  function escapeHtml(t) {
    return String(t).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderMyList() {
    const list = (DB.scores || []).slice(0, 15);
    $('#myList').innerHTML = list.length
      ? list.map((e, i) => scoreRow(e, i, true, e.online ? '' : 'noch nicht online ⏳')).join('')
      : '<p class="hint small">Noch kein Eintrag – spiel eine Runde und trag dich ein!</p>';
  }

  let onlineBusy = false;
  async function renderOnline() {
    const box = $('#onlineList'), note = $('#onlineNote');
    if (!Leaderboard.configured()) {
      box.innerHTML = '';
      note.textContent = 'Die Online-Bestenliste ist noch nicht eingerichtet. '
        + 'Wie das geht, steht in der README unter „Online-Bestenliste einrichten“.';
      $('#onlineReload').hidden = true;
      return;
    }
    $('#onlineReload').hidden = false;
    if (onlineBusy) return;
    onlineBusy = true;
    box.innerHTML = '<p class="hint small">Wird geladen …</p>';
    note.textContent = '';
    try {
      const rows = await Leaderboard.top(null);
      box.innerHTML = rows.length
        ? rows.map((e, i) => scoreRow(e, i, e.name === DB.settings.nick)).join('')
        : '<p class="hint small">Noch keine Einträge – sei die Erste!</p>';
    } catch (err) {
      box.innerHTML = '';
      note.textContent = 'Die Online-Liste ist gerade nicht erreichbar. Deine Punkte auf diesem Gerät sind trotzdem gespeichert.';
    }
    onlineBusy = false;
  }

  function renderScores() {
    renderMyList();
    renderOnline();
    renderPendingNote();
    flushPending(true);
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
      ['Bestes Bonusspiel', (DB.stats.bestMiniStars || 0) + ' ★'],
      ['Gespielte Bonusspiele', DB.stats.miniPlayed || 0],
      ['Gespielte Runden', DB.stats.games]
    ].map(x => '<div class="stat-row"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>').join('');
  }

  /* ===================== Nachträglich online stellen =====================
     Wenn der Upload beim Spielen scheitert (kein Netz, Supabase-Projekt
     schläft, Regel zu streng), bleibt der Eintrag auf dem Gerät und ist
     mit online:false markiert. Von hier aus wird er später nachgereicht. */
  function pendingScores() {
    return (DB.scores || []).filter(e => !e.online);
  }

  let flushing = false;
  async function flushPending(silent) {
    if (flushing || !Leaderboard.configured()) return;
    const todo = pendingScores();
    if (!todo.length) { renderPendingNote(); return; }
    flushing = true;
    renderPendingNote('Wird gesendet …');

    /* Erst schauen, was schon oben liegt - sonst gibt es Dubletten,
       etwa bei Einträgen aus einer älteren Fassung der App. */
    let known = null;
    try {
      const rows = await Leaderboard.top(null, 100);
      known = new Set((rows || []).map(r => r.name + '|' + r.score));
    } catch (e) { known = null; }

    let sent = 0, failed = 0, lastError = '';
    for (const entry of todo) {
      if (known && known.has(entry.name + '|' + entry.score)) { entry.online = true; continue; }
      try {
        await Leaderboard.submit(entry);
        entry.online = true;
        sent++;
      } catch (err) {
        failed++;
        lastError = err && err.message ? err.message : String(err);
        break;                       /* beim ersten Fehler abbrechen */
      }
    }
    save();
    flushing = false;

    if (failed) {
      renderPendingNote('Hochladen hat nicht geklappt: ' + lastError);
    } else if (sent) {
      renderPendingNote();
      if (!silent) toast(sent === 1 ? 'Eintrag ist online! 🌍' : sent + ' Einträge sind online! 🌍');
      renderOnline();
    } else {
      renderPendingNote();
    }
    renderMyList();
  }

  function renderPendingNote(msg) {
    const box = $('#pendingBox');
    const n = pendingScores().length;
    if (!Leaderboard.configured() || (!n && !msg)) { box.hidden = true; $('#pendingText').textContent = ''; return; }
    box.hidden = false;
    $('#pendingText').textContent = msg
      || (n === 1 ? '1 Eintrag ist noch nicht online.' : n + ' Einträge sind noch nicht online.');
    $('#pendingSend').hidden = !n;
    $('#pendingSend').textContent = n === 1 ? 'Jetzt hochladen' : n + ' Einträge hochladen';
    $('#pendingSend').disabled = flushing;
  }



  /* ===================== Spielart ===================== */
  const PLAY_MODES = {
    arcade: 'Aufgaben fallen herab – schieß sie ab, bevor sie unten ankommen.',
    safari: 'Ohne Zeitdruck: Der Jeep fährt nur weiter, wenn die Aufgabe stimmt. '
      + '20 Stationen bis zum Camp – dafür weniger Punkte und Sternchen.'
  };

  function isSafari() { return DB.settings.playMode === 'safari'; }

  function syncPlayMode() {
    const m = isSafari() ? 'safari' : 'arcade';
    $$('#playMode button, #playModeSet button').forEach(b => b.classList.toggle('active', b.dataset.play === m));
    $('#modeDesc').textContent = PLAY_MODES[m];
    $('#modeDescSet').textContent = PLAY_MODES[m];

    /* Das Start-Tempo gibt es nur im Arcade - im Safari fällt nichts. */
    $('#speedSection').hidden = isSafari();
    $('#chipSpeed').hidden = isSafari();

    const t = themeList().find(x => x.id === DB.settings.theme);
    $('#themeHead').textContent = isSafari() ? 'Landschaft' : 'Hintergrund';
    $('#themeDesc').textContent = isSafari()
      ? 'Jede Landschaft hat ihr eigenes Fahrzeug.'
      : 'Die Kulisse bestimmt auch, womit du fliegst oder tauchst.';
    $('#chipTheme').textContent = t ? t.icon + ' ' + t.name : '';
  }

  /* Umschalten zieht die ganze Oberfläche nach */
  function setPlayMode(m) {
    DB.settings.playMode = m === 'safari' ? 'safari' : 'arcade';
    save();
    buildThemes();
    applyInputMode();
    syncPlayMode();
    renderMenuInfo();
  }

  /* ===================== Bildschirmzeit =====================
     Ein Budget für das ganze Gerät: 15 Minuten am Stück, über alle Runden
     und beide Spielarten zusammengezählt. Ist es aufgebraucht, macht die
     App 30 Minuten Pause und fängt danach wieder bei null an. Gezählt wird
     nur echte Spielzeit - Menüs und Pausen laufen nicht mit. */
  function limitSec() { return Math.max(60, (DB.time.limitMin | 0) * 60); }
  function pauseSec() { return Math.max(0, (DB.time.pauseMin | 0) * 60); }
  function usedSec() { return Math.max(0, DB.time.usedSec || 0); }
  function leftSec() { return Math.max(0, limitSec() - usedSec()); }

  /* Läuft gerade eine Sperre? Nach ihrem Ende ist das Budget wieder voll.
     Eine zurückgestellte Uhr kann die Pause nicht endlos verlängern: länger
     als die eingestellte Pause dauert sie nie. */
  function lockLeft() {
    const until = DB.time.lockUntil || 0;
    if (!until) return 0;
    const max = Date.now() + Math.max(60, pauseSec()) * 1000;
    if (until > max) { DB.time.lockUntil = max; save(); }
    const left = Math.ceil((Math.min(until, max) - Date.now()) / 1000);
    if (left <= 0) {
      DB.time.lockUntil = 0;
      DB.time.usedSec = 0;
      save();
      return 0;
    }
    return left;
  }
  function isLocked() { return lockLeft() > 0; }

  /* Zeit ist alle: Sperre setzen (Pause 0 = nur Hinweis, sofort weiter) */
  function startLock() {
    DB.time.usedSec = limitSec();
    DB.time.lockUntil = pauseSec() > 0 ? Date.now() + pauseSec() * 1000 : 0;
    if (!DB.time.lockUntil) DB.time.usedSec = 0;
    save();
  }

  function addUsed(sec) {
    if (!(sec > 0)) return;
    DB.time.usedSec = usedSec() + sec;
    /* nicht bei jedem Frame schreiben - einmal pro Sekunde genügt */
    const now = Date.now();
    if (now - (lastTimeSave || 0) > 1000) { lastTimeSave = now; save(); }
  }
  let lastTimeSave = 0;

  /* Beim Zurückkommen den gespeicherten Stand dazunehmen. Sonst könnte man
     die App in zwei Fenstern öffnen und die Bildschirmzeit halbieren: jedes
     Fenster zählt für sich, und beim Speichern gewänne das langsamere. */
  function mergeTime() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const t = (JSON.parse(raw) || {}).time;
      if (!t) return;
      DB.time.usedSec = Math.max(usedSec(), t.usedSec || 0);
      DB.time.lockUntil = Math.max(DB.time.lockUntil || 0, t.lockUntil || 0);
      if (t.limitMin) DB.time.limitMin = t.limitMin;
      if (t.pauseMin != null) DB.time.pauseMin = t.pauseMin;
      if (t.code) DB.time.code = t.code;
    } catch (e) { /* egal */ }
  }

  function freeTime() {
    DB.time.usedSec = 0;
    DB.time.lockUntil = 0;
    save();
    renderTimeStrip();
  }

  function mmssLong(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  function minWord(n) { return n === 1 ? '1 Minute' : n + ' Minuten'; }

  /* Der Streifen im Startmenü zeigt, wie viel Zeit noch übrig ist. */
  function renderTimeStrip() {
    const strip = $('#timeStrip'), fill = $('#timeFill'), txt = $('#timeText');
    if (!strip) return;
    $('#limitLine').textContent = minWord(DB.time.limitMin | 0) + ' Bildschirmzeit';
    const lock = lockLeft();
    if (lock > 0) {
      strip.className = 'time-strip out';
      fill.style.width = '0%';
      txt.textContent = 'Pause – in ' + mmssLong(lock) + ' geht es weiter.';
      $('#btnPlay').disabled = true;
      $('#btnPlay').textContent = 'PAUSE ' + mmssLong(lock);
      return;
    }
    const left = leftSec(), pct = Math.round(left / limitSec() * 100);
    strip.className = 'time-strip' + (pct <= 25 ? ' low' : '');
    fill.style.width = pct + '%';
    txt.textContent = 'Noch ' + mmssLong(left) + ' von ' + minWord(DB.time.limitMin | 0) + ' Bildschirmzeit';
    $('#btnPlay').disabled = false;
    $('#btnPlay').textContent = 'SPIELEN';
  }

  /* Sperrbildschirm mit laufender Uhr */
  let lockTimer = null;
  function showLocked() {
    const p = DB.time.pauseMin | 0;
    $('#lockedText').textContent =
      'Die ' + minWord(DB.time.limitMin | 0) + ' Bildschirmzeit sind aufgebraucht. '
      + 'Jetzt ist erst einmal ' + minWord(p) + ' Pause – Zeit für etwas anderes!';
    $('#lockedRule').textContent =
      'Die Bildschirmzeit gilt für das ganze Gerät, egal wie oft die App geöffnet wird. '
      + 'Nach der Pause stehen wieder ' + minWord(DB.time.limitMin | 0) + ' bereit.';
    show('locked');
    tickLock();
  }

  function tickLock() {
    clearInterval(lockTimer);
    const run = () => {
      const left = lockLeft();
      $('#lockClock').textContent = mmssLong(left);
      renderTimeStrip();
      if (left <= 0) {
        clearInterval(lockTimer);
        $('#lockClock').textContent = 'Frei!';
        if (openScreen === 'locked') {
          $('#lockedText').textContent = 'Die Pause ist vorbei – es kann weitergehen!';
        }
      }
    };
    run();
    lockTimer = setInterval(run, 1000);
  }

  /* ===================== Eltern-Code ===================== */
  /* Der Code wird nicht im Klartext gespeichert, sondern als kurze Prüfsumme.
     Das hält neugierige Kinder ab - mehr soll es auch nicht leisten. */
  function hashCode(code) {
    let h = 5381;
    const str = 'mathe-app:' + String(code);
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function hasCode() { return !!DB.time.code; }
  function checkCode(code) { return hasCode() && hashCode(code) === DB.time.code; }
  function setCode(code) { DB.time.code = hashCode(code); save(); }

  let gateMode = 'ask';        /* ask | set | math */
  let gateThen = null;
  let gateTask = { text: '', answer: 0 };

  function openGate(then) {
    gateThen = then || (() => show('parent'));
    gateMode = hasCode() ? 'ask' : 'set';
    gateTask = makeGateTask();
    $('#gateCode').value = '';
    $('#gateRepeat').value = '';
    $('#gateMath').value = '';
    $('#gateError').textContent = '';
    syncGate();
    show('gate');
    setTimeout(() => { $('#gateCode').focus(); }, 120);
  }

  function makeGateTask() {
    const a = 11 + Math.floor(Math.random() * 78);
    const b = 12 + Math.floor(Math.random() * 78);
    return { text: a + ' · ' + b, answer: a * b };
  }

  function syncGate() {
    const set = gateMode === 'set', math = gateMode === 'math';
    $('#gateTitle').textContent = set ? '🔒 Code festlegen' : '🔒 Eltern-Einstellungen';
    $('#gateHint').textContent = set
      ? 'Bitte einen vierstelligen Code vergeben – er schützt die Zeit-Einstellungen.'
      : 'Bitte den vierstelligen Code eingeben.';
    $('#gateHint').hidden = math;
    $('#gateCode').parentNode.hidden = math;
    $('#gateRepeatRow').hidden = !set;
    $('#gateMathBox').hidden = !math;
    $('#gateForgot').hidden = set || math;
    $('#gateTask').textContent = gateTask.text;
  }

  function submitGate() {
    const err = m => { $('#gateError').textContent = m; Sound.play('wrong'); };

    if (gateMode === 'math') {
      if (parseInt($('#gateMath').value, 10) !== gateTask.answer) {
        gateTask = makeGateTask(); syncGate();
        $('#gateMath').value = '';
        return err('Leider falsch. Hier ist eine neue Aufgabe.');
      }
      Sound.play('badge');
      gateMode = 'set';
      DB.time.code = '';
      $('#gateCode').value = ''; $('#gateError').textContent = '';
      syncGate();
      return;
    }

    const code = $('#gateCode').value.trim();
    if (!/^\d{4}$/.test(code)) return err('Bitte genau vier Ziffern eingeben.');

    if (gateMode === 'set') {
      if ($('#gateRepeat').value.trim() !== code) return err('Die beiden Eingaben sind nicht gleich.');
      setCode(code);
      Sound.play('badge');
      toast('Code gespeichert 🔒');
    } else {
      if (!checkCode(code)) return err('Der Code stimmt nicht.');
      Sound.play('click');
    }
    $('#gateError').textContent = '';
    const then = gateThen; gateThen = null;
    if (then) then();
  }

  /* ===================== Eltern-Einstellungen ===================== */
  const LIMITS = [5, 10, 15, 20, 30, 45];
  const PAUSES = [0, 15, 30, 45, 60];

  function buildParent() {
    const lg = $('#limitGrid'); lg.innerHTML = '';
    LIMITS.forEach(m => {
      const b = document.createElement('button');
      b.innerHTML = '<span class="ic">' + m + '</span><small>Minuten</small>';
      b.dataset.limit = m;
      b.addEventListener('click', () => {
        DB.time.limitMin = m; save();
        Sound.play('click');
        syncParent(); renderTimeStrip();
      });
      lg.appendChild(b);
    });
    const pg = $('#pauseGrid'); pg.innerHTML = '';
    PAUSES.forEach(m => {
      const b = document.createElement('button');
      b.innerHTML = '<span class="ic">' + (m || '–') + '</span><small>' + (m ? 'Minuten' : 'keine') + '</small>';
      b.dataset.pause = m;
      b.addEventListener('click', () => {
        DB.time.pauseMin = m; save();
        Sound.play('click');
        syncParent(); renderTimeStrip();
      });
      pg.appendChild(b);
    });
    syncParent();
  }

  function syncParent() {
    $$('#limitGrid button').forEach(b => b.classList.toggle('active', +b.dataset.limit === (DB.time.limitMin | 0)));
    $$('#pauseGrid button').forEach(b => b.classList.toggle('active', +b.dataset.pause === (DB.time.pauseMin | 0)));
    const lock = lockLeft();
    $('#timeStats').innerHTML = [
      ['Seit der letzten Pause gespielt', mmssLong(usedSec())],
      ['Davon noch übrig', mmssLong(leftSec())],
      ['Zustand', lock > 0 ? 'Pause, noch ' + mmssLong(lock) : 'frei']
    ].map(x => '<div class="stat-row"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>').join('');
    $('#btnCodeChange').textContent = hasCode() ? 'Code ändern' : 'Code festlegen';
  }

  /* ===================== Eintrag in die Bestenliste ===================== */
  let currentAvatar = '';
  let pendingEntry = null;

  function drawAvatarBox() {
    const cv = $('#avatarCanvas');
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    /* 7 x 7 Pixel auf 64 x 64: Größe 8, oben links 4 Pixel Rand */
    Pixel.drawAvatar(c, currentAvatar, 4, 4, 8);
  }

  function rollAvatar() {
    currentAvatar = Pixel.randomAvatar();
    DB.settings.avatar = currentAvatar;
    save();
    drawAvatarBox();
  }

  let entryDone = false;

  /* Ohne Spitznamen kein Eintrag - der Knopf bleibt so lange gesperrt. */
  function syncEntryButton() {
    const btn = $('#submitScore');
    if (entryDone) {
      btn.disabled = true;
      btn.textContent = 'Eingetragen ✓';
      return;
    }
    const name = Leaderboard.cleanName($('#nickInput').value);
    btn.disabled = name.length === 0;
    btn.textContent = name ? 'Eintragen' : 'Spitzname fehlt';
    $('#nickInput').classList.toggle('needed', name.length === 0);
  }

  function prepareEntry(r) {
    pendingEntry = r;
    currentAvatar = DB.settings.avatar || Pixel.randomAvatar();
    DB.settings.avatar = currentAvatar;
    $('#nickInput').value = DB.settings.nick || '';
    drawAvatarBox();
    const key = r.score + '|' + r.seconds + '|' + r.correct;
    entryDone = key === lastEntryKey;
    $('#entryBox').hidden = r.score <= 0;
    if (entryDone) $('#submitScore').textContent = 'Schon eingetragen ✓';
    syncEntryButton();
    $('#entryNote').textContent = Leaderboard.configured()
      ? '' : 'Ohne Online-Liste wird der Eintrag nur auf diesem Gerät gespeichert.';
  }

  async function submitEntry() {
    if (!pendingEntry || entryDone) return;
    const nick = Leaderboard.cleanName($('#nickInput').value);
    if (!nick) {
      $('#entryNote').textContent = 'Bitte zuerst einen Spitznamen eintragen.';
      $('#nickInput').classList.add('needed');
      $('#nickInput').focus();
      Sound.play('wrong');
      return;
    }
    DB.settings.nick = nick;
    DB.settings.avatar = currentAvatar;

    const entry = {
      name: nick, avatar: currentAvatar,
      score: pendingEntry.score, grade: pendingEntry.grade,
      correct: pendingEntry.correct, level: pendingEntry.level,
      date: Date.now(), online: false
    };

    /* immer zuerst auf dem Gerät sichern */
    DB.scores.push(entry);
    DB.scores.sort((a, b) => b.score - a.score);
    DB.scores = DB.scores.slice(0, 25);
    save();

    lastEntryKey = pendingEntry.score + '|' + pendingEntry.seconds + '|' + pendingEntry.correct;
    entryDone = true;
    syncEntryButton();
    Sound.play('badge');

    if (!Leaderboard.configured()) {
      entry.online = true;                /* ohne Online-Liste gibt es nichts nachzureichen */
      save();
      $('#entryNote').textContent = 'Auf diesem Gerät gespeichert.';
      toast('Eingetragen! 🏆');
      return;
    }
    $('#entryNote').textContent = 'Wird hochgeladen …';
    try {
      await Leaderboard.submit(entry);
      entry.online = true;
      save();
      $('#entryNote').textContent = 'In der Online-Bestenliste eingetragen!';
      toast('Online eingetragen! 🌍');
    } catch (err) {
      save();
      $('#entryNote').textContent = 'Noch nicht online: ' + (err && err.message ? err.message : err)
        + ' – der Eintrag ist auf dem Gerät gespeichert und wird in der Bestenliste nachgereicht.';
    }
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
    buildOps();
    buildRanges();
    syncSpeeds();
  }

  /* ---- Rechenarten (pro Klassenstufe gemerkt) ----
     Gespeichert wird nur eine Auswahl, wenn sie von "alles an" abweicht.
     Dadurch sind neue Aufgabenarten in späteren Versionen automatisch
     mit dabei, statt still zu fehlen. */
  function allOps(grade) {
    return MathGen.opsFor(grade || DB.settings.grade);
  }

  function curOps(grade) {
    const g = grade || DB.settings.grade;
    const avail = allOps(g).map(o => o.id);
    const saved = DB.settings.opsByGrade[g];
    if (!Array.isArray(saved) || !saved.length) return avail.slice();
    const keep = saved.filter(id => avail.indexOf(id) >= 0);
    return keep.length ? keep : avail.slice();
  }

  function setOps(list) {
    const g = DB.settings.grade;
    const avail = allOps(g).map(o => o.id);
    if (list.length >= avail.length) delete DB.settings.opsByGrade[g];   /* alles an = kein Eintrag */
    else DB.settings.opsByGrade[g] = list.slice();
    save();
  }

  function buildOps() {
    const grid = $('#opGrid');
    const g = DB.settings.grade;
    const active = curOps();
    grid.innerHTML = '';
    allOps(g).forEach(op => {
      const lab = document.createElement('label');
      lab.className = 'op-item';
      lab.innerHTML =
        '<input type="checkbox" data-op="' + op.id + '">' +
        '<span class="box"></span>' +
        '<span class="txt"><b>' + op.name + '</b><small>' + op.sym + '</small></span>';
      const cb = lab.querySelector('input');
      cb.checked = active.indexOf(op.id) >= 0;
      lab.classList.toggle('on', cb.checked);
      cb.addEventListener('change', () => {
        const chosen = Array.from(grid.querySelectorAll('input:checked')).map(i => i.dataset.op);
        if (!chosen.length) {
          /* die letzte Rechenart bleibt an - sonst gäbe es keine Aufgaben */
          cb.checked = true;
          lab.classList.add('on');
          Sound.play('wrong');
          $('#opsHint').textContent = 'Mindestens eine Rechenart muss angehakt bleiben.';
          return;
        }
        Sound.play('click');
        setOps(chosen);
        syncOps();
        renderMenuInfo();
      });
      grid.appendChild(lab);
    });
    syncOps();
  }

  function syncOps() {
    const g = DB.settings.grade;
    const avail = allOps(g);
    const active = curOps();
    $('#opsForGrade').textContent = '· ' + MathGen.GRADE_INFO[g].name;
    Array.from($('#opGrid').querySelectorAll('.op-item')).forEach(lab => {
      const cb = lab.querySelector('input');
      cb.checked = active.indexOf(cb.dataset.op) >= 0;
      lab.classList.toggle('on', cb.checked);
    });
    const n = MathGen.poolSize(g, 12, active);
    $('#opsHint').textContent = active.length === avail.length
      ? 'Alle ' + avail.length + ' Rechenarten sind an (' + n + ' Aufgabenarten).'
      : active.length + ' von ' + avail.length + ' Rechenarten an (' + n + ' Aufgabenarten).';
  }

  /* ---- Zahlenraum (pro Klassenstufe gemerkt) ----
     Maßgeblich ist immer die größte Zahl der Aufgabe, das Ergebnis
     eingeschlossen: "7 + 5 = 12" gehört damit zu den 10ern. */
  function allRanges() { return MathGen.RANGES; }

  function curRanges(grade) {
    const g = grade || DB.settings.grade;
    const avail = allRanges().map(r => r.id);
    const saved = DB.settings.rangeByGrade[g];
    if (!Array.isArray(saved) || !saved.length) return avail.slice();
    const keep = saved.filter(id => avail.indexOf(id) >= 0);
    return keep.length ? keep : avail.slice();
  }

  function setRanges(list) {
    const g = DB.settings.grade;
    if (list.length >= allRanges().length) delete DB.settings.rangeByGrade[g];
    else DB.settings.rangeByGrade[g] = list.slice();
    save();
  }

  function buildRanges() {
    const grid = $('#rangeGrid');
    const active = curRanges();
    grid.innerHTML = '';
    allRanges().forEach(r => {
      const lab = document.createElement('label');
      lab.className = 'op-item';
      lab.innerHTML =
        '<input type="checkbox" data-range="' + r.id + '">' +
        '<span class="box"></span>' +
        '<span class="txt"><b>' + r.name + '</b><small>' + r.note + '</small></span>';
      const cb = lab.querySelector('input');
      cb.checked = active.indexOf(r.id) >= 0;
      lab.classList.toggle('on', cb.checked);
      cb.addEventListener('change', () => {
        const chosen = Array.from(grid.querySelectorAll('input:checked')).map(i => i.dataset.range);
        if (!chosen.length) {
          /* der letzte Zahlenraum bleibt an - sonst gäbe es keine Aufgaben */
          cb.checked = true;
          lab.classList.add('on');
          Sound.play('wrong');
          $('#rangeHint').textContent = 'Mindestens ein Zahlenraum muss angehakt bleiben.';
          return;
        }
        Sound.play('click');
        setRanges(chosen);
        syncRanges();
        renderMenuInfo();
      });
      grid.appendChild(lab);
    });
    syncRanges();
  }

  function syncRanges() {
    const avail = allRanges();
    const active = curRanges();
    Array.from($('#rangeGrid').querySelectorAll('.op-item')).forEach(lab => {
      const cb = lab.querySelector('input');
      cb.checked = active.indexOf(cb.dataset.range) >= 0;
      lab.classList.toggle('on', cb.checked);
    });
    const names = avail.filter(r => active.indexOf(r.id) >= 0).map(r => r.name);
    $('#rangeHint').textContent = active.length === avail.length
      ? 'Alle Zahlenräume sind an – die Aufgaben richten sich nach der Klassenstufe.'
      : 'Nur ' + names.join(', ') + ': Die größte Zahl einer Aufgabe bleibt in diesem Bereich.';
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

  /* Dieselben vier Hintergründe, aber je Spielart anders benannt und
     gezeichnet: im Arcade die Kulisse, im Safari die Landkarte von oben. */
  function themeList() {
    return Backgrounds.list().map(t => {
      if (!isSafari()) return { id: t.id, name: t.name, icon: t.icon };
      const w = Safari.info(t.id);
      return { id: t.id, name: w.name, icon: w.icon };
    });
  }

  function buildThemes() {
    const grid = $('#themeGrid');
    grid.innerHTML = '';
    themeList().forEach(t => {
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
      try {
        const c = cv.getContext('2d');
        if (isSafari()) Safari.preview(c, t.id, 220, 130);
        else Backgrounds.preview(c, t.id, 220, 130);
      } catch (e) { /* egal */ }
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
    $('#btnParent').addEventListener('click', () => { Sound.play('click'); openGate(() => { buildParent(); show('parent'); }); });
    $$('[data-close]').forEach(b => b.addEventListener('click', () => { Sound.play('back'); show('menu'); renderMenuInfo(); }));

    /* Spielart */
    $$('#playMode button, #playModeSet button').forEach(b => b.addEventListener('click', () => {
      Sound.play('click');
      setPlayMode(b.dataset.play);
    }));

    /* Sperrbildschirm */
    $('#lockedOk').addEventListener('click', () => { Sound.play('back'); show('menu'); renderMenuInfo(); });
    $('#lockedParent').addEventListener('click', () => {
      Sound.play('click');
      openGate(() => { buildParent(); show('parent'); });
    });

    /* Eltern-Code */
    $('#gateOk').addEventListener('click', () => submitGate());
    $('#gateCode').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitGate(); } });
    $('#gateRepeat').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitGate(); } });
    $('#gateMath').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitGate(); } });
    $('#gateForgot').addEventListener('click', () => {
      Sound.play('click');
      gateMode = 'math';
      gateTask = makeGateTask();
      $('#gateError').textContent = '';
      syncGate();
      setTimeout(() => $('#gateMath').focus(), 100);
    });

    /* Eltern-Einstellungen */
    $('#btnTimeReset').addEventListener('click', () => {
      Sound.play('badge'); freeTime(); syncParent(); toast('Bildschirmzeit freigegeben');
    });
    $('#btnCodeChange').addEventListener('click', () => {
      Sound.play('click');
      gateMode = 'set';
      gateThen = () => { buildParent(); show('parent'); };
      $('#gateCode').value = ''; $('#gateRepeat').value = ''; $('#gateError').textContent = '';
      syncGate();
      show('gate');
      setTimeout(() => $('#gateCode').focus(), 120);
    });

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
      DB.settings.opsByGrade = {};
      DB.settings.rangeByGrade = {};
      DB.scores = [];
      save(); buildOps(); buildRanges(); syncSpeeds(); renderMenuInfo(); toast('Fortschritt gelöscht');
    });

    /* Tastenfeld */
    $$('#keypad button').forEach(b => b.addEventListener('click', () => key(b.dataset.k)));
    $('#btnFire').addEventListener('click', fireAnswer);

    /* Pause */
    $('#btnPause').addEventListener('click', () => { Game.pause(); Sound.play('back'); openPause(false); });
    $('#btnResume').addEventListener('click', () => {
      Sound.play('click');
      show(null);
      /* kurzer Countdown, danach stehen neue Aufgaben da. Im Safari wartet
         die Aufgabe ohnehin geduldig - da geht es direkt weiter. */
      if (Game.mode === 'safari') Game.resume(); else countdown(() => Game.resume());
    });
    $('#btnQuit').addEventListener('click', () => { Sound.play('back'); quitToMenu(); });

    /* Bonus-Station */
    wireCannon();
    $('#bonusContinue').addEventListener('click', () => {
      Sound.play('click');
      show(null); inGameChrome(true);
      $('#miniHint').hidden = true;
      $('#cannonPad').hidden = true;
      applyInputMode();
      Game.resumeFromBonus();
      if (DB.settings.music) Sound.startMusic();
    });

    $('#miniOk').addEventListener('click', () => { Sound.play('click'); refreshBonus(); show('bonus'); });

    /* Eintrag in die Bestenliste */
    $('#avatarDice').addEventListener('click', () => { Sound.play('click'); rollAvatar(); });
    $('#submitScore').addEventListener('click', submitEntry);
    $('#nickInput').addEventListener('input', syncEntryButton);
    $('#nickInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); submitEntry(); }
    });

    /* Ansichten der Bestenliste */
    $$('#scoreTabs button').forEach(b => b.addEventListener('click', () => {
      Sound.play('click');
      $$('#scoreTabs button').forEach(x => x.classList.toggle('active', x === b));
      const online = b.dataset.tab === 'online';
      $('#tabOnline').hidden = !online;
      $('#tabLocal').hidden = online;
      if (online) renderOnline();
    }));
    $('#onlineReload').addEventListener('click', () => { Sound.play('click'); renderOnline(); renderPendingNote(); });
    $('#pendingSend').addEventListener('click', () => { Sound.play('click'); flushPending(false); });

    /* Game Over */
    $('#btnAgain').addEventListener('click', () => { Sound.play('start'); startGame(); });
    $('#btnMenu').addEventListener('click', () => { Sound.play('back'); show('menu'); renderMenuInfo(); });

    /* Tastatur */
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (inRound() || Game.state === 'mini') { Game.pause(); show('pause'); }
        else if (openScreen === 'pause') { show(null); Game.resume(); }
        return;
      }
      if (!inRound() || DB.settings.inputMode !== 'keypad') return;
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

    /* App im Hintergrund: sofort pausieren. Sonst friert das Spiel zwar ein,
       man könnte aber in aller Ruhe nachdenken - und die Musik liefe weiter. */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (inRound() || Game.state === 'mini')) {
        Game.pause();
        openPause(false);
      }
      if (document.hidden) { Sound.stopMusic(); save(); }
      else {
        /* zurück aus dem Hintergrund: Stand abgleichen und prüfen, ob die
           Bildschirmzeit inzwischen abgelaufen oder wieder frei ist */
        mergeTime();
        renderTimeStrip();
        if (isLocked() && openScreen === 'menu') showLocked();
      }
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

  const APP_FALLBACK_VERSION = '1.8.0';

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
      onTimeUsed: (used) => { addUsed(used); },
      onToast: toast,
      onMiniStart: (info, inst) => {
        document.querySelector('.bonus-meter').hidden = true;
        cannonInst = info.id === 'kanone' ? inst : null;
        if (cannonInst) {
          cannonInst.setAngle(+$('#angleSlider').value);
          cannonInst.setPower(+$('#powerSlider').value);
        }
      },
      onMiniEnd: r => {
        DB.stats.bestKills = Math.max(DB.stats.bestKills, r.score);
        DB.stats.bestMiniStars = Math.max(DB.stats.bestMiniStars || 0, r.stars);
        DB.stats.totalStars += r.stars;
        DB.stats.miniPlayed = (DB.stats.miniPlayed || 0) + 1;
        save();
        checkBadges();
        cannonInst = null;
        const net = r.stars - r.cost;
        $('#miniTitle').textContent = r.game.icon + ' ' + r.game.name;
        $('#miniStats').innerHTML = (r.detail || []).concat([
          ['💯 +' + r.score, 'Extra-Punkte'],
          ['⭐ +' + r.stars, 'von 5 möglichen']
        ]).slice(0, 4)
          .map(x => '<div><b>' + x[0] + '</b><small>' + x[1] + '</small></div>').join('');
        $('#miniNet').textContent = 'Einsatz ' + r.cost + ' ★ · zurück ' + r.stars + ' ★ · Bilanz ' +
          (net >= 0 ? '+' : '') + net + ' ★';
        $('#miniHint').hidden = true;
        $('#cannonPad').hidden = true;
        show('miniresult');
      }
    });

    $$('#modeSeg button').forEach(x => x.classList.toggle('active', x.dataset.mode === DB.settings.inputMode));
    buildGrades();
    buildOps();
    buildRanges();
    buildSpeeds();
    buildThemes();
    buildParent();
    syncSound();
    Backgrounds.use(DB.settings.theme);
    renderMenuInfo();
    renderAnswer();
    wire();
    pwa();
    show('menu');
    inGameChrome(false);
    /* Läuft noch eine Pause? Dann gleich mit laufender Uhr anzeigen. */
    mergeTime();
    if (isLocked()) { tickLock(); showLocked(); }
    /* Der Streifen im Menü zählt auch ohne Spiel weiter */
    setInterval(() => { if (openScreen === 'menu') renderTimeStrip(); }, 5000);
    /* Beim Schließen der App die verbrauchte Zeit sicher wegschreiben */
    window.addEventListener('pagehide', () => save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    setTimeout(() => flushPending(true), 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
