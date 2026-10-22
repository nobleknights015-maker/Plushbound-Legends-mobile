export class ModuleRegistry {
  constructor({ services = {}, commands = null, logger = console } = {}) {
    this.services = new Map(Object.entries(services));
    this.commands = commands;
    this.logger = logger;
    this.modules = new Map();
    this.enabled = new Set();
    this.hooks = new Map();
  }

  register(module) {
    if (!module?.id) throw new Error('Module requires an id');
    const id = String(module.id);
    if (this.modules.has(id)) throw new Error(`Module already registered: ${id}`);
    const normalized = {
      id,
      version: String(module.version ?? '0.0.0'),
      requires: (module.requires || []).map(String),
      optional: (module.optional || []).map(String),
      setup: typeof module.setup === 'function' ? module.setup : null,
      teardown: typeof module.teardown === 'function' ? module.teardown : null,
      hooks: module.hooks || {}
    };
    this.modules.set(id, normalized);
    return normalized;
  }

  has(id) { return this.modules.has(String(id)); }
  isEnabled(id) { return this.enabled.has(String(id)); }

  provide(name, service) {
    const key = String(name);
    if (this.services.has(key)) throw new Error(`Service already registered: ${key}`);
    this.services.set(key, service);
    return service;
  }

  replaceService(name, service) {
    this.services.set(String(name), service);
    return service;
  }

  service(name) {
    const key = String(name);
    if (!this.services.has(key)) throw new Error(`Missing service: ${key}`);
    return this.services.get(key);
  }

  enable(id) {
    const key = String(id);
    if (this.enabled.has(key)) return false;
    const order = this.#resolveEnableOrder(key);
    for (const moduleId of order) {
      if (this.enabled.has(moduleId)) continue;
      const module = this.modules.get(moduleId);
      this.#installHooks(module);
      try {
        module.setup?.(this.#context(module));
        this.enabled.add(moduleId);
      } catch (error) {
        this.#removeHooks(module);
        throw error;
      }
    }
    return true;
  }

  disable(id) {
    const key = String(id);
    if (!this.enabled.has(key)) return false;
    const dependents = [...this.enabled].filter(other => this.modules.get(other)?.requires.includes(key));
    if (dependents.length) throw new Error(`Cannot disable ${key}; required by ${dependents.join(', ')}`);
    const module = this.modules.get(key);
    module.teardown?.(this.#context(module));
    this.#removeHooks(module);
    this.enabled.delete(key);
    return true;
  }

  emit(hookName, payload) {
    const handlers = this.hooks.get(String(hookName)) || [];
    const results = [];
    for (const entry of handlers) {
      if (!this.enabled.has(entry.moduleId)) continue;
      results.push(entry.handler(payload, this.#context(this.modules.get(entry.moduleId))));
    }
    return results;
  }

  registerCommand(code, handler) {
    if (!this.commands?.register) throw new Error('No event command registry attached');
    this.commands.register(code, handler);
    return handler;
  }

  snapshot() {
    return {
      modules: [...this.modules.values()].map(m => ({ id: m.id, version: m.version, requires: [...m.requires], optional: [...m.optional] })),
      enabled: [...this.enabled]
    };
  }

  #resolveEnableOrder(id, visiting = new Set(), resolved = []) {
    const module = this.modules.get(id);
    if (!module) throw new Error(`Missing module: ${id}`);
    if (visiting.has(id)) throw new Error(`Module dependency cycle detected at ${id}`);
    visiting.add(id);
    for (const dependency of module.requires) {
      if (!this.modules.has(dependency)) throw new Error(`Module ${id} requires missing module ${dependency}`);
      if (!this.enabled.has(dependency) && !resolved.includes(dependency)) this.#resolveEnableOrder(dependency, visiting, resolved);
    }
    visiting.delete(id);
    if (!resolved.includes(id)) resolved.push(id);
    return resolved;
  }

  #installHooks(module) {
    for (const [name, handler] of Object.entries(module.hooks || {})) {
      if (typeof handler !== 'function') continue;
      const list = this.hooks.get(name) || [];
      list.push({ moduleId: module.id, handler });
      this.hooks.set(name, list);
    }
  }

  #removeHooks(module) {
    for (const name of Object.keys(module.hooks || {})) {
      const list = (this.hooks.get(name) || []).filter(x => x.moduleId !== module.id);
      if (list.length) this.hooks.set(name, list); else this.hooks.delete(name);
    }
  }

  #context(module) {
    return {
      module,
      services: this.services,
      service: name => this.service(name),
      provide: (name, service) => this.provide(name, service),
      replaceService: (name, service) => this.replaceService(name, service),
      registerCommand: (code, handler) => this.registerCommand(code, handler),
      emit: (name, payload) => this.emit(name, payload),
      logger: this.logger
    };
  }
}
