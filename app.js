"use strict";

const VERSION = "2";
const DEFAULT_CLIENT_ID = "124960225219-osjbpd1vbqvt66vph755v9kcsp15lf0v.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const LOG_KEY = "gis-test-log";
const SETTINGS_KEY = "gis-test-settings";

function settings() {
  const stored = readJson(SETTINGS_KEY, {});
  return { ...stored, clientId: stored.clientId || DEFAULT_CLIENT_ID };
}

const $ = (id) => document.getElementById(id);
let tokenClient = null;
let token = null;
let expiresAt = 0;
let requestedAt = 0;

function displayMode() {
  for (const mode of ["standalone", "minimal-ui", "fullscreen"]) {
    if (matchMedia(`(display-mode: ${mode})`).matches) return mode;
  }
  return "browser";
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("localStorage write failed", error);
  }
}

function log(msg, data, kind) {
  const entries = readJson(LOG_KEY, []);
  entries.push({ t: new Date().toISOString(), mode: displayMode(), msg, data: data ?? null, kind: kind ?? "" });
  writeJson(LOG_KEY, entries.slice(-400));
  renderLog();
}

function renderLog() {
  const entries = readJson(LOG_KEY, []);
  const list = $("log");
  list.replaceChildren(
    ...entries
      .slice()
      .reverse()
      .map((e) => {
        const li = document.createElement("li");
        li.className = e.kind;
        const time = e.t.slice(11, 19);
        li.textContent = `${time} [${e.mode}] ${e.msg}${e.data ? " " + JSON.stringify(e.data) : ""}`;
        return li;
      }),
  );
}

function renderStatus() {
  const current = settings();
  const rows = [
    ["Version", VERSION],
    ["Anzeigemodus", displayMode()],
    ["Online", String(navigator.onLine)],
    ["Client-ID", current.clientId === DEFAULT_CLIENT_ID ? "Vorgabe" : "eigene"],
    ["GIS geladen", String(Boolean(window.google?.accounts?.oauth2))],
    ["Token", token ? `gültig bis ${new Date(expiresAt).toLocaleTimeString("de-DE")}` : "keins"],
  ];
  $("status").replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const key = document.createElement("b");
      key.textContent = k;
      const value = document.createElement("span");
      value.textContent = v;
      return [key, value];
    }),
  );
}

function initClient() {
  const { clientId } = settings();
  if (!clientId) {
    log("Keine Client-ID gesetzt", null, "err");
    return false;
  }
  if (!window.google?.accounts?.oauth2) {
    log("GIS-Skript noch nicht geladen", null, "err");
    return false;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPE,
    callback: onToken,
    error_callback: onTokenError,
  });
  log("Token-Client initialisiert");
  return true;
}

function onToken(response) {
  const ms = Date.now() - requestedAt;
  if (response.error) {
    log("Freigabe-Antwort mit Fehler", { error: response.error, description: response.error_description, ms }, "err");
    return;
  }
  token = response.access_token;
  expiresAt = Date.now() + Number(response.expires_in) * 1000;
  log("Token erhalten", { expires_in: response.expires_in, scope: response.scope, ms, visible: document.visibilityState }, "ok");
  renderStatus();
}

function onTokenError(error) {
  log("Freigabe fehlgeschlagen", { type: error.type, message: error.message, ms: Date.now() - requestedAt }, "err");
}

function request(label, overrides) {
  if (!tokenClient && !initClient()) return;
  requestedAt = Date.now();
  log(`Anforderung: ${label}`, overrides);
  try {
    tokenClient.requestAccessToken(overrides);
  } catch (error) {
    log("requestAccessToken warf eine Ausnahme", { message: String(error) }, "err");
  }
}

function silentOverrides() {
  const { hint } = settings();
  return hint ? { prompt: "", login_hint: hint } : { prompt: "" };
}

async function driveFetch(label, url, init) {
  if (!token) {
    log(`${label}: kein Token vorhanden`, null, "err");
    return;
  }
  try {
    const response = await fetch(url, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } });
    const text = await response.text();
    log(`${label}: HTTP ${response.status}`, { body: text.slice(0, 300) }, response.ok ? "ok" : "err");
  } catch (error) {
    log(`${label}: Netzwerkfehler`, { message: String(error) }, "err");
  }
}

function upload() {
  const boundary = "gis-test-" + Date.now();
  const metadata = { name: `test-${new Date().toISOString()}.json`, parents: ["appDataFolder"] };
  const content = { erstellt: new Date().toISOString(), modus: displayMode() };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content)}\r\n--${boundary}--`;
  driveFetch("Upload", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
}

function listFiles() {
  const params = new URLSearchParams({ spaces: "appDataFolder", fields: "files(id,name,createdTime)", orderBy: "createdTime desc", pageSize: "10" });
  driveFetch("Auflisten", `https://www.googleapis.com/drive/v3/files?${params}`);
}

async function copyLog() {
  const text = JSON.stringify({ ua: navigator.userAgent, entries: readJson(LOG_KEY, []) }, null, 1);
  try {
    await navigator.clipboard.writeText(text);
    log("Protokoll in die Zwischenablage kopiert");
  } catch {
    const area = $("copyArea");
    area.hidden = false;
    area.value = text;
    area.select();
    log("Kopieren nicht erlaubt; Text im Feld markiert", null, "err");
  }
}

function loadSettingsIntoForm() {
  const current = settings();
  $("clientId").value = current.clientId;
  $("hint").value = current.hint ?? "";
  $("auto").checked = Boolean(current.auto);
}

window.gisLoaded = () => {
  log("GIS-Skript geladen");
  renderStatus();
  if (!initClient()) return;
  if (settings().auto) request("automatisch beim Start (ohne Tipp)", silentOverrides());
};

window.gisFailed = () => {
  log("GIS-Skript konnte nicht geladen werden", { online: navigator.onLine }, "err");
};

$("save").addEventListener("click", () => {
  writeJson(SETTINGS_KEY, { clientId: $("clientId").value.trim(), hint: $("hint").value.trim(), auto: $("auto").checked });
  tokenClient = null;
  log("Einstellungen gespeichert");
  initClient();
  renderStatus();
});
$("consent").addEventListener("click", () => request("mit Zustimmungsdialog", { prompt: "consent" }));
$("silent").addEventListener("click", () => request("ohne Dialog", silentOverrides()));
$("delayed").addEventListener("click", () => {
  log("Anforderung in 10 Sekunden geplant");
  setTimeout(() => request("verzögert (10 s nach dem Tipp)", silentOverrides()), 10000);
});
$("upload").addEventListener("click", upload);
$("list").addEventListener("click", listFiles);
$("persist").addEventListener("click", async () => {
  const granted = await navigator.storage?.persist?.();
  log("persist() angefordert", { granted });
});
$("copy").addEventListener("click", copyLog);
$("clear").addEventListener("click", () => {
  writeJson(LOG_KEY, []);
  renderLog();
});

document.addEventListener("visibilitychange", () => log(`Sichtbarkeit: ${document.visibilityState}`));
addEventListener("online", () => log("Online"));
addEventListener("offline", () => log("Offline"));
setInterval(renderStatus, 5000);

loadSettingsIntoForm();
renderLog();
renderStatus();
log("Seite geladen", { ua: navigator.userAgent, online: navigator.onLine, referrer: document.referrer || null });
navigator.storage?.persisted?.().then((persisted) => log("Speicher dauerhaft?", { persisted }));
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then(() => log("Service Worker registriert"))
    .catch((error) => log("Service Worker fehlgeschlagen", { message: String(error) }, "err"));
}
