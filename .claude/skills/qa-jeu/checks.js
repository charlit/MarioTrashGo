// Suite de tests QA de TrashGO World.
// À exécuter dans la page ouverte avec ?debug (window.__tg doit exister).
// Chaque test repart d'une partie neuve via g.start(niveau) et renvoie
// { test, ok, detail }. Le résultat global est la dernière expression.
(() => {
  const g = window.__tg;
  if (!g) return { error: "window.__tg absent : ouvre la page avec ?debug" };
  const { T, LEVEL_Y, GROUND_ROW, GROUND_Y } = g.consts;
  const results = [];
  const check = (test, ok, detail) => results.push({ test, ok: !!ok, detail });
  const release = () => ['left', 'right', 'jump', 'trick'].forEach((k) => g.release(k));
  const safe = (name, fn) => { try { fn(); } catch (e) { check(name, false, 'exception : ' + e.message); } release(); };

  // 1. Hauteur de saut : sur place et avec élan (les poubelles de 4 tuiles = 120 px)
  safe('saut', () => {
    g.start(0);
    const p = g.player();
    const y0 = p.y; let minY = y0;
    g.press('jump'); for (let i = 0; i < 60; i++) { g.run(1); minY = Math.min(minY, p.y); } g.release('jump'); g.run(40);
    const standing = Math.round(y0 - minY);
    g.warp(4); g.run(2); g.press('right'); g.run(40);
    const y1 = p.y; minY = y1;
    g.press('jump'); for (let i = 0; i < 60; i++) { g.run(1); minY = Math.min(minY, p.y); }
    const running = Math.round(y1 - minY);
    check('saut', standing >= 100 && running >= 4 * T + 6, 'sur place ' + standing + ' px, avec élan ' + running + ' px (poubelle max 120 px)');
  });

  // 2. Géométrie statique de chaque niveau : poubelles ≤ 4, socle du drapeau, sol au checkpoint et au départ
  safe('niveaux', () => {
    g.start(0);
    const n = g.def().levels;
    const problems = [];
    for (let i = 0; i < n; i++) {
      g.start(i);
      const grid = g.grid(), d = g.def();
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < d.cols; c++) {
          if (grid[r][c] !== 'T') continue;
          let h = 1; while (grid[r + h] && grid[r + h][c] === 'p') h++;
          if (h > 4) problems.push('niveau ' + (i + 1) + ' : poubelle col ' + c + ' haute de ' + h + ' tuiles');
        }
      }
      if (grid[GROUND_ROW - 1][d.flag] !== 'S') problems.push('niveau ' + (i + 1) + ' : pas de socle S sous le drapeau');
      if (grid[GROUND_ROW][d.checkpoint] !== '#') problems.push('niveau ' + (i + 1) + ' : pas de sol au checkpoint');
      if (grid[GROUND_ROW][2] !== '#') problems.push('niveau ' + (i + 1) + ' : pas de sol au départ');
      if ((d.flag + 5) * T + 130 > d.cols * T) problems.push('niveau ' + (i + 1) + ' : fronton coupé en fin de niveau');
      // marches d'escalier : jamais plus de 4 tuiles d'un coup
      for (let c = 1; c < d.cols; c++) {
        const height = (col) => { let h = 0; while (GROUND_ROW - 1 - h >= 0 && grid[GROUND_ROW - 1 - h][col] === 'S') h++; return h; };
        if (height(c) - height(c - 1) > 4) problems.push('niveau ' + (i + 1) + ' : marche infranchissable col ' + c);
      }
    }
    check('niveaux', problems.length === 0, problems.length ? problems.join(' | ') : n + ' niveaux OK');
  });

  // 3. Bloc ? : donne une pièce
  safe('bloc ?', () => {
    g.start(0);
    g.warp(14); g.run(2);
    g.press('jump'); g.run(25); g.release('jump'); g.run(40);
    const i = g.info();
    check('bloc ?', i.coinCount === 1 && g.grid()[GROUND_ROW - 4][14] === 'X', 'pièces ' + i.coinCount + ', tuile ' + g.grid()[GROUND_ROW - 4][14]);
  });

  // 4. Écraser un cône en lui tombant dessus
  safe('écraser cône', () => {
    g.start(0);
    const e = g.enemies().find((x) => x.type === 'cone');
    g.warp(Math.floor(e.x / T) - 3); g.run(1);
    e.active = true;
    g.place(e.x, e.y - 60, 2);
    const s0 = g.info().score;
    g.run(20);
    check('écraser cône', !e.alive && g.info().score > s0 && g.info().state === 'playing', 'alive=' + e.alive + ', +' + (g.info().score - s0) + ' pts');
  });

  // 5. Toucher un cône de côté = mort (petit) ou rapetisser (grand)
  safe('touché par cône', () => {
    g.start(0);
    const e = g.enemies().find((x) => x.type === 'cone');
    g.warp(Math.floor(e.x / T) - 3); g.run(1);
    e.active = true;
    g.place(e.x - 25, GROUND_Y - g.player().h, 0);
    g.press('right'); g.run(30);
    check('touché par cône', g.info().state === 'dying', 'état ' + g.info().state);
  });

  // 6. Mouette : on peut aussi l'écraser
  safe('écraser mouette', () => {
    g.start(0);
    const e = g.enemies().find((x) => x.type === 'gull');
    if (!e) { check('écraser mouette', false, 'aucune mouette au niveau 1'); return; }
    g.warp(Math.floor(e.x / T) - 3); g.run(1);
    e.active = true;
    g.place(e.x + 4, e.y - 50, 3);
    g.run(12);
    check('écraser mouette', !e.alive, 'alive=' + e.alive);
  });

  // 7. Bloc M → gâteau basque → le joueur grandit
  safe('gâteau basque', () => {
    g.start(0);
    const grid = g.grid();
    let c = -1, r = -1;
    for (let rr = 0; rr < grid.length && c < 0; rr++) { const k = grid[rr].indexOf('M'); if (k >= 0) { c = k; r = rr; } }
    // on retire les ennemis proches : on teste le bonus, pas l'esquive
    g.enemies().forEach((e) => { if (Math.abs(e.x - c * T) < 20 * T) { e.alive = false; e.dead = 'gone'; } });
    g.warp(c); g.run(2);
    g.press('jump'); g.run(25); g.release('jump'); g.run(20);
    g.press('right'); let big = false;
    for (let i = 0; i < 240 && !big; i++) { g.run(1); big = g.info().big; if (g.info().state !== 'playing') break; }
    check('gâteau basque', big, 'big=' + big + ', état ' + g.info().state);
  });

  // 8. Rail : on glisse automatiquement en atterrissant dessus
  safe('rail', () => {
    g.start(0);
    const grid = g.grid();
    let c = -1, r = -1;
    for (let rr = 0; rr < grid.length && c < 0; rr++) { const k = grid[rr].indexOf('R'); if (k >= 0) { c = k; r = rr; } }
    g.warp(c); g.run(1);
    g.place(c * T + 10, LEVEL_Y + r * T - g.player().h - 20, 1);
    g.press('right');
    let grind = false; for (let i = 0; i < 30; i++) { g.run(1); if (g.info().grinding) grind = true; }
    check('rail', grind, 'grinding vu=' + grind);
  });

  // 9. Chute dans un trou = vie perdue, puis réapparition
  safe('trou', () => {
    g.start(0);
    const grid = g.grid();
    let gap = -1;
    for (let c = 5; c < grid[0].length; c++) if (grid[GROUND_ROW][c] === ' ') { gap = c; break; }
    g.warp(gap); g.run(1);
    g.place(gap * T + 5, GROUND_Y - 10, 0);
    g.run(40);
    const dying = g.info().state === 'dying';
    g.run(300);
    check('trou', dying && g.info().lives === 2 && g.info().state === 'playing', 'dying=' + dying + ', vies ' + g.info().lives + ', état ' + g.info().state);
  });

  // 10. Drapeau : fin de niveau, bonus de temps, passage au niveau suivant (pour chaque niveau)
  safe('drapeau', () => {
    g.start(0);
    const n = g.def().levels;
    const out = [];
    for (let i = 0; i < n; i++) {
      g.start(i);
      const d = g.def();
      g.warp(d.flag - 4); g.run(2);
      g.press('right');
      let cleared = false;
      for (let k = 0; k < 200 && !cleared; k++) { g.run(1); cleared = g.info().state === 'clear'; }
      g.release('right');
      const score0 = g.info().score;
      g.run(700);
      const inf = g.info();
      out.push({ niveau: i + 1, cleared, bonus: inf.score - score0, suivant: inf.levelIndex });
    }
    check('drapeau', out.every((o, i) => o.cleared && o.bonus > 0 && o.suivant === i + 1), JSON.stringify(out));
  });

  // 11. Figures en l'air : points + combo
  safe('figures', () => {
    g.start(0);
    const s0 = g.info().score;
    g.press('jump'); g.run(5);
    g.press('trick'); g.release('trick');
    g.run(60); g.release('jump'); g.run(20);
    check('figures', g.info().score > s0, '+' + (g.info().score - s0) + ' pts');
  });

  // 12. Chrono : à 0, on perd une vie
  safe('chrono', () => {
    g.start(0);
    g.run(24 * 301);
    check('chrono', g.info().state === 'dying' || g.info().lives === 2, 'état ' + g.info().state + ', vies ' + g.info().lives);
  });

  // 13. 100 pièces = 1UP (on part de 99 et on prend le premier bloc ?)
  safe('1UP', () => {
    g.start(0);
    if (!g.setCoins) { check('1UP', false, 'g.setCoins absent du mode debug'); return; }
    g.setCoins(99);
    const lives0 = g.info().lives;
    g.warp(14); g.run(2);
    g.press('jump'); g.run(25); g.release('jump'); g.run(20);
    const i = g.info();
    check('1UP', i.lives === lives0 + 1 && i.coinCount === 0, 'vies ' + lives0 + ' → ' + i.lives + ', pièces ' + i.coinCount);
  });

  // 14. Pause : le jeu et le chrono s'arrêtent, les commandes sont ignorées, puis ça repart
  safe('pause', () => {
    g.start(0);
    const x0 = g.info().x, t0 = g.info().timeLeft;
    g.setPaused(true);
    g.press('right'); g.run(200); g.release('right');
    const frozen = g.info().x === x0 && g.info().timeLeft === t0;
    g.setPaused(false);
    g.press('right'); g.run(30); g.release('right');
    check('pause', frozen && g.info().x > x0, 'figé=' + frozen + ', avance après reprise ' + (g.info().x - x0) + ' px');
  });

  // 15. Croix tactile : on glisse le pouce de droite à gauche sans le lever
  safe('croix glissante', () => {
    const dpad = document.getElementById('dpad');
    if (!dpad) { check('croix glissante', false, '#dpad absent'); return; }
    g.start(0); g.warp(6); g.run(2);
    // sur ordinateur la manette est masquée (largeur 0) : on l'affiche le temps du test
    const pad = document.getElementById('pad');
    const prevDisplay = pad.style.display;
    if (getComputedStyle(pad).display === 'none') pad.style.display = 'flex';
    const r = dpad.getBoundingClientRect();
    const ev = (type, fx) => dpad.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', clientX: r.left + r.width * fx, clientY: r.top + r.height / 2 }));
    ev('pointerdown', 0.8); g.run(20);
    const right = g.keys.right && !g.keys.left;
    ev('pointermove', 0.2); g.run(5);
    const left = g.keys.left && !g.keys.right;
    ev('pointerup', 0.2);
    const released = !g.keys.left && !g.keys.right;
    pad.style.display = prevDisplay;
    check('croix glissante', right && left && released, 'droite=' + right + ', glisse gauche=' + left + ', relâché=' + released);
  });

  g.start(0);
  const failed = results.filter((r) => !r.ok);
  return { total: results.length, echecs: failed.length, results };
})()
