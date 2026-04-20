const authKey = "tsd1000.auth";

const state = {
  token: null,
  user: null,
  session: null,
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

function renderAuthenticatedView() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");

  document.getElementById("welcome-title").textContent = `Dashboard`;
  document.getElementById("username-chip").textContent = state.user.username;
  document.getElementById("role-badge").textContent = state.user.role;
  document.getElementById("user-id").textContent = state.user.id;
  document.getElementById("user-name").textContent = state.user.username;
  document.getElementById("user-role").textContent = state.user.role;
  document.getElementById("user-status").textContent = state.user.status;
  document.getElementById("session-id").textContent = state.session.id;
  document.getElementById("session-expiry").textContent = new Date(state.session.expiresAt).toLocaleString();

  document.querySelectorAll(".admin-only").forEach((node) => {
    node.classList.toggle("hidden", state.user.role !== "ADMIN");
  });
}

function renderLoggedOutView() {
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
  usernameInput.focus();
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => null);
  return { response, payload };
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
    // Best-effort logout for UX.
  } finally {
    clearAuth();
    renderLoggedOutView();
    setSessionMessage("Session ended.");
  }
});

bootstrapAuth();
