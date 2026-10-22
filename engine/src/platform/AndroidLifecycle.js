export class AndroidLifecycle {
  constructor({ saves, audio, input, clock = () => Date.now(), logger = console } = {}) {
    this.saves = saves;
    this.audio = audio;
    this.input = input;
    this.clock = clock;
    this.logger = logger;
    this.state = 'active';
    this.lastBackgroundAt = null;
  }

  async onPause(gameState) {
    this.state = 'paused';
    this.lastBackgroundAt = this.clock();
    this.input?.clearAll?.();
    this.audio?.suspend?.();
    if (gameState && this.saves?.autosave) {
      await this.saves.autosave({ reason: 'android-pause' });
    }
  }

  onResume() {
    this.state = 'active';
    this.audio?.resume?.();
    this.input?.clearAll?.();
  }

  async onStop(gameState) {
    this.state = 'stopped';
    this.input?.clearAll?.();
    this.audio?.suspend?.();
    if (gameState && this.saves?.autosave) {
      await this.saves.autosave({ reason: 'android-stop' });
    }
  }

  onDestroy() {
    this.state = 'destroyed';
    this.input?.clearAll?.();
    this.audio?.stopAll?.();
  }
}
