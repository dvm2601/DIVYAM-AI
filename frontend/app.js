const API_BASE_URL =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ||
  "http://127.0.0.1:8000";

const form = document.getElementById("chatForm");
const input = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const newChatBtn = document.getElementById("newChatBtn");
const themeBtn = document.getElementById("themeBtn");
const statusText = document.getElementById("statusText");
const toast = document.getElementById("toast");
const sidebar = document.getElementById("sidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");

let busy = false;

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function renderMarkdownLite(text) {
  // Lightweight rendering for this portfolio. The backend returns plain text.
  let html = escapeHtml(text);
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/^\s*[-•]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  html = html.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
  return `<p>${html}</p>`;
}

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "D" : "You";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = role === "assistant" ? renderMarkdownLite(text) : `<p>${escapeHtml(text)}</p>`;

  row.appendChild(avatar);
  row.appendChild(bubble);
  messages.appendChild(row);
  scrollToBottom();
  return { row, bubble };
}

function addTyping() {
  const row = document.createElement("div");
  row.className = "message assistant";
  row.id = "typingRow";
  row.innerHTML = `
    <div class="avatar">D</div>
    <div class="bubble">
      <div class="typing"><i></i><i></i><i></i></div>
    </div>`;
  messages.appendChild(row);
  scrollToBottom();
}

function removeTyping() {
  document.getElementById("typingRow")?.remove();
}

function scrollToBottom() {
  const area = document.getElementById("chatArea");
  requestAnimationFrame(() => area.scrollTo({ top: area.scrollHeight, behavior: "smooth" }));
}

function setBusy(value) {
  busy = value;
  sendBtn.disabled = value || !input.value.trim();
  input.disabled = value;
  statusText.textContent = value ? "Thinking…" : "Ready";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

async function sendQuestion(question) {
  question = question.trim();
  if (!question || busy) return;

  welcome.style.display = "none";
  addMessage("user", question);
  input.value = "";
  resizeInput();
  setBusy(true);
  addTyping();

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      let detail = "";
      try {
        const data = await response.json();
        detail = data.detail || "";
      } catch (_) {}
      throw new Error(detail || `Server returned ${response.status}`);
    }

    const data = await response.json();
    removeTyping();
    addMessage("assistant", data.answer || "I don't have enough information to answer that.");
  } catch (error) {
    removeTyping();
    addMessage(
      "assistant",
      "I couldn't reach the resume assistant right now. Please try again in a moment."
    );
    showToast("Could not connect to the backend.");
    console.error(error);
  } finally {
    setBusy(false);
    input.focus();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  sendQuestion(input.value);
});

input.addEventListener("input", () => {
  resizeInput();
  sendBtn.disabled = busy || !input.value.trim();
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!busy) form.requestSubmit();
  }
});

function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
}

document.querySelectorAll(".suggestion-trigger").forEach(button => {
  button.addEventListener("click", () => {
    sidebar.classList.remove("open");
    sendQuestion(button.dataset.question);
  });
});

newChatBtn.addEventListener("click", () => {
  messages.innerHTML = "";
  welcome.style.display = "";
  input.value = "";
  resizeInput();
  input.focus();
});

themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("divyam-theme", next);
  themeBtn.textContent = next === "dark" ? "☀" : "☾";
});

mobileMenuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));

document.addEventListener("click", event => {
  if (window.innerWidth <= 760 &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      event.target !== mobileMenuBtn) {
    sidebar.classList.remove("open");
  }
});

const savedTheme = localStorage.getItem("divyam-theme");
if (savedTheme === "dark") {
  document.documentElement.dataset.theme = "dark";
  themeBtn.textContent = "☀";
}

// Optional resume link. Put your deployed PDF URL here.
const RESUME_URL = "resume latest aug 6.pdf";
document.getElementById("resumeLink").addEventListener("click", event => {
  if (!RESUME_URL) {
    event.preventDefault();
    showToast("Add your resume PDF URL in app.js.");
    return;
  }
  event.currentTarget.href = RESUME_URL;
});

input.focus();
