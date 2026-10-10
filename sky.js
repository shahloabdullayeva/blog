(() => {
  const HOLIDAYS = [
    { from: '12-31', to: '12-31', id: 'newyear', label: "new year's eve" },
    { from: '01-01', to: '01-01', id: 'newyear', label: 'happy new year' },
    { from: '02-14', to: '02-14', id: 'valentine', label: 'feb 14' },
    { from: '03-08', to: '03-08', id: 'womensday', label: 'march 8' },
    { from: '03-20', to: '03-22', id: 'navruz', label: 'navruz muborak' },
    { from: '09-01', to: '09-01', id: 'independence', label: 'independence day' },
    { from: '10-24', to: '10-31', id: 'halloween', label: 'spooky week' },
    { from: '12-13', to: '12-13', id: 'dec13', label: 'dec 13' },
    { from: '12-24', to: '12-26', id: 'christmas', label: 'christmas' },
  ];
  const WXTEXT = {
    clear: 'clear sky', partly: 'a few clouds', overcast: 'overcast', fog: 'foggy',
    rain: 'raining', snow: 'snowing', storm: 'thunderstorm',
  };
  const PAL = {
    night: [[16, 22, 34], [28, 36, 52]],
    dawn: [[30, 40, 60], [80, 72, 88]],
    dusk: [[28, 34, 56], [84, 64, 76]],
    day: [[44, 60, 82], [76, 94, 116]],
  };
  const GREY = { clear: 0, partly: .1, overcast: .6, fog: .65, rain: .7, snow: .55, storm: .85 };
  const STAR_HIDE = { clear: 0, partly: .3, overcast: .9, fog: .9, rain: .95, snow: .9, storm: 1 };
  const COVER = { clear: 0, partly: .1, overcast: .75, fog: .7, rain: .85, snow: .8, storm: .95 };
  const CLOUD_COUNT = { clear: 0, partly: 5, overcast: 12, fog: 6, rain: 11, snow: 10, storm: 13 };
  const CACHE_KEY = 'sky-live';
  const CACHE_MS = 30 * 60 * 1000;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = list => list[Math.floor(R(0, list.length))];

  let live = { city: '', temp: null, wx: 'clear', sunrise: 6.8, sunset: 18.4, ok: false };
  let cv = null, ctx = null, statusEl = null, running = false;
  let W = 0, H = 0, t = 0, raf = 0, flash = 0;
  let stars = [], clouds = [], drops = [], fx = [], fog = [], bursts = [];

  function holidayToday() {
    const d = new Date();
    const md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return HOLIDAYS.find(x => md >= x.from && md <= x.to) || null;
  }

  function wxFromCode(c) {
    if (c >= 95) return 'storm';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
    if (c === 45 || c === 48) return 'fog';
    if (c === 3) return 'overcast';
    if (c === 1 || c === 2) return 'partly';
    return 'clear';
  }

  function readCache() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (saved && Date.now() - saved.at < CACHE_MS) return saved.live;
    } catch (e) {}
    return null;
  }

  async function loadLive() {
    const cached = readCache();
    if (cached) {
      live = cached;
      return;
    }
    try {
      const geo = await fetch('https://get.geojs.io/v1/ip/geo.json').then(r => r.json());
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}` +
        '&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=1';
      const w = await fetch(url).then(r => r.json());
      const toH = s => { const p = s.split('T')[1].split(':'); return +p[0] + p[1] / 60; };
      live = {
        city: geo.city || '',
        temp: Math.round(w.current.temperature_2m),
        wx: wxFromCode(w.current.weather_code),
        sunrise: toH(w.daily.sunrise[0]),
        sunset: toH(w.daily.sunset[0]),
        ok: true,
      };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), live })); } catch (e) {}
    } catch (e) {
      live.ok = false;
    }
  }

  function sunAlt(h, sr, ss) {
    if (h >= sr && h <= ss) return Math.sin(Math.PI * (h - sr) / (ss - sr));
    const nightLen = 24 - (ss - sr), into = h > ss ? h - ss : h + 24 - ss;
    return -Math.sin(Math.PI * into / nightLen);
  }

  function skyColors(h, sr, ss, wx) {
    const alt = sunAlt(h, sr, ss), edge = h < 12 ? PAL.dawn : PAL.dusk;
    let top, bot;
    if (alt >= .3) { top = PAL.day[0]; bot = PAL.day[1]; }
    else if (alt >= 0) { const k = alt / .3; top = mix(edge[0], PAL.day[0], k); bot = mix(edge[1], PAL.day[1], k); }
    else if (alt >= -.25) { const k = -alt / .25; top = mix(edge[0], PAL.night[0], k); bot = mix(edge[1], PAL.night[1], k); }
    else { top = PAL.night[0]; bot = PAL.night[1]; }
    const g = alt > 0 ? [[50, 58, 70], [72, 80, 92]] : [[22, 26, 34], [34, 38, 48]];
    if (wx === 'storm' && alt > 0) { g[0] = [34, 40, 50]; g[1] = [50, 56, 66]; }
    return { top: mix(top, g[0], GREY[wx]), bot: mix(bot, g[1], GREY[wx]), alt };
  }

  function currentHour() {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  function size() {
    const d = devicePixelRatio || 1;
    W = innerWidth;
    H = innerHeight;
    cv.width = W * d;
    cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function rebuild() {
    if (!running) return;
    size();
    const wx = live.wx, hol = holidayToday();
    stars = Array.from({ length: Math.round(W * H / 5000) }, () => ({ x: R(0, W), y: R(0, H), r: R(.4, 1.5), p: R(0, 6) }));
    clouds = Array.from({ length: CLOUD_COUNT[wx] }, () => {
      const s = R(.6, 1.4) * (wx === 'partly' ? 1 : 1.4);
      return {
        x: R(-100, W + 100), y: R(H * .02, H * .45), s, v: R(.04, .12),
        puffs: Array.from({ length: 6 }, () => ({ dx: R(-90, 90), dy: R(-16, 16), r: R(28, 56) })),
      };
    });
    drops = [];
    if (wx === 'rain' || wx === 'storm') drops = Array.from({ length: Math.min(260, W * H / 5500) }, () => ({ x: R(0, W), y: R(-H, H), l: R(12, 22), v: R(11, 17) }));
    if (wx === 'snow') drops = Array.from({ length: Math.min(220, W * H / 7000) }, () => ({ x: R(0, W), y: R(-H, H), r: R(1.4, 4), v: R(.5, 1.4), p: R(0, 6) }));
    fog = wx === 'fog' ? Array.from({ length: 7 }, (_, i) => ({ y: H * (.25 + i * .11), x: R(0, W), v: R(.08, .2) })) : [];
    fx = [];
    bursts = [];
    const id = hol ? hol.id : 'none';
    const make = {
      valentine: () => ({ k: 'heart', x: R(0, W), y: R(-H, H), s: R(6, 12), v: R(.6, 1.4), p: R(0, 6), c: pick(['#ff5d8f', '#ff9ab8', '#ffffff']) }),
      womensday: () => ({ k: 'petal', x: R(0, W), y: R(-H, H), s: R(5, 9), v: R(.6, 1.3), a: R(0, 6), c: pick(['#ff4d6d', '#ff8fa3', '#ffd166']) }),
      navruz: () => ({ k: 'petal', x: R(0, W), y: R(-H, H), s: R(5, 9), v: R(.6, 1.3), a: R(0, 6), c: pick(['#ff4d6d', '#ffffff', '#5ccf6a', '#ffd166']) }),
      dec13: () => ({ k: 'conf', x: R(0, W), y: R(-H, H), w: R(5, 10), h: R(3, 6), v: R(1, 2.4), a: R(0, 6), sp: R(-.1, .1), c: pick(['#ff6fcf', '#ffe03a', '#9be7ff', '#ffffff', '#c9a2ff']) }),
      halloween: () => ({ k: 'bat', x: R(0, W), y: R(20, H * .55), s: R(.6, 1.2), v: R(.5, 1.2), p: R(0, 6) }),
    }[id];
    if (make) for (let i = 0; i < (id === 'halloween' ? 6 : id === 'dec13' ? 120 : 45); i++) fx.push(make());
    updateText();
    cancelAnimationFrame(raf);
    if (reduce) draw(); else loop();
  }

  function cloud(c, col, alpha) {
    ctx.fillStyle = rgb(col, alpha);
    for (const p of c.puffs) {
      ctx.beginPath();
      ctx.arc(c.x + p.dx * c.s, c.y + p.dy * c.s, p.r * c.s, 0, 7);
      ctx.fill();
    }
  }

  function ridge(base, amp, scale, shift, col) {
    ctx.fillStyle = rgb(col);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 6; x += 6) {
      const u = x * scale + shift;
      const p = .55 * (1 - Math.abs(Math.sin(u * .0035 + .6))) +
        .3 * (1 - Math.abs(Math.sin(u * .009 + 2.1))) +
        .15 * (1 - Math.abs(Math.sin(u * .021 + 4)));
      ctx.lineTo(x, H * base - H * amp * p);
    }
    ctx.lineTo(W, H);
    ctx.fill();
  }

  function heart(x, y, s, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x, y + s * .3);
    ctx.bezierCurveTo(x, y - s * .3, x - s, y - s * .3, x - s, y + s * .2);
    ctx.bezierCurveTo(x - s, y + s * .7, x, y + s * 1.1, x, y + s * 1.3);
    ctx.bezierCurveTo(x, y + s * 1.1, x + s, y + s * .7, x + s, y + s * .2);
    ctx.bezierCurveTo(x + s, y - s * .3, x, y - s * .3, x, y + s * .3);
    ctx.fill();
  }

  function bat(x, y, s, f) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#050505';
    const w = Math.sin(f) * 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-14, -12 - w, -30, -4 - w);
    ctx.quadraticCurveTo(-22, 0, -24, 8 - w * .3);
    ctx.quadraticCurveTo(-12, 2, 0, 8);
    ctx.quadraticCurveTo(12, 2, 24, 8 - w * .3);
    ctx.quadraticCurveTo(22, 0, 30, -4 - w);
    ctx.quadraticCurveTo(14, -12 - w, 0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 2, 5, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  function firework(colors) {
    const x = R(W * .1, W * .9), y = R(H * .1, H * .45), c = pick(colors);
    for (let i = 0; i < 70; i++) {
      const a = R(0, 7), sp = R(1, 4.2);
      bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c });
    }
  }

  function draw() {
    const h = currentHour(), L = live, wx = L.wx, hol = holidayToday(), id = hol ? hol.id : 'none';
    const { top, bot, alt } = skyColors(h, L.sunrise, L.sunset, wx);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(top));
    g.addColorStop(1, rgb(bot));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const starA = Math.max(0, Math.min(1, -alt / .25)) * (1 - STAR_HIDE[wx]);
    if (starA > 0) for (const s of stars) {
      ctx.globalAlpha = starA * (.35 + .65 * Math.abs(Math.sin(t / 70 + s.p)));
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const cover = COVER[wx];
    if (alt > -.05) {
      const f = (h - L.sunrise) / (L.sunset - L.sunrise);
      const x = W * (.12 + .76 * Math.min(1, Math.max(0, f))), y = H * .82 - Math.max(alt, 0) * H * .65;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 160);
      glow.addColorStop(0, `rgba(255,200,150,${.18 * (1 - cover)})`);
      glow.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 160, y - 160, 320, 320);
      ctx.fillStyle = `rgba(255,${alt < .2 ? 170 : 214},${alt < .2 ? 130 : 170},${.55 * (1 - cover * .9)})`;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, 7);
      ctx.fill();
    } else {
      const into = (h > L.sunset ? h - L.sunset : h + 24 - L.sunset) / (24 - (L.sunset - L.sunrise));
      const x = W * (.12 + .76 * into), y = H * .82 + alt * H * .65;
      ctx.globalAlpha = 1 - cover * .85;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 120);
      glow.addColorStop(0, 'rgba(220,230,255,.12)');
      glow.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 120, y - 120, 240, 240);
      ctx.fillStyle = '#cfccbd';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, 7);
      ctx.fill();
      ctx.fillStyle = rgb(mix(top, bot, .3));
      ctx.beginPath();
      ctx.arc(x + 10, y - 5, 20, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ridge(.86, .13, 1, 0, mix(bot, [8, 10, 16], .45));
    ridge(.93, .1, 1.7, 900, mix(bot, [8, 10, 16], .75));

    const cCol = alt > 0 ? (wx === 'storm' ? [54, 60, 72] : wx === 'clear' || wx === 'partly' ? [106, 120, 140] : [86, 96, 112]) : [44, 50, 64];
    for (const c of clouds) {
      c.x += c.v;
      if (c.x - 140 * c.s > W) c.x = -140 * c.s;
      cloud(c, cCol, .6);
    }

    for (const f of fog) {
      f.x += f.v;
      if (f.x > W) f.x -= W;
      const gr = ctx.createLinearGradient(0, f.y - 40, 0, f.y + 40);
      const fc = alt > 0 ? '90,94,104' : '60,62,72';
      gr.addColorStop(0, `rgba(${fc},0)`);
      gr.addColorStop(.5, `rgba(${fc},.3)`);
      gr.addColorStop(1, `rgba(${fc},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, f.y - 40, W, 80);
    }

    if (wx === 'rain' || wx === 'storm') {
      ctx.strokeStyle = 'rgba(150,170,200,.38)';
      ctx.lineWidth = 1.3;
      for (const d of drops) {
        d.y += d.v;
        d.x -= d.v * .12;
        if (d.y > H) { d.y = R(-60, 0); d.x = R(0, W + 60); }
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.l * .12, d.y + d.l);
        ctx.stroke();
      }
    }
    if (wx === 'snow') {
      ctx.fillStyle = 'rgba(230,234,240,.7)';
      for (const d of drops) {
        d.y += d.v;
        d.x += Math.sin(t / 40 + d.p) * .5;
        if (d.y > H) { d.y = -6; d.x = R(0, W); }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, 7);
        ctx.fill();
      }
    }
    if (wx === 'storm' && !reduce) {
      if (Math.random() < .004) flash = 1;
      if (flash > .6) {
        ctx.strokeStyle = 'rgba(255,255,240,.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let x = R(W * .2, W * .8), y = 0;
        ctx.moveTo(x, y);
        while (y < H * .6) { x += R(-30, 30); y += R(20, 50); ctx.lineTo(x, y); }
        ctx.stroke();
      }
      if (flash > 0) {
        ctx.fillStyle = `rgba(200,210,255,${flash * .12})`;
        ctx.fillRect(0, 0, W, H);
        flash *= .86;
        if (flash < .02) flash = 0;
      }
    }

    for (const p of fx) {
      if (p.k === 'heart') {
        p.y += p.v;
        p.x += Math.sin(t / 50 + p.p) * .4;
        if (p.y > H + 20) { p.y = -20; p.x = R(0, W); }
        ctx.globalAlpha = .85;
        heart(p.x, p.y, p.s, p.c);
      }
      if (p.k === 'petal') {
        p.y += p.v;
        p.a += .03;
        p.x += Math.sin(t / 40 + p.a) * .6;
        if (p.y > H + 20) { p.y = -20; p.x = R(0, W); }
        ctx.globalAlpha = .9;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s, p.s * .5, 0, 0, 7);
        ctx.fill();
        ctx.restore();
      }
      if (p.k === 'conf') {
        p.y += p.v;
        p.a += p.sp;
        if (p.y > H + 10) { p.y = -10; p.x = R(0, W); }
        ctx.globalAlpha = .85;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.scale(1, Math.cos(t / 15 + p.a));
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (p.k === 'bat') {
        p.x += p.v;
        p.y += Math.sin(t / 30 + p.p) * .6;
        if (p.x > W + 40) { p.x = -40; p.y = R(20, H * .55); }
        ctx.globalAlpha = 1;
        bat(p.x, p.y, p.s, t / 4 + p.p);
      }
    }
    ctx.globalAlpha = 1;

    if (id === 'newyear' || id === 'independence') {
      const cols = id === 'independence' ? ['#3aa8ff', '#ffffff', '#2ecc71'] : ['#ffd166', '#ff6fcf', '#9be7ff', '#ffffff'];
      if (!reduce && t % 55 === 0) firework(cols);
      if (reduce && !bursts.length) {
        firework(cols);
        firework(cols);
        bursts.forEach(b => { b.x += b.vx * 12; b.y += b.vy * 12; });
      }
      for (const b of bursts) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += .035;
        b.vx *= .985;
        b.life -= .012;
        ctx.globalAlpha = Math.max(0, b.life);
        ctx.fillStyle = b.c;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.8, 0, 7);
        ctx.fill();
      }
      bursts = bursts.filter(b => b.life > 0);
      ctx.globalAlpha = 1;
    }

    if (id === 'christmas') {
      ctx.strokeStyle = 'rgba(20,20,20,.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.quadraticCurveTo(W / 2, 90, W, 10);
      ctx.stroke();
      const cols = ['#ff4d4d', '#ffd166', '#5ccf6a', '#4aa8ff'];
      for (let i = 1; i < 24; i++) {
        const u = i / 24, x = W * u, y = (1 - u) * (1 - u) * 10 + 2 * (1 - u) * u * 90 + u * u * 10;
        const on = .5 + .5 * Math.sin(t / 12 + i * 1.7);
        ctx.fillStyle = cols[i % 4];
        ctx.shadowColor = cols[i % 4];
        ctx.shadowBlur = reduce ? 8 : 14 * on;
        ctx.globalAlpha = reduce ? 1 : .5 + .5 * on;
        ctx.beginPath();
        ctx.ellipse(x, y + 7, 4, 6, 0, 0, 7);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function loop() {
    t++;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function updateText() {
    if (!statusEl) return;
    const hol = holidayToday();
    statusEl.textContent = '';
    if (live.ok) {
      const where = live.city ? ` in ${live.city.toLowerCase()}` : '';
      statusEl.append(`${WXTEXT[live.wx]}, ${live.temp}°C${where} right now.`);
    }
    if (hol) {
      const span = document.createElement('span');
      span.textContent = `(${hol.label})`;
      statusEl.append(live.ok ? ' ' : '', span);
    }
    statusEl.hidden = !statusEl.textContent;
  }

  function isHome() {
    return location.pathname === '/' || location.pathname.endsWith('/index.html');
  }

  function start() {
    if (running) return;
    running = true;
    cv = document.createElement('canvas');
    cv.id = 'sky';
    cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    ctx = cv.getContext('2d');
    const main = document.querySelector('main');
    if (main && isHome()) {
      statusEl = document.createElement('p');
      statusEl.className = 'sky-status';
      statusEl.hidden = true;
      main.append(statusEl);
    }
    addEventListener('resize', rebuild);
    const cached = readCache();
    if (cached) live = cached;
    rebuild();
    if (!cached) loadLive().then(rebuild);
  }

  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    removeEventListener('resize', rebuild);
    cv.remove();
    if (statusEl) statusEl.remove();
    cv = ctx = statusEl = null;
  }

  window.sky = { start, stop };
})();
