/* Boot: loads data/*.json (edited with Pages CMS), converts it to the shapes the site code expects on window.FOX,
   then loads the site scripts in order. In the JSON files, houses, places and families are referred to by NAME
   (e.g. an event's location is "Fox House"); ids are made from the names here. */
(function () {
  'use strict';
  const F = (window.FOX = window.FOX || {});
  const DATA = ['config', 'houses', 'locations', 'families',   'schedule'];
    const CODE = ['util', 'components', 'weather', 'check', 'pages', 'home', 'houses', 'app'];

  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const clean = (v) => {
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).forEach((k) => { const x = clean(v[k]); if (x !== '' && x !== null && x !== undefined) o[k] = x; });
      return o;
    }
    return v;
  };
  const num = (v) => (v === undefined || v === '' || v === null || isNaN(+v) ? undefined : +v);
  const coords = (o) => { ['lat', 'lng', 'zoom'].forEach((k) => { if (k in o) { const n = num(o[k]); if (n === undefined) delete o[k]; else o[k] = n; } }); return o; };
  // Only http(s) links are kept, so a typo or bad value can never become a script link.
  const webOnly = (o) => { if (o.url && !/^https?:\/\//i.test(o.url)) { o.rawUrl = o.url; delete o.url; } return o; };
  const key = (s) => String(s || '').trim().toLowerCase();

  function build(d) {
    const config = clean(d.config);
    config.year = num(config.year) || new Date().getFullYear();
    if (config.weather) coords(config.weather);
    if (config.map) coords(config.map);
    F.config = config;

    const withId = (list) => list.map((x) => Object.assign({}, clean(x), { id: slug(x.name) }));
    F.houses = withId(d.houses).map(coords);
    F.locations = withId(d.locations).map(coords).map(webOnly);
    F.families = withId(d.families);

    const ref = (list, name) => { const hit = list.find((x) => key(x.name) === key(name)); return hit ? hit.id : name; };
    F.families.forEach((f) => { if (f.house) f.house = ref(F.houses, f.house); });

    F.schedule = d.schedule.map((day) => {
      const o = { date: day.date, events: [] };
      if (day.title) o.title = day.title;
      if (day.noDinner) o.dinner = false; else if (day.dinnerNote) o.dinner = day.dinnerNote;
      o.events = (day.events || []).map((e) => {
        const x = clean(e);
        if (x.location) x.location = ref(F.houses.concat(F.locations), x.location);
        if (x.host) x.host = ref(F.families, x.host);
        return x;
      });
      return o;
    });
  }

  const getJson = (name) => fetch('data/' + name + '.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('data/' + name + '.json could not be loaded (' + r.status + ').');
    return r.text();
  }).then((t) => {
    try { return JSON.parse(t); } catch (e) { throw new Error('data/' + name + '.json has a typo and cannot be read: ' + e.message); }
  });

  const loadScript = (name) => new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'js/' + name + '.js'; s.onload = ok; s.onerror = () => fail(new Error('js/' + name + '.js could not be loaded.'));
    document.body.append(s);
  });

  Promise.all(DATA.map(getJson))
    .then((all) => { const d = {}; DATA.forEach((n, i) => { d[n] = all[i]; }); build(d); })
    .then(() => CODE.reduce((p, n) => p.then(() => loadScript(n)), Promise.resolve()))
    .catch((e) => {
      const app = document.getElementById('app');
      if (app) { app.textContent = ''; const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'The site could not load its information. ' + e.message + ' If you just edited the data, check for a typo; otherwise try again in a minute.'; app.append(p); }
      if (window.console) console.error(e);
    });
})();
