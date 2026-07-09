/* Canvas annotation editor for lesson builder */

const DEFAULT_COLOR = "#e53935";

const RAINBOW_COLORS = [
  "#e53935",
  "#ff6f00",
  "#fdd835",
  "#43a047",
  "#00897b",
  "#1e88e5",
  "#3949ab",
  "#8e24aa",
  "#d81b60",
  "#17202a",
  "#ffffff",
];

const HANDLE_RADIUS = 12;

function annotationId() {
  return `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nextAnnotationLabel(annotations) {
  let max = 0;
  for (const item of annotations || []) {
    const num = Number.parseInt(String(item?.label ?? ""), 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return String(max + 1);
}

function allocateAnnotationLabel(annotations, hooks) {
  if (typeof hooks.getNextLabel === "function") {
    return hooks.getNextLabel();
  }
  return nextAnnotationLabel(annotations);
}

function labelCenter(item) {
  if (item.type === "rect") {
    return { x: item.x + item.w / 2, y: item.y + item.h / 2 };
  }
  if (item.type === "circle") {
    return { x: item.cx, y: item.cy };
  }
  return null;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointNearSegment(p, a, b, tolerance = 10) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (!len2) return dist(p, a) <= tolerance;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return dist(p, proj) <= tolerance;
}

function textMetrics(ctx, item) {
  ctx.font = `700 ${item.size || 22}px Segoe UI`;
  const text = item.text || "";
  const width = ctx.measureText(text).width;
  const height = (item.size || 22) + 14;
  return { width, height };
}

function annotationBounds(ctx, item) {
  if (item.type === "rect") {
    return { x: item.x, y: item.y, w: item.w, h: item.h };
  }
  if (item.type === "circle") {
    return { x: item.cx - item.r, y: item.cy - item.r, w: item.r * 2, h: item.r * 2 };
  }
  if (item.type === "arrow") {
    const x = Math.min(item.x1, item.x2);
    const y = Math.min(item.y1, item.y2);
    return { x, y, w: Math.abs(item.x2 - item.x1) || 1, h: Math.abs(item.y2 - item.y1) || 1 };
  }
  if (item.type === "text" || item.type === "callout") {
    const m = textMetrics(ctx, item);
    const pad = 8;
    return { x: item.tx - pad, y: item.ty - pad, w: m.width + pad * 2, h: m.height + pad * 2 };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

function calloutLineStart(item) {
  const b = { x: item.tx, y: item.ty, w: 0, h: 0 };
  const ctx = document.createElement("canvas").getContext("2d");
  const m = textMetrics(ctx, item);
  const pad = 8;
  const boxW = m.width + pad * 2;
  const boxH = (item.size || 22) + pad * 2;
  const cx = item.tx - pad + boxW / 2;
  const cy = item.ty - pad + boxH;
  return { x: cx, y: cy };
}

function hitTest(ctx, annotations, point) {
  for (let i = annotations.length - 1; i >= 0; i -= 1) {
    const item = annotations[i];
    if (item.type === "rect") {
      const pad = 8;
      if (
        point.x >= item.x - pad &&
        point.x <= item.x + item.w + pad &&
        point.y >= item.y - pad &&
        point.y <= item.y + item.h + pad
      ) {
        return item;
      }
    } else if (item.type === "circle") {
      if (Math.abs(dist(point, { x: item.cx, y: item.cy }) - item.r) <= 12 || dist(point, { x: item.cx, y: item.cy }) <= item.r) {
        return item;
      }
    } else if (item.type === "arrow") {
      if (pointNearSegment(point, { x: item.x1, y: item.y1 }, { x: item.x2, y: item.y2 }, 14)) return item;
    } else if (item.type === "text") {
      const b = annotationBounds(ctx, item);
      if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) return item;
    } else if (item.type === "callout") {
      const b = annotationBounds(ctx, item);
      if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) return item;
      if (dist(point, { x: item.ax, y: item.ay }) <= HANDLE_RADIUS) return item;
      const lineStart = calloutLineStart(item);
      if (pointNearSegment(point, lineStart, { x: item.ax, y: item.ay }, 12)) return item;
    }
  }
  return null;
}

function getHandle(item, point) {
  if (item.type === "rect") {
    const corners = [
      { name: "nw", x: item.x, y: item.y },
      { name: "ne", x: item.x + item.w, y: item.y },
      { name: "sw", x: item.x, y: item.y + item.h },
      { name: "se", x: item.x + item.w, y: item.y + item.h },
    ];
    for (const corner of corners) {
      if (dist(point, corner) <= HANDLE_RADIUS) return corner.name;
    }
    return null;
  }
  if (item.type === "circle") {
    const edge = { x: item.cx + item.r, y: item.cy };
    if (dist(point, edge) <= HANDLE_RADIUS) return "resize";
  }
  if (item.type === "arrow") {
    if (dist(point, { x: item.x1, y: item.y1 }) <= HANDLE_RADIUS) return "start";
    if (dist(point, { x: item.x2, y: item.y2 }) <= HANDLE_RADIUS) return "end";
  }
  if (item.type === "callout") {
    if (dist(point, { x: item.ax, y: item.ay }) <= HANDLE_RADIUS) return "anchor";
    const b = annotationBounds(document.createElement("canvas").getContext("2d"), item);
    if (point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h) return "text";
  }
  return null;
}

function drawArrow(ctx, x1, y1, x2, y2, color, stroke) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = stroke;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 16;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.45), y2 - head * Math.sin(angle - 0.45));
  ctx.lineTo(x2 - head * Math.cos(angle + 0.45), y2 - head * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

function drawHandle(ctx, x, y, color = "#ff6f00") {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawLabelBadge(ctx, item, color, pulse = 0) {
  const label = item.label;
  if (!label) return;
  const center = labelCenter(item);
  if (!center) return;

  const baseSize = Math.max(18, Math.min(28, (item.r || Math.min(item.w, item.h) / 3 || 24) * 0.45));
  const size = baseSize + pulse * 6;
  const radius = size * 0.72 + pulse * 4;

  ctx.save();
  if (pulse > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 + pulse * 18;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${size}px Segoe UI`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(label), center.x, center.y + 1);
  ctx.restore();
}

function drawTextBox(ctx, x, y, text, color, size, preview = false) {
  ctx.font = `700 ${size}px Segoe UI`;
  const metrics = ctx.measureText(text);
  const pad = 8;
  const boxW = metrics.width + pad * 2;
  const boxH = size + pad * 2;
  if (preview) ctx.setLineDash([6, 4]);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.fillRect(x - pad, y - pad, boxW, boxH);
  ctx.strokeRect(x - pad, y - pad, boxW, boxH);
  ctx.setLineDash([]);
  ctx.fillStyle = "#17202a";
  ctx.fillText(text, x, y + size - 4);
}

function drawAnnotation(ctx, item, preview = false, selected = false, pulse = 0) {
  const color = item.color || DEFAULT_COLOR;
  const stroke = (item.stroke || 4) + pulse * 3;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = stroke;
  if (preview) ctx.setLineDash([8, 6]);

  if (pulse > 0) {
    const b = annotationBounds(ctx, item);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25 + pulse * 0.35;
    ctx.lineWidth = 4 + pulse * 10;
    ctx.strokeRect(b.x - 6 - pulse * 8, b.y - 6 - pulse * 8, b.w + 12 + pulse * 16, b.h + 12 + pulse * 16);
    ctx.restore();
  }

  if (item.type === "rect") {
    ctx.strokeRect(item.x, item.y, item.w, item.h);
    if (!preview) drawLabelBadge(ctx, item, color, pulse);
  } else if (item.type === "circle") {
    ctx.beginPath();
    ctx.arc(item.cx, item.cy, item.r, 0, Math.PI * 2);
    ctx.stroke();
    if (!preview) drawLabelBadge(ctx, item, color, pulse);
  } else if (item.type === "arrow") {
    drawArrow(ctx, item.x1, item.y1, item.x2, item.y2, color, stroke);
  } else if (item.type === "text") {
    drawTextBox(ctx, item.tx, item.ty, item.text || "", color, item.size || 22, preview);
  } else if (item.type === "callout") {
    const lineStart = calloutLineStart(item);
    ctx.beginPath();
    ctx.moveTo(lineStart.x, lineStart.y);
    ctx.lineTo(item.ax, item.ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(item.ax, item.ay, 6, 0, Math.PI * 2);
    ctx.fill();
    drawTextBox(ctx, item.tx, item.ty, item.text || "", color, item.size || 22, preview);
  }

  if (selected) {
    const b = annotationBounds(ctx, item);
    ctx.setLineDash([]);
    ctx.strokeStyle = "#ff6f00";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);

    if (item.type === "rect") {
      [
        [item.x, item.y],
        [item.x + item.w, item.y],
        [item.x, item.y + item.h],
        [item.x + item.w, item.y + item.h],
      ].forEach(([hx, hy]) => drawHandle(ctx, hx, hy));
    } else if (item.type === "circle") {
      drawHandle(ctx, item.cx + item.r, item.cy);
    } else if (item.type === "arrow") {
      drawHandle(ctx, item.x1, item.y1);
      drawHandle(ctx, item.x2, item.y2);
    } else if (item.type === "callout") {
      drawHandle(ctx, item.ax, item.ay, "#1e88e5");
      const b2 = annotationBounds(ctx, item);
      drawHandle(ctx, b2.x + b2.w / 2, b2.y + b2.h / 2);
    }
  }
  ctx.restore();
}

function createCanvasEditor(canvas, paletteEl, onChange, hooks = {}) {
  const ctx = canvas.getContext("2d");
  const state = {
    tool: "select",
    color: DEFAULT_COLOR,
    stroke: 4,
    annotations: [],
    selectedId: null,
    hoveredId: null,
    pulseId: null,
    pulsePhase: 0,
    drawing: false,
    start: null,
    preview: null,
    drag: null,
    lastPoint: null,
    pointerDown: false,
  };

  function notifySelection() {
    hooks.onSelectionChange?.(state.selectedId);
  }

  function selectItem(item) {
    state.selectedId = item?.id || null;
    notifySelection();
    redraw(window.__canvasBgImage || null);
  }

  function setAnnotations(items) {
    const prev = state.selectedId;
    state.annotations = (items || []).map((item) => ({ ...item, id: item.id || annotationId() }));
    state.selectedId = prev && state.annotations.some((item) => item.id === prev) ? prev : null;
    redraw();
    notifySelection();
  }

  function getAnnotations() {
    return state.annotations.map((item) => ({ ...item }));
  }

  function selected() {
    return state.annotations.find((item) => item.id === state.selectedId) || null;
  }

  function paintCanvas(bgImage = null) {
    const bg = bgImage ?? window.__canvasBgImage ?? null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bg) ctx.drawImage(bg, 0, 0);
    state.annotations.forEach((item) => {
      const isSelected = item.id === state.selectedId;
      const isHovered = item.id === state.hoveredId && !isSelected;
      const pulse = item.id === state.pulseId ? state.pulsePhase : 0;
      drawAnnotation(ctx, item, false, isSelected, pulse);
      if (isHovered) {
        const b = annotationBounds(ctx, item);
        ctx.save();
        ctx.strokeStyle = "rgba(30, 136, 229, 0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
        ctx.restore();
      }
    });
    if (state.preview) drawAnnotation(ctx, state.preview, true, false);
  }

  let paletteReady = false;
  let paintQueued = false;

  function ensurePalette() {
    if (!paletteEl || paletteReady) return;
    paletteEl.innerHTML = RAINBOW_COLORS.map(
      (color) =>
        `<button type="button" class="color-swatch" data-color="${color}" style="background:${color}" title="${color}"></button>`
    ).join("");
    paletteEl.addEventListener("click", (event) => {
      const button = event.target.closest(".color-swatch");
      if (!button) return;
      event.stopPropagation();
      const color = button.dataset.color;
      state.color = color;
      const current = selected();
      if (current) {
        current.color = color;
        onChange(getAnnotations());
        syncPaletteActive();
        schedulePaint();
      }
    });
    paletteReady = true;
  }

  function syncPaletteActive() {
    ensurePalette();
    if (!paletteEl) return;
    const item = selected();
    paletteEl.querySelectorAll(".color-swatch").forEach((button) => {
      button.classList.toggle("is-active", item?.color === button.dataset.color);
    });
  }

  function schedulePaint(bgImage = null) {
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(() => {
      paintQueued = false;
      paintCanvas(bgImage);
    });
  }

  function redraw(bgImage = null) {
    paintCanvas(bgImage);
    syncPaletteActive();
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  function finishChange() {
    onChange(getAnnotations());
    schedulePaint();
    syncPaletteActive();
  }

  function commitCreated(item) {
    state.annotations.push(item);
    state.preview = null;
    state.drawing = false;
    state.start = null;
    state.pointerDown = false;
    state.selectedId = item.id;
    notifySelection();
    onChange(getAnnotations());
    schedulePaint();
    syncPaletteActive();
    hooks.onLabelsChange?.(getAnnotations());
  }

  function trySelectAt(point, preferHandle = true) {
    const item = hitTest(ctx, state.annotations, point);
    if (!item) {
      state.selectedId = null;
      notifySelection();
      redraw(window.__canvasBgImage || null);
      return null;
    }
    state.selectedId = item.id;
    const handle = preferHandle ? getHandle(item, point) : null;
    state.drag = { mode: handle || "move", item, start: point, origin: JSON.parse(JSON.stringify(item)) };
    notifySelection();
    redraw(window.__canvasBgImage || null);
    return item;
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    const point = canvasPoint(event);
    state.lastPoint = point;
    state.pointerDown = true;

    const hit = hitTest(ctx, state.annotations, point);
    const handle = hit ? getHandle(hit, point) : null;

    if (hit && (state.tool === "select" || handle || event.shiftKey)) {
      trySelectAt(point, true);
      return;
    }

    if (hit && state.tool !== "select") {
      trySelectAt(point, true);
      return;
    }

    if (state.tool === "select") {
      trySelectAt(point, true);
      return;
    }

    if (state.tool === "text") {
      const text = prompt("Текст:", "Нажать здесь");
      if (!text) return;
      commitCreated({
        id: annotationId(),
        type: "text",
        tx: point.x,
        ty: point.y,
        text,
        color: state.color,
        size: 22,
        stroke: state.stroke,
      });
      return;
    }

    if (state.tool === "callout") {
      state.drawing = true;
      state.start = point;
      state.preview = {
        type: "callout",
        tx: point.x,
        ty: point.y,
        ax: point.x,
        ay: point.y,
        text: "Сноска",
        color: state.color,
        size: 22,
        stroke: state.stroke,
      };
      redraw(window.__canvasBgImage || null);
      return;
    }

    state.drawing = true;
    state.start = point;
    state.preview = null;
  }

  function onPointerMove(event) {
    const point = canvasPoint(event);
    state.lastPoint = point;

    if (state.drag) {
      const { mode, item, start, origin } = state.drag;
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      if (mode === "move") {
        if (origin.type === "rect") {
          item.x = origin.x + dx;
          item.y = origin.y + dy;
        } else if (origin.type === "circle") {
          item.cx = origin.cx + dx;
          item.cy = origin.cy + dy;
        } else if (origin.type === "arrow") {
          item.x1 = origin.x1 + dx;
          item.y1 = origin.y1 + dy;
          item.x2 = origin.x2 + dx;
          item.y2 = origin.y2 + dy;
        } else if (origin.type === "text") {
          item.tx = origin.tx + dx;
          item.ty = origin.ty + dy;
        } else if (origin.type === "callout") {
          item.tx = origin.tx + dx;
          item.ty = origin.ty + dy;
          item.ax = origin.ax + dx;
          item.ay = origin.ay + dy;
        }
      } else if (origin.type === "rect" && ["nw", "ne", "sw", "se"].includes(mode)) {
        let x1 = origin.x;
        let y1 = origin.y;
        let x2 = origin.x + origin.w;
        let y2 = origin.y + origin.h;
        if (mode.includes("n")) y1 = origin.y + dy;
        if (mode.includes("s")) y2 = origin.y + origin.h + dy;
        if (mode.includes("w")) x1 = origin.x + dx;
        if (mode.includes("e")) x2 = origin.x + origin.w + dx;
        item.x = Math.min(x1, x2);
        item.y = Math.min(y1, y2);
        item.w = Math.abs(x2 - x1);
        item.h = Math.abs(y2 - y1);
      } else if (origin.type === "circle" && mode === "resize") {
        item.r = Math.max(8, dist(point, { x: origin.cx, y: origin.cy }));
      } else if (origin.type === "arrow") {
        if (mode === "start") {
          item.x1 = point.x;
          item.y1 = point.y;
        } else if (mode === "end") {
          item.x2 = point.x;
          item.y2 = point.y;
        }
      } else if (origin.type === "callout") {
        if (mode === "anchor") {
          item.ax = point.x;
          item.ay = point.y;
        } else if (mode === "text") {
          item.tx = point.x;
          item.ty = point.y;
        }
      }
      schedulePaint();
      return;
    }

    if (!state.drawing || !state.start) {
      const hover = hitTest(ctx, state.annotations, point);
      const hoverId = hover?.id || null;
      if (hoverId !== state.hoveredId) {
        state.hoveredId = hoverId;
        canvas.style.cursor = hoverId ? "pointer" : state.tool === "select" ? "default" : "crosshair";
        schedulePaint();
      }
      return;
    }

    const start = state.start;
    if (state.tool === "arrow") {
      state.preview = { type: "arrow", x1: start.x, y1: start.y, x2: point.x, y2: point.y, color: state.color, stroke: state.stroke };
    } else if (state.tool === "rect") {
      state.preview = {
        type: "rect",
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        w: Math.abs(point.x - start.x),
        h: Math.abs(point.y - start.y),
        color: state.color,
        stroke: state.stroke,
      };
    } else if (state.tool === "circle") {
      state.preview = {
        type: "circle",
        cx: start.x,
        cy: start.y,
        r: Math.hypot(point.x - start.x, point.y - start.y),
        color: state.color,
        stroke: state.stroke,
      };
    } else if (state.tool === "callout" && state.preview) {
      state.preview.ax = point.x;
      state.preview.ay = point.y;
    }
    schedulePaint();
  }

  function onPointerUp(event) {
    if (!state.pointerDown && !state.drawing && !state.drag) return;

    const point = canvasPoint(event);

    if (state.drag) {
      state.drag = null;
      state.pointerDown = false;
      finishChange();
      return;
    }

    if (!state.drawing || !state.start) {
      state.pointerDown = false;
      return;
    }

    const start = state.start;

    if (state.tool === "arrow" && (Math.abs(point.x - start.x) > 6 || Math.abs(point.y - start.y) > 6)) {
      commitCreated({
        id: annotationId(),
        type: "arrow",
        x1: start.x,
        y1: start.y,
        x2: point.x,
        y2: point.y,
        color: state.color,
        stroke: state.stroke,
      });
      return;
    }

    if (state.tool === "rect" && (Math.abs(point.x - start.x) > 6 || Math.abs(point.y - start.y) > 6)) {
      commitCreated({
        id: annotationId(),
        type: "rect",
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        w: Math.abs(point.x - start.x),
        h: Math.abs(point.y - start.y),
        color: state.color,
        stroke: state.stroke,
        label: allocateAnnotationLabel(state.annotations, hooks),
      });
      return;
    }

    if (state.tool === "circle" && Math.hypot(point.x - start.x, point.y - start.y) > 6) {
      commitCreated({
        id: annotationId(),
        type: "circle",
        cx: start.x,
        cy: start.y,
        r: Math.hypot(point.x - start.x, point.y - start.y),
        color: state.color,
        stroke: state.stroke,
        label: allocateAnnotationLabel(state.annotations, hooks),
      });
      return;
    }

    if (state.tool === "callout" && state.preview) {
      const text = prompt("Текст сноски:", state.preview.text);
      if (text === null) {
        state.preview = null;
        state.drawing = false;
        state.start = null;
        state.pointerDown = false;
        redraw(window.__canvasBgImage || null);
        return;
      }
      commitCreated({
        id: annotationId(),
        type: "callout",
        tx: state.preview.tx,
        ty: state.preview.ty,
        ax: point.x,
        ay: point.y,
        text: text.trim() || "Сноска",
        color: state.color,
        size: 22,
        stroke: state.stroke,
      });
      return;
    }

    state.drawing = false;
    state.start = null;
    state.preview = null;
    state.pointerDown = false;
    redraw(window.__canvasBgImage || null);
  }

  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("mouseup", onPointerUp);
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("mousemove", (event) => {
    if (state.drag || state.drawing) onPointerMove(event);
  });

  canvas.addEventListener("dblclick", (event) => {
    const point = canvasPoint(event);
    const item = hitTest(ctx, state.annotations, point);
    if (!item) return;
    if (item.type === "text" || item.type === "callout") {
      const next = prompt("Изменить текст:", item.text || "");
      if (next === null) return;
      item.text = next.trim() || item.text;
      selectItem(item);
      finishChange();
      return;
    }
    if (item.type === "rect" || item.type === "circle") {
      const next = prompt("Номер метки:", item.label || "");
      if (next === null) return;
      item.label = next.trim() || item.label;
      selectItem(item);
      finishChange();
      hooks.onLabelsChange?.(getAnnotations());
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!canvas.isConnected) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if ((event.key === "Delete" || event.key === "Backspace") && state.selectedId) {
      event.preventDefault();
      state.annotations = state.annotations.filter((item) => item.id !== state.selectedId);
      state.selectedId = null;
      notifySelection();
      finishChange();
    }
  });

  return {
    setTool(tool) {
      state.tool = tool;
      if (tool !== "select") {
        state.drag = null;
      }
      redraw(window.__canvasBgImage || null);
    },
    setColor(color) {
      state.color = color;
      const item = selected();
      if (item) {
        item.color = color;
        finishChange();
      }
    },
    setAnnotations,
    getAnnotations,
    redraw,
    deleteSelected() {
      let id = state.selectedId;
      if (!id && state.lastPoint) {
        const item = hitTest(ctx, state.annotations, state.lastPoint);
        id = item?.id;
      }
      if (!id) return false;
      state.annotations = state.annotations.filter((item) => item.id !== id);
      state.selectedId = null;
      notifySelection();
      finishChange();
      return true;
    },
    clearAll() {
      state.annotations = [];
      state.selectedId = null;
      notifySelection();
      finishChange();
    },
    undo() {
      state.annotations.pop();
      state.selectedId = null;
      notifySelection();
      finishChange();
    },
    getSelectedId: () => state.selectedId,
    selectAnnotation: (id) => {
      const item = state.annotations.find((entry) => entry.id === id);
      if (item) selectItem(item);
    },
    findByLabel(label) {
      const key = String(label || "").trim();
      if (!key) return null;
      return state.annotations.find((item) => String(item.label || "") === key) || null;
    },
    getLabeledAnnotations() {
      return state.annotations.filter((item) => item.label);
    },
    setPulse(id, phase = 0) {
      state.pulseId = id || null;
      state.pulsePhase = phase;
      schedulePaint();
    },
    colors: RAINBOW_COLORS,
  };
}

window.DEFAULT_ANNOTATION_COLOR = DEFAULT_COLOR;
window.nextAnnotationLabel = nextAnnotationLabel;
window.RAINBOW_COLORS = RAINBOW_COLORS;
window.createCanvasEditor = createCanvasEditor;
