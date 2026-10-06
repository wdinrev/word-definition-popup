# Smart Word Definition Popup

A lightweight userscript that displays word definitions when selecting text on any webpage. Features adaptive theming that matches the active website's color scheme with guaranteed WCAG AA contrast readability.

## Features

- Instant definitions on text selection
- Adaptive theming matching website background and text colors
- WCAG AA compliant contrast (4.5:1 minimum)
- Multi-tier dictionary lookup via Wiktionary and Datamuse with strict timeouts
- In-memory cache for instant repeated lookups
- Monospace typography using system font stacks with strict CSP compatibility
- Minimal UI that auto-hides on click outside, scroll, or Escape key

## Installation

### Prerequisites

A userscript manager extension installed in your browser:
- Chrome / Edge / Brave: Tampermonkey or Violentmonkey
- Firefox: Tampermonkey or Violentmonkey
- Safari: Userscripts

### Install

- Install via GreasyFork: [Smart Word Definition Popup](https://greasyfork.org/en/scripts/551769-smart-word-definition-popup)
- Or install directly: [word-definition-popup.user.js](https://raw.githubusercontent.com/wdinrev/word-definition-popup/main/word-definition-popup.user.js)

## Usage

1. Select any English word (2-35 characters) on any webpage.
2. The definition popup appears near your cursor.
3. Dismiss the popup by clicking outside, scrolling, or pressing the Escape key.

Punctuation marks and quotation marks around selected words are automatically trimmed.

## GreasyFork Synchronization

This repository automatically synchronizes with GreasyFork on pushes to `main`:
- Script ID: 551769
- Sync Source URL: `https://raw.githubusercontent.com/wdinrev/word-definition-popup/main/word-definition-popup.user.js`

## License

MIT License. Copyright (c) 2025-2026 wdinrev.
