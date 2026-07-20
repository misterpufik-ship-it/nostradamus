const SITE_LOCAL_URL = "http://127.0.0.1:8000/site/";
const SITE_ONLINE_URL = "https://nostradamus-1503.ru/obuchenie/";

function appRoot() {
  const { pathname } = window.location;
  for (const marker of ["/obuchenie/builder", "/x-active-builder"]) {
    const index = pathname.indexOf(marker);
    if (index >= 0) return marker;
  }
  return "";
}

function appUrl(path) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${appRoot()}${suffix}`;
}

function siteHomeUrl() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? SITE_LOCAL_URL
    : SITE_ONLINE_URL;
}

function stepId() {
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function frameId() {
  return `frame-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const state = {
  projects: [],
  project: null,
  selectedStepId: null,
  selectedFrameId: null,
  pollTimer: null,
  activeColor: "#e53935",
  whisperModels: [],
  workspace: "lessons",
  regulations: [],
  selectedRegulationId: null,
  packaging: [],
  selectedPackagingId: null,
  packagingImages: [],
  packagingArticles: [""],
  packagingBarcodes: [""],
  packagingTypes: [],
  users: [],
  selectedUserLogin: null,
  isNewUser: false,
  user: null,
};

const nodes = {
  projectList: document.querySelector("#project-list"),
  emptyState: document.querySelector("#empty-state"),
  editor: document.querySelector("#editor"),
  projectTopic: document.querySelector("#project-topic"),
  projectTitle: document.querySelector("#project-title"),
  fieldTopic: document.querySelector("#field-topic"),
  fieldRole: document.querySelector("#field-role"),
  fieldDuration: document.querySelector("#field-duration"),
  fieldDescription: document.querySelector("#field-description"),
  fieldVideoNote: document.querySelector("#field-video-note"),
  fieldKeywords: document.querySelector("#field-keywords"),
  fieldChecklist: document.querySelector("#field-checklist"),
  fieldIssues: document.querySelector("#field-issues"),
  fieldRegulationIds: document.querySelector("#field-regulation-ids"),
  fieldWhisperModel: document.querySelector("#field-whisper-model"),
  whisperHint: document.querySelector("#whisper-hint"),
  recleanTranscript: document.querySelector("#reclean-transcript"),
  projectStatus: document.querySelector("#project-status"),
  statusMessage: document.querySelector("#status-message"),
  stepsCount: document.querySelector("#steps-count"),
  stepsList: document.querySelector("#steps-list"),
  stepEditorTitle: document.querySelector("#step-editor-title"),
  stepTitle: document.querySelector("#step-title"),
  stepWhy: document.querySelector("#step-why"),
  stepAction: document.querySelector("#step-action"),
  stepActionMarkers: document.querySelector("#step-action-markers"),
  actionField: document.querySelector("#action-field"),
  stepComment: document.querySelector("#step-comment"),
  stepResult: document.querySelector("#step-result"),
  frameSelect: document.querySelector("#frame-select"),
  framePickerRow: document.querySelector("#frame-picker-row"),
  stepFramesStrip: document.querySelector("#step-frames-strip"),
  canvas: document.querySelector("#annotation-canvas"),
  colorToolbar: document.querySelector("#color-toolbar"),
  colorPalette: document.querySelector("#color-palette"),
  paletteRow: document.querySelector("#palette-row"),
  snippetDialog: document.querySelector("#snippet-dialog"),
  snippetOutput: document.querySelector("#snippet-output"),
  appShell: document.querySelector("#app-shell"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  sidebarRestore: document.querySelector("#sidebar-restore"),
  annotationDock: document.querySelector("#annotation-dock"),
  canvasWrap: document.querySelector("#canvas-wrap"),
  canvasExpand: document.querySelector("#canvas-expand"),
  canvasPlaceholder: document.querySelector("#canvas-placeholder"),
  canvasLightbox: document.querySelector("#canvas-lightbox"),
  canvasLightboxInner: document.querySelector("#canvas-lightbox-inner"),
  canvasLightboxClose: document.querySelector("#canvas-lightbox-close"),
  canvasPlaceholderClose: document.querySelector("#canvas-placeholder-close"),
  publishButton: document.querySelector("#publish-project"),
  unpublishButton: document.querySelector("#unpublish-project"),
  formatBoldBubble: document.querySelector("#rich-format-bubble"),
  formatBoldBtn: document.querySelector("#format-bold-btn"),
  formatNormalBtn: document.querySelector("#format-normal-btn"),
  regulationsWorkspace: document.querySelector("#regulations-workspace"),
  regulationsList: document.querySelector("#regulations-list"),
  regulationsCount: document.querySelector("#regulations-count"),
  regulationId: document.querySelector("#regulation-id"),
  regulationTitle: document.querySelector("#regulation-title"),
  regulationUrl: document.querySelector("#regulation-url"),
  regulationText: document.querySelector("#regulation-text"),
  regulationStatus: document.querySelector("#regulation-status"),
  newRegulation: document.querySelector("#new-regulation"),
  saveRegulation: document.querySelector("#save-regulation"),
  deleteRegulation: document.querySelector("#delete-regulation"),
  publishRegulation: document.querySelector("#publish-regulation"),
  unpublishRegulation: document.querySelector("#unpublish-regulation"),
  packagingWorkspace: document.querySelector("#packaging-workspace"),
  packagingList: document.querySelector("#packaging-list"),
  packagingCount: document.querySelector("#packaging-count"),
  packagingId: document.querySelector("#packaging-id"),
  packagingName: document.querySelector("#packaging-name"),
  packagingType: document.querySelector("#packaging-type"),
  packagingArticlesList: document.querySelector("#packaging-articles-list"),
  packagingBarcodesList: document.querySelector("#packaging-barcodes-list"),
  packagingTypesList: document.querySelector("#packaging-types-list"),
  packagingAddArticle: document.querySelector("#packaging-add-article"),
  packagingAddBarcode: document.querySelector("#packaging-add-barcode"),
  packagingAddType: document.querySelector("#packaging-add-type"),
  packagingSaveTypes: document.querySelector("#packaging-save-types"),
  packagingText: document.querySelector("#packaging-text"),
  packagingStatus: document.querySelector("#packaging-status"),
  packagingPhotoGrid: document.querySelector("#packaging-photo-grid"),
  packagingPhotoInput: document.querySelector("#packaging-photo-input"),
  packagingAddPhoto: document.querySelector("#packaging-add-photo"),
  newPackaging: document.querySelector("#new-packaging"),
  savePackaging: document.querySelector("#save-packaging"),
  deletePackaging: document.querySelector("#delete-packaging"),
  publishPackaging: document.querySelector("#publish-packaging"),
  unpublishPackaging: document.querySelector("#unpublish-packaging"),
  usersWorkspace: document.querySelector("#users-workspace"),
  usersList: document.querySelector("#users-list"),
  usersCount: document.querySelector("#users-count"),
  userLogin: document.querySelector("#user-login"),
  userDisplayName: document.querySelector("#user-display-name"),
  userRole: document.querySelector("#user-role"),
  userPassword: document.querySelector("#user-password"),
  userPasswordConfirm: document.querySelector("#user-password-confirm"),
  userPasswordConfirmWrap: document.querySelector("#user-password-confirm-wrap"),
  userStatus: document.querySelector("#user-status"),
  newUser: document.querySelector("#new-user"),
  saveUser: document.querySelector("#save-user"),
  deleteUser: document.querySelector("#delete-user"),
  workspaceUsersBtn: document.querySelector("#workspace-users-btn"),
};

let bgImage = null;
let saveTimer = null;
let canvasEditor = null;
let pulseAnim = null;
let actionFieldEditing = false;
let annotationDockParent = null;
let annotationDockNext = null;
let uploadInProgress = false;
let pasteHandled = false;
let saveChain = Promise.resolve();
let savedSelectionRange = null;

const RICH_FIELDS = () =>
  [nodes.stepWhy, nodes.stepComment, nodes.stepAction, nodes.stepResult, nodes.packagingText].filter(Boolean);

function plainTextFromHtml(value) {
  const div = document.createElement("div");
  div.innerHTML = String(value || "");
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

function getRichHtml(node) {
  if (!node) return "";
  return node.innerHTML.trim();
}

function setRichHtml(node, value) {
  if (!node) return;
  node.innerHTML = value || "";
}

function normalizeActionHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  template.content.querySelectorAll("button, .action-ref-btn, .action-ref-chip").forEach((node) => {
    node.replaceWith(document.createTextNode(node.textContent || ""));
  });
  return sanitizeLessonHtml(template.innerHTML);
}

function setActionHtml(value) {
  setRichHtml(nodes.stepAction, normalizeActionHtml(value));
}

function getActionHtml() {
  return normalizeActionHtml(getRichHtml(nodes.stepAction));
}

function activeRichField() {
  const active = document.activeElement;
  if (active?.classList?.contains("rich-field")) return active;
  return RICH_FIELDS().find((field) => field === active) || null;
}

function restoreSavedSelection() {
  const field = activeRichField();
  if (!field || !savedSelectionRange) return null;
  field.focus();
  const selection = window.getSelection();
  if (!selection) return null;
  selection.removeAllRanges();
  selection.addRange(savedSelectionRange.cloneRange());
  return selection;
}

function unwrapBoldInFragment(fragment) {
  fragment.querySelectorAll("strong, b").forEach((node) => {
    const parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
  });
}

function applyBoldFormat() {
  const field = activeRichField();
  if (!field || !savedSelectionRange) return;

  const selection = restoreSavedSelection();
  if (!selection) return;

  const range = selection.getRangeAt(0);
  const wrapper = document.createElement("strong");
  try {
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
  } catch {
    nodes.statusMessage.textContent = "Не удалось применить жирный текст к этому фрагменту.";
    return;
  }

  selection.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(wrapper);
  selection.addRange(next);
  savedSelectionRange = next.cloneRange();
  if (field !== nodes.packagingText) scheduleSaveStep();
  updateFormatBubble();
  nodes.statusMessage.textContent = "Выделенный фрагмент сделан жирным.";
}

function applyNormalFormat() {
  const field = activeRichField();
  if (!field || !savedSelectionRange) return;

  const selection = restoreSavedSelection();
  if (!selection) return;

  const range = selection.getRangeAt(0);
  const fragment = range.extractContents();
  unwrapBoldInFragment(fragment);
  const first = fragment.firstChild;
  const last = fragment.lastChild;
  range.insertNode(fragment);

  selection.removeAllRanges();
  if (first && last) {
    const next = document.createRange();
    next.setStartBefore(first);
    next.setEndAfter(last);
    selection.addRange(next);
    savedSelectionRange = next.cloneRange();
  } else {
    savedSelectionRange = null;
  }
  if (field !== nodes.packagingText) scheduleSaveStep();
  updateFormatBubble();
  nodes.statusMessage.textContent = "Жирное форматирование снято с выделенного фрагмента.";
}

function updateFormatBubble() {
  const bubble = nodes.formatBoldBubble;
  if (!bubble) return;

  const field = activeRichField();
  const selection = window.getSelection();
  if (!field || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
    bubble.classList.add("hidden");
    savedSelectionRange = null;
    return;
  }

  const range = selection.getRangeAt(0);
  if (!field.contains(range.commonAncestorContainer)) {
    bubble.classList.add("hidden");
    savedSelectionRange = null;
    return;
  }

  savedSelectionRange = range.cloneRange();
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    bubble.classList.add("hidden");
    return;
  }

  bubble.style.left = `${rect.left + rect.width / 2}px`;
  bubble.style.top = `${rect.top - 8}px`;
  bubble.classList.remove("hidden");
}

function hideFormatBubble() {
  nodes.formatBoldBubble?.classList.add("hidden");
  savedSelectionRange = null;
}

function sanitizeLessonHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowed = new Set(["STRONG", "B", "SPAN", "BR", "P", "DIV"]);
  const walk = (node) => {
    [...node.children].forEach((child) => {
      if (!allowed.has(child.tagName)) {
        const text = document.createTextNode(child.textContent || "");
        child.replaceWith(text);
        return;
      }
      if (child.tagName === "SPAN" && !child.classList.contains("lesson-text-red")) {
        child.classList.add("lesson-text-red");
      }
      walk(child);
    });
  };
  walk(template.content);
  return template.innerHTML;
}

function initCanvasEditor() {
  if (canvasEditor) return canvasEditor;
  canvasEditor = createCanvasEditor(
    nodes.canvas,
    nodes.colorPalette,
    (annotations) => {
      const frame = selectedStepFrame();
      if (!frame) return;
      frame.annotations = annotations;
      scheduleSaveStep();
      renderActionMarkers();
    },
    {
      onSelectionChange: () => updatePaletteVisibility(),
      onLabelsChange: () => renderActionMarkers(),
      getNextLabel: () => window.nextAnnotationLabel(stepAllAnnotations(selectedStep())),
    }
  );
  canvasEditor.setColor(state.activeColor);
  return canvasEditor;
}

function activateTool(tool) {
  document.querySelectorAll(".tool-btn").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.tool === tool);
  });
  initCanvasEditor().setTool(tool);
  nodes.canvas.classList.toggle("tool-select", tool === "select");
  updatePaletteVisibility();
}

function stepAllAnnotations(step = selectedStep()) {
  const items = [];
  normalizeStepFrames(step).forEach((frame) => {
    (frame.annotations || []).forEach((item) => items.push(item));
  });
  return items;
}

function stepAnnotationLabels(step = selectedStep()) {
  const labels = [];
  const seen = new Set();
  normalizeStepFrames(step).forEach((frame) => {
    (frame.annotations || []).forEach((item) => {
      const label = item?.label;
      if (!label) return;
      const key = String(label);
      if (seen.has(key)) return;
      seen.add(key);
      labels.push(key);
    });
  });
  return labels.sort((a, b) => {
    const na = Number.parseInt(a, 10);
    const nb = Number.parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return a.localeCompare(b, "ru");
  });
}

function findAnnotationByLabel(label, step = selectedStep()) {
  const key = String(label || "").trim();
  if (!key) return null;
  for (const frame of normalizeStepFrames(step)) {
    const item = (frame.annotations || []).find((entry) => String(entry.label || "") === key);
    if (item) return { frame, item };
  }
  return null;
}

function frameAnnotationLabels(frame = selectedStepFrame()) {
  return stepAnnotationLabels(selectedStep());
}

function findAnnotationIdByLabel(label, frame = selectedStepFrame()) {
  return findAnnotationByLabel(label)?.item?.id || null;
}

async function pulseAnnotation(label) {
  const match = findAnnotationByLabel(label);
  if (!match) {
    nodes.statusMessage.textContent = `Метка «${label}» не найдена в этом шаге.`;
    return;
  }

  if (state.selectedFrameId !== match.frame.id) {
    await flushPendingSave();
    state.selectedFrameId = match.frame.id;
    await renderStepEditor();
  }

  const editor = initCanvasEditor();
  const id = match.item.id;
  editor.selectAnnotation(id);
  if (pulseAnim) cancelAnimationFrame(pulseAnim);
  const start = performance.now();
  const duration = 2400;
  function frame(now) {
    const t = (now - start) / duration;
    if (t >= 1) {
      editor.setPulse(null, 0);
      pulseAnim = null;
      return;
    }
    const phase = Math.sin(t * Math.PI * 5) * 0.5 + 0.5;
    editor.setPulse(id, phase);
    pulseAnim = requestAnimationFrame(frame);
  }
  pulseAnim = requestAnimationFrame(frame);
  nodes.canvasWrap?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function labelsUsedInAction() {
  const text = plainTextFromHtml(getActionHtml());
  const validLabels = new Set(stepAnnotationLabels());
  const used = new Set();
  const re = /\{(\d+)\}/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (validLabels.has(match[1])) used.add(match[1]);
  }
  return used;
}

function markerToken(label) {
  return `{${label}}`;
}

function insertLabelIntoAction(label) {
  const field = nodes.stepAction;
  if (!field) return false;

  if (!actionFieldEditing) {
    field.focus();
    setActionFieldEditing(true);
  }

  field.focus();
  const insert = markerToken(label);
  const selection = window.getSelection();
  if (selection && selection.rangeCount) {
    const range = selection.getRangeAt(0);
    if (field.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      const textNode = document.createTextNode(insert);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      const step = selectedStep();
      if (step) step.action = getActionHtml();
      scheduleSaveStep();
      return true;
    }
  }
  field.append(document.createTextNode(insert));
  const step = selectedStep();
  if (step) step.action = getActionHtml();
  scheduleSaveStep();
  return true;
}

function handleMarkerClick(label) {
  const usedInAction = labelsUsedInAction();
  const isUsed = usedInAction.has(String(label));

  if (actionFieldEditing || !isUsed) {
    if (insertLabelIntoAction(label)) {
      nodes.statusMessage.textContent = `Метка «${label}» вставлена в действие.`;
      renderActionMarkers();
      return;
    }
  }

  if (isUsed) {
    pulseAnnotation(label);
  }
}

function removeLabelFromStep(label) {
  const step = selectedStep();
  if (!step) return;
  const key = String(label || "").trim();
  if (!key) return;
  if (!confirm(`Удалить метку ${markerToken(key)} со всех скринов шага?`)) return;

  syncCanvasToCurrentFrame();
  normalizeStepFrames(step).forEach((frame) => {
    frame.annotations = (frame.annotations || []).filter((item) => String(item.label) !== key);
  });

  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const updatedAction = getActionHtml().replace(new RegExp(`\\{${escaped}\\}`, "g"), "");
  setActionHtml(updatedAction);
  step.action = getActionHtml();
  syncStepLegacyFields(step);

  const frame = selectedStepFrame(step);
  const editor = canvasEditor;
  if (editor && frame) {
    editor.setAnnotations(frame.annotations || []);
    editor.redraw(bgImage);
  }

  scheduleSaveStep();
  renderActionMarkers();
  nodes.statusMessage.textContent = `Метка ${markerToken(key)} удалена.`;
}

function renderActionMarkers() {
  if (!nodes.stepActionMarkers) return;
  const labels = stepAnnotationLabels();
  if (!labels.length) {
    nodes.stepActionMarkers.innerHTML = `<span class="action-markers-hint">Нарисуйте рамку или круг — появится номер метки.</span>`;
    return;
  }
  const usedInAction = labelsUsedInAction();
  const labelText = actionFieldEditing ? "Вставить в действие:" : "Метки шага (все скрины):";
  nodes.stepActionMarkers.innerHTML = `<span class="action-markers-label">${labelText}</span>${labels
    .map((label) => {
      const isUsed = usedInAction.has(label);
      const stateClass = isUsed ? "is-used" : "is-unused";
      const title = isUsed
        ? actionFieldEditing
          ? "Вставить номер ещё раз"
          : "Подсветить на скрине"
        : actionFieldEditing
          ? "Вставить номер в текст действия"
          : "Добавить номер в текст действия";
      return `<span class="action-marker-chip">
        <button type="button" class="action-marker-btn ${stateClass}" data-label="${escapeHtml(label)}" title="${title}">${escapeHtml(markerToken(label))}</button>
        <button type="button" class="action-marker-remove" data-label="${escapeHtml(label)}" title="Удалить метку" aria-label="Удалить метку ${escapeHtml(label)}">×</button>
      </span>`;
    })
    .join("")}`;
  nodes.stepActionMarkers.querySelectorAll(".action-marker-btn").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", () => handleMarkerClick(button.dataset.label));
  });
  nodes.stepActionMarkers.querySelectorAll(".action-marker-remove").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeLabelFromStep(button.dataset.label);
    });
  });
}

function setActionFieldEditing(editing) {
  actionFieldEditing = editing;
  nodes.actionField?.classList.toggle("is-editing", editing);
  renderActionMarkers();
}

function updatePaletteVisibility() {
  const hasSelection = Boolean(canvasEditor?.getSelectedId?.());
  nodes.paletteRow.classList.toggle("is-visible", hasSelection);
}

function renderColorToolbar() {
  const colors = window.RAINBOW_COLORS || [];
  nodes.colorToolbar.innerHTML = colors
    .map(
      (color) =>
        `<button type="button" class="color-swatch${state.activeColor === color ? " is-active" : ""}" data-color="${color}" style="background:${color}" title="${color}"></button>`
    )
    .join("");
  nodes.colorToolbar.querySelectorAll(".color-swatch").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeColor = button.dataset.color;
      canvasEditor?.setColor(state.activeColor);
      renderColorToolbar();
    });
  });
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(appUrl(path), {
    ...options,
    credentials: "include",
    headers,
  });
  if (response.status === 401 && !String(path).includes("/api/login")) {
    window.location.href = appUrl("/login");
    throw new Error("Требуется вход в систему.");
  }
  if (!response.ok) {
    let message = "Ошибка запроса";
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) return response.json();
  return response.blob();
}

function selectedStep() {
  return state.project?.steps?.find((step) => step.id === state.selectedStepId) || null;
}

function normalizeStepFrames(step) {
  if (!step) return [];
  if (Array.isArray(step.frames) && step.frames.length) {
    return step.frames;
  }
  if (step.frameFile) {
    step.frames = [
      {
        id: step.frameId || frameId(),
        frameFile: step.frameFile,
        annotations: step.annotations || [],
      },
    ];
    return step.frames;
  }
  step.frames = step.frames || [];
  return step.frames;
}

function selectedStepFrame(step = selectedStep()) {
  const frames = normalizeStepFrames(step);
  if (!frames.length) return null;
  return frames.find((frame) => frame.id === state.selectedFrameId) || frames[0];
}

function stepFrameCount(step) {
  return normalizeStepFrames(step).length;
}

function syncStepLegacyFields(step) {
  const frames = normalizeStepFrames(step);
  if (frames.length) {
    step.frameFile = frames[0].frameFile;
    step.annotations = frames[0].annotations || [];
  } else {
    step.frameFile = "";
    step.annotations = [];
  }
}

function addStepFrame(step, frameFile) {
  const frames = normalizeStepFrames(step);
  const frame = { id: frameId(), frameFile, annotations: [] };
  frames.push(frame);
  state.selectedFrameId = frame.id;
  syncStepLegacyFields(step);
  return frame;
}

function fileUrl(relPath) {
  return appUrl(`/api/projects/${state.project.id}/files/${relPath}?t=${Date.now()}`);
}

function scheduleSaveProject() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => enqueueSave(saveProjectMeta), 500);
}

function scheduleSaveStep() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(
    () =>
      enqueueSave(async () => {
        await saveProjectMeta();
        renderStepsList();
      }),
    400
  );
}

function linesToList(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(value) {
  return (value || []).join("\n");
}

function issuesToLines(issues) {
  return (issues || [])
    .map((item) => {
      if (typeof item === "string") return item;
      return `${item.title || ""} | ${item.text || ""}`.trim();
    })
    .join("\n");
}

function linesToIssues(value) {
  return linesToList(value).map((line) => {
    const [title, ...rest] = line.split("|");
    return { title: title.trim(), text: rest.join("|").trim() };
  });
}

function renumberSteps() {
  (state.project.steps || []).forEach((step, index) => {
    step.number = index + 1;
  });
}

async function loadProjects() {
  state.projects = await api("/api/projects");
  renderProjectList();
}

function renderProjectList() {
  if (!state.projects.length) {
    nodes.projectList.innerHTML = `<p class="hint-card">Проектов пока нет.</p>`;
    return;
  }

  nodes.projectList.innerHTML = state.projects
    .map((project) => {
      const active = state.project?.id === project.id ? " is-active" : "";
      return `<div class="project-item-wrap${active ? " is-active" : ""}">
        <button class="project-item${active}" type="button" data-id="${project.id}">
          <strong>${escapeHtml(project.title)}</strong>
          <small>${escapeHtml(project.topic)} · ${project.stepsCount} шагов · ${project.status}</small>
        </button>
        <button class="project-delete-btn" type="button" data-id="${project.id}" title="Удалить проект" aria-label="Удалить проект">×</button>
      </div>`;
    })
    .join("");

  nodes.projectList.querySelectorAll(".project-item").forEach((button) => {
    button.addEventListener("click", () => openProject(button.dataset.id));
  });

  nodes.projectList.querySelectorAll(".project-delete-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteProject(button.dataset.id);
    });
  });
}

async function deleteProject(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  const title = project?.title || projectId;
  const publishedNote = project?.status === "published" ? "\n\nУрок также будет убран из учебной базы на сайте." : "";
  if (!confirm(`Удалить проект «${title}»?${publishedNote}\n\nФайлы проекта будут удалены с сервера.`)) {
    return;
  }

  try {
    await flushPendingSave();
    await api(`/api/projects/${projectId}`, { method: "DELETE" });
    if (state.project?.id === projectId) {
      state.project = null;
      state.selectedStepId = null;
      state.selectedFrameId = null;
      nodes.editor.classList.add("hidden");
      nodes.emptyState.classList.remove("hidden");
    }
    await loadProjects();
    nodes.statusMessage.textContent = `Проект «${title}» удалён.`;
  } catch (error) {
    alert(error.message);
  }
}

async function openProject(projectId) {
  setWorkspace("lessons");
  stopPolling();
  await flushPendingSave();
  state.project = await api(`/api/projects/${projectId}`);
  state.selectedStepId = state.project.steps?.[0]?.id || null;
  state.selectedFrameId = selectedStepFrame(state.project.steps?.[0])?.id || null;
  nodes.emptyState.classList.add("hidden");
  nodes.editor.classList.remove("hidden");
  renderEditor();
  if (state.project.status === "processing") startPolling();
  await loadProjects();
}

function updateWhisperHint() {
  if (!nodes.whisperHint) return;
  const model = nodes.fieldWhisperModel?.value || "base";
  const entry = state.whisperModels.find((item) => item.id === model);
  const hint = entry?.hint || model;
  const used = state.project?.transcript?.whisperModel;
  const usedNote = used ? ` Последняя обработка: ${used}.` : "";
  nodes.whisperHint.textContent = `${hint}. Применится при следующей обработке видео.${usedNote} «Перечистить» — убрать паразиты из уже распознанного текста.`;
}

function updateRecleanButton() {
  if (!nodes.recleanTranscript) return;
  const hasTranscript = Boolean(state.project?.transcript?.segments?.length);
  const busy = state.project?.status === "processing";
  nodes.recleanTranscript.disabled = !hasTranscript || busy;
}

function renderWhisperModelOptions() {
  if (!nodes.fieldWhisperModel || !state.whisperModels.length) return;
  const current = state.project?.whisperModel || nodes.fieldWhisperModel.value || "base";
  nodes.fieldWhisperModel.innerHTML = state.whisperModels
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.id)} — ${escapeHtml(item.hint || item.id)}</option>`
    )
    .join("");
  nodes.fieldWhisperModel.value = current;
  updateWhisperHint();
}

async function loadHealth() {
  try {
    const health = await api("/api/health");
    state.whisperModels = health.whisperModels || [];
    renderWhisperModelOptions();
  } catch {
    state.whisperModels = [
      { id: "base", hint: "Быстро, черновик" },
      { id: "small", hint: "Рекомендуется для инструкций" },
      { id: "medium", hint: "Максимум качества, медленно" },
      { id: "tiny", hint: "Очень быстро, низкое качество" },
    ];
    renderWhisperModelOptions();
  }
}

function renderRegulationPicker() {
  if (!nodes.fieldRegulationIds) return;
  const selected = new Set(state.project?.regulationIds || []);
  if (!state.regulations.length) {
    nodes.fieldRegulationIds.innerHTML =
      '<p class="regulation-picker-empty">Создайте регламенты в разделе «Регламенты» слева.</p>';
    return;
  }

  nodes.fieldRegulationIds.innerHTML = state.regulations
    .map((item) => {
      const checked = selected.has(item.id) ? " checked" : "";
      const badge = item.status === "draft" ? " · черновик" : "";
      return `<label><input type="checkbox" value="${escapeHtml(item.id)}"${checked} /><span>${escapeHtml(item.title)}${badge}</span></label>`;
    })
    .join("");

  nodes.fieldRegulationIds.querySelectorAll("input[type=checkbox]").forEach((input) => {
    input.addEventListener("change", () => {
      if (!state.project) return;
      const ids = [...nodes.fieldRegulationIds.querySelectorAll("input[type=checkbox]:checked")].map(
        (node) => node.value
      );
      state.project.regulationIds = ids;
      scheduleSaveProject();
    });
  });
}

function selectedRegulation() {
  return state.regulations.find((item) => item.id === state.selectedRegulationId) || null;
}

function fillRegulationForm(item) {
  nodes.regulationId.value = item?.id || "";
  nodes.regulationTitle.value = item?.title || "";
  nodes.regulationUrl.value = item?.url || "";
  nodes.regulationText.value = item?.text || "";
  const status = item?.status === "published" ? "Опубликован" : item?.id ? "Черновик" : "";
  nodes.regulationStatus.textContent = item
    ? `${status ? `${status}: ` : ""}${item.title}`
    : "Новый черновик. Заполните поля и нажмите «Сохранить».";
  if (nodes.deleteRegulation) {
    nodes.deleteRegulation.classList.toggle("hidden", !isAdmin() || !item?.id);
  }
  if (nodes.publishRegulation) {
    nodes.publishRegulation.classList.toggle("hidden", !isAdmin() || !item?.id || item.status === "published");
  }
  if (nodes.unpublishRegulation) {
    nodes.unpublishRegulation.classList.toggle("hidden", !isAdmin() || item?.status !== "published");
  }
}

function renderRegulationsWorkspace() {
  if (!nodes.regulationsList) return;
  nodes.regulationsCount.textContent = String(state.regulations.length);

  if (!state.regulations.length) {
    nodes.regulationsList.innerHTML = `<p class="status-text">Пока нет регламентов. Нажмите «+ Регламент».</p>`;
    fillRegulationForm(null);
    return;
  }

  if (!state.selectedRegulationId || !selectedRegulation()) {
    state.selectedRegulationId = state.regulations[0].id;
  }

  nodes.regulationsList.innerHTML = state.regulations
    .map((item) => {
      const active = item.id === state.selectedRegulationId ? " is-active" : "";
      const status = item.status === "published" ? "опубликован" : "черновик";
      return `<button class="regulation-card-btn${active}" type="button" data-regulation="${escapeHtml(item.id)}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.id)} · ${status}</span>
      </button>`;
    })
    .join("");

  nodes.regulationsList.querySelectorAll(".regulation-card-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRegulationId = button.dataset.regulation;
      renderRegulationsWorkspace();
    });
  });

  fillRegulationForm(selectedRegulation());
}

async function loadRegulations() {
  state.regulations = await api("/api/regulations/catalog");
  renderRegulationPicker();
  renderRegulationsWorkspace();
}

function collectRegulationPayload() {
  return {
    id: nodes.regulationId.value.trim(),
    title: nodes.regulationTitle.value.trim(),
    url: nodes.regulationUrl.value.trim(),
    text: nodes.regulationText.value.trim(),
  };
}

function regulationHasDraft(id) {
  return state.regulations.some((item) => item.id === id);
}

async function saveRegulationItem() {
  const payload = collectRegulationPayload();
  const existingId = state.selectedRegulationId;
  const current = selectedRegulation();
  const isNew = !existingId || !current;
  const saved = isNew
    ? await api("/api/regulation-drafts", { method: "POST", body: JSON.stringify(payload) })
    : await api(`/api/regulation-drafts/${encodeURIComponent(existingId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
  state.selectedRegulationId = saved.id;
  await loadRegulations();
  nodes.regulationStatus.textContent = saved.message || `Черновик сохранён: ${saved.title}`;
}

async function publishRegulationItem() {
  const item = selectedRegulation();
  if (!item?.id) return;
  const result = await api(`/api/regulation-drafts/${encodeURIComponent(item.id)}/publish`, { method: "POST" });
  await loadRegulations();
  nodes.regulationStatus.textContent = result.message || `Опубликовано: ${item.title}`;
}

async function deleteRegulationItem() {
  const item = selectedRegulation();
  if (!item || !confirm(`Удалить регламент «${item.title}»?`)) return;
  if (item.status === "published") {
    await api(`/api/published-regulations/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if (regulationHasDraft(item.id)) {
      await api(`/api/regulation-drafts/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    }
  } else {
    await api(`/api/regulation-drafts/${encodeURIComponent(item.id)}`, { method: "DELETE" });
  }
  state.selectedRegulationId = null;
  await loadRegulations();
}

async function unpublishRegulationItem() {
  const item = selectedRegulation();
  if (!item?.id || item.status !== "published") return;
  if (!confirm(`Снять с публикации «${item.title}»? Черновик останется в конструкторе.`)) return;
  await api(`/api/published-regulations/${encodeURIComponent(item.id)}`, { method: "DELETE" });
  await loadRegulations();
  nodes.regulationStatus.textContent = `Снято с публикации: ${item.title}`;
}

function packagingAssetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const clean = String(path).replace(/^\.\//, "");
  return siteHomeUrl().replace(/\/?$/, "/") + clean;
}

function selectedPackaging() {
  return state.packaging.find((item) => item.id === state.selectedPackagingId) || null;
}

function normalizePackagingValues(values, legacy) {
  const list = [];
  if (Array.isArray(values)) {
    values.forEach((entry) => {
      const text = String(entry || "").trim();
      if (text && !list.includes(text)) list.push(text);
    });
  } else if (typeof values === "string" && values.trim()) {
    list.push(values.trim());
  }
  if (!list.length && legacy) {
    const text = String(legacy || "").trim();
    if (text) list.push(text);
  }
  return list.length ? list : [""];
}

function readMultiList(container) {
  if (!container) return [];
  return [...container.querySelectorAll("input[type='text']")]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function renderMultiList(container, values, placeholder) {
  if (!container) return;
  const rows = values.length ? values : [""];
  container.innerHTML = rows
    .map(
      (value, index) => `<div class="packaging-multi-row" data-index="${index}">
        <input type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
        <button class="ghost-btn" type="button" data-remove-row="${index}" title="Удалить">✕</button>
      </div>`
    )
    .join("");
  container.querySelectorAll("[data-remove-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeRow);
      const current = readMultiList(container);
      current.splice(index, 1);
      renderMultiList(container, current.length ? current : [""], placeholder);
    });
  });
}

function renderPackagingTypeSelect(selected) {
  if (!nodes.packagingType) return;
  const types = state.packagingTypes.length
    ? state.packagingTypes
    : ["Курьер пакет", "Зип Пакет", "Коробка", "Заводская упаковка", "Другое"];
  const current = selected || "";
  const options = [`<option value="">Тип упаковки</option>`].concat(
    types.map((type) => {
      const active = type === current ? " selected" : "";
      return `<option value="${escapeHtml(type)}"${active}>${escapeHtml(type)}</option>`;
    })
  );
  if (current && !types.includes(current)) {
    options.push(`<option value="${escapeHtml(current)}" selected>${escapeHtml(current)}</option>`);
  }
  nodes.packagingType.innerHTML = options.join("");
}

function renderPackagingTypesEditor() {
  if (!nodes.packagingTypesList) return;
  const types = state.packagingTypes.length ? state.packagingTypes : [""];
  renderMultiList(nodes.packagingTypesList, types, "Название типа");
}

function renderPackagingPhotos() {
  if (!nodes.packagingPhotoGrid) return;
  const images = state.packagingImages || [];
  if (!images.length) {
    nodes.packagingPhotoGrid.innerHTML = `<p class="status-text">Фото пока нет.</p>`;
    return;
  }
  nodes.packagingPhotoGrid.innerHTML = images
    .map(
      (item, index) => `<div class="packaging-photo-card" data-index="${index}">
        <img src="${escapeHtml(packagingAssetUrl(item.image))}" alt="" />
        <button class="ghost-btn" type="button" data-remove-photo="${index}" title="Удалить">✕</button>
        <input type="text" value="${escapeHtml(item.caption || "")}" placeholder="Подпись" data-caption="${index}" />
      </div>`
    )
    .join("");

  nodes.packagingPhotoGrid.querySelectorAll("[data-remove-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removePhoto);
      state.packagingImages.splice(index, 1);
      renderPackagingPhotos();
    });
  });
  nodes.packagingPhotoGrid.querySelectorAll("[data-caption]").forEach((input) => {
    input.addEventListener("change", () => {
      const index = Number(input.dataset.caption);
      if (!state.packagingImages[index]) return;
      state.packagingImages[index].caption = input.value.trim();
    });
  });
}

function fillPackagingForm(item) {
  nodes.packagingId.value = item?.id || "";
  nodes.packagingName.value = item?.name || "";
  renderPackagingTypeSelect(item?.packagingType || "");
  state.packagingArticles = normalizePackagingValues(item?.articles, item?.article);
  state.packagingBarcodes = normalizePackagingValues(item?.barcodes, item?.barcode);
  renderMultiList(nodes.packagingArticlesList, state.packagingArticles, "ART-12345");
  renderMultiList(nodes.packagingBarcodesList, state.packagingBarcodes, "4601234567890");
  setRichHtml(nodes.packagingText, item?.text || "");
  state.packagingImages = Array.isArray(item?.images) ? item.images.map((entry) => ({ ...entry })) : [];
  renderPackagingPhotos();
  const status = item?.status === "published" ? "Опубликован" : item?.id ? "Черновик" : "";
  nodes.packagingStatus.textContent = item
    ? `${status ? `${status}: ` : ""}${item.name}`
    : "Новый черновик. Заполните поля и нажмите «Сохранить».";
  if (nodes.deletePackaging) {
    nodes.deletePackaging.classList.toggle("hidden", !isAdmin() || !item?.id);
  }
  if (nodes.publishPackaging) {
    nodes.publishPackaging.classList.toggle("hidden", !isAdmin() || !item?.id || item.status === "published");
  }
  if (nodes.unpublishPackaging) {
    nodes.unpublishPackaging.classList.toggle("hidden", !isAdmin() || item?.status !== "published");
  }
}

function renderPackagingWorkspace() {
  if (!nodes.packagingList) return;
  nodes.packagingCount.textContent = String(state.packaging.length);
  renderPackagingTypesEditor();

  if (!state.packaging.length) {
    nodes.packagingList.innerHTML = `<p class="status-text">Пока нет упаковки. Нажмите «+ Упаковка».</p>`;
    fillPackagingForm(null);
    return;
  }

  if (!state.selectedPackagingId || !selectedPackaging()) {
    state.selectedPackagingId = state.packaging[0].id;
  }

  nodes.packagingList.innerHTML = state.packaging
    .map((item) => {
      const active = item.id === state.selectedPackagingId ? " is-active" : "";
      const status = item.status === "published" ? "опубликован" : "черновик";
      const articles = normalizePackagingValues(item.articles, item.article).filter(Boolean);
      const barcodes = normalizePackagingValues(item.barcodes, item.barcode).filter(Boolean);
      const meta = [item.packagingType, articles[0], barcodes[0]].filter(Boolean).join(" · ") || item.id;
      return `<button class="regulation-card-btn${active}" type="button" data-packaging="${escapeHtml(item.id)}">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(meta)} · ${status}</span>
      </button>`;
    })
    .join("");

  nodes.packagingList.querySelectorAll(".regulation-card-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPackagingId = button.dataset.packaging;
      renderPackagingWorkspace();
    });
  });

  fillPackagingForm(selectedPackaging());
}

async function loadPackagingTypes() {
  const payload = await api("/api/packaging-types");
  state.packagingTypes = Array.isArray(payload.types) ? payload.types : [];
  renderPackagingTypeSelect(nodes.packagingType?.value || "");
  renderPackagingTypesEditor();
}

async function loadPackaging() {
  state.packaging = await api("/api/packaging/catalog");
  renderPackagingWorkspace();
}

function collectPackagingPayload() {
  const packagingType = nodes.packagingType?.value.trim() || "";
  if (!packagingType || packagingType === "Тип упаковки") {
    throw new Error("Выберите тип упаковки.");
  }
  return {
    id: nodes.packagingId.value.trim(),
    name: nodes.packagingName.value.trim(),
    packagingType,
    articles: readMultiList(nodes.packagingArticlesList),
    barcodes: readMultiList(nodes.packagingBarcodesList),
    text: getRichHtml(nodes.packagingText),
    images: (state.packagingImages || []).map((entry) => ({
      image: entry.image,
      caption: entry.caption || "",
    })),
  };
}

function packagingHasDraft(id) {
  return state.packaging.some((item) => item.id === id);
}

async function savePackagingItem() {
  const payload = collectPackagingPayload();
  const existingId = state.selectedPackagingId;
  const current = selectedPackaging();
  const isNew = !existingId || !current;
  const saved = isNew
    ? await api("/api/packaging-drafts", { method: "POST", body: JSON.stringify(payload) })
    : await api(`/api/packaging-drafts/${encodeURIComponent(existingId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
  state.selectedPackagingId = saved.id;
  await loadPackaging();
  nodes.packagingStatus.textContent = saved.message || `Черновик сохранён: ${saved.name}`;
}

async function savePackagingTypes() {
  const types = readMultiList(nodes.packagingTypesList);
  if (!types.length) throw new Error("Добавьте хотя бы один тип упаковки.");
  const result = await api("/api/packaging-types", {
    method: "PUT",
    body: JSON.stringify({ types }),
  });
  state.packagingTypes = result.types || types;
  const selected = nodes.packagingType?.value || "";
  renderPackagingTypeSelect(selected);
  renderPackagingTypesEditor();
  nodes.packagingStatus.textContent = result.message || "Типы упаковки сохранены.";
}

async function publishPackagingItem() {
  const item = selectedPackaging();
  if (!item?.id) return;
  await savePackagingItem();
  const result = await api(`/api/packaging-drafts/${encodeURIComponent(item.id)}/publish`, { method: "POST" });
  await loadPackaging();
  nodes.packagingStatus.textContent = result.message || `Опубликовано: ${item.name}`;
}

async function deletePackagingItem() {
  const item = selectedPackaging();
  if (!item || !confirm(`Удалить упаковку «${item.name}»?`)) return;
  if (item.status === "published") {
    await api(`/api/published-packaging/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if (packagingHasDraft(item.id)) {
      await api(`/api/packaging-drafts/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    }
  } else {
    await api(`/api/packaging-drafts/${encodeURIComponent(item.id)}`, { method: "DELETE" });
  }
  state.selectedPackagingId = null;
  await loadPackaging();
}

async function unpublishPackagingItem() {
  const item = selectedPackaging();
  if (!item?.id || item.status !== "published") return;
  if (!confirm(`Снять с публикации «${item.name}»? Черновик останется в конструкторе.`)) return;
  await api(`/api/published-packaging/${encodeURIComponent(item.id)}`, { method: "DELETE" });
  await loadPackaging();
  nodes.packagingStatus.textContent = `Снято с публикации: ${item.name}`;
}

async function uploadPackagingPhotos(files) {
  const item = selectedPackaging();
  if (!item?.id) {
    alert("Сначала сохраните черновик упаковки.");
    return;
  }
  for (const file of files) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(appUrl(`/api/packaging-drafts/${encodeURIComponent(item.id)}/upload-image`), {
      method: "POST",
      body,
      credentials: "include",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Не удалось загрузить фото.");
    }
  }
  await loadPackaging();
  nodes.packagingStatus.textContent = "Фото добавлены.";
}

function selectedUser() {
  return state.users.find((item) => item.login === state.selectedUserLogin) || null;
}

function roleLabel(role) {
  return role === "admin" ? "Администратор" : "Сотрудник";
}

function fillUserForm(item) {
  const isNew = state.isNewUser || !item;
  nodes.userLogin.value = item?.login || "";
  nodes.userLogin.readOnly = !isNew;
  nodes.userDisplayName.value = item?.displayName || "";
  nodes.userRole.value = item?.role || "employee";
  nodes.userPassword.value = "";
  nodes.userPasswordConfirm.value = "";
  nodes.userPassword.placeholder = isNew ? "Минимум 6 символов" : "Оставьте пустым, чтобы не менять";
  nodes.userPassword.required = isNew;
  nodes.userPasswordConfirmWrap?.classList.toggle("hidden", !isNew);
  if (nodes.deleteUser) {
    nodes.deleteUser.classList.toggle("hidden", isNew || !item?.login || item.login === state.user?.login);
  }
  nodes.userStatus.textContent = isNew
    ? "Новый пользователь. Задайте логин, роль и пароль."
    : item
      ? `${roleLabel(item.role)}: ${item.displayName || item.login}`
      : "Выберите пользователя или создайте нового.";
}

function renderUsersWorkspace() {
  if (!nodes.usersList) return;
  nodes.usersCount.textContent = String(state.users.length);

  if (!state.users.length) {
    nodes.usersList.innerHTML = `<p class="status-text">Пока нет пользователей. Нажмите «+ Пользователь».</p>`;
    fillUserForm(null);
    return;
  }

  if (!state.isNewUser && (!state.selectedUserLogin || !selectedUser())) {
    state.selectedUserLogin = state.users[0].login;
  }

  nodes.usersList.innerHTML = state.users
    .map((item) => {
      const active = item.login === state.selectedUserLogin && !state.isNewUser ? " is-active" : "";
      return `<button class="regulation-card-btn${active}" type="button" data-user="${escapeHtml(item.login)}">
        <strong>${escapeHtml(item.displayName || item.login)}</strong>
        <span>${escapeHtml(item.login)} · ${roleLabel(item.role)}</span>
      </button>`;
    })
    .join("");

  nodes.usersList.querySelectorAll("[data-user]").forEach((button) => {
    button.addEventListener("click", () => {
      state.isNewUser = false;
      state.selectedUserLogin = button.dataset.user;
      renderUsersWorkspace();
    });
  });

  fillUserForm(state.isNewUser ? null : selectedUser());
}

async function loadUsers() {
  if (!isAdmin()) {
    state.users = [];
    renderUsersWorkspace();
    return;
  }
  state.users = await api("/api/users");
  renderUsersWorkspace();
}

function collectUserPayload() {
  return {
    login: nodes.userLogin.value.trim(),
    displayName: nodes.userDisplayName.value.trim(),
    role: nodes.userRole.value,
    password: nodes.userPassword.value,
    confirmPassword: nodes.userPasswordConfirm.value,
  };
}

async function saveUserItem() {
  const payload = collectUserPayload();
  const isNew = state.isNewUser || !state.selectedUserLogin;

  if (isNew) {
    if (!payload.password) throw new Error("Введите пароль для нового пользователя.");
    if (payload.password !== payload.confirmPassword) throw new Error("Пароли не совпадают.");
    const result = await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        login: payload.login,
        displayName: payload.displayName,
        role: payload.role,
        password: payload.password,
      }),
    });
    state.isNewUser = false;
    state.selectedUserLogin = result.user.login;
    await loadUsers();
    if (result.message) nodes.userStatus.textContent = result.message;
    return;
  }

  const result = await api(`/api/users/${encodeURIComponent(state.selectedUserLogin)}`, {
    method: "PUT",
    body: JSON.stringify({
      displayName: payload.displayName,
      role: payload.role,
      password: payload.password,
    }),
  });
  state.selectedUserLogin = result.user.login;
  await ensureAuth();
  await loadUsers();
  if (result.message) nodes.userStatus.textContent = result.message;
}

async function deleteUserItem() {
  const item = selectedUser();
  if (!item || !confirm(`Удалить пользователя «${item.displayName || item.login}»?`)) return;
  const result = await api(`/api/users/${encodeURIComponent(item.login)}`, { method: "DELETE" });
  state.selectedUserLogin = null;
  state.isNewUser = false;
  await loadUsers();
  if (result.message) nodes.userStatus.textContent = result.message;
}

function setWorkspace(workspace) {
  state.workspace = workspace;
  document.querySelectorAll(".workspace-btn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.workspace === workspace);
  });

  const isLessons = workspace === "lessons";
  const isUsers = workspace === "users";
  nodes.emptyState.classList.toggle("hidden", !isLessons || state.project);
  nodes.editor.classList.toggle("hidden", !isLessons || !state.project);
  nodes.regulationsWorkspace?.classList.toggle("hidden", workspace !== "regulations");
  nodes.packagingWorkspace?.classList.toggle("hidden", workspace !== "packaging");
  nodes.usersWorkspace?.classList.toggle("hidden", !isUsers);
  document.querySelector(".project-list-wrap")?.classList.toggle("hidden", !isLessons);
  document.querySelector("#new-project")?.classList.toggle("hidden", !isLessons);

  if (workspace === "regulations") {
    renderRegulationsWorkspace();
  }
  if (workspace === "packaging") {
    renderPackagingWorkspace();
  }
  if (isUsers) {
    renderUsersWorkspace();
  }
}

function renderEditor() {
  const project = state.project;
  nodes.projectTopic.textContent = project.topic || "Без темы";
  nodes.projectTitle.value = project.title || "";
  nodes.fieldTopic.value = project.topic || "";
  nodes.fieldRole.value = project.role || "";
  nodes.fieldDuration.value = project.duration || "";
  nodes.fieldDescription.value = project.description || "";
  nodes.fieldVideoNote.value = project.videoNote || "";
  nodes.fieldKeywords.value = (project.keywords || []).join(", ");
  nodes.fieldChecklist.value = listToLines(project.checklist);
  nodes.fieldIssues.value = issuesToLines(project.issues);
  if (!project.regulationIds) project.regulationIds = [];
  renderRegulationPicker();
  nodes.fieldWhisperModel.value = project.whisperModel || "base";
  updateWhisperHint();
  updateRecleanButton();
  nodes.projectStatus.textContent = project.status || "draft";
  nodes.statusMessage.textContent = project.statusMessage || "";
  nodes.stepsCount.textContent = String(project.steps?.length || 0);

  renderStepsList();
  renderFrameSelect();
  updateFramePickerVisibility();
  updateVideoControls();
  updatePublishControls();
  void renderStepEditor();
  updateRecleanButton();
}

function isAdmin() {
  return state.user?.role === "admin";
}

function renderAuthUi() {
  const node = document.querySelector("#auth-user");
  if (!node || !state.user) return;
  const roleLabelText = state.user.role === "admin" ? "Администратор" : "Сотрудник";
  node.innerHTML = `<span class="auth-user-name">${escapeHtml(state.user.displayName || state.user.login)}</span><span class="auth-user-role">${roleLabelText}</span>`;
  nodes.workspaceUsersBtn?.classList.toggle("hidden", !isAdmin());
  updatePublishControls();
  if (nodes.deleteRegulation) {
    nodes.deleteRegulation.classList.toggle("hidden", !isAdmin() || !selectedRegulation());
  }
}

async function ensureAuth() {
  const payload = await api("/api/me");
  state.user = payload.user;
  renderAuthUi();
}

function updatePublishControls() {
  const project = state.project;
  if (!project) return;
  const isPublished = project.status === "published";
  const hasSteps = (project.steps || []).length > 0;
  const busy = project.status === "processing";
  const canPublish = isAdmin();
  nodes.publishButton.classList.toggle("hidden", !canPublish);
  if (!canPublish) {
    nodes.publishButton.disabled = true;
  } else {
    nodes.publishButton.disabled = busy || !hasSteps;
    nodes.publishButton.textContent = isPublished ? "Обновить в учебной базе" : "Добавить в учебную базу";
  }
  if (nodes.unpublishButton) {
    nodes.unpublishButton.classList.toggle("hidden", !canPublish || !isPublished);
    nodes.unpublishButton.disabled = busy || !canPublish;
  }
}

function renderStepsList() {
  const steps = state.project.steps || [];
  if (!steps.length) {
    nodes.stepsList.innerHTML = `<p class="status-text">Нажмите «+ Шаг», затем «+ Скриншот» или Ctrl+V. Видео необязательно.</p>`;
    return;
  }

  nodes.stepsList.innerHTML = steps
    .map((step) => {
      const active = step.id === state.selectedStepId ? " is-active" : "";
      const frameCount = stepFrameCount(step);
      const shots = frameCount ? ` · ${frameCount} скрин.` : "";
      return `<button class="step-card-btn${active}" type="button" data-step="${step.id}">
        <strong>${step.number}. ${escapeHtml(step.title)}</strong>
        <span>${escapeHtml(truncate(step.action, 72))}${shots}</span>
      </button>`;
    })
    .join("");

  nodes.stepsList.querySelectorAll(".step-card-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      syncCanvasToCurrentFrame();
      await flushPendingSave();
      state.selectedStepId = button.dataset.step;
      state.selectedFrameId = selectedStepFrame()?.id || null;
      renderStepEditor();
      renderStepsList();
    });
  });
}

function renderStepFramesStrip() {
  const step = selectedStep();
  const frames = normalizeStepFrames(step);
  if (!frames.length) {
    nodes.stepFramesStrip.innerHTML = "";
    nodes.stepFramesStrip.classList.add("is-empty");
    return;
  }

  nodes.stepFramesStrip.classList.remove("is-empty");
  nodes.stepFramesStrip.innerHTML = frames
    .map((frame, index) => {
      const active = frame.id === selectedStepFrame(step)?.id ? " is-active" : "";
      return `<button class="step-frame-thumb${active}" type="button" data-frame="${frame.id}" title="Скриншот ${index + 1}">
        <img src="${fileUrl(frame.frameFile)}" alt="Скриншот ${index + 1}" />
        <span>${index + 1}</span>
      </button>`;
    })
    .join("");

  nodes.stepFramesStrip.querySelectorAll(".step-frame-thumb").forEach((button) => {
    button.addEventListener("click", async () => {
      if (state.selectedFrameId === button.dataset.frame) return;
      syncCanvasToCurrentFrame();
      await flushPendingSave();
      state.selectedFrameId = button.dataset.frame;
      await renderStepEditor();
    });
  });
}

function frameOptionLabel(frame) {
  const name = frame.file.split("/").pop();
  if (frame.source === "manual" || (typeof frame.time === "string" && Number.isNaN(Number(frame.time)))) {
    return `${frame.time || "вручную"} — ${name}`;
  }
  return `${frame.time}s — ${name}`;
}

function renderFrameSelect() {
  const frames = state.project.availableFrames || [];
  if (!frames.length) {
    nodes.frameSelect.innerHTML = `<option value="">Нет кадров — загрузите видео или добавьте скриншот</option>`;
    return;
  }
  nodes.frameSelect.innerHTML = frames
    .map((frame) => `<option value="${frame.file}">${frameOptionLabel(frame)}</option>`)
    .join("");
}

function updateFramePickerVisibility() {
  const frames = state.project?.availableFrames || [];
  const hasVideoFrames = frames.some((frame) => frame.source !== "manual" && !String(frame.time || "").includes("вручную"));
  nodes.framePickerRow?.classList.toggle("hidden", !hasVideoFrames);
}

function updateVideoControls() {
  const hasVideo = Boolean(state.project?.videoFile);
  const busy = state.project?.status === "processing";
  document.querySelector("#process-video")?.toggleAttribute("disabled", !hasVideo || busy);
}

async function renderStepEditor() {
  const editor = initCanvasEditor();
  const step = selectedStep();
  if (!step) {
    nodes.stepEditorTitle.textContent = "Шаг не выбран";
    bgImage = null;
    window.__canvasBgImage = null;
    editor.setAnnotations([]);
    editor.redraw(null);
    return;
  }

  nodes.stepEditorTitle.textContent = `Шаг ${step.number} · скриншотов: ${normalizeStepFrames(step).length}`;
  nodes.stepTitle.value = step.title || "";
  setRichHtml(nodes.stepWhy, step.why || "");
  setActionHtml(step.action || "");
  setRichHtml(nodes.stepComment, step.comment || "");
  setRichHtml(nodes.stepResult, step.result || "");

  actionFieldEditing = false;
  nodes.actionField?.classList.remove("is-editing");

  renderStepFramesStrip();
  const frame = selectedStepFrame(step);
  if (frame) {
    state.selectedFrameId = frame.id;
  }

  await loadCanvasImage(frame);
  window.__canvasBgImage = bgImage;
  editor.setAnnotations(frame?.annotations || []);
  editor.redraw(bgImage);
  updatePaletteVisibility();
  renderActionMarkers();
}

async function loadCanvasImage(frame) {
  const ctx = nodes.canvas.getContext("2d");
  if (!frame?.frameFile) {
    bgImage = null;
    nodes.canvas.width = 960;
    nodes.canvas.height = 540;
    ctx.fillStyle = "#f4f7fa";
    ctx.fillRect(0, 0, nodes.canvas.width, nodes.canvas.height);
    ctx.fillStyle = "#65717f";
    ctx.font = "18px Segoe UI";
    ctx.fillText("Добавьте скриншот: «+ Скриншот», Ctrl+V или перетащите файл. Видео не нужно.", 36, 48);
    return;
  }

  await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      bgImage = image;
      nodes.canvas.width = image.width;
      nodes.canvas.height = image.height;
      resolve();
    };
    image.onerror = reject;
    image.src = fileUrl(frame.frameFile);
  });
}

function collectProjectPayload() {
  return {
    title: nodes.projectTitle.value.trim(),
    topic: nodes.fieldTopic.value.trim(),
    role: nodes.fieldRole.value.trim(),
    duration: nodes.fieldDuration.value.trim(),
    description: nodes.fieldDescription.value.trim(),
    videoNote: nodes.fieldVideoNote.value.trim(),
    keywords: nodes.fieldKeywords.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    checklist: linesToList(nodes.fieldChecklist.value),
    issues: linesToIssues(nodes.fieldIssues.value),
    regulationIds: state.project?.regulationIds || [],
    whisperModel: nodes.fieldWhisperModel?.value || "base",
    steps: state.project.steps,
  };
}

function syncCanvasToCurrentFrame() {
  const editor = canvasEditor;
  const frame = selectedStepFrame();
  const step = selectedStep();
  if (!editor || !frame || !step) return;
  frame.annotations = editor.getAnnotations();
  syncStepLegacyFields(step);
}

function syncStepFromForm() {
  syncCanvasToCurrentFrame();
  const step = selectedStep();
  if (!step) return;
  step.title = nodes.stepTitle.value.trim();
  step.why = getRichHtml(nodes.stepWhy);
  step.action = getActionHtml();
  step.comment = getRichHtml(nodes.stepComment);
  step.result = getRichHtml(nodes.stepResult);
}

function mergeSavedProject(saved, { keepSteps = true } = {}) {
  const localSteps = state.project?.steps;
  Object.assign(state.project, saved);
  if (keepSteps && localSteps) {
    state.project.steps = localSteps;
  }
}

function enqueueSave(task) {
  saveChain = saveChain
    .then(task)
    .catch((error) => {
      console.error(error);
      nodes.statusMessage.textContent = error.message || "Ошибка сохранения.";
    });
  return saveChain;
}

async function flushPendingSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!state.project) return;
  await enqueueSave(async () => {
    await saveProjectMeta();
  });
}

function cancelPendingSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
}

async function saveProjectMeta() {
  if (!state.project) return;
  syncStepFromForm();
  const payload = collectProjectPayload();
  Object.assign(state.project, payload);
  const saved = await api(`/api/projects/${state.project.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  mergeSavedProject(saved, { keepSteps: true });
}

async function saveStepFields() {
  await saveProjectMeta();
  renderStepsList();
}

document.querySelectorAll(".tool-btn").forEach((button) => {
  button.addEventListener("click", () => activateTool(button.dataset.tool));
});

document.querySelector("#undo-annotation").addEventListener("click", () => {
  initCanvasEditor().undo();
});

document.querySelector("#clear-annotations").addEventListener("click", () => {
  if (!confirm("Очистить все пометки на этом скриншоте?")) return;
  initCanvasEditor().clearAll();
});

document.querySelector("#delete-annotation").addEventListener("click", () => {
  const removed = initCanvasEditor().deleteSelected();
  updatePaletteVisibility();
  if (!removed) {
    nodes.statusMessage.textContent = "Выберите элемент на скрине (инструмент «Выбор») или кликните по нему.";
  }
});

[nodes.projectTitle, nodes.fieldTopic, nodes.fieldRole, nodes.fieldDuration, nodes.fieldDescription, nodes.fieldVideoNote, nodes.fieldKeywords, nodes.fieldChecklist, nodes.fieldIssues].forEach((node) => {
  node.addEventListener("input", scheduleSaveProject);
});

nodes.fieldWhisperModel?.addEventListener("change", () => {
  if (state.project) state.project.whisperModel = nodes.fieldWhisperModel.value;
  updateWhisperHint();
  scheduleSaveProject();
});

[nodes.stepTitle, nodes.stepWhy, nodes.stepComment, nodes.stepResult].forEach((node) => {
  node.addEventListener("input", scheduleSaveStep);
});

RICH_FIELDS().forEach((node) => {
  node.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
});

nodes.stepAction.addEventListener("input", () => {
  scheduleSaveStep();
  renderActionMarkers();
});

nodes.stepAction.addEventListener("focus", () => setActionFieldEditing(true));
nodes.stepAction.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (document.activeElement?.closest?.(".action-marker-btn")) return;
    setActionFieldEditing(false);
  }, 0);
});

document.querySelector("#save-project").addEventListener("click", async () => {
  try {
    await flushPendingSave();
    nodes.statusMessage.textContent = "Проект сохранён.";
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#publish-project").addEventListener("click", async () => {
  if (!state.project || nodes.publishButton.disabled) return;
  const button = nodes.publishButton;
  const originalText = button.textContent;
  try {
    button.disabled = true;
    button.textContent = "Публикация…";
    await flushPendingSave();
    const result = await api(`/api/projects/${state.project.id}/publish`, { method: "POST" });
    state.project = await api(`/api/projects/${state.project.id}`);
    renderEditor();
    const deployNote = result.deployed ? " Сайт задеплоен." : "";
    const message = result.message || "Урок добавлен в учебную базу.";
    nodes.statusMessage.textContent = `${message}${deployNote}`;
    if (result.url) {
      const link = document.createElement("a");
      link.href = result.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = " Открыть урок";
      nodes.statusMessage.appendChild(document.createTextNode(""));
      nodes.statusMessage.appendChild(link);
    }
  } catch (error) {
    nodes.statusMessage.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    updatePublishControls();
  }
});

document.querySelector("#unpublish-project")?.addEventListener("click", async () => {
  if (!state.project || nodes.unpublishButton?.disabled) return;
  const title = state.project.title || "этот урок";
  if (!confirm(`Удалить «${title}» из учебной базы на сайте?\n\nПроект в конструкторе сохранится, урок просто пропадёт из списка на сайте.`)) {
    return;
  }
  const button = nodes.unpublishButton;
  const originalText = button.textContent;
  try {
    button.disabled = true;
    button.textContent = "Удаление…";
    await flushPendingSave();
    const result = await api(`/api/projects/${state.project.id}/unpublish`, { method: "POST" });
    state.project = await api(`/api/projects/${state.project.id}`);
    renderEditor();
    nodes.statusMessage.textContent = result.message || "Урок удалён из учебной базы.";
  } catch (error) {
    nodes.statusMessage.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    updatePublishControls();
  }
});

document.querySelector("#add-step").addEventListener("click", async () => {
  if (!state.project) return;
  await flushPendingSave();
  const number = (state.project.steps?.length || 0) + 1;
  const step = {
    id: stepId(),
    number,
    title: `Шаг ${number}`,
    why: "",
    action: "",
    comment: "",
    result: "",
    frameFile: "",
    frames: [],
    annotations: [],
  };
  state.project.steps = [...(state.project.steps || []), step];
  renumberSteps();
  state.selectedStepId = step.id;
  state.selectedFrameId = null;
  await saveProjectMeta();
  renderEditor();
});

document.querySelector("#delete-step").addEventListener("click", async () => {
  const step = selectedStep();
  if (!step || !confirm(`Удалить шаг ${step.number}?`)) return;
  await flushPendingSave();
  state.project.steps = state.project.steps.filter((item) => item.id !== step.id);
  renumberSteps();
  state.selectedStepId = state.project.steps[0]?.id || null;
  await saveProjectMeta();
  renderEditor();
});

document.querySelector("#move-step-up").addEventListener("click", async () => {
  await moveStep(-1);
});

document.querySelector("#move-step-down").addEventListener("click", async () => {
  await moveStep(1);
});

async function moveStep(direction) {
  const steps = state.project?.steps || [];
  const index = steps.findIndex((step) => step.id === state.selectedStepId);
  if (index < 0) return;
  const target = index + direction;
  if (target < 0 || target >= steps.length) return;
  await flushPendingSave();
  const copy = [...steps];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  state.project.steps = copy;
  renumberSteps();
  await saveProjectMeta();
  renderEditor();
}

document.querySelector("#new-project").addEventListener("click", async () => {
  const title = prompt("Название урока:", "Новый урок");
  if (!title) return;
  const topic = prompt("Тема:", "Поставки WB") || "Без темы";
  const project = await api("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, topic }),
  });
  await loadProjects();
  await openProject(project.id);
});

document.querySelector("#upload-video").addEventListener("click", async () => {
  const input = document.querySelector("#video-input");
  const file = input.files?.[0];
  if (!file || !state.project) {
    alert("Выберите видеофайл.");
    return;
  }
  const form = new FormData();
  form.append("video", file);
  const response = await fetch(appUrl(`/api/projects/${state.project.id}/upload`), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!response.ok) {
    const payload = await response.json();
    alert(payload.error || "Не удалось загрузить видео.");
    return;
  }
  state.project = await response.json();
  renderEditor();
});

document.querySelector("#process-video").addEventListener("click", async () => {
  if (!state.project) return;
  try {
    await flushPendingSave();
    await api(`/api/projects/${state.project.id}/process`, { method: "POST" });
    state.project.status = "processing";
    updateRecleanButton();
    renderEditor();
    startPolling();
  } catch (error) {
    alert(error.message);
  }
});

nodes.recleanTranscript?.addEventListener("click", async () => {
  if (!state.project || nodes.recleanTranscript.disabled) return;
  if (
    !confirm(
      "Перечистить текст и пересобрать шаги?\n\nТексты шагов будут обновлены из распознанной речи. Разметка на скринах сохранится, если таймкоды совпадут."
    )
  ) {
    return;
  }
  try {
    nodes.recleanTranscript.disabled = true;
    nodes.statusMessage.textContent = "Перечистка текста…";
    await flushPendingSave();
    state.project = await api(`/api/projects/${state.project.id}/reclean-transcript`, { method: "POST" });
    renderEditor();
    if (state.project.steps?.length) {
      state.selectedStepId = state.project.steps[0].id;
      state.selectedFrameId = selectedStepFrame(state.project.steps[0])?.id || null;
      await renderStepEditor();
    }
  } catch (error) {
    alert(error.message);
  } finally {
    updateRecleanButton();
  }
});

document.querySelector("#apply-frame").addEventListener("click", async () => {
  const step = selectedStep();
  if (!step) return;
  const frameFile = nodes.frameSelect.value;
  if (!frameFile) {
    alert("Нет доступных кадров.");
    return;
  }
  cancelPendingSave();
  syncCanvasToCurrentFrame();
  syncStepFromForm();
  addStepFrame(step, frameFile);
  await saveStepFields();
  await renderStepEditor();
});

document.querySelector("#delete-step-frame").addEventListener("click", async () => {
  const step = selectedStep();
  const frame = selectedStepFrame(step);
  if (!step || !frame) {
    alert("Нет скриншота для удаления.");
    return;
  }
  const frames = normalizeStepFrames(step);
  if (!confirm(`Удалить скриншот ${frames.findIndex((item) => item.id === frame.id) + 1}?`)) return;
  syncCanvasToCurrentFrame();
  step.frames = frames.filter((item) => item.id !== frame.id);
  syncStepLegacyFields(step);
  state.selectedFrameId = step.frames[0]?.id || null;
  await saveStepFields();
  await renderStepEditor();
});

async function uploadStepImage(file, { applyToStep = true, label = "вручную" } = {}) {
  if (!state.project || !file) return;
  if (uploadInProgress) return;
  const step = selectedStep();
  if (applyToStep && !step) {
    throw new Error("Сначала выберите шаг слева.");
  }

  uploadInProgress = true;
  try {
    cancelPendingSave();
    if (step) {
      syncStepFromForm();
    }

    const form = new FormData();
    const name = file.name || `screenshot-${Date.now()}.png`;
    form.append("image", file, name);
    form.append("label", label);
    if (applyToStep && step) {
      form.append("applyToStep", step.id);
    }
    const response = await fetch(appUrl(`/api/projects/${state.project.id}/upload-image`), {
      method: "POST",
      body: form,
      credentials: "include",
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Не удалось загрузить изображение.");
    }
    state.project = await response.json();
    const freshStep = selectedStep();
    if (applyToStep && freshStep) {
      normalizeStepFrames(freshStep);
      const newest = freshStep.frames[freshStep.frames.length - 1];
      if (newest) state.selectedFrameId = newest.id;
    }
    renderEditor();
    await renderStepEditor();
    nodes.statusMessage.textContent = state.project.statusMessage || "Скриншот добавлен.";
  } finally {
    uploadInProgress = false;
  }
}

document.querySelector("#upload-image").addEventListener("click", () => {
  document.querySelector("#image-input").click();
});

document.querySelector("#image-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !state.project) return;
  try {
    nodes.statusMessage.textContent = "Загрузка изображения…";
    await uploadStepImage(file, { applyToStep: true, label: "файл" });
    nodes.statusMessage.textContent = state.project.statusMessage || "Изображение загружено.";
  } catch (error) {
    alert(error.message);
  }
});

document.addEventListener("paste", handlePaste, true);

async function handlePaste(event) {
  if (pasteHandled) return;
  if (!state.project || nodes.editor.classList.contains("hidden")) return;
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
    return;
  }
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;
    event.preventDefault();
    event.stopImmediatePropagation();
    pasteHandled = true;
    setTimeout(() => {
      pasteHandled = false;
    }, 400);
    try {
      nodes.statusMessage.textContent = "Вставка из буфера…";
      await uploadStepImage(file, { applyToStep: true, label: "буфер" });
    } catch (error) {
      alert(error.message);
    }
    break;
  }
}

document.addEventListener("selectionchange", () => {
  window.requestAnimationFrame(updateFormatBubble);
});

document.addEventListener("mousedown", (event) => {
  if (event.target.closest("#rich-format-bubble, .rich-field")) return;
  hideFormatBubble();
});

nodes.formatBoldBtn?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  applyBoldFormat();
});

nodes.formatNormalBtn?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  applyNormalFormat();
});

RICH_FIELDS().forEach((node) => {
  node.addEventListener("keyup", updateFormatBubble);
  node.addEventListener("mouseup", updateFormatBubble);
});

nodes.canvasWrap?.addEventListener("click", () => nodes.canvasWrap.focus());
nodes.stepFramesStrip?.addEventListener("click", () => nodes.stepFramesStrip.focus());
document.querySelector("#workspace")?.addEventListener("click", (event) => {
  if (event.target.closest("input, textarea, select, button, a, label, .rich-field, [contenteditable='true']")) return;
  document.querySelector("#workspace")?.focus();
});

async function downloadExport(path, filename) {
  const blob = await api(path, { method: "POST" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelector("#export-html").addEventListener("click", () => {
  if (!state.project) return;
  downloadExport(`/api/projects/${state.project.id}/export/html`, "instruction.html");
});

document.querySelector("#export-pdf").addEventListener("click", () => {
  if (!state.project) return;
  downloadExport(`/api/projects/${state.project.id}/export/pdf`, "instruction.pdf");
});

document.querySelector("#export-snippet").addEventListener("click", async () => {
  if (!state.project) return;
  const payload = await api(`/api/projects/${state.project.id}/export/snippet`);
  nodes.snippetOutput.value = payload.snippet;
  nodes.snippetDialog.showModal();
});

document.querySelector("#copy-snippet").addEventListener("click", async (event) => {
  event.preventDefault();
  await navigator.clipboard.writeText(nodes.snippetOutput.value);
});

function startPolling() {
  stopPolling();
  state.pollTimer = setInterval(async () => {
    if (!state.project) return;
    const fresh = await api(`/api/projects/${state.project.id}`);
    const wasProcessing = state.project.status === "processing";
    state.project = fresh;
    renderEditor();
    if (wasProcessing && fresh.status !== "processing") {
      stopPolling();
      if (fresh.steps?.length) {
        state.selectedStepId = fresh.steps[0].id;
        state.selectedFrameId = selectedStepFrame(fresh.steps[0])?.id || null;
        await renderStepEditor();
      }
    }
  }, 2500);
}

function stopPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(value, max) {
  const text = plainTextFromHtml(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function isCanvasLightboxOpen() {
  return nodes.canvasLightbox.classList.contains("is-open");
}

function openCanvasLightbox() {
  if (!selectedStep() || isCanvasLightboxOpen()) return;
  annotationDockParent = nodes.annotationDock.parentElement;
  annotationDockNext = nodes.annotationDock.nextElementSibling;
  nodes.canvasLightboxInner.appendChild(nodes.annotationDock);
  nodes.canvasLightbox.classList.remove("hidden");
  nodes.canvasLightbox.classList.add("is-open");
  nodes.canvasPlaceholder.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  canvasEditor?.redraw(bgImage);
}

function closeCanvasLightbox() {
  if (!isCanvasLightboxOpen()) return;
  if (annotationDockParent) {
    if (annotationDockNext) {
      annotationDockParent.insertBefore(nodes.annotationDock, annotationDockNext);
    } else {
      annotationDockParent.appendChild(nodes.annotationDock);
    }
  }
  nodes.canvasLightbox.classList.add("hidden");
  nodes.canvasLightbox.classList.remove("is-open");
  nodes.canvasPlaceholder.classList.add("hidden");
  document.body.style.overflow = "";
  canvasEditor?.redraw(bgImage);
}

function setSidebarCollapsed(collapsed) {
  nodes.appShell.classList.toggle("is-sidebar-collapsed", collapsed);
  nodes.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
}

nodes.sidebarToggle.addEventListener("click", () => setSidebarCollapsed(true));
nodes.sidebarRestore.addEventListener("click", () => setSidebarCollapsed(false));
nodes.canvasExpand.addEventListener("click", (event) => {
  event.stopPropagation();
  openCanvasLightbox();
});
nodes.canvasLightboxClose.addEventListener("click", closeCanvasLightbox);
nodes.canvasPlaceholderClose.addEventListener("click", closeCanvasLightbox);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isCanvasLightboxOpen()) {
    closeCanvasLightbox();
  }
});

renderColorToolbar();
initCanvasEditor();
loadHealth().finally(() => {
  ensureAuth()
    .then(() => Promise.all([loadRegulations(), loadPackagingTypes(), loadPackaging(), loadUsers()]))
    .finally(() => {
      loadProjects().then(async () => {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get("project");
        const workspace = params.get("workspace");
        if (workspace && ["lessons", "regulations", "packaging", "users"].includes(workspace)) {
          setWorkspace(workspace);
        }
        if (projectId) {
          await openProject(projectId);
        }
      });
    })
    .catch(() => {
      /* redirect handled in api() */
    });
});

const siteHomeLink = document.querySelector("#site-home-link");
if (siteHomeLink) siteHomeLink.href = siteHomeUrl();

document.querySelectorAll(".workspace-btn").forEach((button) => {
  button.addEventListener("click", () => setWorkspace(button.dataset.workspace));
});

nodes.newRegulation?.addEventListener("click", () => {
  state.selectedRegulationId = null;
  fillRegulationForm(null);
  nodes.regulationTitle.focus();
});

nodes.saveRegulation?.addEventListener("click", async () => {
  try {
    await saveRegulationItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.publishRegulation?.addEventListener("click", async () => {
  try {
    await publishRegulationItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.unpublishRegulation?.addEventListener("click", async () => {
  try {
    await unpublishRegulationItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.deleteRegulation?.addEventListener("click", async () => {
  try {
    await deleteRegulationItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.newPackaging?.addEventListener("click", () => {
  state.selectedPackagingId = null;
  fillPackagingForm(null);
  nodes.packagingName.focus();
});

nodes.savePackaging?.addEventListener("click", async () => {
  try {
    await savePackagingItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.publishPackaging?.addEventListener("click", async () => {
  try {
    await publishPackagingItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.unpublishPackaging?.addEventListener("click", async () => {
  try {
    await unpublishPackagingItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.deletePackaging?.addEventListener("click", async () => {
  try {
    await deletePackagingItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.packagingAddPhoto?.addEventListener("click", () => {
  nodes.packagingPhotoInput?.click();
});

nodes.packagingAddArticle?.addEventListener("click", () => {
  const current = readMultiList(nodes.packagingArticlesList);
  current.push("");
  renderMultiList(nodes.packagingArticlesList, current, "ART-12345");
});

nodes.packagingAddBarcode?.addEventListener("click", () => {
  const current = readMultiList(nodes.packagingBarcodesList);
  current.push("");
  renderMultiList(nodes.packagingBarcodesList, current, "4601234567890");
});

nodes.packagingAddType?.addEventListener("click", () => {
  const current = readMultiList(nodes.packagingTypesList);
  current.push("");
  renderMultiList(nodes.packagingTypesList, current, "Название типа");
});

nodes.packagingSaveTypes?.addEventListener("click", async () => {
  try {
    await savePackagingTypes();
  } catch (error) {
    alert(error.message);
  }
});

nodes.packagingPhotoInput?.addEventListener("change", async () => {
  const files = [...(nodes.packagingPhotoInput.files || [])];
  nodes.packagingPhotoInput.value = "";
  if (!files.length) return;
  try {
    await uploadPackagingPhotos(files);
  } catch (error) {
    alert(error.message);
  }
});

nodes.newUser?.addEventListener("click", () => {
  state.isNewUser = true;
  state.selectedUserLogin = null;
  fillUserForm(null);
  nodes.userLogin.readOnly = false;
  nodes.userLogin.focus();
});

nodes.saveUser?.addEventListener("click", async () => {
  try {
    await saveUserItem();
  } catch (error) {
    alert(error.message);
  }
});

nodes.deleteUser?.addEventListener("click", async () => {
  try {
    await deleteUserItem();
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#logout-btn")?.addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST" });
  } finally {
    window.location.href = appUrl("/login");
  }
});
