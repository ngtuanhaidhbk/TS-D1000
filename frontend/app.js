const authKey = "tsd1000.auth";

const state = {
  token: null,
  user: null,
  session: null,
  currentView: "dashboard",
  runtimeSnapshot: null,
  runtimeRequests: [],
  runtimePollHandle: null,
  runtimeMapFilters: {
    showActiveSpeakersOnly: false,
    showPendingRequests: true,
    showCameras: true,
  },
  runtimeCameraGrid: 2,
  runtimeSelectedDevice: null,
  overview: null,
  tsdConfig: null,
  units: [],
  cameras: [],
  presetsByCamera: {},
  layout: null,
  layoutDevices: [],
  layoutAnnotations: [],
  mappings: [],
  mode: "MANUAL",
  readiness: null,
};

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const loginError = document.getElementById("login-error");
const logoutButton = document.getElementById("logout-button");
const sessionMessage = document.getElementById("session-message");
const viewError = document.getElementById("view-error");
const welcomeTitle = document.getElementById("welcome-title");
const roomChip = document.getElementById("room-chip");
const modeBadgeButton = document.getElementById("mode-badge");
const sseBadgeNode = document.getElementById("sse-badge");
const modalRoot = document.getElementById("modal-root");
const viewSections = {
  dashboard: document.getElementById("dashboard-section"),
  "runtime-map": document.getElementById("runtime-map-section"),
  "runtime-cameras": document.getElementById("runtime-cameras-section"),
  "runtime-manual": document.getElementById("runtime-manual-section"),
  "runtime-monitor": document.getElementById("runtime-monitor-section"),
  overview: document.getElementById("overview-section"),
  tsd: document.getElementById("tsd-section"),
  cameras: document.getElementById("cameras-section"),
  layout: document.getElementById("layout-section"),
  mappings: document.getElementById("mappings-section"),
  mode: document.getElementById("mode-section"),
  readiness: document.getElementById("readiness-section"),
  logs: document.getElementById("logs-section"),
};

function loadPersistedAuth() {
  const raw = localStorage.getItem(authKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.token = parsed.token ?? null;
    state.user = parsed.user ?? null;
    state.session = parsed.session ?? null;
  } catch {
    localStorage.removeItem(authKey);
  }
}

function persistAuth() {
  localStorage.setItem(
    authKey,
    JSON.stringify({
      token: state.token,
      user: state.user,
      session: state.session,
    })
  );
}

function clearAuth() {
  state.token = null;
  state.user = null;
  state.session = null;
  localStorage.removeItem(authKey);
}

function setFieldError(field, message) {
  const errorNode = document.querySelector(`[data-field-error="${field}"]`);
  const input = document.getElementById(field);
  if (errorNode) errorNode.textContent = message || "";
  if (input) input.classList.toggle("invalid", Boolean(message));
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.remove("hidden");
}

function clearLoginError() {
  loginError.textContent = "";
  loginError.classList.add("hidden");
}

function setLoginLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.querySelector(".button-label").textContent = isLoading ? "Signing in..." : "Login";
  loginButton.querySelector(".button-spinner").classList.toggle("hidden", !isLoading);
}

function setSessionMessage(message) {
  if (!message) {
    sessionMessage.classList.add("hidden");
    sessionMessage.textContent = "";
    return;
  }
  sessionMessage.textContent = message;
  sessionMessage.classList.remove("hidden");
}

function setViewError(message) {
  if (!message) {
    viewError.classList.add("hidden");
    viewError.textContent = "";
    return;
  }
  viewError.textContent = message;
  viewError.classList.remove("hidden");
}

function formatDate(value) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusBadge(value) {
  const safe = String(value || "UNKNOWN").toLowerCase();
  return `<span class="status-pill status-${safe}">${value || "N/A"}</span>`;
}

function isAdmin() {
  return state.user?.role === "ADMIN";
}

function loadNavState() {
  document.querySelectorAll(".nav-button").forEach((node) => {
    const isActive = node.dataset.view === state.currentView;
    node.classList.toggle("active", isActive);
    if (node.classList.contains("admin-only")) {
      node.classList.toggle("hidden", !isAdmin());
    }
  });
}

function showView(viewName) {
  if (state.currentView !== viewName) {
    stopRuntimePolling();
  }
  state.currentView = viewName;
  Object.entries(viewSections).forEach(([key, section]) => {
    section.classList.toggle("hidden", key !== viewName);
  });
  const titles = {
    dashboard: "Dashboard",
    "runtime-map": "Runtime Map View",
    "runtime-cameras": "Runtime Camera View",
    "runtime-manual": "Manual Control",
    "runtime-monitor": "Runtime Monitor",
    overview: "System Configuration Overview",
    tsd: "TS-D1000 Configuration",
    cameras: "Camera Configuration",
    layout: "Layout & Map",
    mappings: "Mic-Camera Mapping",
    mode: "Operation Mode",
    readiness: "Readiness Check",
    logs: "Audit Logs",
  };
  welcomeTitle.textContent = titles[viewName] || "Dashboard";
  loadNavState();

  if (viewName.startsWith("runtime-")) {
    startRuntimePolling();
  }
}

function renderAuthenticatedView() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");

  document.getElementById("username-chip").textContent = state.user.username;
  document.getElementById("role-badge").textContent = `${state.user.role} access`;

  renderTopbarStatus();
  showView(state.currentView);
}

function renderLoggedOutView() {
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
  usernameInput.focus();
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function requireApiSuccess(result) {
  if (!result.response.ok || !result.payload?.success) {
    const message = result.payload?.error?.message || "Request failed";
    const error = new Error(message);
    error.code = result.payload?.error?.code || "HTTP_ERROR";
    throw error;
  }
  return result.payload.data;
}

async function bootstrapAuth() {
  loadPersistedAuth();
  if (!state.token) {
    renderLoggedOutView();
    return;
  }

  const { response, payload } = await apiFetch("/api/v1/auth/me", { method: "GET" });
  if (!response.ok || !payload?.success) {
    clearAuth();
    renderLoggedOutView();
    setSessionMessage("Session expired. Please login again.");
    return;
  }

  state.user = payload.data.user;
  state.session = payload.data.session;
  persistAuth();
  await loadApplicationData();
  renderAuthenticatedView();
}

function validateLoginForm() {
  let valid = true;
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username) {
    setFieldError("username", "Username is required");
    valid = false;
  } else {
    setFieldError("username", "");
  }

  if (!password) {
    setFieldError("password", "Password is required");
    valid = false;
  } else {
    setFieldError("password", "");
  }

  return valid;
}

async function fetchJson(path, options = {}) {
  return requireApiSuccess(await apiFetch(path, options));
}

async function loadApplicationData() {
  setViewError("");
  try {
    const overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    state.overview = overview;

    await Promise.all([
      loadTsdData(),
      loadCameraData(),
      loadLayoutData(),
      loadMappingsData(),
      loadModeData(),
      loadLogsData(),
    ]);
  } catch (error) {
    setViewError(error.message || "Unable to load application data.");
  }
  renderAllViews();
}

async function loadTsdData() {
  state.units = [];
  state.tsdConfig = null;
  try {
    state.tsdConfig = await fetchJson("/api/v1/config/tsd/current", { method: "GET" });
    if (state.tsdConfig?.id) {
      const units = await fetchJson(`/api/v1/config/tsd/${state.tsdConfig.id}/units`, { method: "GET" });
      state.units = units.items || [];
    }
  } catch (error) {
    if (error.code !== "CONFIG_NOT_FOUND") {
      throw error;
    }
  }
}

async function loadCameraData() {
  const cameraList = await fetchJson("/api/v1/config/cameras", { method: "GET" });
  state.cameras = cameraList.items || [];
  state.presetsByCamera = {};
  for (const camera of state.cameras) {
    const presets = await fetchJson(`/api/v1/config/cameras/${camera.id}/presets`, { method: "GET" });
    state.presetsByCamera[camera.id] = presets.items || [];
  }
}

async function loadLayoutData() {
  state.layout = null;
  state.layoutDevices = [];
  state.layoutAnnotations = [];
  try {
    state.layout = await fetchJson("/api/v1/config/layout/current", { method: "GET" });
    if (state.layout?.id) {
      const [devices, annotations] = await Promise.all([
        fetchJson("/api/v1/config/layout/devices", { method: "GET" }),
        fetchJson("/api/v1/config/layout/annotations", { method: "GET" }),
      ]);
      state.layoutDevices = devices.items || [];
      state.layoutAnnotations = annotations.items || [];
    }
  } catch (error) {
    if (error.code !== "LAYOUT_NOT_CONFIGURED") {
      throw error;
    }
  }
}

async function loadMappingsData() {
  const mappings = await fetchJson("/api/v1/config/mappings", { method: "GET" });
  state.mappings = mappings.items || [];
}

async function loadModeData() {
  const mode = await fetchJson("/api/v1/config/mode", { method: "GET" });
  state.mode = mode.mode;
}

async function loadLogsData() {
  const sessionMeta = state.session
    ? `<div><dt>Session ID</dt><dd>${state.session.id || "Not loaded"}</dd></div>
       <div><dt>Expires At</dt><dd>${formatDate(state.session.expiresAt)}</dd></div>`
    : "";
  viewSections.logs.innerHTML = `
    <div class="panel">
      <h4>Current Session Context</h4>
      <dl class="meta">
        <div><dt>User ID</dt><dd>${state.user?.id || ""}</dd></div>
        <div><dt>Username</dt><dd>${state.user?.username || ""}</dd></div>
        <div><dt>Role</dt><dd>${state.user?.role || ""}</dd></div>
        <div><dt>Status</dt><dd>${state.user?.status || ""}</dd></div>
        ${sessionMeta}
      </dl>
    </div>
  `;
}

function renderAllViews() {
  renderDashboard();
  renderRuntimeMap();
  renderRuntimeCameras();
  renderOverview();
  renderTsd();
  renderCameras();
  renderLayout();
  renderMappings();
  renderMode();
  renderReadiness();
  renderTopbarStatus();
  loadNavState();
}

function renderTopbarStatus() {
  if (!roomChip) return;

  const roomName = state.overview?.room?.name || "Room";
  roomChip.textContent = roomName;

  const snap = state.runtimeSnapshot;
  const mode = snap?.operationMode || state.mode || "MANUAL";
  const sse = snap?.sseStatus || "UNKNOWN";

  if (modeBadgeButton) {
    modeBadgeButton.className = `status-pill badge-button status-${String(mode).toLowerCase()}`;
    modeBadgeButton.textContent = mode;
    modeBadgeButton.classList.toggle("hidden", !mode);
    modeBadgeButton.title = isAdmin() ? "Change mode" : "Mode (Admin only)";
    modeBadgeButton.disabled = !isAdmin();
  }

  if (sseBadgeNode) {
    sseBadgeNode.className = `status-pill status-${String(sse).toLowerCase()}`;
    sseBadgeNode.textContent = sse;
    sseBadgeNode.classList.toggle("hidden", !snap);
  }
}

function renderDashboard() {
  viewSections.dashboard.innerHTML = `
    <div class="grid">
      <article class="panel">
        <h4>User Context</h4>
        <dl class="meta">
          <div><dt>User ID</dt><dd>${state.user?.id || ""}</dd></div>
          <div><dt>Username</dt><dd>${state.user?.username || ""}</dd></div>
          <div><dt>Role</dt><dd>${state.user?.role || ""}</dd></div>
          <div><dt>Status</dt><dd>${state.user?.status || ""}</dd></div>
        </dl>
      </article>
      <article class="panel">
        <h4>Session Context</h4>
        <dl class="meta">
          <div><dt>Session ID</dt><dd>${state.session?.id || "Bootstrap after login"}</dd></div>
          <div><dt>Expires At</dt><dd>${formatDate(state.session?.expiresAt)}</dd></div>
        </dl>
      </article>
      <article class="panel">
        <h4>What to test</h4>
        <ul class="plain-list">
          <li>Login and logout</li>
          <li>Admin vs Operator UI behavior</li>
          <li>TS-D1000 config and sync</li>
          <li>Camera, preset, layout, mapping, mode, readiness</li>
        </ul>
      </article>
    </div>
  `;
}

function renderOverview() {
  const overview = state.overview;
  if (!overview) {
    viewSections.overview.innerHTML = `<div class="panel"><p>No overview data.</p></div>`;
    return;
  }
  viewSections.overview.innerHTML = `
    <div class="hero-row">
      <article class="panel stat-card">
        <p class="eyebrow">Room</p>
        <h4>${overview.room.name}</h4>
        ${statusBadge(overview.room.operationMode)}
      </article>
      <article class="panel stat-card">
        <p class="eyebrow">TS-D1000</p>
        <h4>${overview.tsdConnection.configured ? "Configured" : "Not configured"}</h4>
        <p>Last test: ${formatDate(overview.tsdConnection.lastTestAt)}</p>
      </article>
      <article class="panel stat-card">
        <p class="eyebrow">Cameras</p>
        <h4>${overview.cameraSummary.active} / ${overview.cameraSummary.total} active</h4>
      </article>
      <article class="panel stat-card">
        <p class="eyebrow">Mappings</p>
        <h4>${overview.mappingSummary.active} / ${overview.mappingSummary.total} active</h4>
      </article>
    </div>
    <div class="panel">
      <div class="section-header">
        <h4>Readiness Shortcut</h4>
        ${isAdmin() ? '<button id="overview-readiness-button" class="button secondary" type="button">Run Readiness Check</button>' : '<span class="muted-badge">Operator view only</span>'}
      </div>
      <div id="overview-readiness-result">${state.readiness ? renderReadinessList(state.readiness) : "<p>No readiness check run yet.</p>"}</div>
    </div>
  `;

  if (isAdmin()) {
    document.getElementById("overview-readiness-button")?.addEventListener("click", async () => {
      await runReadinessCheck();
      renderOverview();
      showView("overview");
    });
  }
}

function renderTsd() {
  const config = state.tsdConfig;
  const canEdit = isAdmin();
  viewSections.tsd.innerHTML = `
    <div class="grid">
      <article class="panel">
        <div class="section-header">
          <h4>Connection</h4>
          ${config?.lastTestResult ? statusBadge(config.lastTestResult) : ""}
        </div>
        ${config ? `
          <dl class="meta">
            <div><dt>Base URL</dt><dd>${config.baseUrl}</dd></div>
            <div><dt>Username</dt><dd>${config.username || "Not set"}</dd></div>
            <div><dt>SSE Endpoint</dt><dd>${config.sseEndpoint}</dd></div>
            <div><dt>Last Test</dt><dd>${formatDate(config.lastTestAt)}</dd></div>
          </dl>` : `<p>No TS-D1000 configuration yet.</p>`}
      </article>
      <article class="panel">
        <h4>${config ? "Edit TS-D1000 Configuration" : "Create TS-D1000 Configuration"}</h4>
        ${canEdit ? `
          <form id="tsd-form" class="stack-form">
            <label class="field"><span>Base URL</span><input name="baseUrl" value="${config?.baseUrl || ""}" /></label>
            <label class="field"><span>Username</span><input name="username" value="${config?.username || ""}" /></label>
            <label class="field"><span>Password</span><input name="password" type="password" value="" placeholder="${config ? "Leave blank to keep current" : ""}" /></label>
            <label class="field"><span>SSE Endpoint</span><input name="sseEndpoint" value="${config?.sseEndpoint || "/api/event"}" /></label>
            <div class="button-row">
              <button class="button secondary" type="submit">Save</button>
              <button id="tsd-test-button" class="button secondary" type="button" ${config ? "" : "disabled"}>Test Connection</button>
              <button id="tsd-sync-button" class="button secondary" type="button" ${config ? "" : "disabled"}>Sync Units</button>
              <button id="tsd-deactivate-button" class="button danger" type="button" ${config ? "" : "disabled"}>Deactivate</button>
            </div>
          </form>` : `<p class="read-only-text">Operator can view TS-D1000 configuration only.</p>`}
      </article>
    </div>
    <article class="panel">
      <h4>Synced Units</h4>
      ${state.units.length ? `
        <table class="data-table">
          <thead><tr><th>External Unit ID</th><th>Name</th><th>Type</th><th>Runtime State</th></tr></thead>
          <tbody>${state.units.map((unit) => `<tr><td>${unit.externalUnitId}</td><td>${unit.unitName || "Unnamed"}</td><td>${unit.deviceType}</td><td>${unit.runtimeState}</td></tr>`).join("")}</tbody>
        </table>` : "<p>No synced units yet.</p>"}
    </article>
  `;

  if (canEdit) {
    document.getElementById("tsd-form")?.addEventListener("submit", handleTsdSave);
    document.getElementById("tsd-test-button")?.addEventListener("click", handleTsdTest);
    document.getElementById("tsd-sync-button")?.addEventListener("click", handleTsdSync);
    document.getElementById("tsd-deactivate-button")?.addEventListener("click", handleTsdDeactivate);
  }
}

function renderCameras() {
  const canEdit = isAdmin();
  const cameraOptions = state.cameras
    .map((camera) => `<option value="${camera.id}">${camera.name}</option>`)
    .join("");
  const selectedCamera = state.cameras[0] || null;
  const selectedPresets = selectedCamera ? state.presetsByCamera[selectedCamera.id] || [] : [];

  viewSections.cameras.innerHTML = `
    <div class="grid">
      <article class="panel">
        <div class="section-header">
          <h4>Cameras</h4>
          ${canEdit ? '<button id="camera-refresh-button" class="button secondary" type="button">Refresh</button>' : '<span class="muted-badge">Read only</span>'}
        </div>
        ${state.cameras.length ? `
          <table class="data-table">
            <thead><tr><th>Name</th><th>Protocol</th><th>IP</th><th>Status</th><th>Last Test</th></tr></thead>
            <tbody>${state.cameras.map((camera) => `<tr><td>${camera.name}</td><td>${camera.protocol}</td><td>${camera.ipAddress}${camera.port ? `:${camera.port}` : ""}</td><td>${statusBadge(camera.status)}</td><td>${camera.lastTestResult || "Not tested"}</td></tr>`).join("")}</tbody>
          </table>` : "<p>No cameras configured yet.</p>"}
      </article>
      <article class="panel">
        <h4>${canEdit ? "Add Camera" : "Camera Detail"}</h4>
        ${canEdit ? `
          <form id="camera-form" class="stack-form">
            <label class="field"><span>Name</span><input name="name" /></label>
            <label class="field"><span>Protocol</span>
              <select name="protocol"><option value="ONVIF">ONVIF</option><option value="VISCA">VISCA</option></select>
            </label>
            <label class="field"><span>IP Address</span><input name="ipAddress" /></label>
            <label class="field"><span>Port</span><input name="port" type="number" /></label>
            <label class="field"><span>Username</span><input name="username" /></label>
            <label class="field"><span>Password</span><input name="password" type="password" /></label>
            <label class="field"><span>RTSP URL</span><input name="rtspUrl" /></label>
            <label class="field"><span>Vendor</span><input name="vendor" /></label>
            <label class="field"><span>Model</span><input name="model" /></label>
            <div class="button-row"><button class="button secondary" type="submit">Save Camera</button></div>
          </form>` : selectedCamera ? `
            <dl class="meta">
              <div><dt>Name</dt><dd>${selectedCamera.name}</dd></div>
              <div><dt>Status</dt><dd>${selectedCamera.status}</dd></div>
              <div><dt>PTZ</dt><dd>${selectedCamera.capabilities.ptz}</dd></div>
              <div><dt>Preset</dt><dd>${selectedCamera.capabilities.preset}</dd></div>
            </dl>` : "<p>No camera selected.</p>"}
      </article>
    </div>
    ${canEdit ? `
      <div class="grid">
        <article class="panel">
          <h4>Test / Deactivate Camera</h4>
          <form id="camera-action-form" class="stack-form">
            <label class="field"><span>Camera</span><select name="cameraId"><option value="">Select camera</option>${cameraOptions}</select></label>
            <div class="button-row">
              <button id="camera-test-button" class="button secondary" type="button">Test Camera</button>
              <button id="camera-deactivate-button" class="button danger" type="button">Deactivate</button>
            </div>
          </form>
        </article>
        <article class="panel">
          <h4>Create Preset</h4>
          <form id="preset-form" class="stack-form">
            <label class="field"><span>Camera</span><select name="cameraId"><option value="">Select camera</option>${cameraOptions}</select></label>
            <label class="field"><span>Preset Code</span><input name="presetCode" /></label>
            <label class="field"><span>Preset Name</span><input name="presetName" /></label>
            <div class="button-row"><button class="button secondary" type="submit">Save Preset</button></div>
          </form>
        </article>
      </div>` : ""}
    <article class="panel">
      <h4>Presets</h4>
      ${selectedCamera ? selectedPresets.length ? `
        <table class="data-table">
          <thead><tr><th>Camera</th><th>Preset Code</th><th>Preset Name</th>${canEdit ? "<th>Actions</th>" : ""}</tr></thead>
          <tbody>${selectedPresets.map((preset) => `<tr><td>${selectedCamera.name}</td><td>${preset.presetCode}</td><td>${preset.presetName || "Unnamed"}</td>${canEdit ? `<td><button class="button danger preset-delete-button" data-preset-id="${preset.id}" type="button">Delete</button></td>` : ""}</tr>`).join("")}</tbody>
        </table>` : "<p>No presets available for selected camera.</p>" : "<p>No camera configured.</p>"}
    </article>
  `;

  if (canEdit) {
    document.getElementById("camera-refresh-button")?.addEventListener("click", async () => {
      await loadCameraData();
      renderCameras();
    });
    document.getElementById("camera-form")?.addEventListener("submit", handleCameraSave);
    document.getElementById("camera-test-button")?.addEventListener("click", handleCameraTest);
    document.getElementById("camera-deactivate-button")?.addEventListener("click", handleCameraDeactivate);
    document.getElementById("preset-form")?.addEventListener("submit", handlePresetSave);
    document.querySelectorAll(".preset-delete-button").forEach((button) => {
      button.addEventListener("click", () => handlePresetDelete(button.dataset.presetId));
    });
  }
}

function renderLayout() {
  const canEdit = isAdmin();
  const unitOptions = state.units.map((unit) => `<option value="TSD_UNIT|${unit.id}">TSD_UNIT - ${unit.externalUnitId}</option>`).join("");
  const cameraOptions = state.cameras.map((camera) => `<option value="CAMERA|${camera.id}">CAMERA - ${camera.name}</option>`).join("");

  viewSections.layout.innerHTML = `
    <div class="grid">
      <article class="panel">
        <h4>Layout</h4>
        ${state.layout ? `
          <dl class="meta">
            <div><dt>File Name</dt><dd>${state.layout.fileName}</dd></div>
            <div><dt>File Type</dt><dd>${state.layout.fileType}</dd></div>
            <div><dt>File Path</dt><dd>${state.layout.filePath}</dd></div>
          </dl>` : "<p>No layout uploaded yet.</p>"}
        ${canEdit ? `
          <form id="layout-upload-form" class="stack-form">
            <label class="field"><span>Layout File</span><input name="file" type="file" accept=".pdf,.jpg,.jpeg" /></label>
            <div class="button-row"><button class="button secondary" type="submit">${state.layout ? "Replace Layout" : "Upload Layout"}</button></div>
          </form>` : '<p class="read-only-text">Operator can view layout only.</p>'}
      </article>
      <article class="panel">
        <h4>Placed Devices</h4>
        ${state.layoutDevices.length ? `
          <table class="data-table">
            <thead><tr><th>Ref Type</th><th>Ref ID</th><th>posX</th><th>posY</th><th>Label</th></tr></thead>
            <tbody>${state.layoutDevices.map((item) => `<tr><td>${item.refType}</td><td>${item.refId}</td><td>${item.posX}</td><td>${item.posY}</td><td>${item.iconLabel || ""}</td></tr>`).join("")}</tbody>
          </table>` : "<p>No devices placed yet.</p>"}
      </article>
    </div>
    ${canEdit ? `
      <div class="grid">
        <article class="panel">
          <h4>Place Device</h4>
          <form id="layout-device-form" class="stack-form">
            <label class="field"><span>Reference</span><select name="ref">${unitOptions}${cameraOptions}</select></label>
            <label class="field"><span>Position X</span><input name="posX" value="0.5" /></label>
            <label class="field"><span>Position Y</span><input name="posY" value="0.5" /></label>
            <label class="field"><span>Label</span><input name="iconLabel" /></label>
            <div class="button-row"><button class="button secondary" type="submit">Save Positions</button></div>
          </form>
        </article>
        <article class="panel">
          <h4>Add Annotation</h4>
          <form id="annotation-form" class="stack-form">
            <label class="field"><span>Text</span><input name="text" /></label>
            <label class="field"><span>Position X</span><input name="posX" value="0.5" /></label>
            <label class="field"><span>Position Y</span><input name="posY" value="0.5" /></label>
            <div class="button-row"><button class="button secondary" type="submit">Save Annotation</button></div>
          </form>
        </article>
      </div>` : ""}
    <article class="panel">
      <h4>Annotations</h4>
      ${state.layoutAnnotations.length ? `
        <table class="data-table">
          <thead><tr><th>Text</th><th>posX</th><th>posY</th></tr></thead>
          <tbody>${state.layoutAnnotations.map((item) => `<tr><td>${item.text}</td><td>${item.posX}</td><td>${item.posY}</td></tr>`).join("")}</tbody>
        </table>` : "<p>No annotations yet.</p>"}
    </article>
  `;

  if (canEdit) {
    document.getElementById("layout-upload-form")?.addEventListener("submit", handleLayoutUpload);
    document.getElementById("layout-device-form")?.addEventListener("submit", handleLayoutDeviceSave);
    document.getElementById("annotation-form")?.addEventListener("submit", handleAnnotationSave);
  }
}

function renderMappings() {
  const canEdit = isAdmin();
  const unitOptions = state.units.map((unit) => `<option value="${unit.id}">${unit.externalUnitId} - ${unit.unitName || "Unnamed"}</option>`).join("");
  const activeCameraOptions = state.cameras.filter((camera) => camera.status === "ACTIVE").map((camera) => `<option value="${camera.id}">${camera.name}</option>`).join("");

  viewSections.mappings.innerHTML = `
    <article class="panel">
      <h4>Mappings</h4>
      ${state.mappings.length ? `
        <table class="data-table">
          <thead><tr><th>Unit</th><th>Camera</th><th>Preset</th><th>Active</th>${canEdit ? "<th>Actions</th>" : ""}</tr></thead>
          <tbody>${state.mappings.map((mapping) => `<tr><td>${mapping.unit.externalUnitId}${mapping.unit.unitName ? ` - ${mapping.unit.unitName}` : ""}</td><td>${mapping.camera.name}</td><td>${mapping.preset.presetCode}</td><td>${statusBadge(mapping.isActive ? "ACTIVE" : "INACTIVE")}</td>${canEdit ? `<td>${mapping.isActive ? `<button class="button danger mapping-deactivate-button" data-mapping-id="${mapping.id}" type="button">Deactivate</button>` : '<span class="muted-text">No action</span>'}</td>` : ""}</tr>`).join("")}</tbody>
        </table>` : "<p>No mappings configured.</p>"}
    </article>
    ${canEdit ? `
      <article class="panel">
        <h4>Create Mapping</h4>
        <form id="mapping-form" class="stack-form">
          <label class="field"><span>Unit</span><select name="unitId"><option value="">Select unit</option>${unitOptions}</select></label>
          <label class="field"><span>Camera</span><select name="cameraId"><option value="">Select camera</option>${activeCameraOptions}</select></label>
          <label class="field"><span>Preset</span><select name="presetId" id="mapping-preset-select"><option value="">Select preset</option></select></label>
          <div class="button-row"><button class="button secondary" type="submit">Save Mapping</button></div>
          <p class="muted-text" id="mapping-preset-help">Select a camera first.</p>
        </form>
      </article>` : '<article class="panel"><p class="read-only-text">Operator can view mappings only.</p></article>'}
  `;

  if (canEdit) {
    document.querySelector('#mapping-form select[name="cameraId"]')?.addEventListener("change", handleMappingCameraChange);
    document.getElementById("mapping-form")?.addEventListener("submit", handleMappingSave);
    document.querySelectorAll(".mapping-deactivate-button").forEach((button) => {
      button.addEventListener("click", () => handleMappingDeactivate(button.dataset.mappingId));
    });
  }
}

function renderMode() {
  const canEdit = isAdmin();
  viewSections.mode.innerHTML = `
    <article class="panel">
      <div class="section-header">
        <h4>Operation Mode</h4>
        ${statusBadge(state.mode)}
      </div>
      <form id="mode-form" class="stack-form">
        <label class="choice-row">
          <input type="radio" name="mode" value="MANUAL" ${state.mode === "MANUAL" ? "checked" : ""} ${canEdit ? "" : "disabled"} />
          <span><strong>MANUAL</strong><small>Manual mode and operator-driven runtime behavior.</small></span>
        </label>
        <label class="choice-row">
          <input type="radio" name="mode" value="AUTOMATIC" ${state.mode === "AUTOMATIC" ? "checked" : ""} ${canEdit ? "" : "disabled"} />
          <span><strong>AUTOMATIC</strong><small>Automatic runtime behavior using active mappings.</small></span>
        </label>
        ${canEdit ? '<div class="button-row"><button class="button secondary" type="submit">Save Mode</button></div>' : '<p class="read-only-text">Operator can review current mode only.</p>'}
      </form>
    </article>
  `;
  if (canEdit) {
    document.getElementById("mode-form")?.addEventListener("submit", handleModeSave);
  }
}

function renderReadiness() {
  viewSections.readiness.innerHTML = `
    <article class="panel">
      <div class="section-header">
        <h4>Readiness Check</h4>
        ${isAdmin() ? '<button id="readiness-run-button" class="button secondary" type="button">Run Check</button>' : '<span class="muted-badge">Admin only action</span>'}
      </div>
      <div id="readiness-result">
        ${state.readiness ? renderReadinessList(state.readiness) : "<p>No readiness check run yet.</p>"}
      </div>
    </article>
  `;
  if (isAdmin()) {
    document.getElementById("readiness-run-button")?.addEventListener("click", async () => {
      await runReadinessCheck();
      renderReadiness();
    });
  }
}

function renderReadinessList(readiness) {
  return `
    <div class="stack-block">
      <p><strong>Overall:</strong> ${statusBadge(readiness.overallStatus)}</p>
      <ul class="plain-list">
        ${readiness.items.map((item) => `<li><strong>${item.category}</strong>: ${statusBadge(item.status)} ${item.message}</li>`).join("")}
      </ul>
    </div>
  `;
}

async function runReadinessCheck() {
  try {
    state.readiness = await fetchJson("/api/v1/config/readiness/check", { method: "POST" });
    setSessionMessage("Readiness check completed.");
  } catch (error) {
    setViewError(error.message || "Unable to run readiness check.");
  }
}

async function handleTsdSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    baseUrl: String(form.get("baseUrl") || "").trim(),
    username: String(form.get("username") || "").trim() || undefined,
    password: String(form.get("password") || "").trim() || undefined,
    sseEndpoint: String(form.get("sseEndpoint") || "").trim() || undefined,
  };
  try {
    if (state.tsdConfig) {
      await fetchJson(`/api/v1/config/tsd/${state.tsdConfig.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await fetchJson("/api/v1/config/tsd", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    await loadTsdData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderTsd();
    renderOverview();
    setSessionMessage("TS-D1000 configuration saved.");
  } catch (error) {
    setViewError(error.message || "Unable to save TS-D1000 configuration.");
  }
}

async function handleTsdTest() {
  if (!state.tsdConfig) return;
  try {
    await fetchJson(`/api/v1/config/tsd/${state.tsdConfig.id}/test`, { method: "POST" });
    await loadTsdData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderTsd();
    renderOverview();
    setSessionMessage("TS-D1000 connection successful.");
  } catch (error) {
    setViewError(error.message || "TS-D1000 connection failed.");
  }
}

async function handleTsdSync() {
  if (!state.tsdConfig) return;
  try {
    await fetchJson(`/api/v1/config/tsd/${state.tsdConfig.id}/sync-units`, { method: "POST" });
    await loadTsdData();
    renderTsd();
    renderLayout();
    renderMappings();
    setSessionMessage("TS-D1000 units synced.");
  } catch (error) {
    setViewError(error.message || "Unable to sync TS-D1000 units.");
  }
}

async function handleTsdDeactivate() {
  if (!state.tsdConfig) return;
  const confirmed = window.confirm("Deactivate the current TS-D1000 configuration?");
  if (!confirmed) return;

  try {
    await fetchJson(`/api/v1/config/tsd/${state.tsdConfig.id}/deactivate`, {
      method: "PATCH",
      body: JSON.stringify({ reason: "Deactivated from browser test" }),
    });
    await loadTsdData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderTsd();
    renderOverview();
    renderMappings();
    setSessionMessage("TS-D1000 configuration deactivated.");
  } catch (error) {
    setViewError(error.message || "Unable to deactivate TS-D1000 configuration.");
  }
}

async function handleCameraSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    name: String(form.get("name") || "").trim(),
    protocol: String(form.get("protocol") || "").trim(),
    ipAddress: String(form.get("ipAddress") || "").trim(),
    port: String(form.get("port") || "").trim() || undefined,
    username: String(form.get("username") || "").trim() || undefined,
    password: String(form.get("password") || "").trim() || undefined,
    rtspUrl: String(form.get("rtspUrl") || "").trim() || undefined,
    vendor: String(form.get("vendor") || "").trim() || undefined,
    model: String(form.get("model") || "").trim() || undefined,
  };
  try {
    await fetchJson("/api/v1/config/cameras", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadCameraData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderCameras();
    renderOverview();
    renderLayout();
    renderMappings();
    event.currentTarget.reset();
    setSessionMessage("Camera saved.");
  } catch (error) {
    setViewError(error.message || "Unable to save camera.");
  }
}

async function handleCameraTest() {
  const form = document.getElementById("camera-action-form");
  const cameraId = form?.elements?.cameraId?.value;
  if (!cameraId) {
    setViewError("Please select a camera.");
    return;
  }
  try {
    await fetchJson(`/api/v1/config/cameras/${cameraId}/test`, { method: "POST" });
    await loadCameraData();
    renderCameras();
    setSessionMessage("Camera connection tested.");
  } catch (error) {
    setViewError(error.message || "Camera connection failed.");
  }
}

async function handleCameraDeactivate() {
  const form = document.getElementById("camera-action-form");
  const cameraId = form?.elements?.cameraId?.value;
  if (!cameraId) {
    setViewError("Please select a camera.");
    return;
  }
  try {
    await fetchJson(`/api/v1/config/cameras/${cameraId}/deactivate`, {
      method: "PATCH",
      body: JSON.stringify({ reason: "Deactivated from browser test" }),
    });
    await loadCameraData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderCameras();
    renderOverview();
    renderMappings();
    setSessionMessage("Camera deactivated.");
  } catch (error) {
    setViewError(error.message || "Unable to deactivate camera.");
  }
}

async function handlePresetSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const cameraId = String(form.get("cameraId") || "");
  const payload = {
    presetCode: String(form.get("presetCode") || "").trim(),
    presetName: String(form.get("presetName") || "").trim() || undefined,
  };
  if (!cameraId) {
    setViewError("Please select a camera.");
    return;
  }
  try {
    await fetchJson(`/api/v1/config/cameras/${cameraId}/presets`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadCameraData();
    renderCameras();
    renderMappings();
    event.currentTarget.reset();
    setSessionMessage("Preset saved.");
  } catch (error) {
    setViewError(error.message || "Unable to save preset.");
  }
}

async function handlePresetDelete(presetId) {
  if (!presetId) return;
  const confirmed = window.confirm("Delete this preset?");
  if (!confirmed) return;

  try {
    await fetchJson(`/api/v1/config/presets/${presetId}`, {
      method: "DELETE",
    });
    await loadCameraData();
    renderCameras();
    renderMappings();
    setSessionMessage("Preset deleted.");
  } catch (error) {
    setViewError(error.message || "Unable to delete preset.");
  }
}

async function handleLayoutUpload(event) {
  event.preventDefault();
  const fileInput = event.currentTarget.querySelector('input[name="file"]');
  if (!fileInput.files?.length) {
    setViewError("Please select a file.");
    return;
  }
  const body = new FormData();
  body.append("file", fileInput.files[0]);
  try {
    await fetchJson(state.layout ? `/api/v1/config/layout/${state.layout.id}/replace` : "/api/v1/config/layout", {
      method: state.layout ? "PUT" : "POST",
      body,
    });
    await loadLayoutData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderLayout();
    renderOverview();
    event.currentTarget.reset();
    setSessionMessage("Layout uploaded.");
  } catch (error) {
    setViewError(error.message || "Unable to upload layout.");
  }
}

async function handleLayoutDeviceSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const refValue = String(form.get("ref") || "");
  const [actualRefType, actualRefId] = refValue.split("|");
  if (!actualRefType || !actualRefId) {
    setViewError("Please select a valid device reference.");
    return;
  }
  try {
    const devices = [
      ...state.layoutDevices.filter((item) => !(item.refType === actualRefType && item.refId === actualRefId)),
      {
        refType: actualRefType,
        refId: actualRefId,
        posX: Number(form.get("posX")),
        posY: Number(form.get("posY")),
        iconLabel: String(form.get("iconLabel") || "").trim() || undefined,
      },
    ];
    await fetchJson("/api/v1/config/layout/devices", {
      method: "PUT",
      body: JSON.stringify({ devices }),
    });
    await loadLayoutData();
    renderLayout();
    event.currentTarget.reset();
    setSessionMessage("Device position saved.");
  } catch (error) {
    setViewError(error.message || "Unable to save device positions.");
  }
}

async function handleAnnotationSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await fetchJson("/api/v1/config/layout/annotations", {
      method: "POST",
      body: JSON.stringify({
        text: String(form.get("text") || "").trim(),
        posX: Number(form.get("posX")),
        posY: Number(form.get("posY")),
      }),
    });
    await loadLayoutData();
    renderLayout();
    event.currentTarget.reset();
    setSessionMessage("Annotation saved.");
  } catch (error) {
    setViewError(error.message || "Unable to save annotation.");
  }
}

function handleMappingCameraChange(event) {
  const cameraId = event.target.value;
  const presetSelect = document.getElementById("mapping-preset-select");
  const help = document.getElementById("mapping-preset-help");
  const presets = cameraId ? state.presetsByCamera[cameraId] || [] : [];
  presetSelect.innerHTML = `<option value="">Select preset</option>${presets.map((preset) => `<option value="${preset.id}">${preset.presetCode}${preset.presetName ? ` - ${preset.presetName}` : ""}</option>`).join("")}`;
  presetSelect.disabled = !cameraId || presets.length === 0;
  help.textContent = !cameraId ? "Select a camera first." : presets.length === 0 ? "No presets available for selected camera." : "Preset list loaded.";
}

async function handleMappingSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await fetchJson("/api/v1/config/mappings", {
      method: "POST",
      body: JSON.stringify({
        unitId: String(form.get("unitId") || ""),
        cameraId: String(form.get("cameraId") || ""),
        presetId: String(form.get("presetId") || ""),
      }),
    });
    await loadMappingsData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderMappings();
    renderOverview();
    event.currentTarget.reset();
    document.getElementById("mapping-preset-select").innerHTML = '<option value="">Select preset</option>';
    document.getElementById("mapping-preset-select").disabled = true;
    document.getElementById("mapping-preset-help").textContent = "Select a camera first.";
    setSessionMessage("Mapping saved.");
  } catch (error) {
    setViewError(error.message || "Unable to save mapping.");
  }
}

async function handleMappingDeactivate(mappingId) {
  if (!mappingId) return;
  const confirmed = window.confirm("Deactivate this mapping?");
  if (!confirmed) return;

  try {
    await fetchJson(`/api/v1/config/mappings/${mappingId}/deactivate`, {
      method: "PATCH",
    });
    await loadMappingsData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderMappings();
    renderOverview();
    setSessionMessage("Mapping deactivated.");
  } catch (error) {
    setViewError(error.message || "Unable to deactivate mapping.");
  }
}

async function handleModeSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const mode = String(form.get("mode") || "");

    // UC-SWITCH-01: warn before switching mode during an active session.
    if (isAdmin()) {
      const snapshot = await fetchJson("/api/v1/runtime/snapshot", { method: "GET" }).catch(() => null);
      if (snapshot && snapshot.operationMode && snapshot.operationMode !== mode) {
        const activeCount = Array.isArray(snapshot.activeSpeakers) ? snapshot.activeSpeakers.length : 0;
        const pendingCount = Array.isArray(snapshot.pendingRequests) ? snapshot.pendingRequests.length : 0;
        if (activeCount > 0 || pendingCount > 0) {
          const confirmed = window.confirm(
            `There are currently ${activeCount} active speaker(s) and ${pendingCount} pending request(s). Switching mode may affect the current session. Continue?`
          );
          if (!confirmed) return;
        }
      }
    }

    await fetchJson("/api/v1/config/mode", {
      method: "PUT",
      body: JSON.stringify({ mode }),
    });
    await loadModeData();
    state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
    renderMode();
    renderOverview();
    setSessionMessage("Operation mode updated.");
  } catch (error) {
    setViewError(error.message || "Unable to update mode.");
  }
}

function unitById(unitId) {
  return state.units.find((unit) => unit.id === unitId) || null;
}

function cameraById(cameraId) {
  return state.cameras.find((camera) => camera.id === cameraId) || null;
}

async function loadRuntimeSnapshot() {
  state.runtimeSnapshot = await fetchJson("/api/v1/runtime/snapshot", { method: "GET" });
  // Use runtime snapshot as the source-of-truth for mode badge on runtime screens.
  if (state.runtimeSnapshot?.operationMode) {
    state.mode = state.runtimeSnapshot.operationMode;
  }
  renderTopbarStatus();
}

async function loadRuntimeRequests() {
  const result = await fetchJson("/api/v1/runtime/requests?page=1&pageSize=50", { method: "GET" });
  state.runtimeRequests = result.items || [];
}

function renderRuntimeManual() {
  const host = viewSections["runtime-manual"];
  const snap = state.runtimeSnapshot;
  if (!snap) {
    host.innerHTML = `<div class="card"><h4>Runtime state not loaded</h4><p>Waiting for data...</p></div>`;
    return;
  }

  const modeBadge = statusBadge(snap.operationMode);
  const sseBadge = statusBadge(snap.sseStatus);

  const activeSpeakers = (snap.activeSpeakers || []).map((unitId) => unitById(unitId)).filter(Boolean);
  const pendingRequests = (state.runtimeRequests || []).filter((req) => req.status === "PENDING");
  const isManual = snap.operationMode === "MANUAL";

  const queuePanel = isManual
    ? `
      <div class="card">
        <div class="card-header">
          <h4>Pending Requests</h4>
          <div class="pill-row">${modeBadge}${sseBadge}</div>
        </div>
        ${
          pendingRequests.length === 0
            ? `<p class="empty">No pending requests.</p>`
            : `<div class="stack">
                ${pendingRequests
                  .map((req) => {
                    const unit = unitById(req.unitId);
                    const label = unit ? `${unit.externalUnitId} - ${unit.unitName || "Unnamed"}` : req.unitId;
                    return `
                      <div class="row-card">
                        <div>
                          <div class="row-title">${label}</div>
                          <div class="row-meta">${statusBadge(req.status)} <span class="muted">Requested:</span> ${formatDate(req.createdAt)}</div>
                        </div>
                        <div class="row-actions">
                          <button class="button primary" data-runtime-approve="${req.id}" type="button">Approve</button>
                          <button class="button danger" data-runtime-reject="${req.id}" type="button">Reject</button>
                        </div>
                      </div>`;
                  })
                  .join("")}
              </div>`
        }
      </div>`
    : `
      <div class="card">
        <div class="card-header">
          <h4>Automatic Mode</h4>
          <div class="pill-row">${modeBadge}${sseBadge}</div>
        </div>
        <p class="hint">Request queue and Approve/Reject actions are hidden in AUTOMATIC mode.</p>
      </div>`;

  host.innerHTML = `
    <div class="grid two">
      ${queuePanel}
      <div class="card">
        <div class="card-header">
          <h4>Active Speakers</h4>
          <div class="pill-row">${statusBadge(activeSpeakers.length)}</div>
        </div>
        ${
          activeSpeakers.length === 0
            ? `<p class="empty">No active speakers.</p>`
            : `<div class="stack">
                ${activeSpeakers
                  .map((unit) => {
                    return `<div class="row-card">
                      <div>
                        <div class="row-title">${unit.externalUnitId} - ${unit.unitName || "Unnamed"}</div>
                        <div class="row-meta">${statusBadge("SPEAKING")} <span class="muted">Type:</span> ${unit.deviceType}</div>
                      </div>
                    </div>`;
                  })
                  .join("")}
              </div>`
        }

        <div class="divider"></div>
        <h4>Camera Target</h4>
        ${
          snap.currentCameraTarget
            ? (() => {
                const cam = cameraById(snap.currentCameraTarget.cameraId);
                const unit = unitById(snap.currentCameraTarget.unitId);
                return `<p><strong>Unit:</strong> ${unit ? unit.externalUnitId : snap.currentCameraTarget.unitId}</p>
                        <p><strong>Camera:</strong> ${cam ? cam.name : snap.currentCameraTarget.cameraId}</p>
                        <p><strong>Preset:</strong> ${snap.currentCameraTarget.presetId}</p>`;
              })()
            : `<p class="empty">No camera target.</p>`
        }
      </div>
    </div>
  `;

  if (isManual) {
    host.querySelectorAll("[data-runtime-approve]").forEach((button) => {
      button.addEventListener("click", async () => {
        await approveRuntimeRequest(button.dataset.runtimeApprove);
      });
    });
    host.querySelectorAll("[data-runtime-reject]").forEach((button) => {
      button.addEventListener("click", async () => {
        await rejectRuntimeRequest(button.dataset.runtimeReject);
      });
    });
  }
}

function buildUnitStateMap() {
  const snapUnits = state.runtimeSnapshot?.units || {};
  const result = {};
  for (const [unitId, item] of Object.entries(snapUnits)) {
    if (item && typeof item === "object") {
      result[unitId] = item.state || "IDLE";
    }
  }
  return result;
}

function renderRuntimeMap() {
  const host = viewSections["runtime-map"];
  const snap = state.runtimeSnapshot;

  if (!state.layout) {
    host.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h4>Realtime Map</h4>
          <div class="pill-row">${snap ? statusBadge(snap.operationMode) : ""}${snap ? statusBadge(snap.sseStatus) : ""}</div>
        </div>
        <p class="hint">No layout configured yet. Upload a layout in <strong>System Configuration</strong> to enable the map canvas.</p>
      </div>
    `;
    return;
  }

  const filters = state.runtimeMapFilters;
  const unitStates = buildUnitStateMap();
  const activeSet = new Set(snap?.activeSpeakers || []);
  const pendingUnitIds = new Set(
    (state.runtimeRequests || [])
      .filter((req) => req.status === "PENDING")
      .map((req) => req.unitId)
      .filter(Boolean)
  );

  const placed = state.layoutDevices || [];
  const selected = state.runtimeSelectedDevice;

  const dots = placed
    .map((device) => {
      const refType = device.refType;
      const refId = device.refId;
      const isCamera = refType === "CAMERA";
      const unitState = !isCamera ? unitStates[refId] || "IDLE" : "IDLE";
      const isActiveSpeaker = !isCamera && activeSet.has(refId);
      const isPending = !isCamera && pendingUnitIds.has(refId);

      if (filters.showActiveSpeakersOnly && !isActiveSpeaker) return null;
      if (!filters.showPendingRequests && isPending) return null;
      if (!filters.showCameras && isCamera) return null;

      const statusClass = !isCamera
        ? unitState === "SPEAKING"
          ? "speaking"
          : unitState === "REQUEST" || isPending
            ? "request"
            : unitState === "OFFLINE"
              ? "offline"
              : ""
        : "";

      const label = device.iconLabel || (isCamera ? "Cam" : "Unit");
      const x = Math.max(0, Math.min(1, Number(device.posX ?? 0))) * 100;
      const y = Math.max(0, Math.min(1, Number(device.posY ?? 0))) * 100;
      const isSelected = selected && selected.refType === refType && selected.refId === refId;

      return `
        <div
          class="device-dot ${statusClass} ${isSelected ? "selected" : ""}"
          style="left:${x}%; top:${y}%"
          data-device-ref-type="${refType}"
          data-device-ref-id="${refId}"
          role="button"
          tabindex="0"
          aria-label="${label}"
        >
          <strong>${label}</strong>
          ${isCamera ? statusBadge("CAMERA") : statusBadge(unitState)}
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  const selectedPanel = (() => {
    if (!selected) {
      return `<p class="hint">Select a device on the canvas to see details.</p>`;
    }
    if (selected.refType === "CAMERA") {
      const camera = cameraById(selected.refId);
      return `
        <dl class="meta">
          <div><dt>Type</dt><dd>Camera</dd></div>
          <div><dt>Name</dt><dd>${camera?.name || selected.refId}</dd></div>
          <div><dt>Status</dt><dd>${statusBadge(camera?.status || "UNKNOWN")}</dd></div>
        </dl>
      `;
    }
    const unit = unitById(selected.refId);
    const unitState = unitStates[selected.refId] || "IDLE";
    return `
      <dl class="meta">
        <div><dt>Type</dt><dd>${unit?.deviceType || "Unit"}</dd></div>
        <div><dt>Unit</dt><dd>${unit ? `${unit.externalUnitId} - ${unit.unitName || "Unnamed"}` : selected.refId}</dd></div>
        <div><dt>Runtime State</dt><dd>${statusBadge(unitState)}</dd></div>
        <div><dt>Last Event</dt><dd>${formatDate(state.runtimeSnapshot?.units?.[selected.refId]?.lastEventAt)}</dd></div>
      </dl>
    `;
  })();

  host.innerHTML = `
    <div class="layout-shell">
      <div class="card">
        <div class="card-header">
          <h4>Legend & Filters</h4>
          <div class="pill-row">${snap ? statusBadge(snap.operationMode) : ""}${snap ? statusBadge(snap.sseStatus) : ""}</div>
        </div>
        <div class="stack-form">
          <label class="choice-row">
            <input type="checkbox" data-filter="activeOnly" ${filters.showActiveSpeakersOnly ? "checked" : ""} />
            <span><strong>Active speakers only</strong><small>Show only units that are currently speaking.</small></span>
          </label>
          <label class="choice-row">
            <input type="checkbox" data-filter="pending" ${filters.showPendingRequests ? "checked" : ""} />
            <span><strong>Show pending requests</strong><small>REQUEST state highlight in MANUAL mode.</small></span>
          </label>
          <label class="choice-row">
            <input type="checkbox" data-filter="cameras" ${filters.showCameras ? "checked" : ""} />
            <span><strong>Show cameras</strong><small>Render placed camera icons.</small></span>
          </label>
          <div class="button-row">
            <button class="button secondary" id="map-reset-btn" type="button">Reset Selection</button>
          </div>
        </div>
        <div class="divider"></div>
        <p class="hint"><strong>States</strong>: ${statusBadge("REQUEST")} ${statusBadge("SPEAKING")} ${statusBadge("IDLE")} ${statusBadge("OFFLINE")}</p>
      </div>

      <div class="layout-canvas" aria-label="Layout canvas">
        <div class="layout-grid"></div>
        ${dots || `<div class="camera-frame">No placed devices yet. Place units/cameras in Layout & Map.</div>`}
      </div>

      <div class="card">
        <div class="card-header"><h4>Selected Device</h4></div>
        ${selectedPanel}
        <div class="divider"></div>
        <h4>Current Camera Target</h4>
        ${
          snap?.currentCameraTarget
            ? (() => {
                const cam = cameraById(snap.currentCameraTarget.cameraId);
                const unit = unitById(snap.currentCameraTarget.unitId);
                return `<p><strong>Unit:</strong> ${unit ? unit.externalUnitId : snap.currentCameraTarget.unitId}</p>
                        <p><strong>Camera:</strong> ${cam ? cam.name : snap.currentCameraTarget.cameraId}</p>
                        <p><strong>Preset:</strong> ${snap.currentCameraTarget.presetId}</p>`;
              })()
            : `<p class="empty">No camera target.</p>`
        }
      </div>
    </div>
  `;

  host.querySelector("#map-reset-btn")?.addEventListener("click", () => {
    state.runtimeSelectedDevice = null;
    renderRuntimeMap();
  });

  host.querySelectorAll("[data-filter]").forEach((node) => {
    node.addEventListener("change", () => {
      const key = node.dataset.filter;
      if (key === "activeOnly") state.runtimeMapFilters.showActiveSpeakersOnly = node.checked;
      if (key === "pending") state.runtimeMapFilters.showPendingRequests = node.checked;
      if (key === "cameras") state.runtimeMapFilters.showCameras = node.checked;
      renderRuntimeMap();
    });
  });

  host.querySelectorAll("[data-device-ref-type]").forEach((node) => {
    const select = () => {
      state.runtimeSelectedDevice = {
        refType: node.dataset.deviceRefType,
        refId: node.dataset.deviceRefId,
      };
      renderRuntimeMap();
    };
    node.addEventListener("click", select);
    node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        select();
      }
    });
  });
}

function renderRuntimeCameras() {
  const host = viewSections["runtime-cameras"];
  const snap = state.runtimeSnapshot;

  const activeCameras = (state.cameras || []).filter((cam) => cam.status === "ACTIVE");
  const grid = Number(state.runtimeCameraGrid) || 2;
  const gridClass = grid === 4 ? "grid four" : grid === 3 ? "grid three" : grid === 1 ? "grid" : "grid two";

  host.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h4>Camera View</h4>
        <div class="pill-row">${snap ? statusBadge(snap.operationMode) : ""}${snap ? statusBadge(snap.sseStatus) : ""}</div>
      </div>
      <div class="row-actions">
        <span class="muted">Grid:</span>
        <button class="button secondary" data-grid="1" type="button">1</button>
        <button class="button secondary" data-grid="2" type="button">2</button>
        <button class="button secondary" data-grid="4" type="button">4</button>
      </div>
    </div>

    <div class="${gridClass}">
      ${
        activeCameras.length === 0
          ? `<div class="card"><p class="empty">No active cameras configured.</p></div>`
          : activeCameras
              .slice(0, 4)
              .map((cam) => {
                const isTarget = snap?.currentCameraTarget?.cameraId === cam.id;
                const targetUnit = snap?.currentCameraTarget?.unitId ? unitById(snap.currentCameraTarget.unitId) : null;
                const targetLabel = isTarget
                  ? targetUnit
                    ? `${targetUnit.externalUnitId} - ${targetUnit.unitName || "Unnamed"}`
                    : snap.currentCameraTarget.unitId
                  : "No target";
                return `
                  <div class="camera-tile">
                    <div class="camera-tile-header">
                      <div>
                        <div class="row-title">${cam.name}</div>
                        <div class="row-meta">${statusBadge(cam.status)} ${cam.protocol ? statusBadge(cam.protocol) : ""}</div>
                      </div>
                      <div class="pill-row">${isTarget ? statusBadge("TARGET") : statusBadge("IDLE")}</div>
                    </div>
                    <div class="camera-frame">
                      <div>
                        <div><strong>Current target</strong></div>
                        <div class="muted">${targetLabel}</div>
                      </div>
                    </div>
                  </div>
                `;
              })
              .join("")
      }
    </div>
  `;

  host.querySelectorAll("[data-grid]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.runtimeCameraGrid = Number(btn.dataset.grid) || 2;
      renderRuntimeCameras();
    });
  });
}

function renderRuntimeMonitor() {
  const host = viewSections["runtime-monitor"];
  const snap = state.runtimeSnapshot;

  host.innerHTML = `
    <div class="grid two">
      <div class="card">
        <div class="card-header">
          <h4>SSE / Runtime Status</h4>
          <div class="pill-row">${snap ? statusBadge(snap.sseStatus) : statusBadge("UNKNOWN")}</div>
        </div>
        <p class="muted">Mode: ${snap ? statusBadge(snap.operationMode) : "N/A"}</p>
        <div class="row-actions">
          <button class="button secondary" id="runtime-refresh-btn" type="button">Refresh</button>
          ${
            isAdmin()
              ? `<button class="button primary" id="runtime-start-btn" type="button">Start Runtime</button>
                 <button class="button danger" id="runtime-stop-btn" type="button">Stop Runtime</button>`
              : `<span class="muted">Admin can start/stop runtime.</span>`
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h4>Snapshot</h4>
        </div>
        <pre class="code">${snap ? JSON.stringify(snap, null, 2) : "No snapshot loaded"}</pre>
      </div>
    </div>
  `;

  host.querySelector("#runtime-refresh-btn")?.addEventListener("click", async () => {
    try {
      await Promise.all([loadRuntimeSnapshot(), loadRuntimeRequests()]);
      renderRuntimeViews();
      setSessionMessage("Runtime refreshed.");
    } catch (error) {
      setViewError(error.message || "Unable to refresh runtime.");
    }
  });

  host.querySelector("#runtime-start-btn")?.addEventListener("click", async () => {
    try {
      await fetchJson("/internal/runtime/start", { method: "POST" });
      await loadRuntimeSnapshot();
      renderRuntimeViews();
      setSessionMessage("Runtime started.");
    } catch (error) {
      setViewError(error.message || "Unable to start runtime.");
    }
  });

  host.querySelector("#runtime-stop-btn")?.addEventListener("click", async () => {
    const confirmed = window.confirm("Stop runtime listener?");
    if (!confirmed) return;
    try {
      await fetchJson("/internal/runtime/stop", { method: "POST" });
      await loadRuntimeSnapshot();
      renderRuntimeViews();
      setSessionMessage("Runtime stopped.");
    } catch (error) {
      setViewError(error.message || "Unable to stop runtime.");
    }
  });
}

function renderRuntimeViews() {
  renderTopbarStatus();
  if (state.currentView === "runtime-manual") {
    renderRuntimeManual();
  }
  if (state.currentView === "runtime-map") {
    renderRuntimeMap();
  }
  if (state.currentView === "runtime-cameras") {
    renderRuntimeCameras();
  }
  if (state.currentView === "runtime-monitor") {
    renderRuntimeMonitor();
  }
}

async function approveRuntimeRequest(requestId) {
  if (!requestId) return;
  try {
    await fetchJson(`/api/v1/runtime/requests/${requestId}/approve`, { method: "POST" });
    await loadRuntimeRequests();
    await loadRuntimeSnapshot();
    renderRuntimeViews();
    setSessionMessage("Request approved.");
  } catch (error) {
    setViewError(error.message || "Unable to approve request.");
  }
}

async function rejectRuntimeRequest(requestId) {
  if (!requestId) return;
  const confirmed = window.confirm("Reject this request?");
  if (!confirmed) return;
  try {
    await fetchJson(`/api/v1/runtime/requests/${requestId}/reject`, { method: "POST" });
    await loadRuntimeRequests();
    await loadRuntimeSnapshot();
    renderRuntimeViews();
    setSessionMessage("Request rejected.");
  } catch (error) {
    setViewError(error.message || "Unable to reject request.");
  }
}

function startRuntimePolling() {
  if (state.runtimePollHandle) return;

  const tick = async () => {
    try {
      await Promise.all([loadRuntimeSnapshot(), loadRuntimeRequests()]);
      renderRuntimeViews();
    } catch (error) {
      // Non-blocking; show a single banner.
      setViewError(error.message || "Unable to load runtime state.");
    }
  };

  tick();
  state.runtimePollHandle = window.setInterval(tick, 1000);
}

function stopRuntimePolling() {
  if (!state.runtimePollHandle) return;
  window.clearInterval(state.runtimePollHandle);
  state.runtimePollHandle = null;
}

function closeModal() {
  if (!modalRoot) return;
  modalRoot.innerHTML = "";
}

async function openChangeModeModal() {
  if (!isAdmin()) return;
  if (!modalRoot) return;

  closeModal();

  const currentMode = state.runtimeSnapshot?.operationMode || state.mode || "MANUAL";
  modalRoot.innerHTML = `
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Change operation mode">
      <div class="modal">
        <div class="modal-header">
          <h4>Change Operation Mode</h4>
          <button class="button danger ghost" id="mode-modal-close" type="button">Close</button>
        </div>
        <div id="mode-impact" class="alert hidden" role="alert"></div>
        <form id="mode-modal-form" class="stack-form">
          <label class="choice-row">
            <input type="radio" name="mode" value="MANUAL" ${currentMode === "MANUAL" ? "checked" : ""} />
            <span><strong>MANUAL</strong><small>Show queue and require approve/reject.</small></span>
          </label>
          <label class="choice-row">
            <input type="radio" name="mode" value="AUTOMATIC" ${currentMode === "AUTOMATIC" ? "checked" : ""} />
            <span><strong>AUTOMATIC</strong><small>Hide queue and follow active speaker events directly.</small></span>
          </label>
          <div class="modal-actions">
            <button class="button secondary" id="mode-modal-cancel" type="button">Cancel</button>
            <button class="button primary" id="mode-modal-save" type="submit">Save Mode</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = modalRoot.querySelector(".modal-overlay");
  const impactNode = modalRoot.querySelector("#mode-impact");
  const closeBtn = modalRoot.querySelector("#mode-modal-close");
  const cancelBtn = modalRoot.querySelector("#mode-modal-cancel");
  const form = modalRoot.querySelector("#mode-modal-form");

  const hide = () => closeModal();
  closeBtn?.addEventListener("click", hide);
  cancelBtn?.addEventListener("click", hide);
  overlay?.addEventListener("click", (ev) => {
    if (ev.target === overlay) hide();
  });
  window.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key === "Escape") hide();
    },
    { once: true }
  );

  try {
    const impact = await fetchJson("/api/v1/runtime/mode/switch-impact", { method: "GET" });
    if (impact?.warningMessage) {
      impactNode.textContent = impact.warningMessage;
      impactNode.classList.remove("hidden");
    }
  } catch {
    // best effort
  }

  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      const selected = form.querySelector("input[name='mode']:checked")?.value;
      if (!selected) {
        impactNode.textContent = "Mode is required.";
        impactNode.classList.remove("hidden");
        return;
      }

      if (selected === currentMode) {
        setSessionMessage("No changes. Mode is already set.");
        hide();
        return;
      }

      await fetchJson("/api/v1/runtime/mode", {
        method: "PUT",
        body: JSON.stringify({ mode: selected }),
      });

      await Promise.all([loadModeData(), loadRuntimeSnapshot(), loadRuntimeRequests()]);
      state.overview = await fetchJson("/api/v1/config/overview", { method: "GET" });
      renderAllViews();
      renderRuntimeViews();
      setSessionMessage("Operation mode updated.");
      hide();
    } catch (error) {
      impactNode.textContent = error.message || "Unable to update mode.";
      impactNode.classList.remove("hidden");
    }
  });
}

modeBadgeButton?.addEventListener("click", () => {
  openChangeModeModal();
});

usernameInput.addEventListener("blur", () => {
  if (usernameInput.value.trim()) setFieldError("username", "");
});

passwordInput.addEventListener("blur", () => {
  if (passwordInput.value.trim()) setFieldError("password", "");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearLoginError();
  setSessionMessage("");
  setViewError("");

  if (!validateLoginForm()) return;

  setLoginLoading(true);

  try {
    const { response, payload } = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      }),
    });

    if (!response.ok || !payload?.success) {
      const code = payload?.error?.code;
      const message =
        code === "USER_INACTIVE"
          ? "User account is inactive"
          : response.status >= 500
          ? "System error"
          : "Invalid username or password";
      showLoginError(message);
      return;
    }

    state.token = payload.data.token;
    state.user = payload.data.user;
    state.session = {
      id: null,
      expiresAt: payload.data.expiresAt,
    };
    persistAuth();

    const meResult = await apiFetch("/api/v1/auth/me", { method: "GET" });
    if (!meResult.response.ok || !meResult.payload?.success) {
      clearAuth();
      showLoginError("Unable to load session context");
      return;
    }

    state.user = meResult.payload.data.user;
    state.session = meResult.payload.data.session;
    persistAuth();
    await loadApplicationData();

    usernameInput.value = "";
    passwordInput.value = "";
    renderAuthenticatedView();
  } catch {
    showLoginError("Unable to connect. Please check network.");
  } finally {
    setLoginLoading(false);
  }
});

logoutButton.addEventListener("click", async () => {
  const shouldLogout = window.confirm("Are you sure you want to logout?");
  if (!shouldLogout) return;

  try {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
  } catch {
    // best effort
  } finally {
    clearAuth();
    renderLoggedOutView();
    setSessionMessage("Session ended.");
  }
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.view;
    if (target === "logs" && !isAdmin()) {
      return;
    }
    showView(target);
  });
});

bootstrapAuth();
