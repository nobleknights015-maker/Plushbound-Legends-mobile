const DEFAULT_THEME = Object.freeze({
  padding: 18,
  margin: 4,
  lineHeight: 36,
  fontSize: 28,
  windowOpacity: 0.9,
  contentsOpacity: 1,
  cornerRadius: 10,
  cursorBlinkMs: 600,
  colors: Object.freeze({
    text: '#f4f1ea',
    disabled: '#8e9299',
    system: '#ffd37a',
    crisis: '#ff8e8e',
    gaugeBack: '#1e2430'
  })
});

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function clone(value) { return value == null ? value : structuredClone(value); }

export class ClassicWindowSystem {
  constructor({ viewportWidth = 1604, viewportHeight = 720, theme = {} } = {}) {
    this.viewportWidth = Math.max(320, Number(viewportWidth) || 1604);
    this.viewportHeight = Math.max(240, Number(viewportHeight) || 720);
    this.theme = { ...DEFAULT_THEME, ...theme, colors: { ...DEFAULT_THEME.colors, ...(theme.colors || {}) } };
  }

  setViewport(width, height) {
    this.viewportWidth = Math.max(320, Number(width) || this.viewportWidth);
    this.viewportHeight = Math.max(240, Number(height) || this.viewportHeight);
    return this;
  }

  fitRect(rect = {}) {
    const margin = this.theme.margin;
    const width = Math.min(Math.max(1, Number(rect.width) || 1), Math.max(1, this.viewportWidth - margin * 2));
    const height = Math.min(Math.max(1, Number(rect.height) || 1), Math.max(1, this.viewportHeight - margin * 2));
    const x = clamp(Number(rect.x) || 0, margin, Math.max(margin, this.viewportWidth - width - margin));
    const y = clamp(Number(rect.y) || 0, margin, Math.max(margin, this.viewportHeight - height - margin));
    return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
  }

  messageWindow({ lines = 4, faceWidth = 144, hasFace = false, name = null } = {}) {
    const h = this.theme.padding * 2 + this.theme.lineHeight * clamp(Math.floor(lines), 1, 6);
    const rect = { x: 0, y: this.viewportHeight - h, width: this.viewportWidth, height: h };
    const face = hasFace ? {
      x: rect.x + this.theme.padding,
      y: rect.y + this.theme.padding,
      width: faceWidth,
      height: Math.min(faceWidth, h - this.theme.padding * 2)
    } : null;
    const textLeft = rect.x + this.theme.padding + (face ? face.width + this.theme.padding : 0);
    return this.windowModel({
      id: 'message',
      rect,
      contents: { x: textLeft, y: rect.y + this.theme.padding, width: rect.x + rect.width - this.theme.padding - textLeft, height: h - this.theme.padding * 2 },
      face,
      name
    });
  }

  commandWindow({ id = 'command', commands = [], width = 360, x = 32, y = 32, maxRows = 8, index = 0, columns = 1 } = {}) {
    const cols = clamp(Math.floor(columns), 1, 4);
    const safeRowsByViewport = Math.max(1, Math.floor((this.viewportHeight - this.theme.margin * 2 - this.theme.padding * 2) / this.theme.lineHeight));
    const rowLimit = clamp(Math.floor(maxRows), 1, safeRowsByViewport);
    const capacity = Math.max(1, rowLimit * cols);
    const selectedIndex = clamp(Math.floor(Number(index) || 0), 0, Math.max(0, commands.length - 1));
    const page = Math.floor(selectedIndex / capacity);
    const pageCount = Math.max(1, Math.ceil(commands.length / capacity));
    const pageStart = page * capacity;
    const visibleCommands = commands.slice(pageStart, pageStart + capacity);
    const rows = Math.max(1, Math.min(rowLimit, Math.ceil(visibleCommands.length / cols) || 1));
    const height = this.theme.padding * 2 + rows * this.theme.lineHeight;
    const rect = this.fitRect({ x, y, width: Math.max(180, width), height });
    const items = visibleCommands.map((command, localIndex) => {
      const i = pageStart + localIndex;
      const row = Math.floor(localIndex / cols);
      const col = localIndex % cols;
      const innerWidth = rect.width - this.theme.padding * 2;
      const itemWidth = innerWidth / cols;
      return {
        id: String(command.id ?? i),
        text: String(command.text ?? command.label ?? command.id ?? ''),
        enabled: command.enabled !== false,
        selected: i === selectedIndex,
        index: i,
        rect: {
          x: rect.x + this.theme.padding + col * itemWidth,
          y: rect.y + this.theme.padding + row * this.theme.lineHeight,
          width: itemWidth,
          height: this.theme.lineHeight
        }
      };
    });
    return this.windowModel({
      id,
      rect,
      index: selectedIndex,
      items,
      columns: cols,
      pagination: {
        page,
        pageCount,
        pageStart,
        pageEnd: pageStart + items.length,
        capacity,
        hasPrevious: page > 0,
        hasNext: page + 1 < pageCount
      }
    });
  }

  choiceWindow({ choices = [], messageRect = null, width = 420, index = 0 } = {}) {
    const rows = Math.max(1, Math.min(choices.length || 1, 6));
    const height = this.theme.padding * 2 + rows * this.theme.lineHeight;
    const anchorY = messageRect?.y ?? this.viewportHeight;
    const y = Math.max(0, anchorY - height - this.theme.margin);
    const x = Math.max(0, this.viewportWidth - width - this.theme.margin);
    return this.commandWindow({
      id: 'choice',
      commands: choices.map((choice, i) => typeof choice === 'string' ? { id: i, text: choice } : choice),
      width,
      x,
      y,
      maxRows: 6,
      index
    });
  }

  helpWindow({ text = '', heightLines = 2 } = {}) {
    const height = this.theme.padding * 2 + clamp(Math.floor(heightLines), 1, 4) * this.theme.lineHeight;
    return this.windowModel({
      id: 'help',
      rect: { x: 0, y: 0, width: this.viewportWidth, height },
      text: String(text)
    });
  }

  windowModel({ id, rect, ...extra }) {
    const r = this.fitRect(rect);
    return {
      id: String(id ?? 'window'),
      rect: r,
      frame: {
        cornerRadius: this.theme.cornerRadius,
        opacity: this.theme.windowOpacity,
        skin: 'plushbound-classic',
        nineSlice: true
      },
      contentsOpacity: this.theme.contentsOpacity,
      padding: this.theme.padding,
      lineHeight: this.theme.lineHeight,
      fontSize: this.theme.fontSize,
      colors: clone(this.theme.colors),
      ...clone(extra)
    };
  }
}

export { DEFAULT_THEME as CLASSIC_WINDOW_THEME };
