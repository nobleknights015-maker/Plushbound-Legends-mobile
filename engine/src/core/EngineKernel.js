export class EngineKernel {
  constructor({ renderer, input, data, saves, audio, logger = console }) {
    this.services = new Map(Object.entries({ renderer, input, data, saves, audio, logger }));
    this.sceneStack = [];
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.stepMs = 1000 / 60;
    this.maxFrameMs = 250;
    this.boundFrame = (t) => this.#frame(t);
  }

  service(name) {
    if (!this.services.has(name)) throw new Error(`Missing engine service: ${name}`);
    return this.services.get(name);
  }

  registerService(name, service) {
    if (!name || !service) throw new Error('registerService requires name and service');
    this.services.set(name, service);
  }

  get scene() { return this.sceneStack.at(-1) || null; }

  async pushScene(scene, payload) {
    if (!scene) throw new Error('pushScene requires a scene');
    const current = this.scene;
    if (current?.pause) current.pause();
    this.sceneStack.push(scene);
    await scene.enter?.(payload, this);
    this.service('input').setContext?.(scene.inputContext || 'default');
  }

  async replaceScene(scene, payload) {
    if (this.scene) await this.popScene();
    await this.pushScene(scene, payload);
  }

  async popScene() {
    const current = this.sceneStack.pop();
    if (current) await current.exit?.(this);
    const next = this.scene;
    next?.resume?.();
    this.service('input').setContext?.(next?.inputContext || 'default');
    return current;
  }

  async boot(initialScene, payload) {
    if (this.running) return;
    await this.service('data').loadCore?.();
    await this.service('saves').initialize?.();
    await this.pushScene(initialScene, payload);
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.boundFrame);
  }

  stop() { this.running = false; }

  #frame(now) {
    if (!this.running) return;
    try {
      const elapsed = Math.min(this.maxFrameMs, Math.max(0, now - this.lastTime));
      this.lastTime = now;
      this.accumulator += elapsed;

      while (this.accumulator >= this.stepMs) {
        this.service('input').update?.();
        this.scene?.update?.(this.stepMs / 1000, this);
        this.accumulator -= this.stepMs;
      }

      const renderer = this.service('renderer');
      renderer.beginFrame?.();
      for (const scene of this.sceneStack) scene.render?.(renderer, this);
      renderer.endFrame?.();
    } catch (error) {
      this.running = false;
      this.service('logger').error('Fatal engine frame error', error);
      this.services.get('renderer')?.renderFatalError?.(error);
      throw error;
    }
    requestAnimationFrame(this.boundFrame);
  }
}
