export const STORAGE_KEY = 'a-little-english-v1';

export function freshRecord(text) {
  return { target: text, input: '', attempts: 0, correctAttempts: 0, elapsed: 0, started: false, completed: false };
}

export function restoreRecord(raw, text) {
  if (!raw || raw.target !== text || typeof raw.input !== 'string') return freshRecord(text);
  const nonnegative = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (![raw.attempts, raw.correctAttempts, raw.elapsed].every(nonnegative) || raw.correctAttempts > raw.attempts || raw.input.length > text.length + 1000) return freshRecord(text);
  return { target: text, input: raw.input, attempts: raw.attempts, correctAttempts: raw.correctAttempts, elapsed: raw.elapsed, started: raw.started === true, completed: raw.input === text };
}

// Count only the newly inserted range. Deletions never undo historical errors.
export function applyInput(record, value, range = null) {
  const previous = record.input;
  let start = 0;
  let end = value.length;
  if (range && Number.isInteger(range.start) && Number.isInteger(range.end) && value.startsWith(previous.slice(0, range.start)) && value.endsWith(previous.slice(range.end))) {
    start = range.start;
    end = value.length - (previous.length - range.end);
  } else {
    while (start < previous.length && start < value.length && previous[start] === value[start]) start++;
    let suffix = 0;
    while (suffix < previous.length - start && suffix < value.length - start && previous[previous.length - 1 - suffix] === value[value.length - 1 - suffix]) suffix++;
    end = value.length - suffix;
  }
  for (let i = start; i < end; i++) {
    record.attempts++;
    if (value[i] === record.target[i]) record.correctAttempts++;
  }
  record.input = value;
  record.started ||= value.length > 0;
  record.completed = value === record.target;
  return record;
}

export function stats(record) {
  let correct = 0;
  let firstError = -1;
  for (let i = 0; i < record.input.length; i++) {
    if (record.input[i] === record.target[i]) correct++;
    else if (firstError === -1) firstError = i;
  }
  return {
    correct, firstError,
    wpm: record.elapsed > 0 ? Math.round((correct / 5) / (record.elapsed / 60000)) : 0,
    accuracy: record.attempts ? Math.round(record.correctAttempts / record.attempts * 100) : null,
  };
}

export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function loadState(storage) {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!raw || raw.version !== 1 || !raw.records || typeof raw.records !== 'object' || Array.isArray(raw.records)) return { version: 1, records: {}, current: null };
    return { version: 1, records: raw.records, current: raw.current || null };
  } catch {
    return { version: 1, records: {}, current: null };
  }
}
