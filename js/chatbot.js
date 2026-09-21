/**
 * TETRA AEROMECH - AI Engineering Concierge Chatbot ("TetraBot")
 * Handles live technical aerospace inquiries, tolerances, materials, standards, and RFQ navigation.
 */

(function () {
  let chatSessionId = "session_" + Math.random().toString(36).substring(2, 9);
  let isOpen = false;

  // DOM Elements
  const launcher = document.getElementById("chatLauncher");
  const widget = document.getElementById("chatWidget");
  const closeBtn = document.getElementById("chatClose");
  const messagesContainer = document.getElementById("chatMessages");
  const inputField = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  const chipsContainer = document.getElementById("chatChips");

  if (!launcher || !widget) return;

  // Toggle Chat Open/Close
  function toggleChat(open) {
    isOpen = (typeof open === "boolean") ? open : !isOpen;
    if (isOpen) {
      widget.classList.add("active");
      launcher.classList.add("hidden");
      if (inputField) inputField.focus();
    } else {
      widget.classList.remove("active");
      launcher.classList.remove("hidden");
    }
  }

  launcher.addEventListener("click", () => toggleChat(true));
  if (closeBtn) closeBtn.addEventListener("click", () => toggleChat(false));

  // Quick Chips
  const promptChips = [
    "What tolerances can you deliver?",
    "Can you machine Inconel 718 and Titanium?",
    "Do you provide AS9102 FAIR reports?",
    "Explain your 7S and Kanban system",
    "Who are the 4 co-founders?",
    "How does the RFQ process work?"
  ];

  function renderChips() {
    if (!chipsContainer) return;
    chipsContainer.innerHTML = promptChips.map(chip => `
      <button class="chat-chip" data-query="${chip}">${chip}</button>
    `).join("");

    chipsContainer.querySelectorAll(".chat-chip").forEach(btn => {
      btn.addEventListener("click", () => {
        const query = btn.getAttribute("data-query");
        if (query) {
          sendMessage(query);
        }
      });
    });
  }

  renderChips();

  // Append Message to UI
  function appendMessage(sender, text, isActionable = false) {
    if (!messagesContainer) return;

    const msgEl = document.createElement("div");
    msgEl.className = `chat-msg chat-msg-${sender}`;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;

    msgEl.appendChild(bubble);

    if (isActionable && sender === "bot") {
      const actionRow = document.createElement("div");
      actionRow.className = "chat-action-row";
      actionRow.innerHTML = `
        <a href="#rfq" class="btn btn-xs btn-primary" onclick="window.closeChat()">Launch RFQ Builder</a>
        <a href="#components" class="btn btn-xs btn-outline" onclick="window.closeChat()">View Components</a>
      `;
      msgEl.appendChild(actionRow);
    }

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Show Typing Indicator
  let typingIndicator = null;
  function showTyping() {
    if (typingIndicator) return;
    typingIndicator = document.createElement("div");
    typingIndicator.className = "chat-msg chat-msg-bot chat-typing";
    typingIndicator.innerHTML = `
      <div class="chat-bubble">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    `;
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    if (typingIndicator && typingIndicator.parentNode) {
      typingIndicator.parentNode.removeChild(typingIndicator);
    }
    typingIndicator = null;
  }

  // Send Message Logic
  async function sendMessage(text) {
    const query = text || (inputField ? inputField.value.trim() : "");
    if (!query) return;

    if (inputField) inputField.value = "";
    appendMessage("user", query);
    showTyping();

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          session_id: chatSessionId
        })
      });

      hideTyping();

      if (resp.ok) {
        const data = await resp.json();
        const reply = data.reply || "Thank you for contacting Tetra Aeromech Engineering.";
        const isActionable = query.toLowerCase().includes("quote") || query.toLowerCase().includes("rfq") || query.toLowerCase().includes("tolerance") || query.toLowerCase().includes("part");
        appendMessage("bot", reply, isActionable);
      } else {
        appendMessage("bot", "Our engineering server is operating under high security restrictions. You can directly request a quote via our online RFQ portal or email us.", true);
      }
    } catch (err) {
      hideTyping();
      // Graceful offline fallback
      appendMessage("bot", "At Tetra Aeromech, we specialize in precision CNC & 5-axis VMC machining for Aerospace, Defense, and Automotive sectors with sub-micron tolerances (±0.002 mm). Feel free to submit your 3D CAD drawing in our RFQ portal.", true);
    }
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", () => sendMessage());
  }

  if (inputField) {
    inputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  window.openChat = function () { toggleChat(true); };
  window.closeChat = function () { toggleChat(false); };
})();
