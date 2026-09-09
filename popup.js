/**
 * Afaan Oromo Web Translator - Level 3
 * popup.js
 *
 * Coordinates:
 * 1. Extracting Selected Text from active webpage (Level 3 feature)
 * 2. Extracting Full Page Content from active webpage (Level 1 feature)
 * 3. Translating text to Afaan Oromo with smart chunking (Level 2 feature)
 * 4. Clipboard copying and UI state management
 */

// ============================================================================
// 1. DOM Elements
// ============================================================================
const extractSelectedBtn = document.getElementById("extractSelectedBtn");
const extractFullBtn = document.getElementById("extractFullBtn");
const translateBtn = document.getElementById("translateBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const statusIndicator = document.getElementById("statusIndicator");
const extractedTextArea = document.getElementById("extractedText");
const translatedTextArea = document.getElementById("translatedText");

const srcCharCountElement = document.getElementById("srcCharCount");
const targetCharCountElement = document.getElementById("targetCharCount");

// ============================================================================
// 2. UI & Status Helper Functions
// ============================================================================

function setStatus(message, type = "ready") {
  statusIndicator.textContent = message;
  statusIndicator.className = `status-badge status-${type}`;
}

function updateCounts() {
  const srcLen = extractedTextArea.value.length;
  const targetLen = translatedTextArea.value.length;
  srcCharCountElement.textContent = `${srcLen.toLocaleString()} chars`;
  targetCharCountElement.textContent = `${targetLen.toLocaleString()} chars`;
}

function cleanExtractedText(text) {
  if (!text) return "";
  return text
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function isRestrictedUrl(url) {
  if (!url) return false;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:") ||
    url.includes("chromewebstore.google.com") ||
    url.includes("chrome.google.com/webstore")
  );
}

// ============================================================================
// 3. Webpage DOM Injected Functions
// ============================================================================

/**
 * Executes INSIDE the webpage to get only the text currently highlighted by the user.
 */
function extractSelectedTextFromPage() {
  const selection = window.getSelection();
  return selection ? selection.toString() : "";
}

/**
 * Executes INSIDE the webpage to get all human-readable body text.
 */
function extractBodyTextFromPage() {
  if (!document.body) return "";
  return document.body.innerText;
}

// ============================================================================
// 4. Extraction Handlers
// ============================================================================

/**
 * Helper to query active tab and perform security check
 */
async function getActiveTabOrThrow() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  const tab = tabs && tabs[0];
  if (!tab || typeof tab.id === "undefined") {
    throw new Error("No active tab found.");
  }

  if (tab.url && isRestrictedUrl(tab.url)) {
    throw new Error(
      "This page cannot be accessed by the extension.\n" +
      "Try opening a normal website such as Wikipedia or BBC."
    );
  }

  return tab;
}

/**
 * LEVEL 3 FEATURE: Extracts only user-selected text from the active tab.
 */
async function handleExtractSelection() {
  setStatus("Checking selection...", "loading");
  extractSelectedBtn.disabled = true;
  extractFullBtn.disabled = true;

  try {
    const tab = await getActiveTabOrThrow();

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractSelectedTextFromPage
    });

    const selectedText = results && results[0] ? results[0].result : "";

    if (!selectedText || selectedText.trim().length === 0) {
      setStatus("No text selected", "error");
      extractedTextArea.value =
        "No text is currently highlighted on this page.\n\n" +
        "Tip: Highlight a sentence or paragraph on the webpage with your mouse, then click 'Extract Selected Text'.";
      updateCounts();
      return;
    }

    const cleanedText = cleanExtractedText(selectedText);
    extractedTextArea.value = cleanedText;
    updateCounts();
    setStatus("Selected text extracted!", "success");

  } catch (error) {
    console.error("Selection extraction error:", error);
    extractedTextArea.value = error.message;
    setStatus("Unable to access page", "error");
    updateCounts();
  } finally {
    extractSelectedBtn.disabled = false;
    extractFullBtn.disabled = false;
  }
}

/**
 * LEVEL 1 FEATURE: Extracts full webpage body text.
 */
async function handleExtractFullContent() {
  setStatus("Extracting full page...", "loading");
  extractSelectedBtn.disabled = true;
  extractFullBtn.disabled = true;

  try {
    const tab = await getActiveTabOrThrow();

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractBodyTextFromPage
    });

    const rawText = results && results[0] ? results[0].result : "";
    if (!rawText || rawText.trim().length === 0) {
      setStatus("No content found", "error");
      extractedTextArea.value = "No readable content was found on this page.";
      updateCounts();
      return;
    }

    const cleanedText = cleanExtractedText(rawText);
    extractedTextArea.value = cleanedText;
    updateCounts();
    setStatus("Full page extracted!", "success");

  } catch (error) {
    console.error("Full page extraction error:", error);
    extractedTextArea.value = error.message;
    setStatus("Unable to access page", "error");
    updateCounts();
  } finally {
    extractSelectedBtn.disabled = false;
    extractFullBtn.disabled = false;
  }
}

// ============================================================================
// 5. Text Chunking for Translation
// ============================================================================

function splitTextIntoChunks(text, maxChunkSize = 700) {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + "\n\n" + para).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      if (para.length > maxChunkSize) {
        const sentences = para.match(/[^.!?]+[.!?]+(\s|$)/g) || [para];
        for (const sentence of sentences) {
          if ((currentChunk + " " + sentence).length > maxChunkSize) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? " " : "") + sentence;
          }
        }
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// ============================================================================
// 6. Translation Engine
// ============================================================================

/**
 * Translates a text chunk by delegating the network request to the
 * background service worker. This avoids popup CORS/Origin header restrictions.
 */
async function translateChunkToAfaanOromo(textChunk) {
  // Primary Strategy: Route through background service worker
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "translate", text: textChunk },
        (res) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (res && res.success) {
            resolve(res.result);
          } else {
            reject(new Error(res ? res.error : "Translation failed"));
          }
        }
      );
    });
    return response;
  } catch (msgError) {
    console.warn("Background messaging failed, trying direct fetch fallback...", msgError);
  }

  // Fallback Strategy: Direct fetch if background worker is unavailable
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=om&dt=t&q=${encodeURIComponent(textChunk)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data || !data[0] || !Array.isArray(data[0])) {
    throw new Error("Unexpected translation response format.");
  }

  let chunkTranslation = "";
  for (const sentencePart of data[0]) {
    if (sentencePart && sentencePart[0]) {
      chunkTranslation += sentencePart[0];
    }
  }

  return chunkTranslation;
}

async function handleTranslateContent() {
  const sourceText = extractedTextArea.value.trim();

  if (!sourceText) {
    setStatus("No source text to translate", "error");
    translatedTextArea.value = "Please extract or paste text into the source box first.";
    return;
  }

  setStatus("Translating...", "loading");
  translateBtn.disabled = true;
  extractSelectedBtn.disabled = true;
  extractFullBtn.disabled = true;
  translatedTextArea.value = "";
  updateCounts();

  try {
    const chunks = splitTextIntoChunks(sourceText, 700);
    const translatedParts = [];

    for (let i = 0; i < chunks.length; i++) {
      if (chunks.length > 1) {
        setStatus(`Translating part ${i + 1} of ${chunks.length}...`, "loading");
      }

      const translatedChunk = await translateChunkToAfaanOromo(chunks[i]);
      translatedParts.push(translatedChunk);

      translatedTextArea.value = translatedParts.join("\n\n");
      updateCounts();
    }

    setStatus("Translation complete!", "success");

  } catch (error) {
    console.error("Translation error:", error);
    setStatus("Translation failed", "error");
    translatedTextArea.value =
      `Could not translate text.\nError: ${error.message}\n\nPlease check your internet connection and try again.`;
    updateCounts();
  } finally {
    translateBtn.disabled = false;
    extractSelectedBtn.disabled = false;
    extractFullBtn.disabled = false;
  }
}

// ============================================================================
// 7. Clipboard & Clear Handlers
// ============================================================================

async function handleCopyTranslation() {
  const text = translatedTextArea.value.trim();
  if (!text) {
    setStatus("Nothing to copy", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    const originalContent = copyBtn.innerHTML;
    copyBtn.innerHTML = `<span class="btn-icon">✅</span><span class="btn-text">Copied!</span>`;
    setTimeout(() => {
      copyBtn.innerHTML = originalContent;
    }, 1500);
  } catch (err) {
    console.error("Clipboard write error:", err);
    setStatus("Failed to copy", "error");
  }
}

function handleClearAll() {
  extractedTextArea.value = "";
  translatedTextArea.value = "";
  updateCounts();
  setStatus("Ready", "ready");
}

// ============================================================================
// 8. Theme Management (Light & Dark Theme)
// ============================================================================
const THEME_STORAGE_KEY = "afaan_oromo_translator_theme";

function getSystemThemePreference() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (e) {
    console.warn("Unable to read theme from localStorage:", e);
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.warn("Unable to save theme to localStorage:", e);
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggleBtn) {
    const isDark = theme === "dark";
    const nextTheme = isDark ? "light" : "dark";
    themeToggleBtn.setAttribute("title", `Switch to ${nextTheme} theme`);
    themeToggleBtn.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
  }
}

function handleToggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  saveTheme(newTheme);
}

function initTheme() {
  const storedTheme = getStoredTheme();
  const initialTheme = storedTheme || getSystemThemePreference();
  applyTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", handleToggleTheme);
  }

  // Follow system theme changes if user hasn't manually set an explicit preference
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!getStoredTheme()) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }
}

// ============================================================================
// 9. Event Listeners & Initialization
// ============================================================================
extractSelectedBtn.addEventListener("click", handleExtractSelection);
extractFullBtn.addEventListener("click", handleExtractFullContent);
translateBtn.addEventListener("click", handleTranslateContent);
copyBtn.addEventListener("click", handleCopyTranslation);
clearBtn.addEventListener("click", handleClearAll);

extractedTextArea.addEventListener("input", updateCounts);

// Initialize Theme
initTheme();
