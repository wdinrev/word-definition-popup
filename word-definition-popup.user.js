// ==UserScript==
// @name         Smart Word Definition Popup
// @namespace    https://github.com/wdinrev/word-definition-popup
// @version      1.4.1
// @description  Instant word definitions on text selection, with adaptive theming and WCAG AA contrast
// @author       wdinrev
// @homepage     https://github.com/wdinrev/word-definition-popup
// @homepageURL  https://github.com/wdinrev/word-definition-popup
// @supportURL   https://github.com/wdinrev/word-definition-popup/issues
// @updateURL    https://raw.githubusercontent.com/wdinrev/word-definition-popup/main/word-definition-popup.user.js
// @downloadURL  https://raw.githubusercontent.com/wdinrev/word-definition-popup/main/word-definition-popup.user.js
// @match        *://*/*
// @icon         https://img.icons8.com/?size=100&id=lAy38mU19x00&format=png&color=000000
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      *
// @connect      en.wiktionary.org
// @connect      api.datamuse.com
// @connect      api.dictionaryapi.dev
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  // Inject styles (system monospace font stack for fast loading and strict CSP compatibility)
  const style = document.createElement("style");
  style.textContent = `
    #word-definition-popup {
      position: absolute;
      border-radius: 6px;
      padding: 12px 16px;
      font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      max-width: 320px;
      max-height: 280px;
      overflow-y: auto;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      z-index: 2147483647;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.15s ease, visibility 0.15s ease;
      box-sizing: border-box;
      pointer-events: auto;
    }
    #word-definition-popup.show {
      visibility: visible;
      opacity: 1;
    }
    #word-definition-popup .word-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
      text-transform: capitalize;
    }
    #word-definition-popup .word-phonetic {
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 8px;
    }
    #word-definition-popup .word-meaning {
      font-size: 12px;
      margin-bottom: 6px;
    }
    #word-definition-popup .word-meaning:last-child {
      margin-bottom: 0;
    }
    #word-definition-popup .word-pos {
      font-style: italic;
      opacity: 0.65;
      font-size: 11px;
      margin-right: 6px;
    }
    #word-definition-popup .word-definition {
      opacity: 0.95;
    }
    #word-definition-popup .loading {
      opacity: 0.75;
      font-size: 12px;
      font-style: italic;
    }
    #word-definition-popup .error {
      font-size: 12px;
      opacity: 0.85;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  // Create popup element
  const popup = document.createElement("div");
  popup.id = "word-definition-popup";
  (document.body || document.documentElement).appendChild(popup);

  let debounceTimer = null;
  let activeRequestId = 0;
  const definitionCache = new Map();

  // Escape HTML to prevent injection
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Clean Wiktionary HTML definitions
  function cleanDefinitionHtml(html) {
    if (!html) return "";
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<link[^>]*>/gi, "")
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/\s+/g, " ")
      .trim();
  }

  // Resilient HTTP request helper
  // Tries native fetch first (avoids Tampermonkey permission prompt hangs on CORS-enabled APIs).
  // Falls back to GM_xmlhttpRequest if fetch fails (e.g. strict CSP).
  async function httpRequest(url, timeoutMs = 2500) {
    // 1. Try native fetch first
    if (typeof fetch === "function") {
      try {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller ? controller.signal : undefined,
        });
        clearTimeout(timer);
        const text = await res.text();
        return { ok: res.ok, status: res.status, text: text };
      } catch (err) {
        // fetch failed (strict CSP or offline); try GM transport next
      }
    }

    // 2. Try GM_xmlhttpRequest with local timeout guard
    if (typeof GM_xmlhttpRequest === "function") {
      try {
        return await new Promise((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              reject(new Error("Request timed out"));
            }
          }, timeoutMs);

          GM_xmlhttpRequest({
            method: "GET",
            url: url,
            timeout: timeoutMs,
            headers: { Accept: "application/json" },
            onload: function (res) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve({
                ok: res.status >= 200 && res.status < 300,
                status: res.status,
                text: res.responseText,
              });
            },
            ontimeout: function () {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(new Error("Request timed out"));
            },
            onerror: function (err) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(err || new Error("Network error"));
            },
          });
        });
      } catch (e) {
        // Fall through
      }
    }

    // 3. Try GM.xmlHttpRequest with local timeout guard
    if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") {
      try {
        return await new Promise((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              reject(new Error("Request timed out"));
            }
          }, timeoutMs);

          GM.xmlHttpRequest({
            method: "GET",
            url: url,
            timeout: timeoutMs,
            headers: { Accept: "application/json" },
            onload: function (res) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve({
                ok: res.status >= 200 && res.status < 300,
                status: res.status,
                text: res.responseText,
              });
            },
            ontimeout: function () {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(new Error("Request timed out"));
            },
            onerror: function (err) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(err || new Error("Network error"));
            },
          });
        });
      } catch (e) {
        // Fall through
      }
    }

    throw new Error("No HTTP request mechanism available");
  }

  // Parse Wiktionary REST API response
  function parseWiktionary(data, word) {
    const en = data && data.en;
    if (!Array.isArray(en) || en.length === 0) return null;
    const meanings = [];
    for (const item of en) {
      const pos = (item.partOfSpeech || "").toLowerCase();
      for (const def of item.definitions || []) {
        const text = cleanDefinitionHtml(def.definition);
        if (text && text.length > 3) {
          meanings.push({ partOfSpeech: pos, definition: text });
          if (meanings.length >= 3) break;
        }
      }
      if (meanings.length >= 3) break;
    }
    if (meanings.length === 0) return null;
    return { word, meanings };
  }

  // Parse Datamuse API response
  function parseDatamuse(data, word) {
    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    if (!item || !Array.isArray(item.defs) || item.defs.length === 0) return null;
    const meanings = [];
    const posMap = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", u: "" };
    for (const rawDef of item.defs.slice(0, 3)) {
      const parts = rawDef.split("\t");
      if (parts.length >= 2) {
        const rawPos = parts[0].trim();
        const def = parts.slice(1).join("\t").trim();
        meanings.push({
          partOfSpeech: posMap[rawPos] || rawPos,
          definition: def,
        });
      } else {
        meanings.push({ partOfSpeech: "", definition: rawDef.trim() });
      }
    }
    return meanings.length > 0 ? { word, meanings } : null;
  }

  // Resilient multi-tier dictionary fetcher (Wiktionary primary, Datamuse fallback)
  async function fetchWordDefinition(word) {
    // Tier 1: Wiktionary REST API (Wikimedia CDN, ~250ms, 99.99% uptime)
    try {
      const res = await httpRequest(
        `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
        2500,
      );
      if (res && res.ok && res.text) {
        const parsed = parseWiktionary(JSON.parse(res.text), word);
        if (parsed) return parsed;
      }
    } catch (e) {
      // Fall through to Tier 2
    }

    // Tier 2: Datamuse API (WordNet-based, ~150ms)
    try {
      const res = await httpRequest(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`,
        2000,
      );
      if (res && res.ok && res.text) {
        const parsed = parseDatamuse(JSON.parse(res.text), word);
        if (parsed) return parsed;
      }
    } catch (e) {
      // All tiers exhausted
    }

    return null;
  }

  // Color & Theme Helpers
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  let _colorParserEl = null;
  function parseColor(color) {
    if (!color) return null;
    const direct = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (direct) {
      return {
        r: parseInt(direct[1], 10),
        g: parseInt(direct[2], 10),
        b: parseInt(direct[3], 10),
        a: direct[4] !== undefined ? parseFloat(direct[4]) : 1,
      };
    }
    const hex6 = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (hex6) {
      return {
        r: parseInt(hex6[1], 16),
        g: parseInt(hex6[2], 16),
        b: parseInt(hex6[3], 16),
        a: 1,
      };
    }
    const hex3 = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (hex3) {
      return {
        r: parseInt(hex3[1] + hex3[1], 16),
        g: parseInt(hex3[2] + hex3[2], 16),
        b: parseInt(hex3[3] + hex3[3], 16),
        a: 1,
      };
    }
    if (color === "transparent" || color === "rgba(0, 0, 0, 0)") {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    if (color === "white") return { r: 255, g: 255, b: 255, a: 1 };
    if (color === "black") return { r: 0, g: 0, b: 0, a: 1 };

    // Fallback: browser computed style
    if (!_colorParserEl) {
      _colorParserEl = document.createElement("div");
      _colorParserEl.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;";
      (document.body || document.documentElement).appendChild(_colorParserEl);
    }
    _colorParserEl.style.color = color;
    const computed = window.getComputedStyle(_colorParserEl).color;
    const match = computed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      };
    }
    return null;
  }

  function getLuminance(r, g, b) {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(rgb1, rgb2) {
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  }

  function getTextColor(element) {
    let el = element;
    let depth = 0;
    while (el && depth < 15) {
      const textColor = window.getComputedStyle(el).color;
      if (textColor && textColor !== "rgba(0, 0, 0, 0)" && textColor !== "transparent") {
        return textColor;
      }
      el = el.parentElement;
      depth++;
    }
    return "rgb(0, 0, 0)";
  }

  function getSmartBackgroundColor(element) {
    let el = element;
    let depth = 0;
    const foundColors = [];
    while (el && depth < 20) {
      const bgColor = window.getComputedStyle(el).backgroundColor;
      if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
        const rgb = parseColor(bgColor);
        if (rgb && rgb.a > 0.1) {
          foundColors.push(rgb);
          if (rgb.a >= 0.8) {
            return rgbToHex(rgb.r, rgb.g, rgb.b);
          }
        }
      }
      el = el.parentElement;
      depth++;
    }

    if (foundColors.length > 0) {
      const rgb = foundColors[0];
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const bodyRgb = parseColor(bodyBg);
    if (bodyRgb && bodyRgb.a > 0.1) return rgbToHex(bodyRgb.r, bodyRgb.g, bodyRgb.b);

    const docBg = window.getComputedStyle(document.documentElement).backgroundColor;
    const docRgb = parseColor(docBg);
    if (docRgb && docRgb.a > 0.1) return rgbToHex(docRgb.r, docRgb.g, docRgb.b);

    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "#1a1a1a" : "#ffffff";
  }

  function adjustColorForPopup(hexColor, isDark) {
    const rgb = parseColor(hexColor);
    if (!rgb) return hexColor;
    if (isDark) {
      return `rgb(${Math.min(rgb.r + 20, 255)}, ${Math.min(rgb.g + 20, 255)}, ${Math.min(rgb.b + 20, 255)})`;
    } else {
      return `rgb(${Math.max(rgb.r - 10, 0)}, ${Math.max(rgb.g - 10, 0)}, ${Math.max(rgb.b - 10, 0)})`;
    }
  }

  function ensureContrast(textColor, bgColor) {
    const textRgb = parseColor(textColor);
    const bgRgb = parseColor(bgColor);
    if (!textRgb || !bgRgb) return textColor;

    // WCAG AA requires 4.5:1 for normal text
    if (getContrastRatio(textRgb, bgRgb) < 4.5) {
      const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      return bgLum > 0.5 ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
    }
    return textColor;
  }

  function applyTheme(element) {
    const bgColor = getSmartBackgroundColor(element);
    const textColor = getTextColor(element);
    const bgRgb = parseColor(bgColor);
    if (!bgRgb) return;

    const isDark = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b) < 0.5;
    const popupBg = adjustColorForPopup(bgColor, isDark);
    const adjustedTextColor = ensureContrast(textColor, popupBg);
    const borderColor = isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)";
    const shadowColor = isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.15)";

    popup.style.background = popupBg;
    popup.style.color = adjustedTextColor;
    popup.style.border = `1px solid ${borderColor}`;
    popup.style.boxShadow = `0 4px 16px ${shadowColor}`;
  }

  // Positioning
  function positionPopup(x, y) {
    const rect = popup.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x + 10;
    let top = y + 10;

    if (left + rect.width > vw - 20) {
      left = x - rect.width - 10;
    }
    if (left < 20) left = 20;

    if (top + rect.height > vh - 20) {
      top = y - rect.height - 10;
    }
    if (top < 20) top = 20;

    popup.style.left = left + window.scrollX + "px";
    popup.style.top = top + window.scrollY + "px";
  }

  // Popup display
  function showLoading(word, x, y, targetElement) {
    popup.innerHTML = `<div class="word-title">${escapeHtml(word)}</div><div class="loading">Loading...</div>`;
    popup.classList.add("show");
    applyTheme(targetElement);
    positionPopup(x, y);
  }

  function showDefinition(data, x, y, targetElement) {
    let html = `<div class="word-title">${escapeHtml(data.word)}</div>`;
    if (data.phonetic) {
      html += `<div class="word-phonetic">${escapeHtml(data.phonetic)}</div>`;
    }
    for (const m of data.meanings) {
      html += `<div class="word-meaning">`;
      if (m.partOfSpeech) {
        html += `<span class="word-pos">${escapeHtml(m.partOfSpeech)}</span>`;
      }
      html += `<span class="word-definition">${escapeHtml(m.definition)}</span>`;
      html += `</div>`;
    }
    popup.innerHTML = html;
    popup.classList.add("show");
    applyTheme(targetElement);
    positionPopup(x, y);
  }

  function showError(message, x, y, targetElement) {
    popup.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
    popup.classList.add("show");
    if (targetElement) applyTheme(targetElement);
    if (typeof x === "number" && typeof y === "number") positionPopup(x, y);
  }

  function hidePopup() {
    popup.classList.remove("show");
    activeRequestId++;
  }

  // Clean selected text (strip edge punctuation, keep internal hyphens and apostrophes)
  function cleanSelectedText(text) {
    if (!text) return "";
    return text.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "").trim();
  }

  // Main lookup coordinator with 3.5s total failsafe
  async function lookupWord(word, x, y, targetElement) {
    if (definitionCache.has(word)) {
      showDefinition(definitionCache.get(word), x, y, targetElement);
      return;
    }

    const reqId = ++activeRequestId;
    showLoading(word, x, y, targetElement);

    // Hard failsafe: if anything stalls or takes > 3500ms, transition out of loading
    const failsafeTimer = setTimeout(() => {
      if (reqId === activeRequestId && popup.classList.contains("show")) {
        showError("No definition found", x, y, targetElement);
      }
    }, 3500);

    try {
      const result = await fetchWordDefinition(word);
      clearTimeout(failsafeTimer);
      if (reqId !== activeRequestId) return;

      if (result && result.meanings && result.meanings.length > 0) {
        definitionCache.set(word, result);
        showDefinition(result, x, y, targetElement);
      } else {
        showError("No definition found", x, y, targetElement);
      }
    } catch (e) {
      clearTimeout(failsafeTimer);
      if (reqId !== activeRequestId) return;
      showError("No definition found", x, y, targetElement);
    }
  }

  // Selection event listener
  document.addEventListener("mouseup", function (e) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      const rawText = selection ? selection.toString() : "";
      const word = cleanSelectedText(rawText).toLowerCase();

      // Check for valid English word: 2-35 chars, letters with optional hyphens/apostrophes
      if (
        word.length >= 2 &&
        word.length <= 35 &&
        /^[a-zA-Z]+(?:[-'][a-zA-Z]+)*$/.test(word)
      ) {
        lookupWord(word, e.clientX, e.clientY, e.target);
      } else if (!rawText.trim()) {
        hidePopup();
      }
    }, 250);
  });

  // Hide popup when clicking outside
  document.addEventListener("mousedown", function (e) {
    if (!popup.contains(e.target)) {
      hidePopup();
    }
  });

  // Hide popup on scroll
  let scrollTimer = null;
  document.addEventListener(
    "scroll",
    function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (popup.classList.contains("show")) {
          hidePopup();
        }
      }, 100);
    },
    true,
  );

  // Hide popup on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && popup.classList.contains("show")) {
      hidePopup();
    }
  });
})();
