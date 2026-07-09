const PLACE_REGEX = /№\s*места\s*(\d+)/i;
const TOTAL_REGEX = /Всего\s+мест\s+(\d+)/i;

function parsePlaceNumber(text) {
  const match = PLACE_REGEX.exec(text || "");
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseTotalPlaces(text) {
  const match = TOTAL_REGEX.exec(text || "");
  return match ? Number.parseInt(match[1], 10) : null;
}

async function extractPageMeta(bytes) {
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push({
      index: pageNumber - 1,
      pageNumber,
      place: parsePlaceNumber(text),
      total: parseTotalPlaces(text)
    });
  }

  return pages;
}

function buildSortPlan(pages) {
  const withPlace = pages.filter((page) => Number.isFinite(page.place));
  const withoutPlace = pages.filter((page) => !Number.isFinite(page.place));
  const sorted = [...withPlace].sort((left, right) => {
    if (left.place !== right.place) return left.place - right.place;
    return left.index - right.index;
  });

  return {
    order: [...sorted, ...withoutPlace].map((page) => page.index),
    pages,
    missing: withoutPlace.map((page) => page.pageNumber),
    duplicates: findDuplicates(withPlace.map((page) => page.place)),
    totalDeclared: pages.find((page) => page.total)?.total ?? null
  };
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

async function sortPdfBytes(bytes, order) {
  const source = await PDFLib.PDFDocument.load(bytes);
  const target = await PDFLib.PDFDocument.create();
  const copied = await target.copyPages(source, order);
  copied.forEach((page) => target.addPage(page));
  return target.save();
}

function formatOrderLine(page) {
  if (!Number.isFinite(page.place)) return `стр. ${page.pageNumber} — номер не найден`;
  return `место ${page.place} → была стр. ${page.pageNumber}`;
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sortedFilename(originalName) {
  const base = (originalName || "cdek-labels.pdf").replace(/\.pdf$/i, "");
  return `${base}-sorted.pdf`;
}

export function initCdekTool(root) {
  if (!root || root.dataset.cdekReady === "true") return;
  root.dataset.cdekReady = "true";

  const dropzone = root.querySelector("#cdek-dropzone");
  const fileInput = root.querySelector("#cdek-file");
  const status = root.querySelector("#cdek-status");
  const preview = root.querySelector("#cdek-preview");
  const downloadBtn = root.querySelector("#cdek-download");
  const processBtn = root.querySelector("#cdek-process");

  let currentFile = null;
  let sortedBytes = null;
  let lastPlan = null;

  function setStatus(message, tone = "info") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function resetOutput() {
    sortedBytes = null;
    lastPlan = null;
    preview.innerHTML = "";
    downloadBtn.disabled = true;
    processBtn.disabled = !currentFile;
  }

  function renderPreview(plan) {
    const orderedPages = plan.order.map((index) => plan.pages.find((page) => page.index === index));
    const lines = orderedPages.map((page, position) => `${position + 1}. ${formatOrderLine(page)}`);
    const warnings = [];

    if (plan.missing.length) {
      warnings.push(`Не удалось прочитать номер места на страницах: ${plan.missing.join(", ")}. Они будут в конце.`);
    }
    if (plan.duplicates.length) {
      warnings.push(`Повторяющиеся номера мест: ${plan.duplicates.join(", ")}.`);
    }
    if (plan.totalDeclared && plan.totalDeclared !== plan.pages.length) {
      warnings.push(`В PDF ${plan.pages.length} стр., в этикетке указано всего мест: ${plan.totalDeclared}.`);
    }

    preview.innerHTML = [
      "<h3>Порядок печати</h3>",
      `<ol>${lines.map((line) => `<li>${line}</li>`).join("")}</ol>`,
      warnings.length ? `<div class="tools-warning">${warnings.join("<br>")}</div>` : ""
    ].join("");
  }

  async function processFile(file) {
    if (!file) return;
    currentFile = file;
    resetOutput();
    setStatus("Читаем PDF и определяем номера мест…", "info");
    processBtn.disabled = true;

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pages = await extractPageMeta(bytes);
      const plan = buildSortPlan(pages);
      lastPlan = plan;

      const alreadySorted = plan.order.every((index, position) => index === position);
      if (alreadySorted) {
        sortedBytes = bytes;
        renderPreview(plan);
        setStatus("Страницы уже идут по порядку. Можно скачать копию или отправить на печать.", "success");
        downloadBtn.disabled = false;
        return;
      }

      setStatus("Переставляем страницы…", "info");
      sortedBytes = await sortPdfBytes(bytes, plan.order);
      renderPreview(plan);
      setStatus(`Готово: ${plan.pages.length} стр. отсортированы по номеру места.`, "success");
      downloadBtn.disabled = false;
    } catch (error) {
      console.error(error);
      setStatus(error?.message || "Не удалось обработать PDF.", "error");
    } finally {
      processBtn.disabled = !currentFile;
    }
  }

  function pickFile(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      setStatus("Нужен файл в формате PDF.", "error");
      return;
    }
    currentFile = file;
    resetOutput();
    setStatus(`Выбран файл: ${file.name}. Нажмите «Отсортировать» или перетащите новый.`, "info");
    processBtn.disabled = false;
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragover"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
    pickFile(event.dataTransfer?.files?.[0]);
  });

  fileInput.addEventListener("change", () => pickFile(fileInput.files?.[0]));
  processBtn.addEventListener("click", () => processFile(currentFile));
  downloadBtn.addEventListener("click", () => {
    if (!sortedBytes || !currentFile) return;
    downloadBytes(sortedBytes, sortedFilename(currentFile.name));
  });

  setStatus("Загрузите PDF со штрихкодами СДЭК.", "info");
}
