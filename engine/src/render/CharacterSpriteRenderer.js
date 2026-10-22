const DIRECTION_ROW = Object.freeze({ 2: 0, 4: 1, 6: 2, 8: 3, down: 0, left: 1, right: 2, up: 3 });

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export class CharacterSpriteRenderer {
  constructor({ frameWidth = 48, frameHeight = 48, columns = 3, rows = 4, stepFrames = [0, 1, 2, 1], stepDurationMs = 150 } = {}) {
    this.frameWidth = Math.max(1, Number(frameWidth) || 48);
    this.frameHeight = Math.max(1, Number(frameHeight) || 48);
    this.columns = Math.max(1, Math.floor(Number(columns) || 3));
    this.rows = Math.max(1, Math.floor(Number(rows) || 4));
    this.stepFrames = [...stepFrames];
    this.stepDurationMs = Math.max(1, Number(stepDurationMs) || 150);
  }

  frameFor({ direction = 2, moving = false, elapsedMs = 0, pattern = null } = {}) {
    const row = clamp(DIRECTION_ROW[direction] ?? 0, 0, this.rows - 1);
    let column;
    if (pattern != null) column = clamp(Math.floor(Number(pattern) || 0), 0, this.columns - 1);
    else if (!moving) column = Math.min(1, this.columns - 1);
    else {
      const index = Math.floor(Math.max(0, Number(elapsedMs) || 0) / this.stepDurationMs) % this.stepFrames.length;
      column = clamp(this.stepFrames[index] ?? 1, 0, this.columns - 1);
    }
    return {
      column,
      row,
      sx: column * this.frameWidth,
      sy: row * this.frameHeight,
      sw: this.frameWidth,
      sh: this.frameHeight
    };
  }

  drawCommand({ id, assetId, worldX = 0, worldY = 0, direction = 2, moving = false, elapsedMs = 0, pattern = null, scale = 1, opacity = 1, z = null, mirror = false } = {}) {
    const frame = this.frameFor({ direction, moving, elapsedMs, pattern });
    const s = Math.max(0.1, Number(scale) || 1);
    const width = this.frameWidth * s;
    const height = this.frameHeight * s;
    return {
      kind: 'character-sprite',
      id: String(id ?? ''),
      assetId: String(assetId ?? ''),
      worldX: Number(worldX) || 0,
      worldY: Number(worldY) || 0,
      anchorX: 0.5,
      anchorY: 1,
      width,
      height,
      opacity: clamp(Number(opacity) || 0, 0, 1),
      mirror: !!mirror,
      z: z == null ? 1000 + (Number(worldY) || 0) : Number(z),
      frame
    };
  }
}
