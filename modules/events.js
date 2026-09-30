import { ICONS } from './icons.js';

/**
 * The Events view: a grouped upcoming/past list with search, inline editing,
 * repeating events, prep tasks, and calendar export.
 * window.events stays the persistence contract (saveEvents in index.html writes
 * it locally and to Firestore). Every field beyond the original
 * { id, title, date, time, link } is optional, so older records, and devices
 * still on an older build, keep working.
 */

const REPEATS = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year'
};

// Tags are drawn as a dot, an edge and a tint, never behind text, so fixed
// mid-tone hues stay legible on every theme.
const COLORS = [
  { key: '', label: 'Default', value: 'var(--warning, #d97706)' },
  { key: 'blue', label: 'Blue', value: '#3B82F6' },
  { key: 'green', label: 'Green', value: '#22A06B' },
  { key: 'purple', label: 'Purple', value: '#8B5CF6' },
  { key: 'pink', label: 'Pink', value: '#E0428F' },
  { key: 'red', label: 'Red', value: '#E5484D' },
  { key: 'teal', label: 'Teal', value: '#0EA5A4' }
];

const MEETING_HOSTS = /(^|\.)(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com)$/i;
const DAY_MS = 86_400_000;

// --- Dates --------------------------------------------------------------------
// Calendar maths runs on UTC midnights so a daylight-saving change can never
// move an event onto a neighbouring day. Only "today" and "now" read the
// local clock.
const pad = (value) => String(value).padStart(2, '0');
const isISODate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const toUTC = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fromUTC = (ms) => { const date = new Date(ms); return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`; };
const addDays = (iso, days) => fromUTC(toUTC(iso) + days * DAY_MS);
const daysBetween = (from, to) => Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
const daysInMonth = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
const localDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; };
const minutesOf = (time) => (/^\d{2}:\d{2}$/.test(time || '') ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null);
const compactDate = (iso) => iso.replaceAll('-', '');
const hhmm = (minutes) => `${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}`;
const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const ordinal = (n) => { const suffix = ['th', 'st', 'nd', 'rd']; const v = n % 100; return `${n}${suffix[(v - 20) % 10] || suffix[v] || suffix[0]}`; };

function dateLabel(iso, today = todayISO()) {
  if (!isISODate(iso)) return 'No date';
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  if (iso.slice(0, 4) !== today.slice(0, 4)) options.year = 'numeric';
  return localDate(iso).toLocaleDateString('en-US', options);
}

const formatTime = (time) => (typeof window.formatTime === 'function' ? window.formatTime(time) : time);

function timeRange(event) {
  if (!event.time) return 'All day';
  return event.endTime ? `${formatTime(event.time)} – ${formatTime(event.endTime)}` : formatTime(event.time);
}

// Minutes after the occurrence's midnight. No end time means an hour; an end
// at or before the start means the event runs past midnight.
function endMinutes(event) {
  const start = minutesOf(event.time);
  if (start === null) return null;
  const end = minutesOf(event.endTime);
  if (end === null) return start + 60;
  return end <= start ? end + 1440 : end;
}

const duration = (minutes) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`);

// --- Repeats ------------------------------------------------------------------
const repeatOf = (event) => (event && Object.hasOwn(REPEATS, event.repeat) ? event.repeat : 'none');

function occursOn(event, iso) {
  if (!isISODate(event?.date) || !isISODate(iso) || iso < event.date) return false;
  const repeat = repeatOf(event);
  if (repeat !== 'none' && event.repeatUntil && iso > event.repeatUntil) return false;
  const [, startMonth, startDay] = event.date.split('-').map(Number);
  const [, month, day] = iso.split('-').map(Number);
  if (repeat === 'daily') return true;
  if (repeat === 'weekly') return daysBetween(event.date, iso) % 7 === 0;
  if (repeat === 'monthly') return day === startDay;
  if (repeat === 'yearly') return month === startMonth && day === startDay;
  return iso === event.date;
}

// Monthly and yearly series keep the start's day of the month, and months
// without that day (the 31st, Feb 29) are skipped. That is the RFC 5545 rule,
// so exported calendars show exactly the dates this list does.
function steppedOccurrence(event, anchor, direction) {
  const [, startMonth, startDay] = event.date.split('-').map(Number);
  const [anchorYear, anchorMonth] = anchor.split('-').map(Number);
  const yearly = repeatOf(event) === 'yearly';
  for (let step = 0; step < 60; step += 1) {
    const months = yearly
      ? (anchorYear + step * direction) * 12 + (startMonth - 1)
      : anchorYear * 12 + (anchorMonth - 1) + step * direction;
    const year = Math.floor(months / 12);
    const monthIndex = months % 12;
    if (startDay > daysInMonth(year, monthIndex)) continue;
    const iso = `${year}-${pad(monthIndex + 1)}-${pad(startDay)}`;
    if (direction > 0 ? iso >= anchor : iso <= anchor) return iso;
  }
  return null;
}

function nextOccurrence(event, from = todayISO()) {
  if (!isISODate(event?.date)) return null;
  const repeat = repeatOf(event);
  if (repeat === 'none') return event.date >= from ? event.date : null;
  const anchor = event.date > from ? event.date : from;
  let next;
  if (repeat === 'daily') next = anchor;
  else if (repeat === 'weekly') next = addDays(anchor, (7 - (daysBetween(event.date, anchor) % 7)) % 7);
  else next = steppedOccurrence(event, anchor, 1);
  return next && !(event.repeatUntil && next > event.repeatUntil) ? next : null;
}

function lastOccurrence(event, onOrBefore) {
  if (!isISODate(event?.date)) return null;
  const repeat = repeatOf(event);
  const limit = repeat !== 'none' && event.repeatUntil && event.repeatUntil < onOrBefore ? event.repeatUntil : onOrBefore;
  if (limit < event.date) return null;
  if (repeat === 'none') return event.date;
  if (repeat === 'daily') return limit;
  if (repeat === 'weekly') return addDays(limit, -(daysBetween(event.date, limit) % 7));
  const last = steppedOccurrence(event, limit, -1);
  return last && last >= event.date ? last : null;
}

// Where an event sits in the list: its next occurrence from today, or, once a
// series or one-off is over, the last time it happened.
function placement(event, today) {
  const next = nextOccurrence(event, today);
  if (next) return { date: next, past: false };
  return { date: lastOccurrence(event, addDays(today, -1)) || (isISODate(event?.date) ? event.date : ''), past: true };
}

function describeRepeat(event) {
  const repeat = repeatOf(event);
  if (repeat === 'none' || !isISODate(event.date)) return '';
  const start = localDate(event.date);
  const base = {
    daily: 'Every day',
    weekly: `Every ${start.toLocaleDateString('en-US', { weekday: 'long' })}`,
    monthly: `Monthly on the ${ordinal(start.getDate())}`,
    yearly: `Every ${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
  }[repeat];
  return isISODate(event.repeatUntil) ? `${base} until ${dateLabel(event.repeatUntil)}` : base;
}

function relativeLabel(event, occurrence, today, now) {
  const offset = daysBetween(today, occurrence);
  if (offset === 0) {
    const start = minutesOf(event.time);
    if (start === null) return { text: 'Today', tone: 'today' };
    const current = now.getHours() * 60 + now.getMinutes();
    if (current < start) return { text: `Starts in ${duration(start - current)}`, tone: start - current <= 60 ? 'soon' : 'today' };
    if (current < endMinutes(event)) return { text: 'Happening now', tone: 'now' };
    return { text: 'Earlier today', tone: 'ended' };
  }
  if (offset === 1) return { text: 'Tomorrow', tone: '' };
  if (offset > 1) return { text: `In ${offset} days`, tone: '' };
  if (offset === -1) return { text: 'Yesterday', tone: '' };
  return { text: `${-offset} days ago`, tone: '' };
}

// --- Values -------------------------------------------------------------------
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const colorValue = (key) => (COLORS.find((color) => color.key === (key || '')) || COLORS[0]).value;
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

// People paste "zoom.us/j/123" without a scheme; a bare URL() would resolve
// that against this page instead of treating it as a web address.
function safeUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const parsed = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch { return ''; }
}

const valuesOf = (event = {}) => ({
  title: event.title || '', date: event.date || '', time: event.time || '', endTime: event.endTime || '',
  location: event.location || '', link: event.link || '', notes: event.notes || '',
  repeat: repeatOf(event), repeatUntil: event.repeatUntil || '', color: event.color || ''
});

function readForm(form) {
  const data = new FormData(form);
  const text = (name) => String(data.get(name) ?? '').trim();
  return {
    title: text('title'), date: text('date'), time: text('time'), endTime: text('endTime'),
    location: text('location'), link: text('link'), notes: text('notes'),
    repeat: text('repeat') || 'none', repeatUntil: text('repeatUntil'), color: text('color')
  };
}

function validate(values, form) {
  const fail = (name, message) => {
    window.showToast?.(message, 'error');
    const field = form.elements.namedItem(name);
    field?.closest('details')?.setAttribute('open', '');
    field?.focus?.();
    return null;
  };
  if (!values.title) return fail('title', 'Give the event a title.');
  if (!isISODate(values.date)) return fail('date', 'Pick a date for the event.');
  if (values.endTime && !values.time) return fail('time', 'Add a start time to go with the end time.');
  if (values.endTime && values.endTime === values.time) return fail('endTime', 'The end time is the same as the start time.');
  const link = values.link ? safeUrl(values.link) : '';
  if (values.link && !link) return fail('link', 'That link isn’t a web address (http or https).');
  const repeat = Object.hasOwn(REPEATS, values.repeat) ? values.repeat : 'none';
  const repeatUntil = repeat === 'none' ? '' : values.repeatUntil;
  if (repeatUntil && repeatUntil < values.date) return fail('repeatUntil', 'The repeat end date is before the event starts.');
  return {
    title: values.title, date: values.date, time: values.time, endTime: values.endTime,
    location: values.location, link, notes: values.notes, repeat, repeatUntil,
    color: COLORS.some((color) => color.key === values.color) ? values.color : ''
  };
}

// --- Calendar export ------------------------------------------------------------
// Times are written floating (no zone), which calendar apps read as local time.
// That keeps a weekly 9:00 at 9:00 across daylight-saving changes, where a UTC
// conversion would drift by an hour.
function eventBounds(event) {
  const start = minutesOf(event.time);
  if (start === null) return { allDay: true, start: compactDate(event.date), end: compactDate(addDays(event.date, 1)) };
  const end = endMinutes(event);
  return {
    allDay: false,
    start: `${compactDate(event.date)}T${hhmm(start)}00`,
    end: `${compactDate(addDays(event.date, Math.floor(end / 1440)))}T${hhmm(end % 1440)}00`
  };
}

const icsText = (value) => String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545 §3.1: content lines stop at 75 octets and continue after CRLF + space.
function foldLine(line) {
  const encoder = new TextEncoder();
  let folded = '';
  let width = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (width + size > 75) { folded += '\r\n '; width = 1; }
    folded += char;
    width += size;
  }
  return folded;
}

function buildCalendar(events) {
  const stamp = utcStamp(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SoloFlow//Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  events.filter((event) => isISODate(event.date)).forEach((event) => {
    const { allDay, start, end } = eventBounds(event);
    const valueType = allDay ? ';VALUE=DATE' : '';
    const link = safeUrl(event.link);
    const description = [event.notes, link].filter(Boolean).join('\n\n');
    lines.push('BEGIN:VEVENT', `UID:${event.id}@soloflow`, `DTSTAMP:${stamp}`, `DTSTART${valueType}:${start}`, `DTEND${valueType}:${end}`);
    const repeat = repeatOf(event);
    if (repeat !== 'none') {
      // A floating DTSTART needs a floating UNTIL (RFC 5545 §3.3.10).
      const until = isISODate(event.repeatUntil) ? `;UNTIL=${compactDate(event.repeatUntil)}${allDay ? '' : 'T235959'}` : '';
      lines.push(`RRULE:FREQ=${repeat.toUpperCase()}${until}`);
    }
    lines.push(`SUMMARY:${icsText(event.title || 'Untitled event')}`);
    if (event.location) lines.push(`LOCATION:${icsText(event.location)}`);
    if (link) lines.push(`URL:${link}`);
    if (description) lines.push(`DESCRIPTION:${icsText(description)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

function googleCalendarUrl(event) {
  const { allDay, start, end } = eventBounds(event);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title || 'Untitled event', dates: `${start}/${end}` });
  const details = [event.notes, safeUrl(event.link)].filter(Boolean).join('\n\n');
  if (details) params.set('details', details);
  if (event.location) params.set('location', event.location);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!allDay && zone) params.set('ctz', zone);
  const repeat = repeatOf(event);
  if (repeat !== 'none') {
    let rule = `RRULE:FREQ=${repeat.toUpperCase()}`;
    if (isISODate(event.repeatUntil)) {
      // Google wants a UTC UNTIL for timed events: the end of that day here.
      const [y, m, d] = event.repeatUntil.split('-').map(Number);
      rule += `;UNTIL=${allDay ? compactDate(event.repeatUntil) : utcStamp(new Date(y, m - 1, d, 23, 59, 59))}`;
    }
    params.set('recur', rule);
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}

function downloadCalendar(filename, events) {
  const url = URL.createObjectURL(new Blob([buildCalendar(events)], { type: 'text/calendar;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileSlug = (title) => String(title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'event';

// --- Markup -------------------------------------------------------------------
function formHTML(values, mode) {
  const editing = mode === 'edit';
  const repeat = Object.hasOwn(REPEATS, values.repeat) ? values.repeat : 'none';
  const hasDetails = Boolean(values.location || values.link || values.notes || values.color || repeat !== 'none');
  const swatches = COLORS.map((color) => `
    <label class="event-swatch" title="${color.label}">
      <input type="radio" name="color" value="${color.key}"${(values.color || '') === color.key ? ' checked' : ''}>
      <span class="event-swatch-dot" style="--swatch:${color.value}"><span class="sr-only">${color.label}</span></span>
    </label>`).join('');
  return `
    <div class="event-quick-row">
      <label class="event-field event-field-title"><span class="event-field-label">Event</span>
        <input type="text" name="title"${editing ? '' : ' id="eventTitle"'} value="${escapeHTML(values.title)}" placeholder="What’s happening?" maxlength="160" autocomplete="off"></label>
      <label class="event-field"><span class="event-field-label">Date</span>
        <input type="date" name="date" value="${escapeHTML(values.date)}"></label>
      <label class="event-field"><span class="event-field-label">Starts</span>
        <input type="time" name="time" value="${escapeHTML(values.time)}"></label>
      <label class="event-field"><span class="event-field-label">Ends</span>
        <input type="time" name="endTime" value="${escapeHTML(values.endTime)}"></label>
      ${editing ? '' : '<button type="submit" class="event-submit">Add event</button>'}
    </div>
    <details class="event-more"${editing || hasDetails ? ' open' : ''}>
      <summary>More details <span>Location, link, notes, repeat, color</span></summary>
      <div class="event-more-grid">
        <label class="event-field"><span class="event-field-label">Location</span>
          <input type="text" name="location" value="${escapeHTML(values.location)}" placeholder="Room, address, or venue" autocomplete="off"></label>
        <label class="event-field"><span class="event-field-label">Link</span>
          <input type="url" name="link" value="${escapeHTML(values.link)}" placeholder="Zoom, Meet, or Maps link"></label>
        <label class="event-field event-field-wide"><span class="event-field-label">Notes</span>
          <textarea name="notes" rows="2" placeholder="Agenda, what to bring, dial-in details…">${escapeHTML(values.notes)}</textarea></label>
        <label class="event-field"><span class="event-field-label">Repeats</span>
          <select name="repeat">${Object.entries(REPEATS).map(([key, label]) => `<option value="${key}"${key === repeat ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
        <label class="event-field" data-repeat-until${repeat === 'none' ? ' hidden' : ''}><span class="event-field-label">Until <small>(optional)</small></span>
          <input type="date" name="repeatUntil" value="${escapeHTML(values.repeatUntil)}"></label>
        <fieldset class="event-field event-colors"><legend class="event-field-label">Color</legend><div class="event-swatches">${swatches}</div></fieldset>
      </div>
    </details>
    ${editing ? '<div class="event-editor-actions"><button type="button" class="btn-alt" data-action="cancel-edit">Cancel</button><button type="submit">Save changes</button></div>' : ''}`;
}

function cardHTML({ event, date, past }, today, now, draft, editingId) {
  const id = escapeHTML(event.id);
  const color = colorValue(event.color);
  const title = event.title || 'Untitled event';
  if (event.id === editingId) {
    return `
      <article class="event-card is-editing" data-event-id="${id}" style="--event-color:${color}">
        <form class="event-editor" data-editor novalidate aria-label="Edit ${escapeHTML(title)}">${formHTML(draft || valuesOf(event), 'edit')}</form>
      </article>`;
  }
  const relative = date ? relativeLabel(event, date, today, now) : { text: 'No date', tone: '' };
  const day = date ? localDate(date) : null;
  const link = safeUrl(event.link);
  const linkLabel = link && MEETING_HOSTS.test(new URL(link).hostname) ? 'Join' : 'Open link';
  const repeat = describeRepeat(event);
  const tones = [past ? 'is-past' : '', relative.tone ? `is-${relative.tone}` : ''].filter(Boolean).join(' ');
  return `
    <article class="event-card ${tones}" data-event-id="${id}" style="--event-color:${color}" tabindex="-1">
      <div class="event-date-badge" aria-hidden="true">
        <span class="event-date-month">${day ? day.toLocaleDateString('en-US', { month: 'short' }) : '—'}</span>
        <span class="event-date-day">${day ? day.getDate() : ''}</span>
        <span class="event-date-weekday">${day ? day.toLocaleDateString('en-US', { weekday: 'short' }) : ''}</span>
      </div>
      <div class="event-body">
        <h3 class="event-title">${escapeHTML(title)}</h3>
        <div class="event-meta">
          <span class="event-when">${escapeHTML(dateLabel(date, today))} · ${escapeHTML(timeRange(event))}</span>
          <span class="event-relative">${escapeHTML(relative.text)}</span>
          ${repeat ? `<span class="event-repeat">${ICONS.repeat}${escapeHTML(repeat)}</span>` : ''}
        </div>
        ${event.location ? `<a class="event-location" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(event.location)}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps">${ICONS.mapPin}<span>${escapeHTML(event.location)}</span></a>` : ''}
        ${event.notes ? `<p class="event-notes">${escapeHTML(event.notes)}</p>` : ''}
      </div>
      <div class="event-actions">
        ${link ? `<a class="btn-small event-open-link" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${ICONS.link}${linkLabel}</a>` : ''}
        <button type="button" class="btn-small" data-action="edit">Edit</button>
        <details class="event-menu">
          <summary class="btn-small" aria-label="More actions for ${escapeHTML(title)}">${ICONS.more}</summary>
          <div class="event-menu-list">
            <button type="button" data-action="duplicate">Duplicate</button>
            <button type="button" data-action="prep-task">Make a prep task</button>
            <button type="button" data-action="google">Add to Google Calendar</button>
            <button type="button" data-action="ics">Download .ics</button>
            <button type="button" class="is-danger" data-action="delete">Delete</button>
          </div>
        </details>
      </div>
    </article>`;
}

function upcomingGroup(offset) {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset <= 7) return 'Next 7 days';
  return 'Later';
}

const monthLabel = (iso) => (isISODate(iso) ? localDate(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Undated');

function matches(event, query) {
  if (!query) return true;
  return [event.title, event.location, event.notes, event.link, describeRepeat(event)].some((field) => String(field || '').toLowerCase().includes(query));
}

// --- Module -------------------------------------------------------------------
export function installEventsModule(store) {
  const container = document.getElementById('events-container');
  const list = document.getElementById('events-list');
  const addForm = document.getElementById('eventForm');
  const search = document.getElementById('eventSearch');
  const exportButton = document.getElementById('eventsExport');
  const clearPastButton = document.getElementById('eventsClearPast');
  const state = { filter: 'upcoming', query: '', editingId: null, visible: [] };

  const allEvents = () => (Array.isArray(window.events) ? window.events : []);
  const findEvent = (id) => allEvents().find((event) => event.id === id);
  const isOpen = () => container?.style.display === 'block';
  const cardFor = (id) => list?.querySelector(`[data-event-id="${CSS.escape(id)}"]`);

  function syncRepeatField(form) {
    const repeat = form.elements.namedItem('repeat')?.value || 'none';
    const until = form.querySelector('[data-repeat-until]');
    if (until) until.hidden = repeat === 'none';
  }

  function paintToolbar(counts) {
    document.querySelectorAll('[data-event-filter]').forEach((button) => {
      const active = button.dataset.eventFilter === state.filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-event-count]').forEach((badge) => { badge.textContent = counts[badge.dataset.eventCount] || ''; });
    if (clearPastButton) clearPastButton.hidden = !counts.past;
    if (exportButton) exportButton.disabled = !state.visible.length;
  }

  function render() {
    if (!list) return;
    const today = todayISO();
    const now = new Date();
    const events = allEvents();
    if (state.editingId && !findEvent(state.editingId)) state.editingId = null;
    // A re-render while editing (a sync from another device, the minute tick)
    // keeps what has been typed so far.
    const editor = list.querySelector('form[data-editor]');
    const draft = state.editingId && editor ? readForm(editor) : null;

    const entries = events.map((event) => ({ event, ...placement(event, today) }));
    const counts = { upcoming: entries.filter((entry) => !entry.past).length, past: entries.filter((entry) => entry.past).length, all: entries.length };
    const query = state.query.trim().toLowerCase();
    const visible = entries.filter((entry) => (state.filter === 'all' || (state.filter === 'past') === entry.past) && matches(entry.event, query));
    state.visible = visible;

    const byTime = (a, b) => (a.event.time || '').localeCompare(b.event.time || '');
    const upcoming = visible.filter((entry) => !entry.past).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b) || String(a.event.title).localeCompare(String(b.event.title)));
    const past = visible.filter((entry) => entry.past).sort((a, b) => b.date.localeCompare(a.date) || byTime(b, a));
    const groups = [];
    const place = (label, entry) => {
      let group = groups.at(-1);
      if (!group || group.label !== label) groups.push(group = { label, entries: [] });
      group.entries.push(entry);
    };
    upcoming.forEach((entry) => place(upcomingGroup(daysBetween(today, entry.date)), entry));
    past.forEach((entry) => place(`${state.filter === 'all' ? 'Past · ' : ''}${monthLabel(entry.date)}`, entry));

    list.innerHTML = groups.length
      ? groups.map((group) => `
          <section class="events-group" aria-label="${escapeHTML(group.label)}">
            <h3 class="events-group-title">${escapeHTML(group.label)}<span>${group.entries.length}</span></h3>
            ${group.entries.map((entry) => cardHTML(entry, today, now, entry.event.id === state.editingId ? draft : null, state.editingId)).join('')}
          </section>`).join('')
      : emptyHTML(query, counts);
    list.querySelectorAll('form[data-editor]').forEach(syncRepeatField);
    paintToolbar(counts);
    if (isOpen()) window.updateViewHeader?.('events');
  }

  function emptyHTML(query, counts) {
    const empty = window.emptyStateHTML || ((title, description) => `<div class="empty-state"><strong>${title}</strong><span>${description}</span></div>`);
    const focusTitle = "document.getElementById('eventTitle')?.focus()";
    if (query) return empty('No events match that search', 'Try another word, or clear the search to see everything.');
    if (state.filter === 'past') return empty('No past events', 'Events move here once their day is over.');
    if (state.filter === 'upcoming' && counts.past) return empty('Nothing coming up', `You have ${counts.past} past event${counts.past === 1 ? '' : 's'}. Add what’s next above.`, 'Add an event', focusTitle);
    return empty('No events yet', 'Add meetings, deadlines and plans. They also show on your weekly schedule and month calendar.', 'Add an event', focusTitle);
  }

  function setFilter(filter) {
    state.filter = ['upcoming', 'past', 'all'].includes(filter) ? filter : 'upcoming';
    render();
  }

  // Opens the Events view on one event, widening the filter or clearing the
  // search if either would hide it.
  function show(id) {
    const event = findEvent(id);
    if (!event) { window.setView?.('events'); return; }
    if (!isOpen()) window.setView?.('events');
    const { past } = placement(event, todayISO());
    if (state.filter !== 'all' && (state.filter === 'past') !== past) state.filter = past ? 'past' : 'upcoming';
    if (state.query && !matches(event, state.query.trim().toLowerCase())) {
      state.query = '';
      if (search) search.value = '';
    }
    render();
    requestAnimationFrame(() => {
      const card = cardFor(id);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('is-flash');
      setTimeout(() => card.classList.remove('is-flash'), 1600);
    });
  }

  function startEditing(id) {
    state.editingId = id;
    render();
    const title = cardFor(id)?.querySelector('input[name="title"]');
    title?.focus();
    title?.select();
  }

  function stopEditing() {
    const id = state.editingId;
    state.editingId = null;
    render();
    cardFor(id)?.querySelector('[data-action="edit"]')?.focus();
  }

  function saveEditor(form) {
    const id = form.closest('[data-event-id]')?.dataset.eventId;
    const event = findEvent(id);
    if (!event) { stopEditing(); return; }
    const clean = validate(readForm(form), form);
    if (!clean) return;
    Object.assign(event, clean);
    state.editingId = null;
    window.saveEvents();
    cardFor(id)?.focus({ preventScroll: true });
    window.showToast?.('Event updated', 'success');
  }

  function addFromForm() {
    if (!addForm) return;
    const clean = validate(readForm(addForm), addForm);
    if (!clean) return;
    const event = { id: newId(), ...clean };
    if (!Array.isArray(window.events)) window.events = [];
    window.events.push(event);
    addForm.reset();
    addForm.querySelector('details.event-more')?.removeAttribute('open');
    syncRepeatField(addForm);
    window.saveEvents();
    show(event.id);
    window.showToast?.(`Added “${event.title}” for ${dateLabel(nextOccurrence(event) || event.date)}`, 'success');
  }

  function deleteEvent(id) {
    const events = allEvents();
    const index = events.findIndex((event) => event.id === id);
    if (index < 0) return;
    const [removed] = events.splice(index, 1);
    if (state.editingId === id) state.editingId = null;
    window.saveEvents();
    window.showToast?.(`Deleted “${removed.title}”`, 'info', {
      label: 'Undo', action: () => { allEvents().splice(Math.min(index, allEvents().length), 0, removed); window.saveEvents(); }
    });
  }

  function duplicateEvent(id) {
    const events = allEvents();
    const index = events.findIndex((event) => event.id === id);
    if (index < 0) return;
    const copy = { ...structuredClone(events[index]), id: newId(), title: `${events[index].title} (Copy)` };
    events.splice(index + 1, 0, copy);
    state.editingId = copy.id;
    window.saveEvents();
    show(copy.id);
    requestAnimationFrame(() => cardFor(copy.id)?.querySelector('input[name="title"]')?.focus());
    window.showToast?.('Event duplicated. Change the copy’s details and save.', 'success');
  }

  function clearPast() {
    const today = todayISO();
    const before = structuredClone(allEvents());
    const kept = allEvents().filter((event) => !placement(event, today).past);
    const removed = before.length - kept.length;
    if (!removed) return;
    window.events = kept;
    window.saveEvents();
    window.showToast?.(`Cleared ${removed} past event${removed === 1 ? '' : 's'}`, 'info', {
      label: 'Undo', action: () => { window.events = before; window.saveEvents(); }
    });
  }

  function openTask(taskId) {
    window.setView?.('all');
    const taskSearch = document.getElementById('searchInput');
    if (taskSearch) taskSearch.value = '';
    window.renderTasks?.();
    requestAnimationFrame(() => document.querySelector(`.task-card[data-task-id="${CSS.escape(taskId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  function makePrepTask(id) {
    const event = findEvent(id);
    if (!event || !Array.isArray(window.tasks)) return;
    const { date } = placement(event, todayISO());
    // Task descriptions render as sanitised rich text, so lines join with <br>.
    const description = [
      `Prep for ${event.title}: ${dateLabel(date)}, ${timeRange(event)}`,
      event.location && `Location: ${event.location}`,
      safeUrl(event.link) && `Link: ${safeUrl(event.link)}`,
      event.notes
    ].filter(Boolean).map((line) => escapeHTML(line).replace(/\n/g, '<br>')).join('<br>');
    const timestamp = new Date().toISOString();
    const task = {
      id: newId(),
      title: `Prep: ${event.title}`,
      category: 'Events',
      priority: 'Medium',
      financeType: 'Profit',
      budget: '',
      description,
      subtasks: [],
      photoUrl: '',
      linkUrl: safeUrl(event.link),
      workspaceUrl: '',
      assignee: '',
      dateAssigned: '',
      dueDate: date,
      dueTime: event.time || '',
      blockedBy: '',
      projectId: '',
      status: 'todo',
      financeSynced: false,
      integrations: { ics: { lastExportedAt: null }, email: { lastSentAt: null } },
      syncStatus: 'idle',
      metadata: { createdAt: timestamp, updatedAt: timestamp, source: 'event' }
    };
    window.tasks.push(window.normalizeTaskSchema ? window.normalizeTaskSchema(task, 'event') : task);
    window.saveTasks?.();
    window.showToast?.(`Added “${task.title}” to To Do, due ${dateLabel(date)}`, 'success', { label: 'View', action: () => openTask(task.id) });
  }

  function runAction(action, id, trigger) {
    const event = findEvent(id);
    if (action === 'edit') startEditing(id);
    else if (action === 'cancel-edit') stopEditing();
    else if (action === 'duplicate') duplicateEvent(id);
    else if (action === 'delete') deleteEvent(id);
    else if (action === 'prep-task') makePrepTask(id);
    else if (action === 'google' && event) window.open(googleCalendarUrl(event), '_blank', 'noopener');
    else if (action === 'ics' && event) downloadCalendar(`${fileSlug(event.title)}.ics`, [event]);
    trigger?.closest('details.event-menu')?.removeAttribute('open');
  }

  // --- Wiring ----------------------------------------------------------------
  if (addForm) {
    addForm.innerHTML = formHTML(valuesOf(), 'add');
    addForm.addEventListener('submit', (submitEvent) => { submitEvent.preventDefault(); addFromForm(); });
  }

  [addForm, list].forEach((root) => root?.addEventListener('change', (changeEvent) => {
    const field = changeEvent.target;
    const form = field.closest?.('form');
    if (!form) return;
    if (field.name === 'repeat') syncRepeatField(form);
    // Let the editor preview a new colour tag before it is saved.
    if (field.name === 'color') field.closest('.event-card')?.style.setProperty('--event-color', colorValue(field.value));
  }));

  list?.addEventListener('click', (clickEvent) => {
    const trigger = clickEvent.target.closest('[data-action]');
    if (!trigger || !list.contains(trigger)) return;
    runAction(trigger.dataset.action, trigger.closest('[data-event-id]')?.dataset.eventId, trigger);
  });
  list?.addEventListener('submit', (submitEvent) => {
    if (!submitEvent.target.matches('form[data-editor]')) return;
    submitEvent.preventDefault();
    saveEditor(submitEvent.target);
  });
  list?.addEventListener('keydown', (keyEvent) => {
    if (keyEvent.key === 'Escape' && keyEvent.target.closest('form[data-editor]')) {
      keyEvent.preventDefault();
      stopEditing();
    }
  });

  // One menu open at a time, and a click anywhere else closes it.
  document.addEventListener('click', (clickEvent) => {
    document.querySelectorAll('details.event-menu[open]').forEach((menu) => {
      if (!menu.contains(clickEvent.target)) menu.removeAttribute('open');
    });
  });

  document.querySelectorAll('[data-event-filter]').forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.eventFilter)));
  search?.addEventListener('input', () => { state.query = search.value; render(); });
  exportButton?.addEventListener('click', () => {
    const events = state.visible.map((entry) => entry.event);
    if (!events.length) return;
    downloadCalendar(`soloflow-events-${todayISO()}.ics`, events);
    window.showToast?.(`Exported ${events.length} event${events.length === 1 ? '' : 's'} to a calendar file`, 'success');
  });
  clearPastButton?.addEventListener('click', clearPast);

  // "Starts in 20 min" and "Happening now" go stale, so repaint once a minute,
  // but never under someone who is editing or has a menu open.
  const tick = setInterval(() => {
    if (!isOpen() || state.editingId || list?.querySelector('details.event-menu[open]')) return;
    render();
  }, 60_000);

  window.renderEvents = render;
  window.addEvent = addFromForm;
  window.deleteEvent = deleteEvent;
  window.SoloFlowEvents = {
    occursOn,
    nextOccurrence,
    colorValue,
    describeRepeat,
    timeRange,
    upcomingCount: () => allEvents().filter((event) => nextOccurrence(event, todayISO())).length,
    show,
    focusNewEvent: () => {
      if (!isOpen()) window.setView?.('events');
      requestAnimationFrame(() => document.getElementById('eventTitle')?.focus());
    }
  };
  store.bus.emit('events:ready', { at: Date.now() });
  return () => clearInterval(tick);
}
