const baseMaterials = [];
const baseRegulations = [];
const basePackaging = [];

let materials = [...baseMaterials];
let regulations = [...baseRegulations];
let packagingItems = [...basePackaging];
const publishedEditableIds = new Set();

async function loadPublishedRegulations() {
  try {
    const response = await fetch(`./published-regulations.json?${Date.now()}`);
    if (!response.ok) return;
    const published = await response.json();
    if (!Array.isArray(published)) return;
    regulations = published.filter((item) => item?.id);
  } catch {
    /* published-regulations.json may be missing offline */
  }
}

async function loadPublishedPackaging() {
  try {
    const response = await fetch(`./published-packaging.json?${Date.now()}`);
    if (!response.ok) return;
    const published = await response.json();
    if (!Array.isArray(published)) return;
    packagingItems = published.filter((item) => item?.id);
  } catch {
    /* published-packaging.json may be missing offline */
  }
}

async function loadPublishedMaterials() {
  try {
    const response = await fetch(`./published-lessons.json?${Date.now()}`);
    if (!response.ok) return;
    const published = await response.json();
    if (!Array.isArray(published)) return;
    published.forEach((item) => {
      if (!item?.id) return;
      publishedEditableIds.add(item.id);
      const index = materials.findIndex((entry) => entry.id === item.id);
      if (index >= 0) {
        materials[index] = item;
      } else {
        materials.push(item);
      }
    });
  } catch {
    /* published-lessons.json may be missing offline */
  }
}

const synonyms = {
  "эцп": ["подпись", "цифровая подпись", "электронная подпись"],
  "токен": ["интеграция", "доступ", "получить токен"],
  "поставка": ["карточка", "карточки", "товар"],
  "ошибка": ["не получилось", "позже", "сбой"],
  "видео": ["ролик", "исходник", "исходное видео"],
  "wb": ["вб", "wildberries", "вайлдберриз"],
  "вб": ["wb", "wildberries", "вайлдберриз"],
  "сдэк": ["cdek", "транспортная компания", "доставка"],
  "шк": ["штрихкод", "баркод", "шк коробов", "шк поставки"],
  "короба": ["короб", "упаковка", "палета", "грузовое место"],
  "палета": ["паллет", "поддон", "больше 10 коробов"]
};

const state = {
  selectedMaterialId: null,
  selectedRegulationId: null,
  selectedPackagingId: null,
  currentStep: 0,
  currentView: "guide",
  currentIssue: 0,
  currentRegulation: 0,
  query: "",
  completed: {},
  mode: "library",
  developWorkspace: "lessons",
  editMode: false,
  displayMode: "extended",
  activeSlideIndex: 0,
  user: null
};

const nodes = {
  appShell: document.querySelector(".app-shell"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  sidebarRestore: document.querySelector("#sidebar-restore"),
  topicList: document.querySelector("#topic-list"),
  topicsDropdown: document.querySelector("#topics-dropdown"),
  topicsCount: document.querySelector("#topics-count"),
  materialList: document.querySelector("#material-list"),
  searchInput: document.querySelector("#search-input"),
  matchCount: document.querySelector("#match-count"),
  materialsCount: document.querySelector("#materials-count"),
  stepsCount: document.querySelector("#steps-count"),
  videosCount: document.querySelector("#videos-count"),
  topbarTitle: document.querySelector("#topbar-title"),
  regulationList: document.querySelector("#regulation-list"),
  regulationsMatchCount: document.querySelector("#regulations-match-count"),
  regulationsLayout: document.querySelector("#regulations-layout"),
  regulationPageTitle: document.querySelector("#regulation-page-title"),
  regulationPageLead: document.querySelector("#regulation-page-lead"),
  regulationPageBody: document.querySelector("#regulation-page-body"),
  packagingList: document.querySelector("#packaging-list"),
  packagingMatchCount: document.querySelector("#packaging-match-count"),
  packagingLayout: document.querySelector("#packaging-layout"),
  packagingPageTitle: document.querySelector("#packaging-page-title"),
  packagingPageLead: document.querySelector("#packaging-page-lead"),
  packagingPageMeta: document.querySelector("#packaging-page-meta"),
  packagingPageBody: document.querySelector("#packaging-page-body"),
  lessonTopic: document.querySelector("#lesson-topic"),
  lessonTitle: document.querySelector("#lesson-title"),
  lessonDescription: document.querySelector("#lesson-description"),
  lessonMeta: document.querySelector("#lesson-meta"),
  keywordRow: document.querySelector("#keyword-row"),
  viewTabs: document.querySelectorAll(".view-tab"),
  views: {
    guide: document.querySelector("#guide-view"),
    check: document.querySelector("#check-view"),
    issues: document.querySelector("#issues-view"),
    regulations: document.querySelector("#regulations-view"),
    video: document.querySelector("#video-view")
  },
  guideView: document.querySelector("#guide-view"),
  processStrip: document.querySelector("#process-strip"),
  prevStep: document.querySelector("#prev-step"),
  nextStep: document.querySelector("#next-step"),
  stepKicker: document.querySelector("#step-kicker"),
  stepTitle: document.querySelector("#step-title"),
  stepWhy: document.querySelector("#step-why"),
  stepAction: document.querySelector("#step-action"),
  stepResult: document.querySelector("#step-result"),
  stepPanel: document.querySelector("#step-panel"),
  stepCopyColumn: document.querySelector("#step-copy-column"),
  stepCopy: document.querySelector("#step-copy"),
  stepSlides: document.querySelector("#step-slides"),
  stepComplete: document.querySelector("#step-complete"),
  lightbox: document.querySelector("#image-lightbox"),
  lightboxImage: document.querySelector("#lightbox-image"),
  lightboxCaption: document.querySelector("#lightbox-caption"),
  lightboxClose: document.querySelector("#lightbox-close"),
  checklist: document.querySelector("#checklist"),
  mistakeGrid: document.querySelector("#mistake-grid"),
  mistakeDetail: document.querySelector("#mistake-detail"),
  lessonRegulationGrid: document.querySelector("#lesson-regulation-grid"),
  lessonRegulationDetail: document.querySelector("#lesson-regulation-detail"),
  sourceVideo: document.querySelector("#source-video"),
  videoTitle: document.querySelector("#video-title"),
  videoNote: document.querySelector("#video-note"),
  videoLink: document.querySelector("#video-link"),
  libraryLayout: document.querySelector("#library-layout"),
  toolsLayout: document.querySelector("#tools-layout"),
  developLayout: document.querySelector("#develop-layout"),
  modeButtons: document.querySelectorAll(".mode-btn"),
  railLibrary: document.querySelector("#rail-library"),
  railRegulations: document.querySelector("#rail-regulations"),
  railPackaging: document.querySelector("#rail-packaging"),
  railBottom: document.querySelector(".rail-bottom"),
  editLesson: document.querySelector("#edit-lesson"),
  saveLesson: document.querySelector("#save-lesson"),
  openBuilder: document.querySelector("#open-builder")
};

const editableLessonFields = () => [
  nodes.lessonTopic,
  nodes.lessonTitle,
  nodes.lessonDescription,
  nodes.stepTitle,
  nodes.stepWhy,
  nodes.stepAction,
  nodes.stepResult
];

function normalize(value) {
  return value.toLowerCase().replaceAll("ё", "е").trim();
}

function searchTerms(query) {
  const base = normalize(query)
    .split(/[\s,.;:!?]+/)
    .filter((term) => term.length > 1);

  return [...new Set(base.flatMap((term) => [term, ...(synonyms[term] || []).map(normalize)]))];
}

function regulationById(id) {
  return regulations.find((item) => item.id === id);
}

function lessonRegulations(material) {
  const ids = material?.regulationIds || [];
  return ids.map((id) => regulationById(id)).filter(Boolean);
}

function regulationText(item) {
  return normalize([item.title, item.text, item.url].join(" "));
}

function scoreRegulation(item, query) {
  const terms = searchTerms(query);
  if (!terms.length) return 1;
  const haystack = regulationText(item);
  const title = normalize(item.title);
  return terms.reduce((score, term) => {
    if (title.includes(term)) return score + 4;
    if (haystack.includes(term)) return score + 1;
    return score;
  }, 0);
}

function filteredRegulations() {
  return regulations
    .map((item) => ({ item, score: scoreRegulation(item, state.query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function selectedRegulation() {
  return regulationById(state.selectedRegulationId) || filteredRegulations()[0] || regulations[0];
}

function packagingById(id) {
  return packagingItems.find((item) => item.id === id);
}

function packagingText(item) {
  const articles = [].concat(item.articles || item.article || []).filter(Boolean);
  const barcodes = [].concat(item.barcodes || item.barcode || []).filter(Boolean);
  return normalize(
    [
      item.name,
      item.packagingType,
      ...articles,
      ...barcodes,
      item.text,
      ...(item.images || []).map((img) => img.caption),
    ].join(" ")
  );
}

function scorePackaging(item, query) {
  const terms = searchTerms(query);
  if (!terms.length) return 1;
  const haystack = packagingText(item);
  const name = normalize(item.name);
  const type = normalize(item.packagingType);
  const articles = normalize([].concat(item.articles || item.article || []).join(" "));
  const barcodes = normalize([].concat(item.barcodes || item.barcode || []).join(" "));
  return terms.reduce((score, term) => {
    if (name.includes(term)) return score + 4;
    if (type.includes(term)) return score + 3;
    if (articles.includes(term) || barcodes.includes(term)) return score + 3;
    if (haystack.includes(term)) return score + 1;
    return score;
  }, 0);
}

function filteredPackaging() {
  return packagingItems
    .map((item) => ({ item, score: scorePackaging(item, state.query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

function selectedPackaging() {
  return packagingById(state.selectedPackagingId) || filteredPackaging()[0] || packagingItems[0];
}

function selectPackaging(id) {
  state.selectedPackagingId = id;
  renderShell();
}

function materialText(material) {
  const linkedRegs = lessonRegulations(material)
    .map((item) => `${item.title} ${item.text}`)
    .join(" ");
  return normalize(
    [
      material.topic,
      material.title,
      material.description,
      material.role,
      material.duration,
      material.keywords.join(" "),
      material.steps.map((step) => `${step.title} ${step.why} ${step.action} ${step.result}`).join(" "),
      material.checklist.join(" "),
      material.issues.map((issue) => `${issue.title} ${issue.text}`).join(" "),
      linkedRegs
    ].join(" ")
  );
}

function scoreMaterial(material, query) {
  const terms = searchTerms(query);
  if (!terms.length) return 1;

  const haystack = materialText(material);
  const title = normalize(`${material.topic} ${material.title} ${material.keywords.join(" ")}`);
  return terms.reduce((score, term) => {
    if (title.includes(term)) return score + 4;
    if (haystack.includes(term)) return score + 1;
    return score;
  }, 0);
}

function filteredMaterials() {
  return materials
    .map((material) => ({ material, score: scoreMaterial(material, state.query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.material);
}

function selectedMaterial() {
  return materials.find((material) => material.id === state.selectedMaterialId) || materials[0];
}

function completedSet(materialId = state.selectedMaterialId) {
  if (!state.completed[materialId]) {
    state.completed[materialId] = new Set();
  }
  return state.completed[materialId];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function annotationLabels(annotations = []) {
  return new Set(
    annotations
      .filter((item) => item?.label)
      .map((item) => String(item.label))
  );
}

function labelsFromScreenshots(screenshots) {
  const labels = new Set();
  screenshots.forEach((shot) => {
    annotationLabels(shot.annotations).forEach((label) => labels.add(label));
  });
  return labels;
}

function plainTextFromHtml(value) {
  const div = document.createElement("div");
  div.innerHTML = String(value || "");
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

function sanitizeLessonHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowed = new Set(["STRONG", "B", "SPAN", "BR", "P", "DIV"]);
  const walk = (node) => {
    [...node.children].forEach((child) => {
      if (!allowed.has(child.tagName)) {
        child.replaceWith(document.createTextNode(child.textContent || ""));
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

function renderRichText(html) {
  return sanitizeLessonHtml(html);
}

function renderInteractiveActionHtml(html, labels) {
  const source = String(html || "");
  if (!plainTextFromHtml(source)) return "";
  const labelSet = labels instanceof Set ? labels : new Set(labels);
  const container = document.createElement("div");
  container.innerHTML = sanitizeLessonHtml(source);

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (!text || !labelSet.size) return;
      const re = /\{(\d+)\}/g;
      if (!re.test(text)) return;
      re.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let last = 0;
      let match;
      while ((match = re.exec(text)) !== null) {
        fragment.append(document.createTextNode(text.slice(last, match.index)));
        const label = match[1];
        if (labelSet.has(label)) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "action-ref-btn";
          button.dataset.label = label;
          button.textContent = `{${label}}`;
          fragment.append(button);
        } else {
          fragment.append(document.createTextNode(match[0]));
        }
        last = match.index + match[0].length;
      }
      fragment.append(document.createTextNode(text.slice(last)));
      node.replaceWith(fragment);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      [...node.childNodes].forEach(walk);
    }
  };

  [...container.childNodes].forEach(walk);
  return container.innerHTML;
}

function renderInteractiveAction(text, labels) {
  const source = String(text || "");
  if (source.includes("<")) {
    return renderInteractiveActionHtml(source, labels);
  }
  if (!source.trim()) return "";
  const labelSet = labels instanceof Set ? labels : new Set(labels);
  const parts = [];
  const re = /\{(\d+)\}/g;
  let last = 0;
  let match;
  while ((match = re.exec(source)) !== null) {
    parts.push(escapeHtml(source.slice(last, match.index)));
    const label = match[1];
    if (labelSet.has(label)) {
      parts.push(
        `<button type="button" class="action-ref-btn" data-label="${escapeHtml(label)}">{${escapeHtml(label)}}</button>`
      );
    } else {
      parts.push(escapeHtml(match[0]));
    }
    last = match.index + match[0].length;
  }
  parts.push(escapeHtml(source.slice(last)));
  return parts.join("");
}

function splitActionLines(source) {
  const text = String(source || "");
  if (!text.trim()) return [];

  const normalized = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div[^>]*>/gi, "");

  return normalized
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => plainTextFromHtml(line).length > 0);
}

function renderActionLineContent(line, labels) {
  const labelSet = labels instanceof Set ? labels : new Set(labels);
  const hasRefs = labelSet.size > 0 && /\{\d+\}/.test(line);
  if (!hasRefs) return renderRichText(line);
  if (line.includes("<")) return renderInteractiveActionHtml(line, labelSet);
  return renderInteractiveAction(line, labelSet);
}

function actionLineMarker(index) {
  const letter = String.fromCharCode(65 + (index % 26));
  return `<span class="action-line-marker" aria-hidden="true">${letter}</span>`;
}

function renderActionLines(source, labels) {
  const lines = splitActionLines(source);
  if (!lines.length) return "";

  const body = lines
    .map(
      (line, index) =>
        `<div class="action-line">${actionLineMarker(index)}<span class="action-line-text">${renderActionLineContent(line, labels)}</span></div>`
    )
    .join("");

  return `<div class="action-lines">${body}</div>`;
}

function highlightActionLine(label) {
  document.querySelectorAll(".action-line").forEach((line) => {
    line.classList.remove("is-highlighted");
  });
  if (!label) return;
  const button = document.querySelector(`.action-ref-btn[data-label="${CSS.escape(String(label))}"]`);
  button?.closest(".action-line")?.classList.add("is-highlighted");
}

function markerStyle(item, width, height) {
  const w = Number(width) || 1;
  const h = Number(height) || 1;
  if (item.type === "rect") {
    return {
      left: `${(item.x / w) * 100}%`,
      top: `${(item.y / h) * 100}%`,
      width: `${(item.w / w) * 100}%`,
      height: `${(item.h / h) * 100}%`,
    };
  }
  if (item.type === "circle") {
    const diameter = item.r * 2;
    return {
      left: `${((item.cx - item.r) / w) * 100}%`,
      top: `${((item.cy - item.r) / h) * 100}%`,
      width: `${(diameter / w) * 100}%`,
      height: `${(diameter / h) * 100}%`,
    };
  }
  return null;
}

function renderScreenshotMarkers(annotations, width, height, pulseLabel = "") {
  return (annotations || [])
    .filter((item) => item?.label && (item.type === "rect" || item.type === "circle"))
    .map((item) => {
      const style = markerStyle(item, width, height);
      if (!style) return "";
      const pulse = pulseLabel === String(item.label) ? " is-pulsing" : "";
      const shapeClass = item.type === "circle" ? " screenshot-marker-circle" : "";
      const styleText = Object.entries(style)
        .map(([key, value]) => `${key}:${value}`)
        .join(";");
      return `<div class="screenshot-marker${shapeClass}${pulse}" data-label="${escapeHtml(String(item.label))}" style="${styleText}">
        <span class="screenshot-marker-badge">${escapeHtml(String(item.label))}</span>
      </div>`;
    })
    .join("");
}

let pulseTimer = null;

function renderScreenshotFigureHtml(item, index, total, step) {
  const caption = item.caption
    ? `<figcaption>${item.caption}${total > 1 ? ` · скрин ${index + 1}` : ""}</figcaption>`
    : total > 1
      ? `<figcaption>Скриншот ${index + 1}</figcaption>`
      : "";
  return `<figure class="screenshot-frame">
    <button class="screenshot-zoom" type="button" aria-label="Открыть скриншот крупно" data-image-index="${index}">
      <span class="screenshot-media">
        <img src="${item.image}" alt="Скриншот: ${step.title}${total > 1 ? ` (${index + 1})` : ""}" data-shot-index="${index}" />
        ${
          item.annotations?.length
            ? `<div class="screenshot-overlay">${renderScreenshotMarkers(item.annotations, item.width, item.height)}</div>`
            : ""
        }
      </span>
    </button>
    ${caption}
  </figure>`;
}

function slideIndexForLabel(label, screenshots = []) {
  const index = screenshots.findIndex((shot) =>
    shot.annotations?.some((item) => String(item.label) === String(label))
  );
  return index >= 0 ? index : 0;
}

function setActiveSlide(index, screenshots = [], { scroll = false } = {}) {
  const slides = nodes.stepSlides;
  if (!slides) return;

  const rows = slides.querySelectorAll(".step-slide-row");
  if (!rows.length) {
    state.activeSlideIndex = 0;
    if (nodes.stepCopyColumn) nodes.stepCopyColumn.style.transform = "";
    return;
  }

  const safeIndex = Math.max(0, Math.min(rows.length - 1, index));
  state.activeSlideIndex = safeIndex;

  rows.forEach((row) => {
    const isActive = Number(row.dataset.shotIndex) === safeIndex;
    row.classList.toggle("is-slide-active", isActive);
    if (slides.classList.contains("has-carousel")) {
      row.hidden = !isActive;
    }
  });

  const counter = slides.querySelector(".slide-carousel-counter");
  if (counter) {
    counter.textContent = `${safeIndex + 1} / ${rows.length}`;
  }

  const prevBtn = slides.querySelector(".slide-carousel-prev");
  const nextBtn = slides.querySelector(".slide-carousel-next");
  if (prevBtn) prevBtn.disabled = safeIndex <= 0;
  if (nextBtn) nextBtn.disabled = safeIndex >= rows.length - 1;

  if (nodes.stepCopyColumn) nodes.stepCopyColumn.style.transform = "";

  if (scroll) {
    const anchor = nodes.stepCopyColumn || slides;
    const targetTop = anchor.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, targetTop - 72), behavior: "smooth" });
  }
}

function layoutStepSlides(screenshots, step, labels) {
  const panel = nodes.stepPanel;
  const slides = nodes.stepSlides;
  if (!panel || !slides) return;

  const multi = screenshots.length > 1;
  panel.classList.toggle("has-slide-rows", multi);
  slides.className = multi ? "step-slides has-carousel" : "step-slides";
  slides.innerHTML = "";

  if (!screenshots.length) {
    slides.innerHTML = `<div class="screenshot-gallery"><div class="screenshot-frame"><p class="screenshot-empty">Скриншот не добавлен</p></div></div>`;
    state.activeSlideIndex = 0;
    return;
  }

  let viewport = slides;
  if (multi) {
    slides.innerHTML = `
      <div class="slide-carousel-toolbar">
        <button type="button" class="slide-carousel-btn slide-carousel-prev" aria-label="Предыдущий скриншот">‹</button>
        <span class="slide-carousel-counter"></span>
        <button type="button" class="slide-carousel-btn slide-carousel-next" aria-label="Следующий скриншот">›</button>
      </div>
      <div class="slide-carousel-viewport"></div>
    `;
    viewport = slides.querySelector(".slide-carousel-viewport");
  }

  screenshots.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "step-slide-row";
    row.dataset.shotIndex = String(index);
    if (multi) row.hidden = true;

    const gallery = document.createElement("div");
    gallery.className = "screenshot-gallery";
    gallery.innerHTML = renderScreenshotFigureHtml(item, index, screenshots.length, step);
    row.appendChild(gallery);
    viewport.appendChild(row);
  });

  const activeIndex = Math.min(state.activeSlideIndex ?? 0, screenshots.length - 1);
  setActiveSlide(activeIndex, screenshots);
}

function goToSlide(index, screenshots, { scroll = false } = {}) {
  setActiveSlide(index, screenshots, { scroll });
}

function bindScreenshotHandlers(screenshots, labels) {
  nodes.stepSlides?.querySelectorAll(".screenshot-zoom").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (event.target.closest(".screenshot-marker, .action-ref-btn")) return;
      const item = screenshots[Number(button.dataset.imageIndex)];
      if (!item) return;
      nodes.lightboxImage.src = item.image;
      nodes.lightboxImage.alt = button.querySelector("img")?.alt || "";
      nodes.lightboxCaption.textContent = item.caption || "";
      nodes.lightbox.hidden = false;
    });
  });

  nodes.stepSlides?.querySelector(".slide-carousel-prev")?.addEventListener("click", () => {
    goToSlide(state.activeSlideIndex - 1, screenshots);
  });
  nodes.stepSlides?.querySelector(".slide-carousel-next")?.addEventListener("click", () => {
    goToSlide(state.activeSlideIndex + 1, screenshots);
  });

  nodes.stepSlides?.querySelectorAll("img[data-shot-index]").forEach((img) => {
    img.addEventListener("load", () => {
      const shot = screenshots[Number(img.dataset.shotIndex)];
      if (!shot?.annotations?.length || shot.width) return;
      shot.width = img.naturalWidth;
      shot.height = img.naturalHeight;
      const overlay = img.parentElement?.querySelector(".screenshot-overlay");
      if (overlay) {
        overlay.innerHTML = renderScreenshotMarkers(shot.annotations, shot.width, shot.height);
        overlay.querySelectorAll(".screenshot-marker").forEach((marker) => {
          marker.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            pulseScreenshotLabel(marker.dataset.label, screenshots);
          });
        });
      }
    });
  });

  bindInteractiveLessonHandlers(screenshots, labels);
}

function pulseScreenshotLabel(label, screenshots = []) {
  if (pulseTimer) {
    clearTimeout(pulseTimer);
    pulseTimer = null;
  }
  highlightActionLine(label);
  document.querySelectorAll(".screenshot-marker, .action-ref-btn").forEach((node) => {
    node.classList.toggle("is-pulsing", node.dataset.label === String(label));
  });
  const target = document.querySelector(`.screenshot-marker[data-label="${CSS.escape(String(label))}"]`);
  let slideIndex = slideIndexForLabel(label, screenshots);
  if (target) {
    const row = target.closest(".step-slide-row");
    if (row) slideIndex = Number(row.dataset.shotIndex);
  }
  if (screenshots.length) {
    goToSlide(slideIndex, screenshots, { scroll: true });
  } else {
    target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  pulseTimer = window.setTimeout(() => {
    document.querySelectorAll(".is-pulsing").forEach((node) => node.classList.remove("is-pulsing"));
    pulseTimer = null;
  }, 2400);
}

function bindInteractiveLessonHandlers(screenshots, labels) {
  document.querySelectorAll(".action-ref-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      pulseScreenshotLabel(button.dataset.label, screenshots);
    });
  });
  document.querySelectorAll(".screenshot-marker").forEach((marker) => {
    marker.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      pulseScreenshotLabel(marker.dataset.label, screenshots);
    });
  });
}

function renderTopics(items) {
  const topics = [...new Set(materials.map((material) => material.topic))];
  if (nodes.topicsCount) {
    nodes.topicsCount.textContent = String(topics.length);
  }
  const currentTopic = selectedMaterial()?.topic || "";
  const label = nodes.topicsDropdown?.querySelector(".topics-dropdown-label");
  if (label) {
    label.textContent = currentTopic ? `Тема: ${currentTopic}` : "Темы";
  }

  nodes.topicList.innerHTML = topics
    .map((topic) => {
      const count = items.filter((material) => material.topic === topic).length;
      const active = currentTopic === topic ? " is-active" : "";
      return `<button class="topic-button${active}" type="button" data-topic="${topic}">
        <span>${topic}</span><strong>${count}</strong>
      </button>`;
    })
    .join("");

  nodes.topicList.querySelectorAll(".topic-button").forEach((button) => {
    button.addEventListener("click", () => {
      const firstInTopic = materials.find((material) => material.topic === button.dataset.topic);
      if (firstInTopic) selectMaterial(firstInTopic.id);
    });
  });
}

function renderRegulationList(items) {
  if (!nodes.regulationList) return;
  if (!items.length) {
    nodes.regulationList.innerHTML = `<div class="empty-state">Регламенты пока не добавлены.</div>`;
    return;
  }

  nodes.regulationList.innerHTML = items
    .map((item) => {
      const active = item.id === state.selectedRegulationId ? " is-active" : "";
      return `<button class="material-card${active}" type="button" data-regulation="${item.id}">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.id)}</small>
      </button>`;
    })
    .join("");

  nodes.regulationList.querySelectorAll("[data-regulation]").forEach((button) => {
    button.addEventListener("click", () => selectRegulation(button.dataset.regulation));
  });
}

function renderRegulationPage() {
  const item = selectedRegulation();
  if (!item) {
    nodes.regulationPageTitle.textContent = "Регламенты";
    nodes.regulationPageLead.textContent = "Создайте регламенты в конструкторе.";
    nodes.regulationPageBody.innerHTML = "";
    return;
  }

  nodes.regulationPageTitle.textContent = item.title;
  nodes.regulationPageLead.textContent = item.url ? "Документ и текст регламента." : "Текст регламента.";
  const link = item.url
    ? `<a class="file-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Открыть документ</a>`
    : "";
  const text = item.text ? `<div class="regulation-page-text">${renderRichText(item.text)}</div>` : "";
  nodes.regulationPageBody.innerHTML = `${link}${text}`;
}

function renderPackagingList(items) {
  if (!nodes.packagingList) return;
  if (!items.length) {
    nodes.packagingList.innerHTML = `<div class="empty-state">Упаковка пока не добавлена.</div>`;
    return;
  }

  nodes.packagingList.innerHTML = items
    .map((item) => {
      const active = item.id === state.selectedPackagingId ? " is-active" : "";
      const articles = [].concat(item.articles || item.article || []).filter(Boolean);
      const barcodes = [].concat(item.barcodes || item.barcode || []).filter(Boolean);
      const meta = [item.packagingType, articles[0], barcodes[0]].filter(Boolean).join(" · ") || item.id;
      return `<button class="material-card${active}" type="button" data-packaging="${item.id}">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(meta)}</small>
      </button>`;
    })
    .join("");

  nodes.packagingList.querySelectorAll("[data-packaging]").forEach((button) => {
    button.addEventListener("click", () => selectPackaging(button.dataset.packaging));
  });
}

function renderPackagingPage() {
  if (!nodes.packagingPageTitle) return;
  const item = selectedPackaging();
  if (!item) {
    nodes.packagingPageTitle.textContent = "Упаковка";
    nodes.packagingPageLead.textContent = "Создайте карточки упаковки в конструкторе.";
    if (nodes.packagingPageMeta) nodes.packagingPageMeta.innerHTML = "";
    nodes.packagingPageBody.innerHTML = "";
    return;
  }

  nodes.packagingPageTitle.textContent = item.name;
  nodes.packagingPageLead.textContent = item.packagingType
    ? `Тип: ${item.packagingType}`
    : "Описание и фотографии упаковки.";
  const articles = [].concat(item.articles || item.article || []).filter(Boolean);
  const barcodes = [].concat(item.barcodes || item.barcode || []).filter(Boolean);
  const metaParts = [];
  if (item.packagingType) {
    metaParts.push(`<span><small>Тип</small><strong>${escapeHtml(item.packagingType)}</strong></span>`);
  }
  if (articles.length) {
    metaParts.push(
      `<span><small>Артикул${articles.length > 1 ? "ы" : ""}</small><strong>${escapeHtml(articles.join(", "))}</strong></span>`
    );
  }
  if (barcodes.length) {
    metaParts.push(
      `<span><small>Баркод${barcodes.length > 1 ? "ы" : ""}</small><strong>${escapeHtml(barcodes.join(", "))}</strong></span>`
    );
  }
  if (nodes.packagingPageMeta) nodes.packagingPageMeta.innerHTML = metaParts.join("");

  const text = item.text ? `<div class="regulation-page-text">${renderRichText(item.text)}</div>` : "";
  const images = Array.isArray(item.images) ? item.images.filter((entry) => entry?.image) : [];
  const gallery = images.length
    ? `<div class="packaging-gallery">${images
        .map(
          (entry, index) => `<button class="packaging-gallery-item" type="button" data-packaging-image="${index}">
            <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.caption || item.name)}" />
            ${entry.caption ? `<span>${escapeHtml(entry.caption)}</span>` : ""}
          </button>`
        )
        .join("")}</div>`
    : "";

  nodes.packagingPageBody.innerHTML = `${text}${gallery}`;
  nodes.packagingPageBody.querySelectorAll("[data-packaging-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.packagingImage);
      const entry = images[index];
      if (!entry || !nodes.lightbox) return;
      nodes.lightboxImage.src = entry.image;
      nodes.lightboxImage.alt = entry.caption || item.name;
      nodes.lightboxCaption.textContent = entry.caption || "";
      nodes.lightbox.hidden = false;
    });
  });
}

function renderMaterialList(items) {
  if (!items.length) {
    nodes.materialList.innerHTML = `<div class="empty-state">По такому запросу пока ничего не найдено.</div>`;
    return;
  }

  nodes.materialList.innerHTML = items
    .map((material) => {
      const active = material.id === state.selectedMaterialId ? " is-active" : "";
      return `<button class="material-card${active}" type="button" data-material="${material.id}">
        <strong>${material.title}</strong>
        <small>${material.steps.length} шагов · ${material.duration}</small>
      </button>`;
    })
    .join("");

  nodes.materialList.querySelectorAll(".material-card").forEach((button) => {
    button.addEventListener("click", () => selectMaterial(button.dataset.material));
  });
}

function stepScreenshots(step) {
  if (Array.isArray(step.images) && step.images.length) {
    return step.images;
  }
  if (step.image) {
    return [{ image: step.image, caption: step.caption || "" }];
  }
  return [];
}

function renderLesson() {
  const material = selectedMaterial();
  if (!material) {
    nodes.lessonTopic.textContent = "";
    nodes.lessonTitle.textContent = "Материалы пока не опубликованы";
    nodes.lessonDescription.textContent = "Создайте урок в конструкторе и опубликуйте его в учебную базу.";
    nodes.lessonMeta.innerHTML = "";
    nodes.keywordRow.innerHTML = "";
    nodes.processStrip.innerHTML = "";
    nodes.stepKicker.textContent = "";
    nodes.stepTitle.textContent = "";
    nodes.stepWhy.innerHTML = "";
    nodes.stepAction.innerHTML = "";
    nodes.stepResult.innerHTML = "";
    if (nodes.stepSlides) nodes.stepSlides.innerHTML = "";
    nodes.checklist.innerHTML = "";
    nodes.mistakeGrid.innerHTML = "";
    nodes.mistakeDetail.textContent = "";
    if (nodes.lessonRegulationGrid) nodes.lessonRegulationGrid.innerHTML = "";
    if (nodes.lessonRegulationDetail) nodes.lessonRegulationDetail.innerHTML = "";
    return;
  }
  const step = material.steps[state.currentStep] || material.steps[0];

  nodes.lessonTopic.textContent = material.topic;
  nodes.lessonTitle.textContent = material.title;
  const description = (material.description || "").trim();
  nodes.lessonDescription.textContent = description;
  nodes.lessonDescription.classList.toggle("hidden", !description);
  const doneCount = completedSet(material.id).size;
  nodes.lessonMeta.innerHTML = `<span>Роль: ${material.role}</span><span>Время: ${material.duration}</span><span>Понятно: ${doneCount}/${material.steps.length}</span>`;
  const tags = [...new Set([...material.keywords, "Инструкция", "Контроль", "Ошибки", "Регламенты", "Исходное видео"])];
  nodes.keywordRow.innerHTML = tags.map((keyword) => `<span>${keyword}</span>`).join("");

  nodes.processStrip.innerHTML = material.steps
    .map((item, index) => {
      const active = index === state.currentStep ? " is-active" : "";
      const number = String(index + 1).padStart(2, "0");
      return `<button class="process-step${active}" type="button" data-step="${index}">
        <span>${number}</span><strong>${item.title}</strong>
      </button>`;
    })
    .join("");

  nodes.processStrip.querySelectorAll(".process-step").forEach((button) => {
    button.addEventListener("click", () => setStep(Number(button.dataset.step)));
  });

  nodes.stepKicker.textContent = `Шаг ${state.currentStep + 1} из ${material.steps.length}`;
  nodes.stepTitle.textContent = step.title;
  nodes.stepWhy.innerHTML = renderRichText(step.why);
  const screenshots = stepScreenshots(step);
  const labels = labelsFromScreenshots(screenshots);
  if (state.editMode) {
    nodes.stepAction.innerHTML = renderRichText(step.action);
  } else {
    nodes.stepAction.innerHTML = renderActionLines(step.action, labels);
  }
  nodes.stepResult.innerHTML = renderRichText(step.result);
  state.activeSlideIndex = 0;
  layoutStepSlides(screenshots, step, labels);
  bindScreenshotHandlers(screenshots, labels);
  nodes.stepComplete.checked = completedSet(material.id).has(state.currentStep);

  nodes.checklist.innerHTML = material.checklist
    .map((item) => `<label><input type="checkbox" /><span>${item}</span></label>`)
    .join("");

  nodes.mistakeGrid.innerHTML = material.issues
    .map((issue, index) => {
      const active = index === state.currentIssue ? " is-active" : "";
      return `<button class="mistake${active}" type="button" data-issue="${index}">
        <strong>${issue.title}</strong><span>${issue.text}</span>
      </button>`;
    })
    .join("");
  nodes.mistakeDetail.textContent = material.issues[state.currentIssue]?.text || "";
  nodes.mistakeGrid.querySelectorAll(".mistake").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentIssue = Number(button.dataset.issue);
      renderLesson();
    });
  });

  const linkedRegulations = lessonRegulations(material);
  if (!linkedRegulations.length) {
    nodes.lessonRegulationGrid.innerHTML = `<div class="empty-state light-empty">К этому уроку регламенты не привязаны.</div>`;
    nodes.lessonRegulationDetail.innerHTML = "";
  } else {
    nodes.lessonRegulationGrid.innerHTML = linkedRegulations
      .map((item, index) => {
        const active = index === state.currentRegulation ? " is-active" : "";
        return `<button class="regulation-item${active}" type="button" data-regulation-index="${index}">
          <strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(truncatePlain(item.text, 96))}</span>
        </button>`;
      })
      .join("");
    const current = linkedRegulations[state.currentRegulation] || linkedRegulations[0];
    const link = current.url
      ? `<a class="file-link" href="${escapeHtml(current.url)}" target="_blank" rel="noreferrer">Открыть документ</a>`
      : "";
    nodes.lessonRegulationDetail.innerHTML = `${link}<div class="regulation-page-text">${renderRichText(current.text || "")}</div>`;
    nodes.lessonRegulationGrid.querySelectorAll(".regulation-item").forEach((button) => {
      button.addEventListener("click", () => {
        state.currentRegulation = Number(button.dataset.regulationIndex);
        renderLesson();
      });
    });
  }

  nodes.videoTitle.textContent = material.title;
  nodes.videoNote.textContent = material.videoNote;
  nodes.videoLink.href = material.sourceVideo;
  syncVideoSource();
  setLessonEditMode(state.editMode);
  updateLessonActionButtons(material);
}

function syncVideoSource() {
  const material = selectedMaterial();
  if (state.currentView === "video") {
    if (nodes.sourceVideo.getAttribute("src") !== material.sourceVideo) {
      nodes.sourceVideo.src = material.sourceVideo;
      nodes.sourceVideo.load();
    }
    return;
  }

  nodes.sourceVideo.pause();
  nodes.sourceVideo.removeAttribute("src");
  nodes.sourceVideo.load();
}

function truncatePlain(value, max = 96) {
  const text = plainTextFromHtml(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function renderShell() {
  if (state.mode === "regulations") {
    const items = filteredRegulations();
    nodes.regulationsMatchCount.textContent = String(items.length);
    if (items.length && !items.some((item) => item.id === state.selectedRegulationId)) {
      state.selectedRegulationId = items[0].id;
    }
    renderRegulationList(items);
    renderRegulationPage();
    return;
  }

  if (state.mode === "packaging") {
    const items = filteredPackaging();
    if (nodes.packagingMatchCount) nodes.packagingMatchCount.textContent = String(items.length);
    if (items.length && !items.some((item) => item.id === state.selectedPackagingId)) {
      state.selectedPackagingId = items[0].id;
    }
    renderPackagingList(items);
    renderPackagingPage();
    return;
  }

  const items = filteredMaterials();
  nodes.matchCount.textContent = String(items.length);
  nodes.materialsCount.textContent = String(materials.length);
  nodes.stepsCount.textContent = String(materials.reduce((sum, material) => sum + material.steps.length, 0));
  nodes.videosCount.textContent = String(materials.filter((material) => material.sourceVideo).length);
  renderTopics(items);
  renderMaterialList(items);
}

function setStep(index) {
  if (state.editMode) {
    readLessonEditsFromDom(selectedMaterial());
  }
  const material = selectedMaterial();
  state.currentStep = Math.max(0, Math.min(material.steps.length - 1, index));
  renderLesson();
}

function selectRegulation(id) {
  state.selectedRegulationId = id;
  renderShell();
}

function selectMaterial(id) {
  if (state.editMode) {
    readLessonEditsFromDom(selectedMaterial());
  }
  state.editMode = false;
  state.selectedMaterialId = id;
  state.currentStep = 0;
  state.currentIssue = 0;
  state.currentRegulation = 0;
  renderShell();
  renderLesson();
}

function setMode(mode) {
  state.mode = mode;
  const isLibrary = mode === "library";
  const isRegulations = mode === "regulations";
  const isPackaging = mode === "packaging";
  const isTools = mode === "tools";
  const isDevelop = mode === "develop";
  nodes.libraryLayout.classList.toggle("hidden", !isLibrary);
  nodes.regulationsLayout?.classList.toggle("hidden", !isRegulations);
  nodes.packagingLayout?.classList.toggle("hidden", !isPackaging);
  nodes.toolsLayout?.classList.toggle("hidden", !isTools);
  nodes.developLayout.classList.toggle("hidden", !isDevelop);
  document.querySelector(".topbar").classList.toggle("hidden", isDevelop || isTools);
  nodes.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  nodes.railLibrary?.classList.toggle("hidden", !isLibrary);
  nodes.railRegulations?.classList.toggle("hidden", !isRegulations);
  nodes.railPackaging?.classList.toggle("hidden", !isPackaging);
  nodes.railBottom?.classList.toggle("hidden", isDevelop || isTools);
  if (nodes.topbarTitle) {
    if (isRegulations) nodes.topbarTitle.textContent = "Регламенты";
    else if (isPackaging) nodes.topbarTitle.textContent = "Упаковка";
    else if (isTools) nodes.topbarTitle.textContent = "Инструменты";
    else nodes.topbarTitle.textContent = "Материалы";
  }
  if (isDevelop) {
    nodes.sourceVideo.pause();
    const material = selectedMaterial();
    syncDevelopFrame(state.developWorkspace === "lessons" ? material?.builderProjectId : "");
  } else if (isTools) {
    nodes.sourceVideo.pause();
    window.initNostradamusTools?.();
  } else if (isLibrary) {
    syncVideoSource();
    renderLesson();
  } else if (isRegulations || isPackaging) {
    nodes.sourceVideo.pause();
    renderShell();
  }
}

const BUILDER_LOCAL_URL = "http://127.0.0.1:8765/";
const BUILDER_ONLINE_PATH = "/obuchenie/builder/";

function isLocalHost() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

async function loadAuthUser() {
  try {
    const response = await fetch(`${builderApiBase()}/api/me`, { credentials: "include" });
    if (!response.ok) {
      state.user = null;
      return;
    }
    const payload = await response.json();
    state.user = payload.user || null;
  } catch {
    state.user = null;
  }
}

function builderApiBase() {
  if (isLocalHost()) return "http://127.0.0.1:8765";
  return `${window.location.origin}${BUILDER_ONLINE_PATH.replace(/\/$/, "")}`;
}

function canEditMaterial(material) {
  return state.user?.role === "admin" && publishedEditableIds.has(material.id);
}

function setLessonEditMode(enabled) {
  const step = selectedMaterial().steps[state.currentStep];
  if (enabled && step && nodes.stepAction) {
    nodes.stepAction.innerHTML = renderRichText(step.action || "");
  }
  if (enabled && step && nodes.stepWhy) {
    nodes.stepWhy.innerHTML = renderRichText(step.why || "");
  }
  if (enabled && step && nodes.stepResult) {
    nodes.stepResult.innerHTML = renderRichText(step.result || "");
  }
  state.editMode = enabled;
  editableLessonFields().forEach((node) => {
    if (!node) return;
    node.contentEditable = enabled ? "true" : "false";
    node.classList.toggle("is-editing", enabled);
    node.spellcheck = enabled;
  });
  nodes.editLesson?.classList.toggle("hidden", enabled || !canEditMaterial(selectedMaterial()));
  nodes.saveLesson?.classList.toggle("hidden", !enabled);
}

function readLessonEditsFromDom(material) {
  const step = material.steps[state.currentStep] || material.steps[0];
  material.topic = nodes.lessonTopic.textContent.trim();
  material.title = nodes.lessonTitle.textContent.trim();
  material.description = nodes.lessonDescription.textContent.trim();
  if (step) {
    step.title = nodes.stepTitle.textContent.trim();
    step.why = nodes.stepWhy.innerHTML.trim();
    step.action = nodes.stepAction.innerHTML.trim();
    step.result = nodes.stepResult.innerHTML.trim();
    if (step.caption !== undefined) {
      step.caption = step.title;
    }
  }
}

function updateLessonActionButtons(material) {
  const editable = canEditMaterial(material);
  nodes.editLesson?.classList.toggle("hidden", !editable || state.editMode);
  nodes.saveLesson?.classList.toggle("hidden", !state.editMode);
  nodes.openBuilder?.classList.toggle("hidden", !editable && !material.builderProjectId);
}

function builderUrl(projectId, workspace) {
  const base = builderUrlRoot();
  const root = base.endsWith("/") ? base : `${base}/`;
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (workspace && workspace !== "lessons") params.set("workspace", workspace);
  const qs = params.toString();
  return qs ? `${root}?${qs}` : root;
}

function builderUrlRoot() {
  if (isLocalHost()) return BUILDER_LOCAL_URL;
  return BUILDER_ONLINE_PATH;
}

function syncDevelopFrame(projectId) {
  const frame = document.querySelector("#develop-frame");
  const note = document.querySelector("#develop-note");
  const link = document.querySelector("#develop-open-link");
  if (!frame) return;

  const workspace = state.developWorkspace || "lessons";
  const url = builderUrl(projectId || "", workspace);
  if (link) link.href = url;
  if (frame.dataset.loadedUrl !== url) {
    frame.src = url;
    frame.dataset.loadedUrl = url;
  }
  frame.classList.remove("hidden");
  note?.classList.add("hidden");
  document.querySelectorAll(".develop-workspace-btn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.developWorkspace === workspace);
  });
}

async function saveLessonEdits() {
  const material = selectedMaterial();
  if (!canEditMaterial(material)) return;
  readLessonEditsFromDom(material);
  nodes.saveLesson.disabled = true;
  nodes.saveLesson.textContent = "Сохранение…";
  try {
    const response = await fetch(`${builderApiBase()}/api/published-lessons/${encodeURIComponent(material.id)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(material)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Не удалось сохранить урок.");
    }
    setLessonEditMode(false);
    updateLessonActionButtons(material);
    nodes.saveLesson.textContent = "Сохранить";
    alert(payload.message || "Урок сохранён.");
  } catch (error) {
    alert(error.message);
  } finally {
    nodes.saveLesson.disabled = false;
    if (!state.editMode) nodes.saveLesson.textContent = "Сохранить";
  }
}

nodes.modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

document.querySelectorAll(".develop-workspace-btn").forEach((button) => {
  button.addEventListener("click", () => {
    state.developWorkspace = button.dataset.developWorkspace || "lessons";
    const material = selectedMaterial();
    syncDevelopFrame(state.developWorkspace === "lessons" ? material?.builderProjectId : "");
    if (state.mode !== "develop") setMode("develop");
  });
});

function setView(view) {
  state.currentView = view;
  nodes.viewTabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  Object.entries(nodes.views).forEach(([name, node]) => {
    node.classList.toggle("is-active", name === view);
  });
  syncVideoSource();
}

nodes.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  if (state.mode === "regulations") {
    const items = filteredRegulations();
    if (items.length && !items.some((item) => item.id === state.selectedRegulationId)) {
      state.selectedRegulationId = items[0].id;
    }
    renderShell();
    return;
  }
  if (state.mode === "packaging") {
    const items = filteredPackaging();
    if (items.length && !items.some((item) => item.id === state.selectedPackagingId)) {
      state.selectedPackagingId = items[0].id;
    }
    renderShell();
    return;
  }
  const items = filteredMaterials();
  if (items.length && !items.some((material) => material.id === state.selectedMaterialId)) {
    state.selectedMaterialId = items[0].id;
    state.currentStep = 0;
  }
  renderShell();
  renderLesson();
});

nodes.viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

nodes.prevStep.addEventListener("click", () => setStep(state.currentStep - 1));
nodes.nextStep.addEventListener("click", () => setStep(state.currentStep + 1));

nodes.editLesson?.addEventListener("click", () => {
  enableLessonEditing();
});

nodes.saveLesson?.addEventListener("click", () => {
  saveLessonEdits();
});

nodes.openBuilder?.addEventListener("click", () => {
  const material = selectedMaterial();
  setMode("develop");
  syncDevelopFrame(material.builderProjectId);
});

editableLessonFields().forEach((node) => {
  node?.addEventListener("click", () => {
    if (!canEditMaterial(selectedMaterial())) return;
    if (!state.editMode) {
      enableLessonEditing();
    }
  });
});

function enableLessonEditing() {
  if (!canEditMaterial(selectedMaterial())) return;
  setLessonEditMode(true);
  updateLessonActionButtons(selectedMaterial());
}

nodes.stepComplete.addEventListener("change", () => {
  const set = completedSet();
  if (nodes.stepComplete.checked) {
    set.add(state.currentStep);
  } else {
    set.delete(state.currentStep);
  }
  renderLesson();
});

nodes.lightboxClose.addEventListener("click", () => {
  nodes.lightbox.hidden = true;
});

nodes.lightbox.addEventListener("click", (event) => {
  if (event.target === nodes.lightbox) {
    nodes.lightbox.hidden = true;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !nodes.lightbox.hidden) {
    nodes.lightbox.hidden = true;
  }
});

function setSidebarCollapsed(collapsed) {
  nodes.appShell.classList.toggle("is-sidebar-collapsed", collapsed);
  nodes.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
}

nodes.sidebarToggle.addEventListener("click", () => setSidebarCollapsed(true));
nodes.sidebarRestore.addEventListener("click", () => setSidebarCollapsed(false));

async function bootstrap() {
  await Promise.all([loadPublishedMaterials(), loadPublishedRegulations(), loadPublishedPackaging(), loadAuthUser()]);
  const params = new URLSearchParams(window.location.search);
  const lessonId = params.get("lesson");
  const regulationId = params.get("regulation");
  const packagingId = params.get("packaging");
  if (lessonId && materials.some((material) => material.id === lessonId)) {
    state.selectedMaterialId = lessonId;
  } else if (!state.selectedMaterialId && materials[0]) {
    state.selectedMaterialId = materials[0].id;
  }
  if (regulationId && regulationById(regulationId)) {
    state.selectedRegulationId = regulationId;
  } else if (!state.selectedRegulationId && regulations[0]) {
    state.selectedRegulationId = regulations[0].id;
  }
  if (packagingId && packagingById(packagingId)) {
    state.selectedPackagingId = packagingId;
  } else if (!state.selectedPackagingId && packagingItems[0]) {
    state.selectedPackagingId = packagingItems[0].id;
  }
  nodes.guideView?.classList.add("is-extended");
  renderShell();
  renderLesson();
  const view = params.get("view");
  if (view && nodes.views[view]) {
    setView(view);
  } else {
    setView("guide");
  }
  const mode = params.get("mode");
  if (mode === "regulations" || regulationId) {
    setMode("regulations");
  } else if (mode === "packaging" || packagingId) {
    setMode("packaging");
  } else if (mode === "tools") {
    setMode("tools");
  } else if (mode === "develop") {
    const workspace = params.get("workspace");
    if (workspace && ["lessons", "packaging", "regulations"].includes(workspace)) {
      state.developWorkspace = workspace;
    }
    setMode("develop");
  } else {
    setMode("library");
  }
}

bootstrap();

window.addEventListener("resize", () => {
  if (state.activeSlideIndex > 0 && nodes.stepCopyColumn) {
    nodes.stepCopyColumn.style.transform = "";
  }
});
