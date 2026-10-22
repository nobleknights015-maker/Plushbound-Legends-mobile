export class CutsceneController {
  constructor({ input = {}, logger = console } = {}) {
    this.input = input;
    this.logger = logger;
    this.reset();
  }

  reset() {
    this.steps = [];
    this.index = 0;
    this.waitMs = 0;
    this.running = false;
    this.skippable = false;
    this.skipped = false;
    this.completed = false;
    this.context = null;
  }

  start(steps = [], { skippable = true, context = {} } = {}) {
    if (this.running) throw new Error('Cutscene already running');
    this.steps = Array.isArray(steps) ? steps : [];
    this.index = 0;
    this.waitMs = 0;
    this.running = true;
    this.skippable = !!skippable;
    this.skipped = false;
    this.completed = false;
    this.context = context;
    this.input.setLocked?.(true);
    this.#advance();
    return this.snapshot();
  }

  update(dtMs = 0) {
    if (!this.running) return false;
    this.waitMs = Math.max(0, this.waitMs - Math.max(0, Number(dtMs) || 0));
    if (this.waitMs === 0) this.#advance();
    return this.running;
  }

  skip() {
    if (!this.running || !this.skippable) return false;
    this.skipped = true;
    this.context?.onSkip?.();
    this.#finish();
    return true;
  }

  #advance() {
    let safety = 100;
    while (this.running && this.waitMs === 0 && safety > 0) {
      if (this.index >= this.steps.length) {
        this.#finish();
        break;
      }
      safety -= 1;
      const step = this.steps[this.index++] || {};
      try {
        step.run?.(this.context);
      } catch (error) {
        this.logger.error?.('Cutscene step failed', error);
        this.#finish();
        throw error;
      }
      const wait = Math.max(0, Number(step.waitMs || 0));
      if (wait > 0) this.waitMs = wait;
    }

    if (this.running && this.waitMs === 0 && this.index >= this.steps.length) {
      this.#finish();
      return;
    }

    if (this.running && this.waitMs === 0 && safety === 0 && this.index < this.steps.length) {
      this.logger.error?.('Cutscene runaway detected');
      this.#finish();
      throw new Error('Cutscene runaway detected');
    }
  }

  #finish() {
    if (!this.running) return;
    this.running = false;
    this.completed = true;
    this.waitMs = 0;
    this.input.setLocked?.(false);
    this.context?.onComplete?.({ skipped: this.skipped });
  }

  snapshot() {
    return {
      running: this.running,
      completed: this.completed,
      skipped: this.skipped,
      skippable: this.skippable,
      index: this.index,
      waitMs: this.waitMs
    };
  }
}
