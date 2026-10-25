/* Data check: finds mistakes in the data files (data/*.json). Open the site's #/check page after editing. Nothing here changes what visitors see. */
(function (F) {
  const { esc } = F;
  const out = [];
  const add = (level, where, msg) => out.push({ level, where, msg });
  const iso = (s) => /^\d{4}-\d\d-\d\d$/.test(s || '') && F.ymd(F.parse(s)) === s;
  const nice = (s) => (iso(s) ? F.shortDate(s) : String(s));
  const CATS = Object.keys(F.CATEGORIES), MEALS = F.MEAL_TYPES;
  const dupes = (list, f) => list.map(f).filter((v, i, a) => v && a.indexOf(v) !== i);

  // Dates in the schedule
  const sched = F.schedule || [];
  if (!sched.length) add('error', 'Schedule', 'No days found. Add at least one day.');
  sched.forEach((d, i) => {
    if (!iso(d.date)) { add('error', 'Schedule', 'Day ' + (i + 1) + ' has an invalid date "' + d.date + '". Use YYYY-MM-DD with a real calendar date.'); return; }
    if (+d.date.slice(0, 4) !== F.config.year) add('error', nice(d.date), 'Year is ' + d.date.slice(0, 4) + ' but the site year is ' + F.config.year + ' (Site settings).');
    if (i && iso(sched[i - 1].date)) {
      const gap = F.daysBetween(sched[i - 1].date, d.date);
      if (gap === 0) add('error', nice(d.date), 'This date is listed twice. Merge the two blocks.');
      else if (gap < 0) add('error', nice(d.date), 'Days are out of order. Each day must come after the one before.');
      else if (gap > 1) add('error', nice(d.date), 'Missing day(s) before this one. Add a block for ' + F.shortDate(F.addDays(sched[i - 1].date, 1)) + (gap > 2 ? ' and the days after it' : '') + '.');
    }
  });

  // Events
  const ids = dupes(F.events, (e) => e.id);
  ids.forEach((id) => add('error', id, 'Two events share the id "' + id + '". Give one a different title.'));
  F.events.forEach((e) => {
    const w = nice(e.date) + ' - ' + (e.title || '(no title)');
    if (!e.title) add('error', w, 'Event has no title.');
    if (e.status !== 'confirmed' && e.status !== 'tentative') add('error', w, 'status must be \'confirmed\' or \'tentative\' (it is "' + e.status + '").');
    if (CATS.indexOf(e.category) < 0) add('warn', w, 'category "' + e.category + '" is not one of: ' + CATS.join(', ') + '.');
    if (e.location && !F.place(e.location)) add('error', w, 'location "' + e.location + '" does not match the name of any house or map place. Type it exactly as it appears under Houses or Map places.');
    if (e.host && !F.family(e.host)) add('error', w, 'host "' + e.host + '" does not match the name of any family.');
    if (F.isMeal(e)) {
      if (e.mealType && MEALS.indexOf(e.mealType) < 0) add('warn', w, 'mealType "' + e.mealType + '" is not one of: ' + MEALS.join(', ') + '.');
      if (!e.host) add('warn', w, 'Meal has no host family.');
      if (!e.location) add('warn', w, 'Meal has no location.');
    }
    if (!e.time) add('warn', w, 'No time set.');
    else if (F.minutes(e.time) == null) add('info', w, 'Time "' + e.time + '" is not like "6:00 PM", so it is listed last that day.');
  });

  // Dinners
  F.days.forEach((d) => {
    if (iso(d.date) && d.dinner !== false && !d.dinner && !F.dinnerOn(d.date)) add('info', nice(d.date), 'No dinner planned yet (the site shows "Not planned yet"). Add a dinner, or on that day tick "No dinner expected" or type a dinner note.');
  });

  if (F.config.lastUpdated && !iso(F.config.lastUpdated)) add('error', 'Site settings', 'lastUpdated must be YYYY-MM-DD (it is "' + F.config.lastUpdated + '").');

  // Houses, families, places
  F.places.forEach((p) => { if (/\bsample\b/i.test(p.address || '')) add('info', p.name, 'Address still says "Sample" - replace it with the real address before the trip.'); });
  F.locations.forEach((l) => { if (!l.url && l.rawUrl) add('warn', l.name, 'Website "' + l.rawUrl + '" must start with https:// (it is hidden until fixed).'); });
  dupes(F.places, (p) => p.id).forEach((id) => add('error', id, 'Two houses/places have the same name ("' + id + '"). Rename one.'));
  F.families.forEach((f) => { if (f.house && !F.house(f.house)) add('error', f.name, 'house "' + f.house + '" does not match the name of any house.'); if (!f.house) add('warn', f.name, 'No house assigned.'); });
  F.places.forEach((p) => {
    if (!p.address) add('warn', p.name, 'No address yet.');
    if (p.lat == null || p.lng == null) add('info', p.name, 'No lat/lng: the map will look the address up online (needs internet). Add lat/lng for an exact pin.');
  });

  F.problems = out;
  const bad = out.filter((p) => p.level === 'error').length;
  if (bad) console.warn('[Fox site] ' + bad + ' data error(s). Open index.html#/check for details.', out.filter((p) => p.level === 'error'));

  F.pages = F.pages || {};
  F.pages.check = (app) => {
    const L = { error: 'Fix', warn: 'Check', info: 'Note' };
    const n = (l) => out.filter((p) => p.level === l).length;
    app.innerHTML = '<h1>Data Check</h1><p class="sub">For the organizers. Open this page after editing the schedule, families or houses.</p>' +
      '<div class="card"><b>' + (n('error') ? n('error') + ' error(s) to fix' : 'No errors') + '</b> · ' + n('warn') + ' to check · ' + n('info') + ' notes' +
      '<br>Trip: ' + esc(F.trip.start ? F.fullDate(F.trip.start) + ' to ' + F.fullDate(F.trip.end) : 'no days') + ' (' + F.trip.count + ' days)</div>' +
      (out.length ? '<ul class="checklist">' + out.map((p) => '<li class="' + p.level + '"><b>' + L[p.level] + '</b> <span>' + esc(p.where) + '</span> ' + esc(p.msg) + '</li>').join('') + '</ul>' : '') +
      '<h2>Every date on the site</h2><div class="tablewrap"><table class="tbl"><thead><tr><th>Date</th><th>Day</th><th>Headline</th><th>Events</th><th>Dinner</th></tr></thead><tbody>' +
      F.days.map((d) => { const dn = F.dinnerOn(d.date); return '<tr><td>' + esc(d.date) + '</td><td>' + esc(F.weekday(d.date)) + '</td><td>' + esc(d.title) + '</td><td>' + d.events.length + '</td><td>' + esc(dn ? dn.title : d.dinner === false ? 'none expected' : d.dinner || 'not planned') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  };
})(window.FOX);
