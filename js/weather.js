/* Weather: a small client for the free Open-Meteo API (no key, no server).
   Provides the home-page card (F.weather) and the full Weather page (#/weather).
   Responses are cached in localStorage so the page still works with spotty signal. */
(function (F) {
  const { esc, $ } = F;
  const cfg = F.config, W = cfg.weather, TZ = cfg.timezone;
  const API = 'https://api.open-meteo.com/v1/forecast', ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
  const HOUR = 36e5, DAY = 864e5, CLIMATE_YEARS = 5;

  const qs = (o) => Object.keys(o).map((k) => k + '=' + encodeURIComponent(o[k])).join('&');
  const base = () => ({ latitude: W.lat, longitude: W.lng, timezone: TZ, temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch' });

  // Fetch JSON with a cache. Falls back to an older saved copy when offline.
  const get = (url, ttl) => {
    const key = 'fox-wx:' + url; let c = null;
    try { c = JSON.parse(localStorage.getItem(key)); } catch (e) {}
    if (c && Date.now() - c.t < ttl) return Promise.resolve({ data: c.d, t: c.t, stale: false });
    return fetch(url).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then((d) => {
      if (d.error) throw new Error(d.reason || (d.error && d.error.message) || 'API error');
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      return { data: d, t: Date.now(), stale: false };
    }).catch((err) => { if (c) return { data: c.d, t: c.t, stale: true }; throw err; });
  };

  const forecast = () => get(API + '?' + qs(Object.assign(base(), {
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max,uv_index_max',
    forecast_days: 16
  })), 30 * 60e3);

  // Typical conditions: the same dates in each of the last few years, from Open-Meteo's historical archive.
  const climate = (dates) => {
    const y = new Date().getFullYear(), md = (s) => s.slice(5);
    const yrs = Array.from({ length: CLIMATE_YEARS }, (_, i) => y - 1 - i);
    return Promise.all(yrs.map((yr) => get(ARCHIVE + '?' + qs(Object.assign(base(), {
      start_date: yr + '-' + md(dates[0]), end_date: yr + '-' + md(dates[dates.length - 1]),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum'
    })), 7 * DAY).then((r) => r.data.daily).catch(() => null))).then((all) => {
      const ok = all.filter(Boolean);
      if (!ok.length) return null;
      return dates.map((date, i) => {
        const rows = ok.map((d) => ({ hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], rain: d.precipitation_sum[i] })).filter((r) => r.hi != null && r.lo != null);
        if (!rows.length) return null;
        const avg = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
        return { date: date, hi: avg('hi'), lo: avg('lo'), rainPct: Math.round(100 * rows.filter((r) => r.rain >= 0.04).length / rows.length), years: rows.length };
      });
    });
  };

  // Tides: high and low predictions from NOAA CO-OPS (free, no key). Times are station local time (Central).
  const TIDE_API = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
  const TIDE = Object.assign({ station: '8735180', name: 'Dauphin Island, AL' }, cfg.tides);
  const compact = (s) => s.replace(/-/g, '');
  const tides = (dates) => get(TIDE_API + '?' + qs({
    product: 'predictions', application: 'fox-family-dauphin-island', station: TIDE.station, datum: 'MLLW', time_zone: 'lst_ldt',
    units: 'english', interval: 'hilo', format: 'json', begin_date: compact(dates[0]), end_date: compact(dates[dates.length - 1])
  }), 7 * DAY).then((r) => {
    if (!r.data.predictions || !r.data.predictions.length) throw new Error('No tide data');
    const by = {};
    r.data.predictions.forEach((p) => { (by[p.t.slice(0, 10)] = by[p.t.slice(0, 10)] || []).push(p); });
    return { by: by, stale: r.stale, t: r.t };
  });
  const clock = (t) => { const h = +t.slice(11, 13), m = t.slice(14, 16); return (h % 12 || 12) + ':' + m + (h < 12 ? ' AM' : ' PM'); };
  const tideItems = (list) => '<ul class="tide-times">' + list.map((p) => '<li class="' + (p.type === 'H' ? 'hi' : 'lo') + '"><span>' + (p.type === 'H' ? '&#9650; High' : '&#9660; Low') + '</span><b>' + esc(clock(p.t)) + '</b><small>' + (+p.v).toFixed(1) + ' ft</small></li>').join('') + '</ul>';
  const tideRow = (date, list) => '<li class="tide-row"><div class="d">' + esc(F.weekdayShort(date)) + '<small>' + esc(F.monthShort(date) + ' ' + F.dayNum(date)) + '</small></div>' + tideItems(list) + '</li>';
  // Today's tides, shown inside the top weather card. Fails quietly: the rest of the card is still useful.
  const tideToday = (el, date) => tides([date]).then((x) => {
    const list = x.by[date];
    el.innerHTML = list && list.length ? '<h2 class="wx-sub">Tides today</h2>' + tideItems(list) : '';
  }).catch(() => { el.innerHTML = ''; });
  const tideSection = (el, dates) => {
    el.innerHTML = '<p class="sub">Looking up the tides…</p>';
    tides(dates).then((x) => {
      el.innerHTML = (x.stale ? '<p class="wx-alert">You appear to be offline. Showing tides saved ' + esc(ago(x.t)) + '.</p>' : '') +
        '<ul class="wx-list">' + dates.map((t) => tideRow(t, x.by[t] || [])).join('') + '</ul>' +
        '<p class="wx-src">Tide predictions for ' + esc(TIDE.name) + ' from <a href="https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=' + esc(TIDE.station) + '" target="_blank" rel="noopener">NOAA Tides &amp; Currents</a>. Heights are feet above the average lowest tide. Wind and storms can change the actual tide.</p>';
    }).catch(() => { el.innerHTML = '<p class="empty">Tide times are unavailable right now.</p><p class="row" style="justify-content:center"><button type="button" class="small">Try again</button></p>'; el.querySelector('button').onclick = () => tideSection(el, dates); });
  };

  const U = (c) => String.fromCodePoint(c);
  const kind = (c) => (c === 0 ? 'Clear' : c === 1 ? 'Mostly clear' : c === 2 ? 'Partly cloudy' : c === 3 ? 'Cloudy' : c === 45 || c === 48 ? 'Fog' : c >= 51 && c <= 57 ? 'Drizzle' : c === 65 || c === 82 || c === 67 ? 'Heavy rain' : c >= 61 && c <= 67 ? 'Rain' : c >= 80 && c <= 81 ? 'Showers' : c >= 95 ? 'Thunderstorms' : 'Mixed');
  const EMOJI = { 'Clear': 0x2600, 'Mostly clear': 0x1F324, 'Partly cloudy': 0x26C5, 'Cloudy': 0x2601, 'Fog': 0x1F32B, 'Drizzle': 0x1F326, 'Rain': 0x1F327, 'Heavy rain': 0x1F327, 'Showers': 0x1F326, 'Thunderstorms': 0x26C8, 'Mixed': 0x1F321 };
  const ico = (c) => '<span class="wx-ico" aria-hidden="true">' + U(EMOJI[kind(c)]) + '</span>';
  const deg = (n) => Math.round(n) + '\u00B0';
  const hourLabel = (t) => { const h = +t.slice(11, 13); return (h % 12 || 12) + (h < 12 ? ' AM' : ' PM'); };
  const ago = (t) => { const m = Math.round((Date.now() - t) / 6e4); return m < 2 ? 'just now' : m < 90 ? m + ' minutes ago' : Math.round(m / 60) + ' hours ago'; };
  const stale = (r) => (r.stale ? '<p class="wx-alert">You appear to be offline. Showing the forecast saved ' + esc(ago(r.t)) + '.</p>' : '');
  const failed = (el, again) => {
    el.innerHTML = '<p class="empty">Weather is unavailable right now.</p><p class="row" style="justify-content:center"><button type="button" class="small">Try again</button></p>';
    el.querySelector('button').onclick = again;
  };

  const dayRow = (d, i, opts) => {
    const t = d.daily.time[i], tripDay = opts && opts.trip;
    const label = F.weekdayShort(t);
    return '<li class="wx-row' + (tripDay ? ' trip' : '') + '"><div class="d">' + esc(label) + '<small>' + esc(F.monthShort(t) + ' ' + F.dayNum(t)) + '</small></div>' + ico(d.daily.weather_code[i]) +
      '<div><b>' + kind(d.daily.weather_code[i]) + '</b><div class="s">' + d.daily.precipitation_probability_max[i] + '% rain · gusts ' + Math.round(d.daily.wind_gusts_10m_max[i]) + ' mph · UV ' + Math.round(d.daily.uv_index_max[i]) + '</div></div>' +
      '<div class="hi">' + deg(d.daily.temperature_2m_max[i]) + '<small>' + deg(d.daily.temperature_2m_min[i]) + '</small></div></li>';
  };

  // Dashboard tile: conditions right now plus today's high, low and rain chance. Opens the Weather page.
  F.weatherNow = (el) => {
    forecast().then((r) => {
      const d = r.data, c = d.current;
      el.innerHTML = stale(r) + '<div class="weather">' + ico(c.weather_code) + '<div class="t">' + deg(c.temperature_2m) + '</div><div><b>' + kind(c.weather_code) + '</b><div class="meta">Feels like ' + deg(c.apparent_temperature) + ' &middot; Wind ' + Math.round(c.wind_speed_10m) + ' mph</div></div></div>' +
        '<p class="line">Today ' + deg(d.daily.temperature_2m_max[0]) + ' / ' + deg(d.daily.temperature_2m_min[0]) + ' &middot; ' + d.daily.precipitation_probability_max[0] + '% rain</p>';
    }).catch(() => failed(el, () => F.weatherNow(el)));
  };

  // A heads-up when a trip day looks stormy, windy or very wet.
  const alerts = (d, trip) => {
    const out = [];
    d.daily.time.forEach((t, i) => {
      if (trip.indexOf(t) < 0) return;
      const why = [];
      if (d.daily.weather_code[i] >= 95) why.push('thunderstorms');
      else if (d.daily.precipitation_probability_max[i] >= 60) why.push(d.daily.precipitation_probability_max[i] + '% chance of rain');
      if (d.daily.wind_gusts_10m_max[i] >= 30) why.push('gusts to ' + Math.round(d.daily.wind_gusts_10m_max[i]) + ' mph');
      if (why.length) out.push(F.longDate(t) + ': ' + why.join(', '));
    });
    return out.length ? '<div class="wx-alert" role="status">Heads up for our week<br>' + out.map(esc).join('<br>') + '</div>' : '';
  };

  (F.pages = F.pages || {}).weather = (app) => {
    app.innerHTML = '<h1>' + F.pageTitle('weather') + '</h1><p class="sub">Dauphin Island, live from the Open-Meteo weather service.</p><div id="wx-body"><p class="loading">Checking the sky…</p></div>';
    const body = $('#wx-body');
    const load = () => forecast().then((r) => {
      const d = r.data, c = d.current, trip = F.days.map((x) => x.date);
      const nowH = c.time.slice(0, 13);
      const hrs = d.hourly.time.map((t, i) => i).filter((i) => d.hourly.time[i].slice(0, 13) >= nowH).slice(0, 24);
      const inRange = trip.filter((t) => d.daily.time.indexOf(t) >= 0);
      const need = trip.filter((t) => d.daily.time.indexOf(t) < 0);
      const html = stale(r) + (alerts(d, trip)) +
        '<div class="card"><div class="wx-now">' + ico(c.weather_code) + '<div class="wx-big">' + deg(c.temperature_2m) + 'F</div><div><b>' + kind(c.weather_code) + '</b><div class="meta">Feels like ' + deg(c.apparent_temperature) + '</div></div></div>' +
        '<div class="wx-stats"><div><span>Wind</span><b>' + Math.round(c.wind_speed_10m) + ' mph</b></div><div><span>Gusts</span><b>' + Math.round(c.wind_gusts_10m) + ' mph</b></div><div><span>Humidity</span><b>' + Math.round(c.relative_humidity_2m) + '%</b></div><div><span>UV today</span><b>' + Math.round(d.daily.uv_index_max[0]) + '</b></div></div><div id="wx-tide-now" class="wx-tidenow"></div></div>' +
        '<h2>Next 24 hours</h2><ul class="wx-hours" aria-label="Hourly forecast">' + hrs.map((i, n) => '<li><b>' + (n === 0 ? 'Now' : hourLabel(d.hourly.time[i])) + '</b>' + ico(d.hourly.weather_code[i]) + '<b>' + deg(d.hourly.temperature_2m[i]) + '</b><small>' + (d.hourly.precipitation_probability[i] || 0) + '% rain</small></li>').join('') + '</ul>' +
        '<h2>Our week</h2><div id="wx-trip"></div>' +
        '<h2>Tides for our week</h2><div id="wx-tides"></div>' +
        '<p class="wx-src">Forecast data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a>. Updated ' + esc(ago(r.t)) + '.</p>';
      body.innerHTML = html;
      tideToday($('#wx-tide-now'), d.daily.time[0]);
      tideSection($('#wx-tides'), trip);
      const box = $('#wx-trip');
      const list = inRange.map((t) => dayRow(d, d.daily.time.indexOf(t), { trip: true }));
      if (!need.length) { box.innerHTML = '<ul class="wx-list">' + list.join('') + '</ul>'; return; }
      box.innerHTML = (list.length ? '<ul class="wx-list">' + list.join('') + '</ul>' : '') + '<p class="sub" id="wx-note">Looking up typical weather for our dates…</p><ul class="wx-list" id="wx-clim"></ul>';
      climate(need).then((cl) => {
        if (!cl || !cl.some(Boolean)) { $('#wx-note').textContent = 'Forecasts only reach about two weeks out, and typical weather is unavailable right now.'; return; }
        const yrs = Math.max.apply(null, cl.filter(Boolean).map((x) => x.years));
        $('#wx-note').textContent = 'Forecasts only reach about two weeks out. Until then, these are typical conditions for our dates, averaged over the last ' + yrs + ' years.';
        $('#wx-clim').innerHTML = cl.filter(Boolean).map((x) => '<li class="wx-row trip est"><div class="d">' + esc(F.weekdayShort(x.date)) + '<small>' + esc(F.monthShort(x.date) + ' ' + F.dayNum(x.date)) + '</small></div>' + ico(x.rainPct >= 50 ? 61 : x.rainPct >= 25 ? 2 : 1) +
          '<div><b>Typical weather</b><div class="s">Rained on ' + x.rainPct + '% of these dates</div></div><div class="hi">' + deg(x.hi) + '<small>' + deg(x.lo) + '</small></div></li>').join('');
      });
    }).catch(() => failed(body, () => { body.innerHTML = '<p class="loading">Checking the sky…</p>'; load(); }));
    load();
  };
})(window.FOX);
