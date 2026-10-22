export class AudioManager {
  constructor({ adapter, defaults = {} } = {}) {
    this.adapter = adapter || new NullAudioAdapter();
    this.volumes = {
      master: clamp01(defaults.master ?? 1),
      bgm: clamp01(defaults.bgm ?? 1),
      bgs: clamp01(defaults.bgs ?? 1),
      se: clamp01(defaults.se ?? 1),
      me: clamp01(defaults.me ?? 1),
    };
    this.current = { bgm: null, bgs: null, me: null };
    this.muted = false;
  }

  setMuted(value) {
    this.muted = !!value;
    this.#syncVolumes();
  }

  setVolume(channel, value) {
    if (!(channel in this.volumes)) throw new Error(`Unknown audio channel: ${channel}`);
    this.volumes[channel] = clamp01(value);
    this.#syncVolumes();
  }

  effectiveVolume(channel) {
    if (this.muted) return 0;
    const channelVolume = this.volumes[channel] ?? 1;
    return clamp01(this.volumes.master * channelVolume);
  }

  playBgm(name, options = {}) {
    const track = normalizeTrack(name, options, true);
    this.current.bgm = track;
    this.adapter.play?.('bgm', track, this.effectiveVolume('bgm'));
    return track;
  }

  stopBgm() {
    this.current.bgm = null;
    this.adapter.stop?.('bgm');
  }

  playBgs(name, options = {}) {
    const track = normalizeTrack(name, options, true);
    this.current.bgs = track;
    this.adapter.play?.('bgs', track, this.effectiveVolume('bgs'));
    return track;
  }

  stopBgs() {
    this.current.bgs = null;
    this.adapter.stop?.('bgs');
  }

  playSe(name, options = {}) {
    const track = normalizeTrack(name, options, false);
    this.adapter.play?.('se', track, this.effectiveVolume('se'));
    return track;
  }

  playMe(name, options = {}) {
    const track = normalizeTrack(name, options, false);
    this.current.me = track;
    this.adapter.play?.('me', track, this.effectiveVolume('me'));
    return track;
  }

  stopMe() {
    this.current.me = null;
    this.adapter.stop?.('me');
  }

  fade(channel, seconds, target = 0) {
    if (!['bgm', 'bgs', 'me'].includes(channel)) throw new Error(`Cannot fade channel: ${channel}`);
    const duration = Math.max(0, Number(seconds) || 0);
    const targetVolume = clamp01(target) * this.effectiveVolume(channel);
    this.adapter.fade?.(channel, duration, targetVolume);
  }

  snapshot() {
    return JSON.parse(JSON.stringify({ volumes: this.volumes, current: this.current, muted: this.muted }));
  }

  restore(raw = {}) {
    if (raw.volumes) {
      for (const key of Object.keys(this.volumes)) {
        if (raw.volumes[key] != null) this.volumes[key] = clamp01(raw.volumes[key]);
      }
    }
    this.muted = !!raw.muted;
    this.current = { bgm: raw.current?.bgm ?? null, bgs: raw.current?.bgs ?? null, me: raw.current?.me ?? null };
    this.#syncVolumes();
    for (const channel of ['bgm', 'bgs', 'me']) {
      const track = this.current[channel];
      if (track) this.adapter.play?.(channel, track, this.effectiveVolume(channel));
    }
  }

  #syncVolumes() {
    for (const channel of ['bgm', 'bgs', 'se', 'me']) {
      this.adapter.setVolume?.(channel, this.effectiveVolume(channel));
    }
  }
}

export class NullAudioAdapter {
  play() {}
  stop() {}
  fade() {}
  setVolume() {}
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function normalizeTrack(name, options, loop) {
  if (!name) throw new Error('Audio track name is required');
  return {
    name: String(name),
    loop: options.loop ?? loop,
    pitch: Number.isFinite(Number(options.pitch)) ? Number(options.pitch) : 1,
    pan: Number.isFinite(Number(options.pan)) ? Math.max(-1, Math.min(1, Number(options.pan))) : 0,
    position: Math.max(0, Number(options.position) || 0),
  };
}
