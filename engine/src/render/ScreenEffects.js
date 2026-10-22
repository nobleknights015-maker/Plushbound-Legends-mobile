function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function lerp(a, b, t) { return a + (b - a) * t; }

export class ScreenEffects {
  constructor({ rng = Math.random } = {}) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.tone = { r: 0, g: 0, b: 0, gray: 0 };
    this.toneTween = null;
    this.fade = 0;
    this.fadeTween = null;
    this.shake = null;
    this.weather = { type: 'none', power: 0, seed: 0 };
    this.flash = null;
  }

  setTone(tone = {}, durationMs = 0) {
    const target = normalizeTone(tone);
    if (durationMs > 0) this.toneTween = tween(this.tone, target, durationMs);
    else { this.tone = target; this.toneTween = null; }
  }

  fadeTo(opacity = 0, durationMs = 0) {
    const target = clamp(Number(opacity) || 0, 0, 1);
    if (durationMs > 0) this.fadeTween = tween({ value: this.fade }, { value: target }, durationMs);
    else { this.fade = target; this.fadeTween = null; }
  }

  flashColor(color = { r: 255, g: 255, b: 255 }, opacity = 1, durationMs = 250) {
    this.flash = { color: normalizeColor(color), opacity: clamp(Number(opacity) || 0, 0, 1), durationMs: Math.max(1, Number(durationMs) || 1), elapsed: 0 };
  }

  startShake({ power = 8, speed = 12, durationMs = 500 } = {}) {
    this.shake = { power: Math.max(0, Number(power) || 0), speed: Math.max(0.1, Number(speed) || 0.1), durationMs: Math.max(1, Number(durationMs) || 1), elapsed: 0 };
  }

  setWeather(type = 'none', power = 0, seed = 0) {
    const allowed = new Set(['none', 'rain', 'storm', 'snow', 'embers', 'petals']);
    this.weather = { type: allowed.has(type) ? type : 'none', power: clamp(Number(power) || 0, 0, 10), seed: Number(seed) || 0 };
  }

  update(dtMs = 0) {
    const dt = Math.max(0, Number(dtMs) || 0);
    this.#advanceTone(dt);
    this.#advanceFade(dt);
    if (this.shake) {
      this.shake.elapsed += dt;
      if (this.shake.elapsed >= this.shake.durationMs) this.shake = null;
    }
    if (this.flash) {
      this.flash.elapsed += dt;
      if (this.flash.elapsed >= this.flash.durationMs) this.flash = null;
    }
    return this.snapshot();
  }

  compose({ viewportWidth = 1604, viewportHeight = 720, clockMs = 0 } = {}) {
    const commands = [];
    const shake = this.#shakeOffset();
    if (shake.x || shake.y) commands.push({ kind: 'screen-offset', x: shake.x, y: shake.y, z: 90000 });
    if (this.tone.r || this.tone.g || this.tone.b || this.tone.gray) commands.push({ kind: 'tone', ...this.tone, z: 91000 });
    if (this.weather.type !== 'none' && this.weather.power > 0) {
      commands.push({
        kind: 'weather', z: 92000, type: this.weather.type, power: this.weather.power,
        particles: buildParticles(this.weather, viewportWidth, viewportHeight, clockMs)
      });
    }
    if (this.flash) {
      const alpha = this.flash.opacity * (1 - clamp(this.flash.elapsed / this.flash.durationMs, 0, 1));
      commands.push({ kind: 'flash', color: this.flash.color, opacity: alpha, z: 93000 });
    }
    if (this.fade > 0) commands.push({ kind: 'fade', opacity: this.fade, z: 94000 });
    return commands;
  }

  snapshot() {
    return {
      tone: { ...this.tone }, fade: this.fade, weather: { ...this.weather },
      shaking: !!this.shake, flashing: !!this.flash
    };
  }

  #advanceTone(dt) {
    if (!this.toneTween) return;
    this.toneTween.elapsed = Math.min(this.toneTween.durationMs, this.toneTween.elapsed + dt);
    const t = this.toneTween.elapsed / this.toneTween.durationMs;
    this.tone = {
      r: lerp(this.toneTween.from.r, this.toneTween.to.r, t),
      g: lerp(this.toneTween.from.g, this.toneTween.to.g, t),
      b: lerp(this.toneTween.from.b, this.toneTween.to.b, t),
      gray: lerp(this.toneTween.from.gray, this.toneTween.to.gray, t)
    };
    if (t >= 1) this.toneTween = null;
  }

  #advanceFade(dt) {
    if (!this.fadeTween) return;
    this.fadeTween.elapsed = Math.min(this.fadeTween.durationMs, this.fadeTween.elapsed + dt);
    const t = this.fadeTween.elapsed / this.fadeTween.durationMs;
    this.fade = lerp(this.fadeTween.from.value, this.fadeTween.to.value, t);
    if (t >= 1) this.fadeTween = null;
  }

  #shakeOffset() {
    if (!this.shake) return { x: 0, y: 0 };
    const progress = clamp(this.shake.elapsed / this.shake.durationMs, 0, 1);
    const amplitude = this.shake.power * (1 - progress);
    const phase = this.shake.elapsed / 1000 * this.shake.speed * Math.PI * 2;
    return { x: Math.sin(phase) * amplitude, y: Math.cos(phase * 0.5) * amplitude * 0.35 };
  }
}

function normalizeTone(tone) {
  return {
    r: clamp(Number(tone.r) || 0, -255, 255), g: clamp(Number(tone.g) || 0, -255, 255),
    b: clamp(Number(tone.b) || 0, -255, 255), gray: clamp(Number(tone.gray) || 0, 0, 255)
  };
}

function normalizeColor(color) {
  return { r: clamp(Number(color.r) || 0, 0, 255), g: clamp(Number(color.g) || 0, 0, 255), b: clamp(Number(color.b) || 0, 0, 255) };
}

function tween(from, to, durationMs) { return { from: { ...from }, to: { ...to }, durationMs: Math.max(1, Number(durationMs) || 1), elapsed: 0 }; }

function buildParticles(weather, width, height, clockMs) {
  const count = Math.max(1, Math.round(weather.power * 12));
  const time = Math.max(0, Number(clockMs) || 0) / 1000;
  return Array.from({ length: count }, (_, i) => {
    const a = hash(i + weather.seed * 101);
    const b = hash(i * 17 + weather.seed * 13);
    const speed = weather.type === 'storm' ? 900 : weather.type === 'snow' ? 90 : 420;
    const drift = weather.type === 'snow' || weather.type === 'petals' ? Math.sin(time + i) * 22 : -speed * 0.18;
    return {
      x: ((a * width + drift * time) % width + width) % width,
      y: ((b * height + speed * time) % height + height) % height,
      size: weather.type === 'snow' ? 3 + (i % 3) : weather.type === 'embers' ? 2 : 1,
      alpha: 0.35 + (i % 5) * 0.1
    };
  });
}

function hash(value) {
  const x = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
