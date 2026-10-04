// Short, locally synthesised sounds. No downloads, microphone or audio files.
export function createTypingSound(storage) {
  const key = 'a-little-english-sound';
  let enabled = true, context = null, buffers = null;
  try { enabled = storage?.getItem(key) !== 'off'; } catch { /* Storage is optional. */ }

  function buildBuffer(kind) {
    const duration = kind === 'error' ? 0.22 : 0.065;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / context.sampleRate;
      if (kind === 'error') {
        // Two soft, low notes distinguish a mistake from a mechanical key click.
        const local = t < 0.10 ? t : t - 0.12;
        if (local >= 0 && local < 0.09) {
          const envelope = Math.min(local / 0.004, 1) * Math.exp(-local * 32);
          const frequency = t < 0.10 ? 230 : 165;
          data[i] = 0.19 * envelope * (Math.sin(2 * Math.PI * frequency * local) + 0.2 * Math.sin(4 * Math.PI * frequency * local));
        }
      } else {
        // A sharp hammer strike, a small metallic resonance and a quieter release.
        const attack = Math.min(t / 0.0005, 1);
        const strike = (Math.random() * 2 - 1) * 0.30 * Math.exp(-t * 165);
        const body = 0.14 * Math.sin(2 * Math.PI * 1450 * t) * Math.exp(-t * 105);
        const release = t >= 0.022 ? (Math.random() * 2 - 1) * 0.07 * Math.exp(-(t - 0.022) * 180) : 0;
        data[i] = attack * (strike + body + release);
      }
    }
    return buffer;
  }

  return {
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      try { storage?.setItem(key, enabled ? 'on' : 'off'); } catch { /* Still works without persistence. */ }
      return enabled;
    },
    play(kind = 'key') {
      if (!enabled) return;
      try {
        if (!context) {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          context = new Audio();
          buffers = { key: buildBuffer('key'), error: buildBuffer('error') };
        }
        // Called from an actual typing event to respect browser autoplay rules.
        const ready = context.state === 'suspended' ? context.resume() : Promise.resolve();
        ready.then(() => {
          if (!enabled || context.state !== 'running') return;
          const source = context.createBufferSource();
          source.buffer = buffers[kind] || buffers.key;
          source.connect(context.destination);
          source.onended = () => source.disconnect();
          source.start();
        }).catch(() => {});
      } catch { /* Audio failure must never interrupt practice. */ }
    },
  };
}
