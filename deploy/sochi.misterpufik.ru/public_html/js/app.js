const WORKDAY_MS = 9 * 60 * 60 * 1000;
const GEO_ERROR_TEXT = "Разрешите геопозицию в браузере и попробуйте снова.";
const ADDRESS_LOOKUP_URL = "https://nominatim.openstreetmap.org/reverse";

const arrivalBtn = document.querySelector("#arrivalBtn");
const leaveBtn = document.querySelector("#leaveBtn");
const employeeName = document.querySelector("#employeeName");
const statusText = document.querySelector("#statusText");
const recordsBody = document.querySelector("#recordsBody");
const dateFilter = document.querySelector("#dateFilter");
const clearDayBtn = document.querySelector("#clearDayBtn");
const todayLabel = document.querySelector("#todayLabel");
const workedToday = document.querySelector("#workedToday");
const underTime = document.querySelector("#underTime");
const overTime = document.querySelector("#overTime");

const formatterDate = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const formatterTime = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

todayLabel.textContent = formatterDate.format(new Date());
dateFilter.value = toDateKey(new Date());

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Ошибка сохранения данных.");
  }

  return data;
}

async function loadRecords(dateKey) {
  const data = await requestJson(`/api/records?date=${encodeURIComponent(dateKey)}`);
  return data.records || [];
}

function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.classList.toggle("is-error", type === "error");
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDuration(ms) {
  const safeMs = Math.max(0, ms);
  const totalMinutes = Math.floor(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} ч ${String(minutes).padStart(2, "0")} мин`;
}

function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return formatterDate.format(new Date(year, month - 1, day));
}

function formatTime(isoValue) {
  return isoValue ? formatterTime.format(new Date(isoValue)) : "-";
}

function getEmployee() {
  return employeeName.value.trim() || "Сотрудник склада";
}

function getGeoPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, label: "Геолокация не поддерживается", latitude: null, longitude: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        resolve({ ok: true, label: `${latitude}, ${longitude}`, latitude, longitude });
      },
      () => resolve({ ok: false, label: "Геопозиция не разрешена", latitude: null, longitude: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

function buildAddress(parts = {}) {
  return [parts.road, parts.house_number].filter(Boolean).join(", ");
}

async function getAddressFromGeo(latitude, longitude) {
  const url = new URL(ADDRESS_LOOKUP_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latitude);
  url.searchParams.set("lon", longitude);
  url.searchParams.set("accept-language", "ru");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    return buildAddress(data.address);
  } catch {
    return "";
  }
}

async function requireGeoPosition(actionName) {
  setStatus(`Получаю геопозицию ${actionName}...`);
  const geo = await getGeoPosition();

  if (!geo.ok) {
    setStatus(`${geo.label}. ${GEO_ERROR_TEXT}`, "error");
    return null;
  }

  setStatus("Определяю адрес на русском языке...");
  const address = await getAddressFromGeo(geo.latitude, geo.longitude);

  if (address) {
    geo.label = address;
    geo.address = address;
  } else {
    geo.label = "Улица и дом не найдены";
  }

  return geo;
}

function getOpenRecord(records, employee, dateKey) {
  return records.find((record) => record.employee === employee && record.date === dateKey && !record.leaveTime);
}

function calculateWorked(record) {
  if (!record.arrivalTime || !record.leaveTime) {
    return 0;
  }

  return Math.max(0, new Date(record.leaveTime) - new Date(record.arrivalTime));
}

function calculateTotals(records, dateKey) {
  const dayRecords = records.filter((record) => record.date === dateKey);
  const worked = dayRecords.reduce((total, record) => total + calculateWorked(record), 0);
  return {
    worked,
    under: Math.max(0, WORKDAY_MS - worked),
    over: Math.max(0, worked - WORKDAY_MS),
  };
}

function renderGeo(geo) {
  if (!geo) {
    return "-";
  }

  if (geo.latitude === null || geo.longitude === null) {
    return geo.label;
  }

  return `<a class="geo-link" href="https://maps.google.com/?q=${geo.latitude},${geo.longitude}" target="_blank" rel="noreferrer">${geo.label}</a>`;
}

async function render() {
  const selectedDate = dateFilter.value || toDateKey(new Date());
  let visibleRecords = [];

  try {
    visibleRecords = await loadRecords(selectedDate);
  } catch (error) {
    setStatus(error.message, "error");
  }

  const records = visibleRecords;
  const totals = calculateTotals(records, selectedDate);

  workedToday.textContent = formatDuration(totals.worked);
  underTime.textContent = formatDuration(totals.under);
  overTime.textContent = formatDuration(totals.over);

  if (!visibleRecords.length) {
    recordsBody.innerHTML = `<tr><td class="empty" colspan="9">За этот день отметок пока нет.</td></tr>`;
    return;
  }

  const rows = visibleRecords
    .map((record) => {
      const worked = calculateWorked(record);

      return `
        <tr>
          <td>${formatDateKey(record.date)}</td>
          <td>${record.employee}</td>
          <td>${formatTime(record.arrivalTime)}</td>
          <td>${renderGeo(record.arrivalGeo)}</td>
          <td>${formatTime(record.leaveTime)}</td>
          <td>${renderGeo(record.leaveGeo)}</td>
          <td>${formatDuration(worked)}</td>
          <td>-</td>
          <td>-</td>
        </tr>
      `;
    })
    .join("");

  recordsBody.innerHTML = `${rows}
    <tr class="day-total-row">
      <td colspan="6">Итого за день</td>
      <td>${formatDuration(totals.worked)}</td>
      <td>${formatDuration(totals.under)}</td>
      <td>${formatDuration(totals.over)}</td>
    </tr>
  `;
}

arrivalBtn.addEventListener("click", async () => {
  const now = new Date();
  const dateKey = toDateKey(now);
  const employee = getEmployee();

  const geo = await requireGeoPosition("прихода");

  if (!geo) {
    return;
  }

  try {
    await requestJson("/api/arrival", {
      method: "POST",
      body: JSON.stringify({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        date: dateKey,
        employee,
        arrivalTime: now.toISOString(),
        arrivalGeo: geo,
      }),
    });
  } catch (error) {
    setStatus(error.message, "error");
    return;
  }

  dateFilter.value = dateKey;
  setStatus(`Приход зафиксирован: ${formatterTime.format(now)}. Гео: ${geo.label}.`);
  render();
});

leaveBtn.addEventListener("click", async () => {
  const now = new Date();
  const dateKey = toDateKey(now);
  const employee = getEmployee();

  const geo = await requireGeoPosition("ухода");

  if (!geo) {
    return;
  }

  try {
    await requestJson("/api/leave", {
      method: "POST",
      body: JSON.stringify({
        date: dateKey,
        employee,
        leaveTime: now.toISOString(),
        leaveGeo: geo,
      }),
    });
  } catch (error) {
    setStatus(error.message, "error");
    return;
  }

  dateFilter.value = dateKey;
  setStatus(`Уход зафиксирован: ${formatterTime.format(now)}. Гео: ${geo.label}.`);
  render();
});

clearDayBtn.addEventListener("click", async () => {
  const selectedDate = dateFilter.value;

  try {
    await requestJson(`/api/records?date=${encodeURIComponent(selectedDate)}`, { method: "DELETE" });
  } catch (error) {
    setStatus(error.message, "error");
    return;
  }

  setStatus("Отметки за выбранный день очищены.");
  render();
});

dateFilter.addEventListener("change", render);
render();
setStatus("Готово к отметке. При первом нажатии разрешите доступ к геопозиции.");
