/**
 * Afaan Oromo Web Translator - Level 3
 * background.js (Manifest V3 Background Service Worker)
 *
 * Runs in the background independently from the popup.
 * Handles:
 * 1. Registering the "Translate to Afaan Oromo" context menu for selected text.
 * 2. Translating selected text when the user right-clicks.
 * 3. Ingesting and rendering a sleek floating translation bubble directly on the active webpage.
 */

// ============================================================================
// 1. Context Menu Setup
// ============================================================================
chrome.runtime.onInstalled.addListener(() => {
  // Remove any pre-existing menu items to prevent duplicate ID errors
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "translate-selection-to-om",
      title: "Translate '%s' to Afaan Oromo",
      contexts: ["selection"]
    });
  });
});

// ============================================================================
// 2. Translation Service for Service Worker (Multi-Provider Engine)
// ============================================================================
async function translateTextToAfaanOromo(text) {
  // Provider 1: Google Translate single-shot endpoint
  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=om&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(googleUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data[0] && Array.isArray(data[0])) {
        let translated = "";
        for (const part of data[0]) {
          if (part && part[0]) {
            translated += part[0];
          }
        }
        if (translated.trim()) {
          return translated;
        }
      }
    }
  } catch (err) {
    console.warn("Google translate attempt failed, trying MyMemory fallback...", err);
  }

  // Provider 2: MyMemory Translation API fallback
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|om`;
    const response = await fetch(myMemoryUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (err) {
    console.warn("MyMemory translate attempt failed...", err);
  }

  throw new Error("Unable to reach translation servers. Please verify your internet connection.");
}

// Listen for translation requests sent from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate" && request.text) {
    translateTextToAfaanOromo(request.text)
      .then((translated) => {
        sendResponse({ success: true, result: translated });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    // Return true to indicate asynchronous sendResponse
    return true;
  }
});

// ============================================================================
// 3. In-Page Floating Translation Card (Injected into Webpage DOM)
// ============================================================================

/**
 * This function is serialized and injected into the active webpage.
 * It creates a modern, isolated floating card with the translation.
 *
 * @param {string} originalText - The user's selected text
 * @param {string} translatedText - The Afaan Oromo translation
 * @param {string} [iconUrl] - Absolute URL to the extension logo icon
 */
function showFloatingTranslationCard(originalText, translatedText, iconUrl) {
  // Remove any previous translation card if one is already open
  const existingCard = document.getElementById("ao-translator-floating-card");
  if (existingCard) {
    existingCard.remove();
  }

  // Create card container
  const card = document.createElement("div");
  card.id = "ao-translator-floating-card";

  // Apply robust, isolated styling so host webpage CSS does not disrupt the UI
  Object.assign(card.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    width: "360px",
    maxWidth: "90vw",
    maxHeight: "420px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    borderRadius: "14px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px",
    lineHeight: "1.5",
    zIndex: "2147483647", // Maximum z-index to appear on top of any webpage element
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    animation: "aoFadeSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
  });

  // Inject animation keyframes into page header once if not already present
  if (!document.getElementById("ao-translator-keyframes")) {
    const styleTag = document.createElement("style");
    styleTag.id = "ao-translator-keyframes";
    styleTag.textContent = `
      @keyframes aoFadeSlideIn {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(styleTag);
  }

  // Card Content
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:linear-gradient(135deg,#2563eb,#059669);color:#ffffff;">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;">
        ${iconUrl ? `<img src="${iconUrl}" style="width:22px;height:22px;border-radius:4px;object-fit:contain;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.15);" alt="Logo" />` : `<span style="background:rgba(255,255,255,0.25);padding:2px 6px;border-radius:4px;font-size:11px;">AO</span>`}
        <span>Afaan Oromo (Hiikaa)</span>
      </div>
      <button id="ao-close-btn" style="background:none;border:none;color:#ffffff;font-size:18px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px;" title="Close">✕</button>
    </div>

    <div style="padding:12px 14px;overflow-y:auto;max-height:280px;display:flex;flex-direction:column;gap:8px;">
      <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Original Selection:</div>
      <div style="font-size:12px;color:#334155;background:#f8fafc;padding:8px 10px;border-radius:6px;border:1px solid #f1f5f9;max-height:75px;overflow-y:auto;font-style:italic;">
        ${originalText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
      </div>

      <div style="font-size:11px;font-weight:600;color:#059669;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Translation:</div>
      <div id="ao-translated-body" style="font-size:13px;font-weight:500;color:#0f172a;background:#ecfdf5;padding:10px 12px;border-radius:8px;border:1px solid #a7f3d0;user-select:text;">
        ${translatedText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <button id="ao-copy-btn" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#ffffff;color:#334155;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
        📋 <span>Copy Translation</span>
      </button>
      <span style="font-size:11px;color:#94a3b8;">Afaan Oromo Translator</span>
    </div>
  `;

  document.body.appendChild(card);

  // Close Button
  const closeBtn = card.querySelector("#ao-close-btn");
  closeBtn.addEventListener("click", () => card.remove());

  // Copy Button
  const copyBtn = card.querySelector("#ao-copy-btn");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      const span = copyBtn.querySelector("span");
      span.textContent = "Copied!";
      copyBtn.style.color = "#059669";
      copyBtn.style.borderColor = "#059669";
      setTimeout(() => {
        span.textContent = "Copy Translation";
        copyBtn.style.color = "#334155";
        copyBtn.style.borderColor = "#cbd5e1";
      }, 1500);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  });
}

// ============================================================================
// 4. Context Menu Click Listener
// ============================================================================
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translate-selection-to-om" && info.selectionText) {
    const rawSelectedText = info.selectionText.trim();
    if (!rawSelectedText || !tab || !tab.id) return;

    try {
      // 1. Translate the selected text
      const translated = await translateTextToAfaanOromo(rawSelectedText);

      // 2. Inject the floating card into the webpage tab
      const iconUrl = chrome.runtime.getURL("icon.png");
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showFloatingTranslationCard,
        args: [rawSelectedText, translated, iconUrl]
      });
    } catch (error) {
      console.error("Context menu translation error:", error);

      // Display error inside tab if possible
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (errMessage) => {
          alert(`Afaan Oromo Translator:\nCould not translate selection.\n${errMessage}`);
        },
        args: [error.message || "Unknown error"]
      });
    }
  }
});
