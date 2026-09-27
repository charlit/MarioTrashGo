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
      if (d.boss) continue; // arène du boss : ni drapeau ni fronton (testée à part)
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
      if (d.boss) continue;
      // invincible : on teste le drapeau, pas l'esquive (une flamme est juste avant à Bayonne)
      g.player().star = 1000;
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
    check('drapeau', out.length > 0 && out.every((o) => o.cleared && o.bonus > 0 && o.suivant === o.niveau), JSON.stringify(out));
  });

  // 11. Figures automatiques : un grand saut finit sa figure (points), un petit saut
  //     coupé ne rapporte rien mais ne pénalise pas (combo et vitesse intacts)
  safe('figures auto', () => {
    g.start(0);
    const s0 = g.info().score;
    g.press('jump'); g.run(60); g.release('jump'); g.run(20);
    const full = g.info().score - s0;
    g.start(0);
    g.press('right'); g.run(40);
    const s1 = g.info().score, vx = g.player().vx;
    g.press('jump'); g.run(2); g.release('jump');
    let t = 0; while (!g.info().onGround && t < 60) { g.run(1); t++; }
    const hop = g.info().score - s1;
    const keptSpeed = Math.abs(g.player().vx) > Math.abs(vx) * 0.6;
    g.release('right');
    check('figures auto', full > 0 && hop === 0 && keptSpeed, 'grand saut +' + full + ' pts, petit saut +' + hop + ' pts, vitesse gardée=' + keptSpeed);
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

  // 16. Anti-exploit : sauter sur place en boucle (figures auto) ne doit pas faire
  //     exploser le score, et le combo reste plafonné (bug : x21 et 7805 pts en 20 sauts)
  safe('sauts sur place', () => {
    g.start(0);
    const s0 = g.info().score;
    for (let i = 0; i < 20; i++) {
      g.press('jump'); g.run(46); g.release('jump');
      let k = 0; while (!g.info().onGround && k < 30) { g.run(1); k++; }
      g.run(1);
    }
    const gained = g.info().score - s0;
    const m = /x(\d+)/.exec(document.getElementById('combo').textContent);
    const comboShown = m ? +m[1] : 1;
    check('sauts sur place', gained < 1500 && comboShown <= 8, '+' + gained + ' pts en 20 sauts, combo affiché x' + comboShown);
  });

  // 17. Pièces au-dessus des rails : on les ramasse toutes en glissant, SANS sauter
  //     (bug : posées 2 tuiles au-dessus du rail, le petit personnage les ratait d'1 px)
  safe('pièces sur rails', () => {
    const problems = [];
    let railsTested = 0;
    const n = g.def().levels;
    for (let i = 0; i < n; i++) {
      g.start(i);
      const grid = g.grid();
      const runs = [];
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === 'R' && (c === 0 || grid[r][c - 1] !== 'R')) {
            let len = 0; while (grid[r][c + len] === 'R') len++;
            runs.push({ c, r, len });
          }
        }
      }
      for (const run of runs) {
        g.start(i);
        const railTop = LEVEL_Y + run.r * T;
        const above = g.coins().filter((k) => k.x > run.c * T && k.x < (run.c + run.len) * T && k.y < railTop && k.y > railTop - 3 * T);
        if (!above.length) continue;
        railsTested++;
        g.enemies().forEach((e) => { e.alive = false; e.dead = 'gone'; });
        g.warp(run.c); g.run(1);
        const p = g.player();
        g.place(run.c * T + 2, railTop - p.h - 2, 1);
        const c0 = g.info().coinCount;
        g.press('right');
        let f = 0, jumped = false;
        while (p.x < (run.c + run.len) * T + 4 && f < 300) { g.run(1); f++; if (p.vy < -1) jumped = true; }
        g.release('right');
        const got = g.info().coinCount - c0;
        if (got < above.length || jumped) problems.push('niveau ' + (i + 1) + ' rail col ' + run.c + ' : ' + got + '/' + above.length + ' pièces' + (jumped ? ' (a sauté ?)' : ''));
      }
    }
    check('pièces sur rails', railsTested > 0 && problems.length === 0, problems.length ? problems.join(' | ') : railsTested + ' rails : toutes les pièces ramassées en glissant');
  });

  // 18. Flammes au sol : bien placées, cycliques, inoffensives au repos, blessent quand
  //     elles brûlent, et le piment protège
  safe('flammes', () => {
    if (!g.flames) { check('flammes', false, 'g.flames absent du mode debug'); return; }
    const problems = [];
    const n = g.def().levels;
    let count = 0;
    for (let i = 0; i < n; i++) {
      g.start(i);
      const grid = g.grid(), d = g.def();
      for (const f of g.flames()) {
        count++;
        if (grid[GROUND_ROW][f.c] !== '#') problems.push('niv ' + (i + 1) + ' col ' + f.c + ' : pas de sol');
        if (Math.abs(f.c - d.checkpoint) <= 1 || f.c < 5) problems.push('niv ' + (i + 1) + ' col ' + f.c + ' : sur un point de réapparition');
        for (let r = GROUND_ROW - 2; r < GROUND_ROW; r++) if ('R=SBTtpq'.includes(grid[r][f.c])) problems.push('niv ' + (i + 1) + ' col ' + f.c + ' : obstacle au-dessus (' + grid[r][f.c] + ')');
      }
    }
    // cycle : ne brûle qu'une partie du temps
    g.start(0);
    const f0 = g.flames()[0];
    let on = 0;
    for (let k = 0; k < 200; k++) { g.run(1); if (g.flames()[0].mode === 'on') on++; }
    if (on < 40 || on > 100) problems.push('brûle ' + on + '/200 images');
    // au repos : on peut rester dessus sans dommage
    g.start(0); g.enemies().forEach((e) => { e.alive = false; e.dead = 'gone'; });
    let k = 0; while (g.flames()[0].mode !== 'off' && k < 300) { g.run(1); k++; }
    g.warp(f0.c); g.run(1);
    const p = g.player();
    p.x = f0.c * T + 5; p.y = GROUND_Y - p.h; p.vy = 0;
    let offFrames = 0; while (g.flames()[0].mode === 'off' && offFrames < 150) { g.run(1); offFrames++; }
    const safeWhenOff = g.info().state === 'playing' && g.info().lives === 3;
    // quand elle brûle : blesse
    g.run(60);
    const hurt = g.info().state === 'dying';
    if (!safeWhenOff) problems.push("blesse alors qu'elle est éteinte");
    if (!hurt) problems.push('ne blesse pas quand elle brûle');
    // piment : immunisé
    g.start(0); g.enemies().forEach((e) => { e.alive = false; e.dead = 'gone'; });
    p.star = 600; // AVANT de le poser sur la flamme (elle peut déjà être allumée)
    g.warp(f0.c); p.x = f0.c * T + 5; p.y = GROUND_Y - p.h;
    g.run(220);
    if (g.info().state !== 'playing') problems.push('le piment ne protège pas');
    check('flammes', count >= 9 && problems.length === 0, problems.length ? problems.join(' | ') : count + ' flammes OK (brûle ' + on + '/200 images, sans danger au repos, blesse allumée, piment protège)');
  });

  // 19. Chaque flamme se franchit en sautant par-dessus PENDANT qu'elle brûle, avec une
  //     piste d'élan au sol (bug : flammes posées juste après un trou, sous des briques
  //     basses ou coincées entre deux poubelles → on retombait dedans sans pouvoir l'éviter)
  safe('flammes franchissables', () => {
    if (!g.flames) { check('flammes franchissables', false, 'g.flames absent'); return; }
    const problems = [];
    let tested = 0;
    const n = g.def().levels;
    for (let lv = 0; lv < n; lv++) {
      g.start(lv);
      const count = g.flames().length;
      for (let i = 0; i < count; i++) {
        g.start(lv);
        g.enemies().forEach((e) => { e.alive = false; e.dead = 'gone'; });
        const grid = g.grid();
        const fc = g.flames()[i].c;
        // piste : sol continu de fc-4 à fc+3, rien de solide à hauteur 1-2 (on doit pouvoir courir)
        let runway = true;
        for (let c = fc - 4; c <= fc + 3; c++) {
          if (grid[GROUND_ROW][c] !== '#') runway = false;
          for (let r = GROUND_ROW - 2; r < GROUND_ROW; r++) if ('B?MEXSTtpq'.includes(grid[r][c])) runway = false;
        }
        if (!runway) { problems.push('niv ' + (lv + 1) + ' col ' + fc + " : pas de piste d'élan dégagée"); continue; }
        tested++;
        let k = 0; while (!(g.flames()[i].mode === 'on' && g.flames()[i].k === 10) && k < 400) { g.run(1); k++; }
        const p = g.player();
        g.warp(fc - 4); p.x = (fc - 4) * T + 5; p.y = GROUND_Y - p.h; p.vy = 0;
        g.press('right');
        let jumped = false, f = 0;
        while (p.x < fc * T + 2 * T && f < 200 && g.info().state === 'playing') {
          if (!jumped && p.x + p.w > fc * T - 48) { g.press('jump'); jumped = true; }
          g.run(1); f++;
        }
        g.release('right'); g.release('jump');
        if (g.info().state !== 'playing' || g.info().lives !== 3) problems.push('niv ' + (lv + 1) + ' col ' + fc + ' : brûlé en sautant par-dessus');
      }
    }
    check('flammes franchissables', tested > 0 && problems.length === 0, problems.length ? problems.join(' | ') : tested + " flammes franchies en sautant pendant qu'elles brûlent");
  });

  // 20. Boss Tartalo (arène après le 3e niveau) : il blesse au contact, lance des rochers,
  //     fait une onde de choc, n'est vulnérable que SONNÉ, meurt en 3 coups, puis monde suivant
  safe('boss', () => {
    if (!g.boss) { check('boss', false, 'g.boss absent du mode debug'); return; }
    const n = g.def().levels;
    let bi = -1;
    for (let i = 0; i < n; i++) { g.start(i); if (g.def().boss) { bi = i; break; } }
    if (bi < 0) { check('boss', false, 'aucun niveau de boss'); return; }
    const problems = [];
    const p = g.player();
    // a) contact de côté = blessé
    g.start(bi);
    let b = g.boss(); b.state = 'walk'; b.t = 0;
    p.x = b.x - p.w - 2; p.y = GROUND_Y - p.h; g.press('right'); g.run(20); g.release('right');
    if (g.info().state !== 'dying') problems.push('pas blessé au contact');
    // b) il finit par lancer un rocher et par sauter (onde de choc)
    g.start(bi); b = g.boss(); p.x = 20; p.star = 2000;
    let rock = false, wave = false;
    for (let k = 0; k < 900 && !(rock && wave); k++) { g.run(1); if (g.bossRocks().length) rock = true; if (g.shockwaves().length) wave = true; }
    if (!rock) problems.push('ne lance jamais de rocher');
    if (!wave) problems.push("pas d'onde de choc");
    // c) sauter sur sa tête quand il N'EST PAS sonné : pas de dégât au boss
    g.start(bi); b = g.boss(); b.state = 'walk'; b.t = 0; p.star = 2000;
    g.place(b.x + 10, b.y - p.h - 20, 3); g.run(15);
    if (b.hp !== 3) problems.push('prend des dégâts sans être sonné');
    // d) sonné : 3 coups sur la tête → K.O. → bonus → monde suivant
    g.start(bi); b = g.boss();
    const score0 = g.info().score;
    for (let hit = 0; hit < 3; hit++) {
      b.state = 'stunned'; b.t = 0; b.flash = 0; b.y = GROUND_Y - b.h;
      g.place(b.x + 10, b.y - p.h - 24, 3);
      let k = 0; while (b.hp === 3 - hit && k < 30) { g.run(1); k++; }
      p.x = 10; p.y = GROUND_Y - p.h; p.vx = 0; p.vy = 0; p.star = 200;
    }
    if (b.hp !== 0) problems.push('encore ' + b.hp + ' PV après 3 coups');
    let k = 0; while (g.info().state !== 'clear' && k < 300) { g.run(1); k++; }
    const cleared = g.info().state === 'clear';
    const livesAtEnd = g.info().lives;
    g.run(700);
    const inf = g.info();
    // le boss de fin vaincu = FIN DU JEU : écran de victoire avec bonus de vies et score à enregistrer
    const ov = document.getElementById('overlay');
    const txt = ov.innerText || '';
    if (!cleared) problems.push('pas de victoire après le K.O.');
    if (inf.state !== 'won') problems.push("pas d'écran de fin (état " + inf.state + ')');
    if (ov.classList.contains('hidden') || !txt.includes('ZORIONAK') || !document.getElementById('pseudoField')) problems.push('écran de victoire incomplet');
    if (!txt.includes('+' + (livesAtEnd * 1000))) problems.push('bonus de vies absent');
    if (inf.score - score0 < 5000 + livesAtEnd * 1000) problems.push('bonus trop faible (' + (inf.score - score0) + ')');
    // un appui ailleurs relance une partie depuis Biarritz
    ov.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
    g.run(3);
    if (g.info().levelIndex !== 0 || g.info().score !== 0) problems.push('rejouer ne relance pas une partie neuve');
    check('boss', problems.length === 0, problems.length ? problems.join(' | ') : 'Tartalo : contact blessant, rochers, onde de choc, invulnérable hors étourdissement, K.O. en 3 coups, écran de victoire (+' + (inf.score - score0) + ' pts dont vies), rejouer OK');
  });

  // 21. Boss battable SANS TRICHE : un robot qui joue « proprement » (esquive rochers et
  //     ondes de choc, s'écarte du point de chute, saute sur la tête quand il est sonné)
  //     doit gagner. Bugs historiques : le boss coinçait le joueur contre le mur, des planches
  //     au-dessus de lui empêchaient de toucher sa tête, le toucher sonné blessait, les rochers
  //     retombaient pile sur le joueur.
  safe('boss battable', () => {
    if (!g.boss) { check('boss battable', false, 'g.boss absent'); return; }
    const W = 390, n = g.def().levels;
    let bi = -1; for (let i = 0; i < n; i++) { g.start(i); if (g.def().boss) { bi = i; break; } }
    const runs = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      g.start(bi); const p = g.player(); let b = g.boss();
      for (let w = 0; w < attempt * 13; w++) g.run(1);
      let jumpHold = 0, target = null, deaths = 0, f = 0, fin = '';
      for (; f < 60 * 120; f++) {
        const st = g.info().state;
        if (st === 'clear' || st === 'over') { fin = st; break; }
        b = g.boss();
        if (st !== 'playing') { ['left', 'right', 'jump'].forEach((k) => g.release(k)); jumpHold = 0; target = null; g.run(1); continue; }
        const pc = p.x + p.w / 2, bc = b.x + b.w / 2, dist = bc - pc;
        let want = 0, jump = false;
        const rockDanger = g.bossRocks().some((r) => { const d = pc - r.x; return Math.abs(d) < 62 && Math.sign(r.vx) === Math.sign(d) && r.y > GROUND_Y - 60; });
        const waveDanger = g.shockwaves().some((w) => Math.abs(w.x - pc) < 48 && Math.sign(w.dir) === Math.sign(pc - w.x));
        if (b.state === 'stunned') {
          target = null;
          if (p.onGround) { if (Math.abs(dist) > 30) want = Math.sign(dist); if (Math.abs(dist) < 58) jump = true; }
          else want = Math.abs(dist) > 6 ? Math.sign(dist) : 0;
        } else if (b.state === 'crouch' || b.state === 'air') {
          let land = bc;
          if (b.state === 'air') { let y = b.y, vy = b.vy, x = bc; while (y + b.h < GROUND_Y && vy < 40) { vy += 0.495; y += vy; x += b.vx; } land = x; }
          else land = bc + Math.max(-2.8, Math.min(2.8, (pc - bc) / 48)) * 46;
          const left = land - 100, right = land + 100, okL = left > 20, okR = right < W - 20;
          target = (okL && (!okR || Math.abs(pc - left) < Math.abs(pc - right))) ? left : right;
          const crossing = Math.sign(target - pc) === Math.sign(dist) && Math.abs(dist) < 70;
          const bossHigh = b.state === 'air' && (GROUND_Y - (b.y + b.h)) > 45;
          if (Math.abs(target - pc) > 6 && (!crossing || bossHigh || (b.state === 'crouch' && Math.abs(dist) > 70))) want = Math.sign(target - pc);
        } else {
          target = null;
          if (Math.abs(dist) < 120) want = -Math.sign(dist) || 1; else if (Math.abs(dist) > 180) want = Math.sign(dist);
          if ((p.x < 12 && want < 0) || (p.x > W - p.w - 12 && want > 0)) want = 0;
        }
        if ((rockDanger || waveDanger) && p.onGround) jump = true;
        g.release('left'); g.release('right'); if (want < 0) g.press('left'); else if (want > 0) g.press('right');
        if (jump && jumpHold === 0) { g.press('jump'); jumpHold = 22; } if (jumpHold > 0) { jumpHold--; if (jumpHold === 0) g.release('jump'); }
        g.run(1);
        if (g.info().state === 'dying') deaths++;
      }
      ['left', 'right', 'jump'].forEach((k) => g.release(k));
      runs.push({ gagne: fin === 'clear', morts: deaths, secondes: Math.round(f / 60) });
    }
    check('boss battable', runs.every((r) => r.gagne), JSON.stringify(runs));
  });

  // 22. Le boss ne se téléporte jamais : après avoir reculé contre un mur, il revient en
  //     marchant (bug : bond de 41 px en une image quand il repassait en marche)
  safe('boss sans téléportation', () => {
    if (!g.boss) { check('boss sans téléportation', false, 'g.boss absent'); return; }
    const n = g.def().levels;
    let bi = -1; for (let i = 0; i < n; i++) { g.start(i); if (g.def().boss) { bi = i; break; } }
    let worst = 0;
    for (const side of [-1, 1]) {
      g.start(bi);
      const b = g.boss(), p = g.player();
      b.x = side < 0 ? 6 : 390 - b.w - 6; b.state = 'hit'; b.t = 50;
      p.x = side < 0 ? 330 : 30; p.y = GROUND_Y - p.h; p.star = 999;
      let prev = b.x;
      for (let i = 0; i < 90; i++) {
        const st = b.state; g.run(1);
        if (st !== 'air' && b.state !== 'air') worst = Math.max(worst, Math.abs(b.x - prev));
        prev = b.x;
      }
    }
    check('boss sans téléportation', worst < 6, 'déplacement max ' + worst.toFixed(1) + ' px par image hors saut');
  });

  // 23. Passage secret : sur l'écran d'accueil, toucher le soleil mène directement au boss ;
  //     toucher ailleurs lance une partie normale au niveau 1
  safe('soleil secret', () => {
    const overlay = document.getElementById('overlay');
    const canvas = document.getElementById('game');
    if (getComputedStyle(overlay).display === 'none' && !g.toTitle) { check('soleil secret', false, 'écran d’accueil introuvable'); return; }
    const tapAt = (lx, ly) => {
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + canvas.clientLeft + lx * canvas.clientWidth / canvas.width;
      const y = rect.top + canvas.clientTop + ly * canvas.clientHeight / canvas.height;
      overlay.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch' }));
    };
    const res = {};
    g.toTitle(); tapAt(390 - 55, 620 * 0.13); g.run(3);
    res.soleil = { niveau: g.info().levelIndex, boss: !!g.boss() };
    g.toTitle(); tapAt(120, 420); g.run(3);
    res.ailleurs = { niveau: g.info().levelIndex };
    check('soleil secret', res.soleil.boss && res.soleil.niveau === 3 && res.ailleurs.niveau === 0, JSON.stringify(res));
  });

  g.start(0);
  const failed = results.filter((r) => !r.ok);
  return { total: results.length, echecs: failed.length, results };
})()
