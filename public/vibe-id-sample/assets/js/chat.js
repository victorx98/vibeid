(function () {
  const ns = window.aiResume || (window.aiResume = {});
  const data = window.resumeContent;

  const SYSTEM_CONTEXT = buildContext();

  function buildContext() {
    const p = data.profile;
    const exp = data.experience.map(
      (e) => `${e.role} at ${e.organization} (${e.dates}): ${e.bullets.join(" ")}`
    ).join("\n");
    const edu = data.education.map((e) => `${e.degree}, ${e.school} (${e.dates})`).join("; ");
    const projects = data.projects.map(
      (proj) => `${proj.title} (${proj.source}): ${proj.summary}`
    ).join("\n");
    const stack = data.stack.map((s) => s.label).join(", ");

    return [
      `You are an assistant embedded on ${p.name}'s portfolio page.`,
      `Answer questions about their background concisely and helpfully.`,
      `If a question is unrelated, politely redirect to the resume topics.`,
      `\n--- Profile ---`,
      p.summary,
      `\n--- Experience ---`,
      exp,
      `\n--- Education ---`,
      edu,
      `\n--- Projects ---`,
      projects,
      `\n--- Tech Stack ---`,
      stack
    ].join("\n");
  }

  const GREETING = "Hi! I can answer questions about Duke's background, projects, and skills. What would you like to know?";

  let messages = [];
  let isOpen = false;

  function inject() {
    /* Floating action button */
    const fab = document.createElement("button");
    fab.className = "chat-fab";
    fab.setAttribute("aria-label", "Open AI chat");
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    document.body.appendChild(fab);

    /* Chat window */
    const win = document.createElement("div");
    win.className = "chat-window";
    win.id = "chat-window";
    win.innerHTML = `
      <div class="chat-header">
        <span class="chat-header-title">Ask about Duke</span>
        <button class="chat-close" aria-label="Close chat">&times;</button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <form class="chat-input-row" id="chat-form">
        <input class="chat-input" id="chat-input" type="text" placeholder="Ask a question..." autocomplete="off">
        <button class="chat-send" type="submit">Send</button>
      </form>
    `;
    document.body.appendChild(win);

    /* Events */
    fab.addEventListener("click", toggle);
    win.querySelector(".chat-close").addEventListener("click", toggle);
    document.getElementById("chat-form").addEventListener("submit", handleSubmit);

    /* Show greeting */
    messages = [{ role: "assistant", content: GREETING }];
    renderMessages();
  }

  function toggle() {
    isOpen = !isOpen;
    document.getElementById("chat-window").classList.toggle("is-open", isOpen);
    if (isOpen) {
      document.getElementById("chat-input").focus();
    }
  }

  function renderMessages() {
    const container = document.getElementById("chat-messages");
    container.innerHTML = messages
      .map((msg) => `<div class="chat-bubble ${msg.role}">${escapeHtml(msg.content)}</div>`)
      .join("");
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = document.getElementById("chat-messages");
    container.innerHTML += `<div class="chat-bubble typing" id="typing-indicator">Thinking...</div>`;
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    messages.push({ role: "user", content: text });
    input.value = "";
    renderMessages();
    showTyping();

    const reply = await getReply(text);
    hideTyping();
    messages.push({ role: "assistant", content: reply });
    renderMessages();
  }

  async function getReply(userText) {
    /* Try Anthropic API if key is configured on the page */
    const apiKey = window.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            system: SYSTEM_CONTEXT,
            messages: messages.filter((m) => m.role !== "assistant" || m.content !== GREETING)
              .concat([{ role: "user", content: userText }])
              .slice(-10)
          })
        });

        if (res.ok) {
          const json = await res.json();
          return json.content[0].text;
        }
      } catch (_) {
        /* fall through to local fallback */
      }
    }

    /* Local keyword fallback when no API key */
    return localFallback(userText);
  }

  function localFallback(text) {
    const lower = text.toLowerCase();

    if (lower.includes("experience") || lower.includes("work") || lower.includes("job")) {
      return data.experience
        .map((e) => `${e.role} at ${e.organization} (${e.dates})`)
        .join("\n");
    }

    if (lower.includes("education") || lower.includes("degree") || lower.includes("school")) {
      return data.education
        .map((e) => `${e.degree} — ${e.school} (${e.dates})`)
        .join("\n");
    }

    if (lower.includes("project")) {
      return data.projects
        .map((p) => `${p.navTitle}: ${p.summary}`)
        .join("\n\n");
    }

    if (lower.includes("skill") || lower.includes("tech") || lower.includes("stack") || lower.includes("tool")) {
      return "Tech stack: " + data.stack.map((s) => s.label).join(", ") + ".";
    }

    if (lower.includes("contact") || lower.includes("email") || lower.includes("phone")) {
      return `Email: ${data.profile.email} | Phone: ${data.profile.phone} | Website: ${data.profile.website}`;
    }

    if (lower.includes("strength") || lower.includes("about")) {
      return data.strengths.join("\n");
    }

    return "I can answer questions about Duke's experience, education, projects, skills, and contact info. What would you like to know?";
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, "<br>");
  }

  /* Auto-init after DOM is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }

  ns.chat = { toggle };
})();
