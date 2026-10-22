const DEFAULT_TYPES = [
  'actors','classes','skills','items','weapons','armor','enemies','troops','states','animations','commonEvents','system'
];

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export class DataRegistry {
  constructor({ types = DEFAULT_TYPES } = {}) {
    this.schemas = new Map();
    this.tables = new Map();
    for (const type of types) this.tables.set(type, new Map());
  }

  registerSchema(type, validator) {
    if (typeof validator !== 'function') throw new Error('Schema validator must be a function');
    this.schemas.set(type, validator);
    if (!this.tables.has(type)) this.tables.set(type, new Map());
    return this;
  }

  hasType(type) { return this.tables.has(type); }

  upsert(type, record) {
    if (!this.tables.has(type)) throw new Error(`Unknown data type: ${type}`);
    if (!record || record.id == null) throw new Error(`Record for ${type} requires a stable id`);
    const validator = this.schemas.get(type);
    if (validator) {
      const result = validator(record);
      if (result === false) throw new Error(`Invalid ${type} record: ${record.id}`);
      if (typeof result === 'string') throw new Error(result);
    }
    const id = String(record.id);
    const normalized = Object.freeze(clone({ ...record, id }));
    this.tables.get(type).set(id, normalized);
    return normalized;
  }

  load(type, records = []) {
    if (!Array.isArray(records)) throw new Error(`Expected array for ${type}`);
    const seen = new Set();
    for (const record of records) {
      const id = String(record?.id);
      if (record?.id == null) throw new Error(`Record for ${type} requires a stable id`);
      if (seen.has(id)) throw new Error(`Duplicate ${type} id: ${id}`);
      seen.add(id);
    }
    const table = this.tables.get(type);
    if (!table) throw new Error(`Unknown data type: ${type}`);
    table.clear();
    for (const record of records) this.upsert(type, record);
    return this.all(type);
  }

  get(type, id) {
    const table = this.tables.get(type);
    if (!table) throw new Error(`Unknown data type: ${type}`);
    return table.get(String(id)) ?? null;
  }

  require(type, id) {
    const value = this.get(type, id);
    if (!value) throw new Error(`Missing ${type} record: ${id}`);
    return value;
  }

  all(type) {
    const table = this.tables.get(type);
    if (!table) throw new Error(`Unknown data type: ${type}`);
    return [...table.values()];
  }

  remove(type, id) {
    const table = this.tables.get(type);
    if (!table) throw new Error(`Unknown data type: ${type}`);
    return table.delete(String(id));
  }

  validateReferences() {
    const errors = [];
    const skillIds = new Set(this.all('skills').map(x => x.id));
    const itemIds = new Set(this.all('items').map(x => x.id));
    const enemyIds = new Set(this.all('enemies').map(x => x.id));
    const stateIds = new Set(this.all('states').map(x => x.id));

    for (const actor of this.all('actors')) {
      for (const skillId of actor.skills || []) if (!skillIds.has(String(skillId))) errors.push(`Actor ${actor.id} missing skill ${skillId}`);
      for (const stateId of actor.states || []) if (!stateIds.has(String(stateId))) errors.push(`Actor ${actor.id} missing state ${stateId}`);
    }
    for (const troop of this.all('troops')) {
      for (const member of troop.members || []) if (!enemyIds.has(String(member.enemyId))) errors.push(`Troop ${troop.id} missing enemy ${member.enemyId}`);
    }
    for (const skill of this.all('skills')) {
      if (skill.consumeItemId != null && !itemIds.has(String(skill.consumeItemId))) errors.push(`Skill ${skill.id} missing item ${skill.consumeItemId}`);
      for (const stateId of skill.addStates || []) if (!stateIds.has(String(stateId))) errors.push(`Skill ${skill.id} missing state ${stateId}`);
    }
    return errors;
  }

  snapshot() {
    const result = {};
    for (const [type, table] of this.tables) result[type] = [...table.values()].map(clone);
    return result;
  }
}

export const DataTypes = Object.freeze([...DEFAULT_TYPES]);
