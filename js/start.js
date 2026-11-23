import { load, settings, appearance, flatten, findNode, host, save } from './store.js';
import { openURL, searchFor, setThemeListener } from './common.js';
import { applyLanguage } from './i18n.js';

await load();
appearance();
document.body.classList.add('ready');
applyLanguage(settings.language);
setThemeListener();

const $ = selector => document.querySelector(selector);
const q = $('#q');
const matrixCanvas = $('#matrix-bg');
const matrixContext = matrixCanvas.getContext('2d', { alpha: true });
let matrixColumns = [];
let matrixFrame = 0;
let matrixLastPaint = 0;
let matrixReduced = false;
let tree = [];
let all = [];
let visible = [];
let mode = 'web';
let selected = -1;
let actions = [];
let expanded = false;
let current = '';

function initMatrix() {
  cancelAnimationFrame(matrixFrame);
  matrixFrame = 0;
  matrixCanvas.hidden = settings.background !== 'matrix';
  if (matrixCanvas.hidden) return;

  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  matrixCanvas.width = Math.round(innerWidth * ratio);
  matrixCanvas.height = Math.round(innerHeight * ratio);
  matrixContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  matrixColumns = Array.from({ length: Math.ceil(innerWidth / 25) }, () => ({
    y: Math.random() * innerHeight,
    speed: 0.018 + Math.random() * 0.045,
    chars: Array.from({ length: 7 }, () => Math.random() < .5 ? '0' : '1')
  }));
  matrixReduced = settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  matrixLastPaint = 0;
  if (matrixReduced) paintMatrix(0);
  else matrixFrame = requestAnimationFrame(paintMatrix);
}

function paintMatrix(now) {
  if (document.hidden || settings.background !== 'matrix') {
    matrixFrame = requestAnimationFrame(paintMatrix);
    return;
  }
  if (!matrixReduced && now - matrixLastPaint < 38) {
    matrixFrame = requestAnimationFrame(paintMatrix);
    return;
  }
  const elapsed = matrixLastPaint ? Math.min(now - matrixLastPaint, 64) : 32;
  matrixLastPaint = now || 1;
  matrixContext.clearRect(0, 0, innerWidth, innerHeight);
  const rgb = settings.accent.match(/[\da-f]{2}/gi).map(part => parseInt(part, 16));
  matrixContext.font = '12px JetBrains Mono, monospace';
  matrixContext.textBaseline = 'top';
  matrixColumns.forEach((column, index) => {
    if (!matrixReduced) {
      column.y += column.speed * elapsed;
      if (Math.floor(now / 360) !== Math.floor((now - elapsed) / 360)) column.chars[0] = Math.random() < .5 ? '0' : '1';
      if (column.y > innerHeight + 150) column.y = -Math.random() * 180;
    }
    for (let row = 0; row < column.chars.length; row++) {
      const y = column.y - row * 17;
      if (y < -18 || y > innerHeight) continue;
      const alpha = (matrixReduced ? .11 : .07) * (1 - row / (column.chars.length + 1));
      matrixContext.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(3)})`;
      matrixContext.fillText(column.chars[row], index * 25 + 8, y);
    }
    if (!matrixReduced && index % 4 === 0 && Math.random() < .018) {
      column.chars[Math.floor(Math.random() * column.chars.length)] = Math.random() < .5 ? '0' : '1';
    }
  });
  if (!matrixReduced) matrixFrame = requestAnimationFrame(paintMatrix);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && settings.background === 'matrix' && !matrixReduced && !matrixFrame) {
    matrixLastPaint = 0;
    matrixFrame = requestAnimationFrame(paintMatrix);
  }
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', initMatrix);
addEventListener('resize', initMatrix);

const builtins = [
  ['settings', 'Einstellungen', () => location.href = 'settings.html'],
  ['bookmarks', 'Lesezeichen', () => chrome.tabs.create({ url: 'chrome://bookmarks/' })],
  ['history', 'Verlauf', () => chrome.tabs.create({ url: 'chrome://history/' })],
  ['downloads', 'Downloads', () => chrome.tabs.create({ url: 'chrome://downloads/' })],
  ['extensions', 'Erweiterungen', () => chrome.tabs.create({ url: 'chrome://extensions/' })],
  ['profile', 'Profil wählen', () => location.href = 'settings.html#profiles'],
  ['theme', 'Thema wechseln', async () => {
    settings.theme = document.body.classList.contains('light') ? 'dark' : 'light';
    await save();
    appearance();
  }]
];

function baseFolder() {
  if (settings.bookmarkSource === 'folder') return findNode(tree, settings.folder);
  if (settings.bookmarkSource === 'all' || settings.bookmarkSource === 'recent') return null;
  return tree[0]?.children?.find(node => node.children) || tree[0];
}

function chosenFolder() {
  return current ? findNode(tree, current) : baseFolder();
}

function inlineBookmarkLimit() {
  const panel = $('.bookmark-panel');
  const divider = $('.bookmark-panel .divider');
  const heading = $('.bookmark-heading');
  const nav = $('#bookmarks');
  const style = getComputedStyle(nav);
  const dividerStyle = getComputedStyle(divider);
  const overhead = divider.offsetHeight + heading.offsetHeight
    + parseFloat(dividerStyle.marginTop) + parseFloat(dividerStyle.marginBottom)
    + parseFloat(style.marginTop) + 34;
  const rowHeight = document.body.dataset.view === 'grid' ? 68 : (innerWidth < 780 ? 42 : 44);
  const availableRows = Math.floor(Math.max(0, panel.clientHeight - overhead) / rowHeight) - (current ? 1 : 0);
  return Math.max(1, Math.min(settings.limit, availableRows));
}

function bookmarkEntry(node, index) {
  const link = document.createElement(node.url ? 'a' : 'button');
  link.className = `bookmark ${node.url ? 'bookmark-link' : 'bookmark-folder'}`;
  if (node.url) link.href = node.url;
  else link.type = 'button';
  link.setAttribute('aria-label', node.url
    ? `${node.title || host(node.url)}, ${host(node.url)}`
    : `Ordner ${node.title || 'Lesezeichen'} mit ${node.children?.length || 0} Einträgen`);

  const number = document.createElement('span');
  number.className = 'number';
  number.textContent = String(index + 1).padStart(2, '0');

  const iconBox = document.createElement('span');
  iconBox.className = 'bookmark-icon';
  iconBox.setAttribute('aria-hidden', 'true');
  const fallback = document.createElement('span');
  fallback.className = 'icon-fallback';
  fallback.textContent = node.url
    ? (node.title || host(node.url) || '•').trim().slice(0, 1).toUpperCase()
    : '▰';
  iconBox.append(fallback);

  if (node.url && settings.favicons) {
    const icon = document.createElement('img');
    icon.alt = '';
    icon.width = 20;
    icon.height = 20;
    icon.loading = 'lazy';
    icon.addEventListener('load', () => iconBox.classList.add('has-favicon'), { once: true });
    icon.addEventListener('error', () => icon.remove(), { once: true });
    icon.src = `${chrome.runtime.getURL('_favicon/')}?pageUrl=${encodeURIComponent(node.url)}&size=32`;
    iconBox.append(icon);
  }

  const text = document.createElement('span');
  text.className = 'bookmark-text';
  const title = document.createElement('b');
  title.textContent = node.title || host(node.url || '') || 'Unbenannt';
  text.append(title);
  const secondary = document.createElement('small');
  secondary.textContent = node.url
    ? (settings.urls ? host(node.url) : 'Website öffnen')
    : `${node.children?.length || 0} Lesezeichen`;
  text.append(secondary);

  const tail = document.createElement('span');
  tail.className = 'bookmark-tail';
  tail.textContent = node.url ? '↗' : '›';
  link.append(number, iconBox, text, tail);

  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) return;
    event.preventDefault();
    if (node.url) openURL(node.url);
    else {
      current = node.id;
      expanded = false;
      drawBookmarks();
    }
  });
  return link;
}

function drawBookmarks() {
  const root = chosenFolder();
  visible = settings.bookmarkSource === 'all' || settings.bookmarkSource === 'recent'
    ? all.slice()
    : [...(root?.children || [])];
  if (settings.bookmarkSource === 'recent') visible.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  if (settings.sort === 'name') visible.sort((a, b) => a.title.localeCompare(b.title));
  if (settings.sort === 'recent') visible.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  if (settings.sort === 'domain') visible.sort((a, b) => host(a.url || '').localeCompare(host(b.url || '')));

  $('#count').textContent = `${String(visible.length).padStart(2, '0')} EINTRÄGE`;
  const nav = $('#bookmarks');
  nav.replaceChildren();
  nav.classList.toggle('expanded', expanded);

  if (expanded) {
    const toolbar = document.createElement('div');
    toolbar.className = 'bookmark-overlay-head';
    const label = document.createElement('strong');
    label.textContent = current ? (findNode(tree, current)?.title || 'Ordner') : 'Alle Lesezeichen';
    const filter = document.createElement('input');
    filter.type = 'search';
    filter.placeholder = 'Lesezeichen filtern';
    filter.setAttribute('aria-label', 'Lesezeichen filtern');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'bookmark-close';
    close.setAttribute('aria-label', 'Lesezeichen schließen');
    close.textContent = '×';
    close.onclick = () => { expanded = false; drawBookmarks(); };
    toolbar.append(label, filter, close);
    nav.append(toolbar);
    filter.addEventListener('input', () => {
      const needle = filter.value.trim().toLocaleLowerCase();
      nav.querySelectorAll(':scope > .bookmark').forEach(item => {
        item.hidden = !item.textContent.toLocaleLowerCase().includes(needle);
      });
    });
    filter.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        expanded = false;
        drawBookmarks();
        $('#more').focus();
      }
    });
  }

  if (current) {
    const up = document.createElement('button');
    up.className = 'bookmark folder-up';
    up.textContent = '..  Zurück';
    up.onclick = () => {
      const parentId = findNode(tree, current)?.parentId || '';
      current = parentId === baseFolder()?.id ? '' : parentId;
      drawBookmarks();
    };
    nav.append(up);
  }

  const limit = expanded ? visible.length : inlineBookmarkLimit();
  visible.slice(0, limit).forEach((node, index) => nav.append(bookmarkEntry(node, index)));
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'bookmark-empty';
    empty.textContent = 'Keine Lesezeichen in dieser Ansicht.';
    nav.append(empty);
  }

  const more = $('#more');
  more.hidden = visible.length <= limit;
  more.textContent = expanded ? '− Weniger anzeigen' : `+ ${visible.length - limit} weitere`;
  more.setAttribute('aria-expanded', String(expanded));
  more.onclick = () => {
    expanded = !expanded;
    drawBookmarks();
    if (expanded) $('#bookmarks input[type="search"]')?.focus();
  };
}

function paintClock() {
  const now = new Date();
  const timezone = settings.timezone && settings.timezone !== 'local' ? settings.timezone : undefined;
  const options = { hour: '2-digit', minute: '2-digit', hour12: settings.hour12 };
  if (timezone) options.timeZone = timezone;
  if (settings.seconds) options.second = '2-digit';
  $('#clock').textContent = now.toLocaleTimeString(settings.language === 'en' ? 'en-GB' : 'de-DE', options);
  $('#clock').hidden = !settings.showClock;
  const locale = settings.language === 'en' ? 'en-GB' : 'de-DE';
  const dateOptions = timezone ? { timeZone: timezone } : {};
  const date = settings.dateFormat === 'short'
    ? now.toLocaleDateString(locale, { ...dateOptions, year: 'numeric', month: '2-digit', day: '2-digit' })
    : settings.dateFormat === 'iso'
      ? (() => { const parts = new Intl.DateTimeFormat('en-CA', { ...dateOptions, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); const part = type => parts.find(item => item.type === type)?.value; return `${part('year')}-${part('month')}-${part('day')}`; })()
      : now.toLocaleDateString(locale, { ...dateOptions, weekday: 'long', day: 'numeric', month: 'long' });
  $('#date').textContent = date.toUpperCase();
  const zoneName = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('#zone').textContent = zoneName === 'UTC' ? 'UTC' : zoneName.split('/').pop().replaceAll('_', ' ');
  $('#greeting').textContent = settings.greeting;
  $('#clock-widget').hidden = !settings.widgetClock;
  $('.bookmark-panel').hidden = !settings.widgetBookmarks;
  $('.keys').hidden = !settings.keyboardNav;
}

function setMode(next, focus = true) {
  mode = next;
  document.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === next));
  if (focus) q.focus();
  suggest();
}

function suggest() {
  const value = q.value.trim();
  const results = $('#results');
  results.replaceChildren();
  actions = [];
  selected = -1;
  if (!settings.suggestions) return;
  const low = value.toLowerCase();
  if (mode === 'bm') {
    actions = all.filter(node => (node.title + ' ' + node.url).toLowerCase().includes(low)).slice(0, 6)
      .map(node => ({ name: `@ ${node.title} · ${host(node.url || '')}`, run: () => node.url ? openURL(node.url) : (current = node.id, drawBookmarks()) }));
  } else if (mode === 'cmd') {
    const [key, ...args] = value.split(/\s+/);
    actions = [...builtins.map(([key, name, run]) => ({ key, name, run })),
      ...settings.commands.map(command => ({ ...command, run: () => openURL(command.url.replaceAll('%s', encodeURIComponent(args.join(' ')))) }))]
      .filter(command => !key || command.key.startsWith(key.toLowerCase()) || command.name.toLowerCase().includes(key.toLowerCase()))
      .slice(0, 8).map(command => ({ name: `> ${command.key} · ${command.name}`, run: command.run }));
  } else if (value) {
    actions = all.filter(node => node.url && (node.title + ' ' + node.url).toLowerCase().includes(low)).slice(0, 5)
      .map(node => ({ name: `@ ${node.title} · ${host(node.url)}`, run: () => openURL(node.url) }));
  }
  actions.forEach((action, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result';
    button.setAttribute('role', 'option');
    button.textContent = action.name;
    button.onmousedown = event => { event.preventDefault(); action.run(); };
    button.onmousemove = () => { selected = index; paint(); };
    results.append(button);
  });
}

function paint() {
  [...$('#results').children].forEach((button, index) => button.classList.toggle('selected', index === selected));
}

function go() {
  if (selected >= 0 && actions[selected]) return actions[selected].run();
  const value = q.value.trim();
  if (!value) return;
  if (mode === 'cmd') {
    const [key, ...args] = value.split(/\s+/);
    const commands = [...builtins.map(([key, name, run]) => ({ key, name, run })),
      ...settings.commands.map(command => ({ ...command, run: () => openURL(command.url.replaceAll('%s', encodeURIComponent(args.join(' ')))) }))];
    return commands.find(command => command.key === key)?.run();
  }
  if (mode === 'bm') return actions[0]?.run();
  if (/^(https?:|file:|ftp:)/i.test(value)) return openURL(value);
  if (!value.includes(' ') && /^[\w-]+(?:\.[\w-]+)+(?:[:/].*)?$/.test(value)) return openURL('https://' + value);
  if (settings.saveHistory) chrome.storage.local.get({ searchHistory: [] }).then(({ searchHistory }) =>
    chrome.storage.local.set({ searchHistory: [value, ...searchHistory.filter(item => item !== value)].slice(0, 50) }));
  searchFor(value);
}

q.addEventListener('input', () => {
  const prefixes = { '/': 'web', '>': 'cmd', '@': 'bm' };
  if (prefixes[q.value[0]]) {
    mode = prefixes[q.value[0]];
    q.value = q.value.slice(1);
    document.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  }
  suggest();
});
q.addEventListener('keydown', event => {
  if (settings.keyboardNav && event.key === 'Tab') {
    event.preventDefault();
    const modes = ['web', 'cmd', 'bm'];
    setMode(modes[(modes.indexOf(mode) + (event.shiftKey ? 2 : 1)) % 3], false);
  } else if (settings.keyboardNav && event.key === 'ArrowDown' && actions.length) {
    event.preventDefault(); selected = (selected + 1) % actions.length; paint();
  } else if (settings.keyboardNav && event.key === 'ArrowUp' && actions.length) {
    event.preventDefault(); selected = (selected - 1 + actions.length) % actions.length; paint();
  } else if (event.key === 'Escape') {
    q.value = ''; setMode('web', false); $('#results').replaceChildren();
  }
});
$('#search').addEventListener('submit', event => { event.preventDefault(); go(); });
q.addEventListener('blur', () => setTimeout(() => $('#results').replaceChildren(), 180));
q.addEventListener('focus', suggest);
document.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && expanded && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    expanded = false;
    drawBookmarks();
    $('#more').focus();
    return;
  }
  if (!settings.keyboardNav) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === '/') { event.preventDefault(); setMode('web'); }
  if (event.key === ',') location.href = 'settings.html';
  if (event.key.toLowerCase() === 't') {
    settings.theme = document.body.classList.contains('light') ? 'dark' : 'light';
    save().then(appearance);
  }
  if (/^[1-9]$/.test(event.key) && visible[Number(event.key) - 1]?.url) openURL(visible[Number(event.key) - 1].url);
});

async function refresh() {
  tree = await chrome.bookmarks.getTree();
  all = flatten(tree);
  if (current && !findNode(tree, current)) current = '';
  drawBookmarks();
}
for (const event of ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered']) chrome.bookmarks[event].addListener(refresh);
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && (changes.settings || changes.profiles)) {
    await load(); current = ''; expanded = false; appearance(); paintClock(); drawBookmarks(); initMatrix(); setMode(mode, false);
  }
});
await refresh();
paintClock();
initMatrix();
setInterval(paintClock, 1000);
setMode('web', false);
if (!settings.autofocus || location.search.includes('preview=1')) q.blur();
addEventListener('resize', () => { if (!expanded) drawBookmarks(); });
