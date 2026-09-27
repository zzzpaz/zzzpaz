"use strict";

const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");

const newChat = document.getElementById("newChat");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");

let isSending = false;

/* =========================
   UTILITIES
========================= */

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function scrollToBottom() {
    const chatArea = document.getElementById("chatArea");

    if (!chatArea) return;

    requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    });
}

function autoResize() {
    if (!input) return;

    input.style.height = "auto";

    const maxHeight = 150;
    const height = Math.min(input.scrollHeight, maxHeight);

    input.style.height = `${height}px`;
}

function closeSidebar() {
    if (sidebar) {
        sidebar.classList.remove("open");
    }
}

/* =========================
   MESSAGE
========================= */

function addMessage(role, text, sources = []) {
    if (!messages) return;

    if (welcome) {
        welcome.style.display = "none";
    }

    const message = document.createElement("div");
    message.className = `message ${role}`;

    const avatar = role === "user" ? "U" : "✦";

    let sourcesHtml = "";

    if (Array.isArray(sources) && sources.length > 0) {
        sourcesHtml = `
            <div class="sources">
                ${sources.map(source => {
                    const title = escapeHtml(
                        source?.title || source?.url || "Sumber"
                    );

                    const url = escapeHtml(
                        source?.url || "#"
                    );

                    return `
                        <a
                            class="source"
                            href="${url}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${title}
                        </a>
                    `;
                }).join("")}
            </div>
        `;
    }

    message.innerHTML = `
        <div class="avatar">${avatar}</div>

        <div class="message-stack">

            <div class="bubble">${escapeHtml(text)}</div>

            ${sourcesHtml}

        </div>
    `;

    messages.appendChild(message);

    scrollToBottom();
}

/* =========================
   TYPING
========================= */

function showTyping() {
    removeTyping();

    if (!messages) return;

    const message = document.createElement("div");

    message.className = "message assistant";
    message.id = "typingMessage";

    message.innerHTML = `
        <div class="avatar">✦</div>

        <div class="message-stack">

            <div class="bubble typing-bubble">
                <div class="typing">
                    <i></i>
                    <i></i>
                    <i></i>
                </div>
            </div>

        </div>
    `;

    messages.appendChild(message);

    scrollToBottom();
}

function removeTyping() {
    const typing = document.getElementById("typingMessage");

    if (typing) {
        typing.remove();
    }
}

/* =========================
   SEND MESSAGE
========================= */

async function sendMessage(value) {
    const text = String(value || "").trim();

    if (!text) return;

    if (isSending) return;

    isSending = true;

    addMessage("user", text);

    input.value = "";
    autoResize();

    sendBtn.disabled = true;
    input.disabled = true;

    showTyping();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: text
            })
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        removeTyping();

        if (!response.ok) {
            throw new Error(
                data?.error ||
                data?.message ||
                `Server error ${response.status}`
            );
        }

        if (!data.success) {
            throw new Error(
                data?.error ||
                data?.message ||
                "DEA IMUP gagal memberikan jawaban."
            );
        }

        let reply = String(
            data.reply ||
            data.message ||
            ""
        ).trim();

        if (!reply) {
            throw new Error(
                "DEA IMUP tidak mengembalikan jawaban."
            );
        }

        /*
         * Fallback jika backend masih
         * mengeluarkan nama lama.
         */
        reply = reply
            .replaceAll("ZEA AI", "DEA IMUP")
            .replaceAll("ZEA", "DEA IMUP");

        const sources =
            Array.isArray(data.sources)
                ? data.sources
                : [];

        addMessage(
            "assistant",
            reply,
            sources
        );

    } catch (error) {
        removeTyping();

        console.error("DEA IMUP error:", error);

        addMessage(
            "assistant",
            "Maaf, terjadi masalah saat menghubungi DEA IMUP.\n\n" +
            (error?.message || "Server tidak dapat memberikan jawaban.")
        );

    } finally {
        isSending = false;

        sendBtn.disabled = false;
        input.disabled = false;

        input.focus();

        autoResize();

        updateKeyboardOffset();
    }
}

/* =========================
   FORM
========================= */

if (form) {
    form.addEventListener("submit", event => {
        event.preventDefault();

        sendMessage(input.value);
    });
}

/* =========================
   ENTER / SHIFT+ENTER
========================= */

if (input) {
    input.addEventListener("keydown", event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            if (!isSending) {
                sendMessage(input.value);
            }
        }

    });

    input.addEventListener("input", () => {
        autoResize();
        updateKeyboardOffset();
    });
}

/* =========================
   QUICK PROMPTS
========================= */

document.querySelectorAll("[data-prompt]")
    .forEach(button => {

        button.addEventListener("click", () => {

            const prompt =
                button.dataset.prompt || "";

            if (!prompt.trim()) return;

            /*
             * Jika prompt diakhiri titik dua,
             * biarkan user mengisinya sendiri.
             */
            if (prompt.trim().endsWith(":")) {

                input.value = prompt;

                autoResize();

                input.focus();

                closeSidebar();

                return;
            }

            sendMessage(prompt);

            closeSidebar();
        });

    });

/* =========================
   NEW CHAT
========================= */

if (newChat) {
    newChat.addEventListener("click", () => {

        if (isSending) return;

        messages.innerHTML = "";

        if (welcome) {
            welcome.style.display = "";
        }

        input.value = "";

        autoResize();

        closeSidebar();

        input.focus();

        updateKeyboardOffset();
    });
}

/* =========================
   MOBILE MENU
========================= */

if (menuBtn) {
    menuBtn.addEventListener("click", event => {

        event.stopPropagation();

        if (!sidebar) return;

        sidebar.classList.toggle("open");
    });
}

/* =========================
   CLOSE SIDEBAR
========================= */

document.addEventListener("click", event => {

    if (!sidebar) return;

    if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        event.target !== menuBtn
    ) {
        closeSidebar();
    }

});

/* =========================
   ANDROID KEYBOARD
========================= */

function updateKeyboardOffset() {

    if (!window.visualViewport) return;

    const viewport =
        window.visualViewport;

    const keyboardHeight = Math.max(
        0,
        window.innerHeight -
        viewport.height -
        viewport.offsetTop
    );

    document.documentElement.style
        .setProperty(
            "--keyboard-height",
            `${keyboardHeight}px`
        );

    scrollToBottom();
}

if (window.visualViewport) {

    window.visualViewport.addEventListener(
        "resize",
        updateKeyboardOffset
    );

    window.visualViewport.addEventListener(
        "scroll",
        updateKeyboardOffset
    );
}

window.addEventListener(
    "resize",
    updateKeyboardOffset
);

/* =========================
   INITIALIZE
========================= */

autoResize();
updateKeyboardOffset();

if (input) {
    input.focus();
}

console.log("DEA IMUP frontend aktif.");
