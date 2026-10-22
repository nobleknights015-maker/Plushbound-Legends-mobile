function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}

export class AssetManager {
  constructor({ loader, maxEntries = 128 } = {}) {
    if (typeof loader !== 'function') throw new Error('AssetManager requires a loader function');
    this.loader = loader;
    this.maxEntries = Math.max(1, Number(maxEntries) || 128);
    this.cache = new Map();
    this.inflight = new Map();
    this.manifest = new Map();
  }

  register(id, descriptor) {
    const key = String(id);
    if (!key) throw new Error('Asset id is required');
    if (!descriptor?.path) throw new Error(`Asset ${key} requires a path`);
    this.manifest.set(key, Object.freeze(clone({ ...descriptor, id: key })));
    return this.manifest.get(key);
  }

  registerMany(entries = []) {
    for (const entry of entries) this.register(entry.id, entry);
    return this;
  }

  descriptor(id) { return this.manifest.get(String(id)) ?? null; }
  has(id) { return this.manifest.has(String(id)); }
  isLoaded(id) { return this.cache.has(String(id)); }

  async load(id) {
    const key = String(id);
    const descriptor = this.manifest.get(key);
    if (!descriptor) throw new Error(`Unknown asset: ${key}`);
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    if (this.inflight.has(key)) return this.inflight.get(key);
    const promise = Promise.resolve(this.loader(descriptor)).then(value => {
      this.inflight.delete(key);
      this.cache.set(key, value);
      this.#trim();
      return value;
    }, error => {
      this.inflight.delete(key);
      throw error;
    });
    this.inflight.set(key, promise);
    return promise;
  }

  async preload(ids = []) { return Promise.all(ids.map(id => this.load(id))); }

  release(id) { return this.cache.delete(String(id)); }
  clear() { this.cache.clear(); this.inflight.clear(); }

  snapshot() {
    return {
      registered: [...this.manifest.keys()],
      loaded: [...this.cache.keys()],
      inflight: [...this.inflight.keys()],
      maxEntries: this.maxEntries
    };
  }

  #trim() {
    while (this.cache.size > this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }
}

export class SpriteAnimation {
  constructor({ frames = [0], frameMs = 150, loop = true } = {}) {
    if (!Array.isArray(frames) || !frames.length) throw new Error('SpriteAnimation requires frames');
    this.frames = [...frames];
    this.frameMs = Math.max(1, Number(frameMs) || 150);
    this.loop = loop !== false;
    this.index = 0;
    this.elapsed = 0;
    this.playing = true;
    this.finished = false;
  }

  current() { return this.frames[this.index]; }
  reset() { this.index = 0; this.elapsed = 0; this.playing = true; this.finished = false; return this.current(); }
  pause() { this.playing = false; }
  play() { if (!this.finished || this.loop) this.playing = true; }

  update(dtMs) {
    if (!this.playing || this.finished) return this.current();
    this.elapsed += Math.max(0, Number(dtMs) || 0);
    while (this.elapsed >= this.frameMs && this.playing) {
      this.elapsed -= this.frameMs;
      if (this.index + 1 < this.frames.length) this.index += 1;
      else if (this.loop) this.index = 0;
      else { this.finished = true; this.playing = false; }
    }
    return this.current();
  }

  snapshot(){ return { index:this.index, elapsed:this.elapsed, playing:this.playing, finished:this.finished }; }
  restore(raw={}){
    const index = Math.max(0, Math.min(this.frames.length - 1, Number(raw.index) || 0));
    this.index = index;
    this.elapsed = Math.max(0, Number(raw.elapsed) || 0);
    this.playing = !!raw.playing;
    this.finished = !!raw.finished;
  }
}

export class DirectionalSprite {
  constructor({ animations = {}, direction = 2 } = {}) {
    this.animations = new Map(Object.entries(animations).map(([key, config]) => [String(key), config instanceof SpriteAnimation ? config : new SpriteAnimation(config)]));
    this.direction = String(direction);
    if (!this.animations.has(this.direction) && this.animations.size) this.direction = this.animations.keys().next().value;
  }
  face(direction) { const key=String(direction); if(this.animations.has(key)) this.direction=key; return this.currentFrame(); }
  update(dtMs) { return this.animations.get(this.direction)?.update(dtMs) ?? null; }
  currentFrame() { return this.animations.get(this.direction)?.current() ?? null; }
  reset() { for(const animation of this.animations.values()) animation.reset(); return this.currentFrame(); }
}
