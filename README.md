# Afaan Oromo Web Translator Chrome Extension


> **Level 3: Full Page & Selected Text Translator**

Having Issues? [Report Bug](https://github.com/Yeroman1/Translator-to-Afaan-Oromo-chrome-extension/issues/new/choose) | Made with ♥ by [@Yeroman1](https://github.com/Yeroman1)

---

A powerful Google Chrome Extension built using **Manifest V3** to extract and translate webpage content into **Afaan Oromo** (`om`). Level 3 adds complete support for **selected text**, both through the extension popup and via a native right-click **context menu** with an interactive floating translation bubble right on the webpage.

---

##  Level 3 Objectives & Workflows

Level 3 allows users to translate text via **two powerful pathways**:

### Pathway A: In-Popup Selection Extraction
1. Highlight any text on a webpage with your mouse.
2. Click the extension icon and click **"✨ Extract Selected Text"**.
3. Only your highlighted text is extracted into the source box.
4. Click **" Translate to Afaan Oromo"**.

### Pathway B: Right-Click Context Menu (In-Page Floating Card)
1. Highlight any text on any normal webpage.
2. Right-click the highlighted text.
3. Select **"Translate to Afaan Oromo"** from Chrome's context menu.
4. An elegant floating translation card appears directly on the webpage with the Afaan Oromo translation, a **Copy** button, and a **Close** button.

---

##  Project Structure

```text
Afaan Oromo translator/
├── manifest.json   # Extension metadata, permissions & background config (v3.0.0)
├── background.js   # Background service worker for context menu & floating card
├── popup.html      # UI with Extract Selected Text and Extract Full Page buttons
├── popup.css       # Clean styles for dual buttons and panels
├── popup.js        # Controller for popup selection/page extraction & translation
└── README.md       # Documentation & learning guide
```

---

##  Concepts Taught in Level 3

### 1. `window.getSelection().toString()`
The Web Selection API allows JavaScript to inspect the active text selection range made by the user's cursor. We inject this into the webpage to grab only highlighted sentences:
```javascript
function extractSelectedTextFromPage() {
  const selection = window.getSelection();
  return selection ? selection.toString() : "";
}
```

### 2. Manifest V3 Background Service Workers (`background.js`)
Unlike Manifest V2, which kept background scripts running indefinitely in memory, Manifest V3 uses **event-driven Service Workers**:
- They stay dormant to conserve system RAM and battery.
- They wake up instantly when an event occurs (e.g. clicking a context menu item).
- They shut down automatically when idle.

### 3. `chrome.contextMenus` API
Allows extensions to add custom options to Chrome's right-click menu:
```javascript
chrome.contextMenus.create({
  id: "translate-selection-to-om",
  title: "Translate '%s' to Afaan Oromo",
  contexts: ["selection"]
});
```
`contexts: ["selection"]` ensures this menu item only appears when the user has actually highlighted text.

### 4. Dynamic In-Page DOM Injection
When the user triggers translation via the right-click menu, the background script translates the text and injects a temporary floating modal container (`#ao-translator-floating-card`) with custom scoped CSS so it doesn't collide with the host webpage's styles.

---

##  Permissions Declared

```json
{
  "permissions": [
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "https://translate.googleapis.com/*",
    "https://api.mymemory.translated.net/*"
  ]
}
```

- **`contextMenus`**: Allows creating and handling Chrome right-click menu actions.
- **`activeTab` & `scripting`**: Grants authorization to inspect selections and inject the floating translation card into the page.
- **`host_permissions`**: Allows contacting translation endpoints.

---

##  How to Reload & Update in Chrome

1. Open Google Chrome and go to `chrome://extensions/`.
2. Locate the **Afaan Oromo Web Translator** card.
3. Click the circular **Reload icon** ($\mathbf{\circlearrowright}$).
4. The extension is now updated to **Level 3** (`3.0.0`)!

---

## 🧪 Level 3 Testing Checklist

| Test # | Test Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **Test 1** | **Popup Selected Extraction** | Highlight a sentence on [en.wikipedia.org/wiki/Oromo_language](https://en.wikipedia.org/wiki/Oromo_language), open popup, click **Extract Selected Text**. | Status: `Selected text extracted!`. Only the highlighted sentence appears in the Source box. |
| **Test 2** | **No Selection Warning** | Open popup without selecting any text, click **Extract Selected Text**. | Status: `No text selected`. The box displays helpful guidance on highlighting text first. |
| **Test 3** | **Full Page Extraction** | On any article, open popup and click **Extract Full Page**. | Extracts the entire visible webpage text. |
| **Test 4** | **Right-Click Context Menu** | Highlight any sentence on a webpage $\rightarrow$ Right-click $\rightarrow$ click **Translate '...' to Afaan Oromo**. | A sleek floating card appears in the bottom-right corner of the webpage showing the Afaan Oromo translation! |
| **Test 5** | **Floating Card Copy & Close** | In the floating card, click **Copy Translation** (test pasting into Notepad), then click the **✕** button. | Text is copied to clipboard, and the card cleanly dismisses from the page. |

---

##  Project Roadmap

```text
Level 1  [DONE] Extract webpage text locally
Level 2  [DONE] Translate extracted text to Afaan Oromo (om)
Level 3  [DONE] Translate highlighted / selected text (Popup + Right-Click Menu)
Level 4  [NEXT] Replace webpage text in-place with Afaan Oromo
Level 5  [TODO] Intelligent article / reader-mode extraction
Level 6  [TODO] Bidirectional translation (Afaan Oromo ↔ English)
Level 7  [TODO] Multilingual regional support (Afaan Oromo ↔ Amharic)
Level 8  [TODO] Text-to-speech pronunciation engine
Level 9  [TODO] AI-powered contextual translation
Level 10 [TODO] Production-ready Afaan Oromo browser assistant
```

---

<div align="center">

Having Issues? [Report Bug](https://github.com/Yeroman1/Translator-to-Afaan-Oromo-chrome-extension/issues/new/choose) | Made with ♥ by [@Yeroman1](https://github.com/Yeroman1)

</div>
