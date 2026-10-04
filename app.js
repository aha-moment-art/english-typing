import { STORAGE_KEY, freshRecord, restoreRecord, applyInput, stats, formatTime, loadState } from './core.js';

const $ = id => document.getElementById(id);
const colors = [['#705788','#eee5f8'],['#735b8a','#f0e8f9'],['#68567f','#eae4f4'],['#79598c','#f1e6f8'],['#655a81','#ebe7f6'],['#725780','#eee4f4']];
const numerals = ['I','II','III','IV','V','VI'];
let storage;
try { storage = window.localStorage; storage.setItem(`${STORAGE_KEY}-check`, '1'); storage.removeItem(`${STORAGE_KEY}-check`); }
catch { $('storage-warning').hidden = false; }
const state = loadState(storage || { getItem: () => null });
let catalog = [], books = new Map(), book = null, paragraphIndex = 0, record = null;
let activeSince = null, inputRange = null, composing = false;
const input = $('typing-input');

function checkpoint() {
  if (activeSince !== null && record) {
    const now = performance.now();
    record.elapsed += Math.max(0, now - activeSince);
    activeSince = now;
  }
}
function save() {
  checkpoint();
  if (!storage) return;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { storage = null; $('storage-warning').hidden = false; $('save-status').textContent = 'Progress cannot be saved in this browser'; }
}
function pause() { checkpoint(); activeSince = null; save(); updateStats(); }
function resume() {
  if (record?.started && !record.completed && document.activeElement === input && !document.hidden && activeSince === null) activeSince = performance.now();
  updateStats();
}
function completedCount(item) {
  return item.paragraphs.filter(p => state.records[p.id]?.target === p.text && state.records[p.id]?.input === p.text).length;
}
function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderLibrary() {
  const grid = $('book-grid'); grid.replaceChildren();
  let total = 0, count = 0;
  catalog.forEach((item, index) => {
    const full = books.get(item.id);
    const completed = completedCount(full); total += completed; count += full.paragraphs.length;
    const card = make('article', 'book-card');
    const [accent, tint] = colors[index % colors.length];
    card.style.setProperty('--accent', accent); card.style.setProperty('--tint', tint);
    const top = make('div', 'card-top'); top.append(make('span', 'book-mark', numerals[index] || String(index + 1)), make('span', 'tag', item.category));
    const title = make('h3', '', item.title);
    const english = make('p', 'english-title', item.englishTitle); english.lang = 'en';
    const author = make('p', 'author', `${item.author} · ${item.year}`); author.lang = 'en';
    const bottom = make('div', 'card-bottom');
    const button = make('button', '', `${completed ? 'Continue' : 'Start typing'} →`); button.type = 'button'; button.setAttribute('aria-label', `Practise ${item.title}`);
    button.addEventListener('click', () => {
      const saved = state.current?.bookId === item.id ? state.current.index : -1;
      const next = full.paragraphs.findIndex(p => state.records[p.id]?.input !== p.text);
      navigate(item.id, Number.isInteger(saved) && saved >= 0 && saved < full.paragraphs.length ? saved : Math.max(0, next));
    });
    bottom.append(make('span', '', `${completed} / ${full.paragraphs.length} completed`), button);
    const progress = make('div', 'card-progress'); progress.style.width = `${completed / full.paragraphs.length * 100}%`;
    card.append(top, title, author, make('p', 'book-description', item.description), bottom, progress); grid.append(card);
  });
  $('total-progress').textContent = `${total} / ${count} passages completed`;
  document.querySelector('.count').textContent = String(catalog.length).padStart(2, '0');
  const previous = books.get(state.current?.bookId);
  const previousIndex = state.current?.index;
  const valid = previous && Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < previous.paragraphs.length;
  $('resume-banner').hidden = !valid;
  if (valid) $('resume-description').textContent = `${previous.title} · Passage ${previousIndex + 1} of ${previous.paragraphs.length}`;
}
function navigate(id, index) {
  const hash = `#read/${encodeURIComponent(id)}/${index + 1}`;
  if (location.hash !== hash) history.pushState(null, '', hash);
  route();
}
function route() {
  if (!catalog.length) return;
  pause();
  const match = /^#read\/([a-z0-9-]+)\/(\d+)$/.exec(location.hash);
  if (!match || !books.has(match[1])) {
    book = null; record = null;
    $('practice').hidden = true; $('library').hidden = false; $('load-error').hidden = true;
    renderLibrary(); document.title = 'A Little English · Read slowly. Type mindfully.';
    if (match) history.replaceState(null, '', location.pathname + location.search);
    return;
  }
  book = books.get(match[1]);
  paragraphIndex = Math.min(book.paragraphs.length - 1, Math.max(0, Number(match[2]) - 1));
  state.current = { bookId: book.id, index: paragraphIndex };
  const p = book.paragraphs[paragraphIndex];
  record = restoreRecord(state.records[p.id], p.text); state.records[p.id] = record;
  inputRange = null; composing = false;
  $('library').hidden = true; $('practice').hidden = false; $('load-error').hidden = true;
  $('practice-english').textContent = book.category;
  $('practice-heading').textContent = book.title;
  $('practice-author').textContent = `${book.author} · ${book.year}`;
  $('paragraph-meta').textContent = `${paragraphIndex + 1} / ${book.paragraphs.length} · ${p.words} words`;
  $('chapter-name').textContent = p.chapter;
  $('source-link').href = book.sourceText;
  $('paragraph-select').replaceChildren(...book.paragraphs.map((_, i) => {
    const option = make('option', '', `Passage ${i + 1}${state.records[book.paragraphs[i].id]?.input === book.paragraphs[i].text ? ' ✓' : ''}`);
    option.value = String(i); return option;
  }));
  $('paragraph-select').value = String(paragraphIndex);
  $('previous-button').disabled = paragraphIndex === 0;
  $('next-button').textContent = paragraphIndex === book.paragraphs.length - 1 ? 'Back to library →' : 'Next passage →';
  $('action-message').textContent = '';
  input.value = record.input; input.readOnly = record.completed; input.maxLength = p.text.length + 100;
  if (!storage) $('save-status').textContent = 'Progress cannot be saved in this browser';
  renderTyping(); updateCompletion(); save();
  document.title = `${book.title} · A Little English`;
  $('practice-heading').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function renderTyping() {
  if (!record) return;
  const fragment = document.createDocumentFragment();
  // Group same-state runs so assistive technology reads words normally.
  let run = '', previousClass = null;
  const flush = () => { if (run) fragment.append(make('span', previousClass, run)); run = ''; };
  for (let i = 0; i < record.target.length; i++) {
    const cls = i < record.input.length ? (record.input[i] === record.target[i] ? 'correct' : 'incorrect') : '';
    if (cls !== previousClass) { flush(); previousClass = cls; }
    run += record.target[i];
  }
  flush(); $('source-text').replaceChildren(fragment);
  $('character-count').textContent = `${record.input.length} / ${record.target.length} characters`;
  const { firstError } = stats(record);
  $('error-feedback').hidden = firstError < 0;
  const showChar = c => c === ' ' ? 'a space' : c === '\n' ? 'a line break' : `“${c}”`;
  if (firstError >= 0) $('error-feedback').textContent = firstError >= record.target.length ? 'There are extra characters at the end. Delete them to finish.' : `Character ${firstError + 1}: expected ${showChar(record.target[firstError])}, but you typed ${showChar(record.input[firstError])}.`;
  input.setAttribute('aria-invalid', String(firstError >= 0));
  updateStats();
}
function updateStats() {
  if (!record) return;
  const metric = stats(record);
  $('speed').textContent = String(metric.wpm);
  $('accuracy').textContent = metric.accuracy === null ? '—' : String(metric.accuracy);
  $('accuracy-unit').textContent = metric.accuracy === null ? '' : '%';
  $('elapsed').textContent = formatTime(record.elapsed);
  $('timer-state').textContent = record.completed ? 'Complete' : activeSince !== null ? 'Typing' : record.started ? 'Paused' : 'Ready when you are';
}
function updateCompletion() {
  if (!book || !record) return;
  const n = completedCount(book);
  $('book-progress').textContent = `${n} / ${book.paragraphs.length} passages completed`;
  $('book-progress-bar').max = book.paragraphs.length; $('book-progress-bar').value = n;
  $('completion').hidden = !record.completed;
  if (record.completed) {
    $('completion-title').textContent = n === book.paragraphs.length ? 'You have finished this text.' : 'Passage complete.';
    $('completion-detail').textContent = `Time ${formatTime(record.elapsed)} · Accuracy ${stats(record).accuracy ?? 100}%${paragraphIndex < book.paragraphs.length - 1 ? ' — continue when you are ready.' : ' — return to the library to choose another text.'}`;
    const option = $('paragraph-select').options[paragraphIndex]; if (option) option.textContent = `Passage ${paragraphIndex + 1} ✓`;
  }
}
function onInput() {
  if (!record || record.completed || composing) return;
  checkpoint();
  applyInput(record, input.value, inputRange); inputRange = null;
  if (record.completed) { activeSince = null; input.readOnly = true; }
  else resume();
  renderTyping(); updateCompletion(); save();
}
input.addEventListener('beforeinput', event => {
  if (!composing && !event.inputType?.startsWith('delete')) inputRange = { start: input.selectionStart, end: input.selectionEnd };
  else if (!composing) inputRange = null;
});
input.addEventListener('input', event => { if (!event.isComposing) onInput(); });
input.addEventListener('compositionstart', () => { composing = true; inputRange = { start: input.selectionStart, end: input.selectionEnd }; });
input.addEventListener('compositionend', () => { composing = false; onInput(); });
for (const event of ['paste', 'drop']) input.addEventListener(event, e => { e.preventDefault(); $('action-message').textContent = 'Take your time and type each character. Pasting is disabled during practice.'; });
input.addEventListener('focus', resume); input.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
window.addEventListener('blur', pause); window.addEventListener('focus', resume);
window.addEventListener('pagehide', pause); window.addEventListener('hashchange', route);
$('back-button').addEventListener('click', () => { location.hash = ''; });
$('previous-button').addEventListener('click', () => { if (paragraphIndex > 0) navigate(book.id, paragraphIndex - 1); });
$('next-button').addEventListener('click', () => { if (paragraphIndex < book.paragraphs.length - 1) navigate(book.id, paragraphIndex + 1); else location.hash = ''; });
$('paragraph-select').addEventListener('change', event => navigate(book.id, Number(event.target.value)));
$('restart-button').addEventListener('click', () => {
  pause(); const p = book.paragraphs[paragraphIndex]; state.records[p.id] = freshRecord(p.text); route(); input.focus();
});
$('resume-button').addEventListener('click', () => navigate(state.current.bookId, state.current.index));
const help = $('help-dialog');
$('help-button').addEventListener('click', () => help.showModal());
for (const id of ['close-help', 'got-it']) $(id).addEventListener('click', () => help.close());
help.addEventListener('click', event => { if (event.target === help) { const r = help.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) help.close(); } });
setInterval(() => { if (activeSince !== null) { checkpoint(); updateStats(); save(); } }, 1000);

async function fetchJSON(path) {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`Cannot load ${path}: ${response.status}`);
  return response.json();
}
function validateBook(b) {
  if (!b || typeof b.id !== 'string' || !Array.isArray(b.paragraphs) || !b.paragraphs.length || !b.paragraphs.every(p => typeof p.id === 'string' && typeof p.text === 'string' && p.text.length > 0)) throw new Error('Invalid book data');
  return b;
}
async function init() {
  $('retry-button').disabled = true;
  try {
    const items = await fetchJSON('data/catalog.json');
    if (!Array.isArray(items) || !items.length) throw new Error('Invalid catalog');
    const loaded = await Promise.all(items.map(async item => validateBook(await fetchJSON(item.file))));
    books = new Map(loaded.map(b => [b.id, b])); catalog = items;
    for (const b of books.values()) for (const p of b.paragraphs) if (state.records[p.id]) state.records[p.id] = restoreRecord(state.records[p.id], p.text);
    route();
  } catch (error) {
    console.error('Library loading failed:', error);
    $('library').hidden = true; $('practice').hidden = true; $('load-error').hidden = false;
  } finally { $('retry-button').disabled = false; }
}
$('retry-button').addEventListener('click', init);
init();
