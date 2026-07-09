const API_LOCAL_URL = "http://127.0.0.1:8767/convert";
const API_PROD_URL = "./api.php";

function isLocalHost() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function apiUrl() {
  return isLocalHost() ? API_LOCAL_URL : API_PROD_URL;
}

function outputFilename(originalName) {
  const base = (originalName || "stocks.xlsx").replace(/\.xlsx$/i, "");
  if (/инвент/i.test(base)) return `${base}.xlsx`;
  return `инвентаризация-${base}.xlsx`;
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function convertStocksToInventory(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl(), {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Не удалось собрать файл инвентаризации.");
  }

  const output = await response.arrayBuffer();
  const decodeHeader = (value) => {
    if (!value) return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  return {
    output,
    rows: response.headers.get("X-Inventa-Rows") || "",
    organization: decodeHeader(response.headers.get("X-Inventa-Organization")),
    sheetName: decodeHeader(response.headers.get("X-Inventa-Sheet"))
  };
}

export function initInventaTool(root) {
  if (!root || root.dataset.inventaReady === "true") return;
  root.dataset.inventaReady = "true";

  const dropzone = root.querySelector("#inventa-dropzone");
  const fileInput = root.querySelector("#inventa-file");
  const status = root.querySelector("#inventa-status");
  const processBtn = root.querySelector("#inventa-process");
  const downloadBtn = root.querySelector("#inventa-download");

  let currentFile = null;
  let outputBytes = null;

  function setStatus(message, tone = "info") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function resetOutput() {
    outputBytes = null;
    downloadBtn.disabled = true;
    processBtn.disabled = !currentFile;
  }

  async function processFile(file) {
    if (!file) return;
    currentFile = file;
    resetOutput();
    setStatus("Собираем файл инвентаризации на сервере…", "info");
    processBtn.disabled = true;

    try {
      const result = await convertStocksToInventory(file);
      outputBytes = result.output;
      const rowsText = result.rows ? `${result.rows} строк` : "готово";
      const orgText = result.organization ? ` Фильтр: ${result.organization}.` : "";
      const sheetText = result.sheetName ? ` Лист «${result.sheetName}».` : "";
      setStatus(`Готово: ${rowsText}.${sheetText}${orgText}`, "success");
      downloadBtn.disabled = false;
    } catch (error) {
      console.error(error);
      setStatus(error?.message || "Не удалось обработать файл.", "error");
    } finally {
      processBtn.disabled = !currentFile;
    }
  }

  function pickFile(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setStatus("Нужен файл Excel в формате .xlsx.", "error");
      return;
    }
    currentFile = file;
    resetOutput();
    setStatus(`Выбран файл: ${file.name}. Нажмите «Собрать инвентаризацию».`, "info");
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
    if (!outputBytes || !currentFile) return;
    downloadBytes(outputBytes, outputFilename(currentFile.name));
  });

  setStatus("Загрузите исходный файл stocks (.xlsx).", "info");
}

document.addEventListener("DOMContentLoaded", () => {
  initInventaTool(document.querySelector("#inventa-app"));
});
