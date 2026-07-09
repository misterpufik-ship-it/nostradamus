const CHECK_COUNT = 10;
const API_URL = "api/deliveries";
const STORAGE_KEY = "nostradamus-proverka-postavok";

const form = document.querySelector("#delivery-form");
const deliveryNumberInput = document.querySelector("#delivery-number");
const warehouseInput = document.querySelector("#warehouse");
const checksGrid = document.querySelector("#checks-grid");
const formStatus = document.querySelector("#form-status");
const monthTabs = document.querySelector("#month-tabs");
const savedGroups = document.querySelector("#saved-groups");
const savedCount = document.querySelector("#saved-count");

let activeMonthKey = null;

function setStatus(message, tone = "info") {
  formStatus.textContent = message;
  formStatus.dataset.tone = tone;
}

function renderCheckInputs() {
  checksGrid.innerHTML = Array.from({ length: CHECK_COUNT }, (_, index) => {
    const number = index + 1;
    return `
      <label class="check-item">
        <input type="checkbox" data-check-index="${index}" />
        <span>${number}</span>
      </label>
    `;
  }).join("");
}

function readChecksFromForm() {
  return Array.from(checksGrid.querySelectorAll("input[type='checkbox']")).map((input) => input.checked);
}

function resetForm() {
  form.reset();
  setStatus("Заполните поля и нажмите «Сохранить».", "info");
}

function parseDeliveryDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = parseDeliveryDate(value);
  if (!date) return String(value ?? "");
  return date.toLocaleString("ru-RU");
}

function monthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date) {
  const label = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDayLabel(date) {
  const weekday = date.toLocaleDateString("ru-RU", { weekday: "long" });
  const day = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return `${day}, ${weekday}`;
}

function groupDeliveries(deliveries) {
  const months = new Map();

  deliveries.forEach((delivery) => {
    const date = parseDeliveryDate(delivery.savedAt) || new Date();
    const monthId = monthKey(date);
    const dayId = dayKey(date);

    if (!months.has(monthId)) {
      months.set(monthId, {
        key: monthId,
        label: formatMonthLabel(date),
        days: new Map()
      });
    }

    const month = months.get(monthId);
    if (!month.days.has(dayId)) {
      month.days.set(dayId, {
        key: dayId,
        label: formatDayLabel(date),
        deliveries: []
      });
    }

    month.days.get(dayId).deliveries.push(delivery);
  });

  return [...months.values()]
    .sort((left, right) => right.key.localeCompare(left.key))
    .map((month) => ({
      ...month,
      days: [...month.days.values()]
        .sort((left, right) => right.key.localeCompare(left.key))
        .map((day) => ({
          ...day,
          deliveries: day.deliveries.sort((left, right) =>
            String(right.savedAt || "").localeCompare(String(left.savedAt || ""))
          )
        }))
    }));
}

function renderDeliveryCard(delivery) {
  const checks = Array.isArray(delivery.checks) ? delivery.checks : [];
  const checksHtml = Array.from({ length: CHECK_COUNT }, (_, index) => {
    const done = Boolean(checks[index]);
    return `<div class="saved-check ${done ? "is-done" : ""}">${index + 1}${done ? " ✓" : ""}</div>`;
  }).join("");

  return `
    <article class="saved-card" data-id="${delivery.id}">
      <div class="saved-card-header">
        <strong>Поставка ${escapeHtml(delivery.deliveryNumber)}</strong>
        <span class="saved-meta">Склад: ${escapeHtml(delivery.warehouse)}</span>
        <span class="saved-meta">${escapeHtml(formatDateTime(delivery.savedAt))}</span>
        <span class="saved-badge">Сохранено</span>
      </div>
      <div class="saved-checks">${checksHtml}</div>
    </article>
  `;
}

function renderMonthPanel(month, isActive) {
  const daysHtml = month.days
    .map((day, index) => {
      const deliveriesHtml = day.deliveries.map((delivery) => renderDeliveryCard(delivery)).join("");
      return `
        <details class="day-group" ${index === 0 && isActive ? "open" : ""}>
          <summary>
            <span>${escapeHtml(day.label)}</span>
            <span class="day-count">${day.deliveries.length} шт.</span>
          </summary>
          <div class="day-deliveries">${deliveriesHtml}</div>
        </details>
      `;
    })
    .join("");

  return `<div class="month-panel ${isActive ? "" : "hidden"}" data-month="${month.key}">${daysHtml}</div>`;
}

function setActiveMonth(monthKeyValue) {
  activeMonthKey = monthKeyValue;

  monthTabs.querySelectorAll(".month-tab").forEach((button) => {
    const isActive = button.dataset.month === monthKeyValue;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  savedGroups.querySelectorAll(".month-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.month !== monthKeyValue);
  });
}

function renderSavedList(deliveries) {
  savedCount.textContent = String(deliveries.length);

  if (!deliveries.length) {
    monthTabs.innerHTML = "";
    savedGroups.innerHTML = '<div class="empty-state">Пока нет сохранённых поставок.</div>';
    activeMonthKey = null;
    return;
  }

  const grouped = groupDeliveries(deliveries);
  const nextActiveMonth = grouped.some((month) => month.key === activeMonthKey)
    ? activeMonthKey
    : grouped[0].key;

  monthTabs.innerHTML = grouped
    .map((month) => {
      const count = month.days.reduce((sum, day) => sum + day.deliveries.length, 0);
      const isActive = month.key === nextActiveMonth;
      return `
        <button
          class="month-tab ${isActive ? "is-active" : ""}"
          type="button"
          role="tab"
          data-month="${month.key}"
          aria-selected="${isActive}"
        >
          ${escapeHtml(month.label)} (${count})
        </button>
      `;
    })
    .join("");

  savedGroups.innerHTML = grouped
    .map((month) => renderMonthPanel(month, month.key === nextActiveMonth))
    .join("");

  monthTabs.querySelectorAll(".month-tab").forEach((button) => {
    button.addEventListener("click", () => setActiveMonth(button.dataset.month));
  });

  activeMonthKey = nextActiveMonth;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readLocalDeliveries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalDeliveries(deliveries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deliveries));
}

async function fetchDeliveries() {
  try {
    const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("API unavailable");
    const payload = await response.json();
    return Array.isArray(payload.deliveries) ? payload.deliveries : [];
  } catch {
    return readLocalDeliveries();
  }
}

async function saveDelivery(payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Не удалось сохранить поставку.");
    }
    return data.delivery;
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }

    const deliveries = readLocalDeliveries();
    const delivery = {
      id: crypto.randomUUID(),
      deliveryNumber: payload.deliveryNumber,
      warehouse: payload.warehouse,
      checks: payload.checks,
      savedAt: new Date().toISOString()
    };
    deliveries.unshift(delivery);
    writeLocalDeliveries(deliveries);
    return delivery;
  }
}

async function loadDeliveries() {
  const deliveries = await fetchDeliveries();
  renderSavedList(deliveries);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const deliveryNumber = deliveryNumberInput.value.trim();
  const warehouse = warehouseInput.value.trim();
  const checks = readChecksFromForm();

  if (!deliveryNumber || !warehouse) {
    setStatus("Укажите номер поставки и склад.", "error");
    return;
  }

  setStatus("Сохраняем поставку…", "info");

  try {
    const delivery = await saveDelivery({ deliveryNumber, warehouse, checks });
    const savedDate = parseDeliveryDate(delivery.savedAt);
    if (savedDate) {
      activeMonthKey = monthKey(savedDate);
    }
    resetForm();
    setStatus("Поставка сохранена. Редактирование недоступно.", "success");
    await loadDeliveries();
  } catch (error) {
    setStatus(error.message || "Не удалось сохранить поставку.", "error");
  }
});

renderCheckInputs();
loadDeliveries();
