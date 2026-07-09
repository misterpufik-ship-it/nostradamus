const API = 'api.php';

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');
const homepageForm = document.getElementById('homepage-form');
const saveStatus = document.getElementById('save-status');
const servicesList = document.getElementById('services-list');
const logoutBtn = document.getElementById('logout-btn');
const logoPreview = document.getElementById('logo-preview');
const backgroundPreview = document.getElementById('background-preview');
const logoUpload = document.getElementById('logo-upload');
const backgroundUpload = document.getElementById('background-upload');
const footerPreview = document.getElementById('footer-preview');
const footerUpload = document.getElementById('footer-upload');
const footerClearBtn = document.getElementById('footer-clear');
const backgroundTypeColor = document.getElementById('background-type-color');
const backgroundTypeImage = document.getElementById('background-type-image');
const backgroundColorInput = document.getElementById('background-color');
const backgroundColorHex = document.getElementById('background-color-hex');
const backgroundColorPreview = document.getElementById('background-color-preview');
const backgroundColorField = document.getElementById('background-color-field');
const backgroundImageField = document.getElementById('background-image-field');

let homepage = null;

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function setStatus(el, message, type = '') {
  el.textContent = message;
  el.className = `status${type ? ` ${type}` : ''}`;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Ошибка запроса');
  }

  return data;
}

function normalizeHexColor(value) {
  const trimmed = String(value || '').trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return '#000000';
}

function getBackgroundType() {
  return backgroundTypeImage.checked ? 'image' : 'color';
}

function updateBackgroundModeUi() {
  const isColor = getBackgroundType() === 'color';
  backgroundColorField.classList.toggle('hidden', !isColor);
  backgroundImageField.classList.toggle('hidden', isColor);
  updateBackgroundPreview();
}

function updateBackgroundPreview() {
  const type = getBackgroundType();
  if (type === 'color') {
    const color = normalizeHexColor(backgroundColorInput.value);
    backgroundColorPreview.style.backgroundColor = color;
    backgroundColorPreview.style.backgroundImage = 'none';
    return;
  }

  const src = assetUrl(homepage?.background || '');
  if (src) {
    backgroundPreview.src = src;
    backgroundPreview.style.display = '';
  } else {
    backgroundPreview.removeAttribute('src');
    backgroundPreview.style.display = 'none';
  }
}

function syncColorInputs(fromPicker = true) {
  const color = normalizeHexColor(fromPicker ? backgroundColorInput.value : backgroundColorHex.value);
  backgroundColorInput.value = color;
  backgroundColorHex.value = color;
  updateBackgroundPreview();
}

function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `../${path.replace(/^\//, '')}`;
}

function renderServices() {
  servicesList.innerHTML = '';
  homepage.services.forEach((service, index) => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="service-card-head">
        <strong>${service.id}</strong>
        <label class="checkbox">
          <input type="checkbox" data-field="accent" data-index="${index}" ${service.accent ? 'checked' : ''} />
          Акцентная кнопка
        </label>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Текст</label>
          <input type="text" data-field="label" data-index="${index}" value="${escapeHtml(service.label)}" required />
        </div>
        <div class="field">
          <label>Ссылка</label>
          <input type="text" data-field="href" data-index="${index}" value="${escapeHtml(service.href)}" required />
        </div>
      </div>
    `;
    servicesList.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function updateFooterPreview() {
  const src = assetUrl(homepage?.footerBackground || '');
  if (src) {
    footerPreview.src = src;
    footerPreview.style.display = '';
  } else {
    footerPreview.removeAttribute('src');
    footerPreview.style.display = 'none';
  }
}

function updateLogoPreview() {
  logoPreview.src = assetUrl(homepage?.logo || '');
  const size = homepage?.logoSize || 'clamp(220px, 28vw, 360px)';
  logoPreview.style.width = size;
  logoPreview.style.height = 'auto';
}

function fillForm() {
  document.getElementById('title-main').value = homepage.title.main;
  document.getElementById('title-accent').value = homepage.title.accent;
  document.getElementById('subtitle').value = homepage.subtitle;
  document.getElementById('font-title').value = homepage.fontSizes.title;
  document.getElementById('font-subtitle').value = homepage.fontSizes.subtitle;
  document.getElementById('font-button').value = homepage.fontSizes.button;
  document.getElementById('logo-size').value = homepage.logoSize || 'clamp(220px, 28vw, 360px)';
  updateLogoPreview();

  const bgType = homepage.background_type === 'image' ? 'image' : 'color';
  backgroundTypeColor.checked = bgType === 'color';
  backgroundTypeImage.checked = bgType === 'image';

  const bgColor = normalizeHexColor(homepage.background_color || '#000000');
  backgroundColorInput.value = bgColor;
  backgroundColorHex.value = bgColor;

  updateBackgroundModeUi();
  updateFooterPreview();
  renderServices();
}

function collectServices() {
  return homepage.services.map((service, index) => {
    const labelInput = servicesList.querySelector(`input[data-field="label"][data-index="${index}"]`);
    const hrefInput = servicesList.querySelector(`input[data-field="href"][data-index="${index}"]`);
    const accentInput = servicesList.querySelector(`input[data-field="accent"][data-index="${index}"]`);

    return {
      id: service.id,
      label: labelInput.value.trim(),
      href: hrefInput.value.trim(),
      accent: accentInput.checked,
    };
  });
}

async function loadSession() {
  const data = await api(`${API}?action=session`);
  if (data.loggedIn) {
    await loadHomepage();
    hide(loginView);
    show(dashboardView);
  } else {
    hide(dashboardView);
    show(loginView);
  }
}

async function loadHomepage() {
  const data = await api(`${API}?action=homepage`);
  homepage = data.homepage;
  fillForm();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(loginStatus, '');

  try {
    await api(`${API}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ password: document.getElementById('password').value }),
    });
    await loadHomepage();
    hide(loginView);
    show(dashboardView);
    loginForm.reset();
  } catch (error) {
    setStatus(loginStatus, error.message, 'error');
  }
});

logoutBtn.addEventListener('click', async () => {
  await api(`${API}?action=logout`, { method: 'POST', body: '{}' });
  homepage = null;
  hide(dashboardView);
  show(loginView);
});

homepageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(saveStatus, 'Сохранение...');

  try {
    const payload = {
      logo: homepage.logo,
      logoSize: document.getElementById('logo-size').value.trim(),
      footerBackground: homepage.footerBackground || '',
      background_type: getBackgroundType(),
      background_color: normalizeHexColor(backgroundColorInput.value),
      background: homepage.background,
      title: {
        main: document.getElementById('title-main').value.trim(),
        accent: document.getElementById('title-accent').value.trim(),
      },
      subtitle: document.getElementById('subtitle').value.trim(),
      fontSizes: {
        title: document.getElementById('font-title').value.trim(),
        subtitle: document.getElementById('font-subtitle').value.trim(),
        button: document.getElementById('font-button').value.trim(),
      },
      services: collectServices(),
    };

    const data = await api(`${API}?action=homepage`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    homepage = data.homepage;
    setStatus(saveStatus, 'Сохранено', 'ok');
  } catch (error) {
    setStatus(saveStatus, error.message, 'error');
  }
});

async function uploadImage(type, file) {
  setStatus(saveStatus, 'Загрузка изображения...');
  const formData = new FormData();
  formData.append('file', file);

  try {
    const data = await api(`${API}?action=upload&type=${type}`, {
      method: 'POST',
      body: formData,
    });
    homepage = data.homepage;
    fillForm();
    setStatus(saveStatus, 'Изображение загружено', 'ok');
  } catch (error) {
    setStatus(saveStatus, error.message, 'error');
  }
}

logoUpload.addEventListener('change', () => {
  const file = logoUpload.files[0];
  if (file) uploadImage('logo', file);
  logoUpload.value = '';
});

backgroundUpload.addEventListener('change', () => {
  const file = backgroundUpload.files[0];
  if (file) {
    backgroundTypeImage.checked = true;
    updateBackgroundModeUi();
    uploadImage('background', file);
  }
  backgroundUpload.value = '';
});

footerUpload.addEventListener('change', () => {
  const file = footerUpload.files[0];
  if (file) uploadImage('footer', file);
  footerUpload.value = '';
});

footerClearBtn.addEventListener('click', async () => {
  homepage.footerBackground = '';
  updateFooterPreview();
  setStatus(saveStatus, 'Декор убран. Нажмите «Сохранить изменения».', 'ok');
});

backgroundTypeColor.addEventListener('change', updateBackgroundModeUi);
backgroundTypeImage.addEventListener('change', updateBackgroundModeUi);
backgroundColorInput.addEventListener('input', () => syncColorInputs(true));
backgroundColorHex.addEventListener('input', () => syncColorInputs(false));
backgroundColorHex.addEventListener('change', () => syncColorInputs(false));

document.getElementById('logo-size').addEventListener('input', () => {
  if (logoPreview.src) {
    logoPreview.style.width = document.getElementById('logo-size').value.trim() || 'clamp(220px, 28vw, 360px)';
  }
});

loadSession().catch((error) => {
  setStatus(loginStatus, error.message, 'error');
  show(loginView);
});
