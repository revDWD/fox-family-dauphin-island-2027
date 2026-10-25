/* Reusable pieces of HTML: schedule rows, event/meal cards, the week view. */
(function (F) {
  const { esc, nl } = F;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  F.whereOf = (e) => (e.location && F.place(e.location)) || null;
  F.hostOf = (e) => (e.host && F.family(e.host)) || null;
  F.mealLabel = (e) => (F.isDinner(e) ? 'Dinner' : cap(e.mealType || 'Meal'));
  const tag = (cls, text) => '<span class="tag ' + cls + '">' + esc(text) + '</span>';
  const tagsFor = (e) => (F.isMeal(e) ? tag('meal', F.mealLabel(e)) : e.category && e.category !== 'plan' && F.CATEGORIES[e.category] ? tag('cat', F.CATEGORIES[e.category]) : '') + (e.status === 'tentative' ? tag('tent', 'Tentative') : '');

  // One line of the schedule: time, title, where and who. {detail:true} adds description, notes and a map link.
  F.agendaRow = (e, o) => {
    o = o || {};
    const l = F.whereOf(e), h = F.hostOf(e), tags = tagsFor(e);
    const where = l ? (o.detail ? '<a class="pill-link" href="#/map/' + esc(l.id) + '">' + esc(l.name) + '</a>' : esc(l.name)) : '';
    const meta = [where, h ? 'Hosted by ' + esc(h.name) : ''].filter(Boolean).join(' · ');
    return '<li class="ag ' + e.status + (F.isDinner(e) ? ' dinner' : '') + '"><div class="ag-time">' + esc(e.time || 'TBD') + '</div><div class="ag-main"><div class="ag-title">' + esc(e.title) + '</div>' +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + (meta ? '<div class="ag-meta">' + meta + '</div>' : '') +
      (o.detail && e.description ? '<p>' + nl(e.description) + '</p>' : '') + (o.detail && e.notes ? '<div class="note">' + nl(e.notes) + '</div>' : '') + '</div></li>';
  };

  // Shown on days with no dinner so gaps are obvious. A day can opt out (dinner:false) or explain (dinner:'text').
  const dinnerGap = (day) => (day.dinner === false || F.dinnerOn(day.date) ? '' :
    '<li class="ag dinner gap"><div class="ag-time">Dinner</div><div class="ag-main"><div class="ag-title">' + esc(day.dinner || 'Not planned yet') + '</div></div></li>');

  F.dayList = (day, o) => {
    const rows = day.events.map((e) => F.agendaRow(e, o)).join('') + dinnerGap(day);
    return '<ul class="aglist">' + (rows || '<li class="ag free"><div class="ag-main"><div class="ag-title">Free day</div><div class="ag-meta">Nothing planned. Beach time.</div></div></li>') + '</ul>';
  };

  // Today / Tomorrow style card with full detail.
  F.focusCard = (date, label) => {
    const day = F.day(date);
    return day ? '<section class="card focus"><p class="eyebrow">' + esc(label) + '</p><h3>' + esc(F.longDate(date)) + (day.title ? '<span class="wk-title">' + esc(day.title) + '</span>' : '') + '</h3>' + F.dayList(day, { detail: true }) + '</section>' : '';
  };

  // Full card for any event. Meals get the same card, so dinners look the same everywhere.
  F.eventCard = (e, o) => {
    o = o || {};
    const l = F.whereOf(e), h = F.hostOf(e), meal = F.isMeal(e);
    const when = (o.showDate ? esc(F.longDate(e.date)) + ' at ' : '') + esc(e.time || 'Time to be announced');
    const facts = (meal || l ? '<dt>Where</dt><dd>' + (l ? '<a class="pill-link" href="#/map/' + esc(l.id) + '">' + esc(l.name) + '</a>' + (l.address ? '<small>' + esc(l.address) + '</small>' : '') : 'To be announced') + '</dd>' : '') +
      (h ? '<dt>' + (meal ? 'Host' : 'Host family') + '</dt><dd>' + esc(h.name) + '</dd>' : '');
    return '<article class="card event ' + (meal ? 'meal ' : '') + e.status + (o.feature ? ' feature' : '') + '">' +
      (o.eyebrow ? '<p class="eyebrow">' + esc(o.eyebrow) + '</p>' : '') +
      '<div class="ev-head"><h3>' + esc(e.title) + '</h3><div class="tags">' + tagsFor(e) + '</div></div>' +
      '<p class="when">' + when + '</p>' + (facts ? '<dl class="facts">' + facts + '</dl>' : '') +
      (e.description ? '<p>' + nl(e.description) + '</p>' : '') + (e.notes ? '<div class="note"><b>Note:</b> ' + nl(e.notes) + '</div>' : '') +
      '<p class="act"><button class="small" data-ics="' + esc(e.id) + '">Add to my calendar</button></p></article>';
  };

  F.toast = (m) => {
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m;
    document.body.append(t); setTimeout(() => t.remove(), 2500);
  };

  // Builds a one-event .ics file so phones can add it to their own calendar.
  function ics(e) {
    const d = e.date.replace(/-/g, '');
    const mins = F.minutes(e.time);
    const l = F.whereOf(e);
    const esc2 = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const p = (n) => String(n).padStart(2, '0');
    let when;
    if (mins != null) {
      const end = Math.min(mins + 60, 23 * 60 + 59);
      when = 'DTSTART:' + d + 'T' + p(Math.floor(mins / 60)) + p(mins % 60) + '00\r\nDTEND:' + d + 'T' + p(Math.floor(end / 60)) + p(end % 60) + '00';
    } else {
      when = 'DTSTART;VALUE=DATE:' + d;
    }
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fox Family//Dauphin Island//EN', 'BEGIN:VEVENT', 'UID:' + e.id + '@fox-family-dauphin-island', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]|\.\d+/g, ''),
      when, 'SUMMARY:' + esc2(e.title + (e.status === 'tentative' ? ' (tentative)' : '')), 'LOCATION:' + esc2(l ? l.name + ', ' + (l.address || '') : ''), 'DESCRIPTION:' + esc2([e.description, e.notes].filter(Boolean).join('\n')), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-ics]');
    if (a) {
      const e = F.events.find((x) => x.id === a.dataset.ics); if (!e) return;
      const url = URL.createObjectURL(new Blob([ics(e)], { type: 'text/calendar' }));
      const link = document.createElement('a'); link.href = url; link.download = e.id + '.ics'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const c = ev.target.closest('[data-copy]');
    if (c) {
      const v = c.dataset.copy;
      const done = () => F.toast('Copied: ' + v);
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(v).then(done, done);
      else { const t = document.createElement('textarea'); t.value = v; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove(); done(); }
    }
  });

  F.avatar = (f) => '<div class="avatar" aria-hidden="true">' + esc(F.initials(f.name)) + '</div>';

  // Meals & gatherings at a glance: one row per day, columns for breakfast, lunch and dinner.
  const slotOf = (e) => {
    if (e.mealType === 'breakfast') return 0;
    if (e.mealType === 'lunch') return 1;
    const m = F.minutes(e.time);
    return m == null || m >= 15 * 60 ? 2 : m < 11 * 60 ? 0 : 1;
  };
  F.mealBoard = () => {
    const today = F.today(), names = ['Breakfast', 'Lunch', 'Dinner'];
    const cell = (d, s) => {
      const evs = d.events.filter((e) => F.isMeal(e) && slotOf(e) === s).sort((a, b) => (F.minutes(a.time) || 0) - (F.minutes(b.time) || 0));
      if (!evs.length) {
        const note = s === 2 && d.dinner !== undefined ? (d.dinner === false ? 'No dinner' : d.dinner) : '';
        return '<td class="mb-empty' + (note ? ' mb-note' : '') + '" data-label="' + names[s] + '">' + (note ? esc(note) : '<span aria-label="Nothing planned">&ndash;</span>') + '</td>';
      }
      return '<td class="mb-cell' + (s === 2 ? ' mb-din' : '') + '" data-label="' + names[s] + '">' + evs.map((e) => {
        const h = F.hostOf(e), l = F.whereOf(e);
        return '<a class="mb-meal' + (e.status === 'tentative' ? ' tentative' : '') + '" href="#/calendar/' + d.date + '"><b>' + esc(e.title) + '</b><small>' + esc(e.time || '') + (e.status === 'tentative' ? ' · Tentative' : '') + '</small>' + (h || l ? '<small>' + esc(h ? h.name : l.name) + '</small>' : '') + '</a>';
      }).join('') + '</td>';
    };
    return '<div class="mealboard" tabindex="0" role="region" aria-label="Meals and events by day, scrolls sideways"><table class="mb"><caption class="sr">Meals and gatherings for each day of the trip</caption><thead><tr><th scope="col">Day</th>' + names.map((n) => '<th scope="col">' + n + '</th>').join('') + '</tr></thead><tbody>' +
      F.days.map((d) => '<tr' + (d.date === today ? ' class="now"' : '') + '><th scope="row"><a href="#/calendar/' + d.date + '"><span class="wd">' + esc(F.weekdayShort(d.date)) + '</span><span class="dn">' + F.dayNum(d.date) + '</span><span class="mo">' + esc(F.monthShort(d.date)) + '</span></a>' + (d.title ? '<small>' + esc(d.title) + '</small>' : '') + '</th>' + [0, 1, 2].map((s) => cell(d, s)).join('') + '</tr>').join('') +
      '</tbody></table></div>';
  };
})(window.FOX);
