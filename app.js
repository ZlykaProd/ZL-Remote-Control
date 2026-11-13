const socket = io({transports:["websocket"]});
const statusEl = document.getElementById("status");
const screen = document.getElementById("screen");
const placeholder = document.getElementById("placeholder");
const notice = document.getElementById("notice");
const connectBtn = document.getElementById("connect");
const disconnectBtn = document.getElementById("disconnect");
let agentOnline = false, viewing = false, sourceWidth = 0, sourceHeight = 0, lastMove = 0;

function status(text, online) {
  statusEl.textContent = text;
  statusEl.className = "status " + (online ? "online" : "offline");
}
function updateButtons() {
  connectBtn.disabled = viewing || !agentOnline;
  disconnectBtn.disabled = !viewing;
}
socket.on("connect", () => socket.emit("agent_status_request"));
socket.on("connect_error", () => notice.textContent = "Не удалось подключиться к серверу.");
socket.on("agent_status", data => {
  agentOnline = !!data.online;
  status(agentOnline ? "ПК в сети" : "ПК не в сети", agentOnline);
  updateButtons();
});
socket.on("notice", data => notice.textContent = data.message || "Нет доступа.");
socket.on("view_started", () => {
  viewing = true; placeholder.style.display = "none";
  notice.textContent = "Подключено. Управление активно.";
  updateButtons();
});
socket.on("screen_frame", data => {
  if (!viewing) return;
  sourceWidth = data.width; sourceHeight = data.height;
  screen.src = "data:image/jpeg;base64," + data.image;
  screen.style.display = "block";
});
connectBtn.onclick = () => {
  notice.textContent = "Запрос отправлен. Подтвердите его в окне на компьютере.";
  socket.emit("viewer_request");
};
disconnectBtn.onclick = stop;
function stop() {
  socket.emit("viewer_stop"); viewing = false;
  screen.style.display = "none"; placeholder.style.display = "grid";
  notice.textContent = "Сеанс отключён."; updateButtons();
}
document.getElementById("fullscreen").onclick = () => {
  const wrap = document.getElementById("screenWrap");
  if (wrap.requestFullscreen) wrap.requestFullscreen();
};
function coords(e) {
  const r = screen.getBoundingClientRect();
  return {
    x: Math.round((e.clientX-r.left) / r.width * sourceWidth),
    y: Math.round((e.clientY-r.top) / r.height * sourceHeight)
  };
}
screen.addEventListener("mousemove", e => {
  if (!viewing || !sourceWidth) return;
  const now = Date.now(); if (now-lastMove < 70) return; lastMove = now;
  socket.emit("control", {kind:"move", ...coords(e)});
});
screen.addEventListener("click", e => {
  if (!viewing) return;
  socket.emit("control", {kind:"click", ...coords(e), button:e.button === 2 ? "right" : "left"});
});
screen.addEventListener("contextmenu", e => e.preventDefault());
document.getElementById("sendKey").onclick = () => {
  const field = document.getElementById("keyInput");
  if (viewing && field.value) socket.emit("control", {kind:"key", key:field.value});
  field.value = "";
};
window.addEventListener("beforeunload", () => { if (viewing) socket.emit("viewer_stop"); });
