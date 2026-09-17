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
      nick: '', avatar: ''
    },
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
    const done = Game.config.bonusEvery - s.untilBonus;
    $('#bonusFill').style.width = (done / Game.config.bonusEvery * 100) + '%';
    $('#bonusText').textContent = 'BONUS in ' + s.untilBonus;
    $('.bonus-meter').title = 'Noch ' + s.untilBonus + ' richtige Aufgaben bis zur Bonus-Station';

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
    if (st === 'playing' || st === 'mini') {
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
    Sound.resume();
    show(null);
    inGameChrome(true);
    applyInputMode();
    answer = ''; negative = false; renderAnswer();
    heartSlots = 3;
    $('#hearts').innerHTML = '';
    Game.setTheme(DB.settings.theme);
    armBack();
    countdown(() => {
      Game.start({
        grade: DB.settings.grade, theme: DB.settings.theme,
        inputMode: DB.settings.inputMode, speed: curSpeed(), ops: curOps()
      });
    });
  }

  /* ===================== Bonus-Station ===================== */
  function onBonus() {
    refreshBonus();
    show('bonus');
  }

  function refreshBonus() {
    const info = Game.bonusInfo;
    $('#bonusStars').textContent = info.stars;

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
    prepareEntry(r);
    if (fresh.length) setTimeout(() => Sound.play('badge'), 700);
    show('gameover');
    renderMenuInfo();
  }

  /* ===================== Menü-Infos ===================== */
  function renderMenuInfo() {
    const g = DB.settings.grade;
    $('#chipGrade').textContent = MathGen.GRADE_INFO[g].name;
    const opsAll = allOps().length, opsOn = curOps().length;
    $('#chipOps').textContent = opsOn === opsAll
      ? 'Alle Rechenarten' : opsOn + '/' + opsAll + ' Rechenarten';
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
      DB.settings.opsByGrade = {};
      DB.scores = [];
      save(); buildOps(); syncSpeeds(); renderMenuInfo(); toast('Fortschritt gelöscht');
    });

    /* Tastenfeld */
    $$('#keypad button').forEach(b => b.addEventListener('click', () => key(b.dataset.k)));
    $('#btnFire').addEventListener('click', fireAnswer);

    /* Pause */
    $('#btnPause').addEventListener('click', () => { Game.pause(); Sound.play('back'); openPause(false); });
    $('#btnResume').addEventListener('click', () => {
      Sound.play('click');
      show(null);
      /* kurzer Countdown, danach stehen neue Aufgaben da */
      countdown(() => Game.resume());
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

  const APP_FALLBACK_VERSION = '1.5.1';

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
    setTimeout(() => flushPending(true), 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
