# 📖 Smart Word Definition Popup

A lightweight userscript that automatically displays word definitions when you select text on any webpage. Features adaptive theming that intelligently matches your website's color scheme with guaranteed readability.

![Version](https://img.shields.io/badge/version-1.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **🎯 Instant Definitions** - Select any word to instantly see its definition
- **🎨 Adaptive Theming** - Automatically matches the website's background and text colors
- **✅ Guaranteed Readability** - WCAG AA compliant contrast ratios (4.5:1 minimum)
- **🪶 Lightweight** - Minimal performance impact with optimized code
- **🎭 Smart Positioning** - Popup intelligently adjusts based on viewport boundaries
- **⌨️ IBM Plex Mono** - Clean, professional monospace typography
- **🔇 No Close Button** - Minimal UI that auto-hides when needed
- **🌐 Works Everywhere** - Compatible with all websites including complex layouts
- **🆓 Free API** - Uses Free Dictionary API (no API key required)
- **🔄 Auto-Update** - Tampermonkey/Violentmonkey will update the script automatically

## 🚀 Installation

### Prerequisites
You need a userscript manager extension installed in your browser:

- **Chrome/Edge/Brave**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) or [Violentmonkey](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdaq)
- **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Violentmonkey](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)
- **Safari**: [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887)

### Steps

1. **Install a userscript manager** (see links above)
2. **Click here to install**: [word-definition-popup.user.js](https://github.com/doniwicaksono/word-definition-popup/raw/refs/heads/main/word-definition-popup.user.js)
3. **Confirm installation** in the userscript manager popup
4. **Done!** Start selecting words on any webpage

## 📖 Usage

1. **Select any word** on any webpage
2. **Wait 300ms** (debounce delay)
3. **See the definition** appear near your cursor

### Supported Word Types
- Single English words (1-30 characters)
- Words with hyphens (e.g., "self-aware")
- Words with apostrophes (e.g., "don't")

### Hiding the Popup
The popup automatically hides when you:
- Click anywhere outside the popup
- Start scrolling
- Press the **ESC** key
- Select new text

## 🎨 Adaptive Theming

The popup intelligently adapts to your website's design with guaranteed readability:

### Background Color Detection
- **Deep DOM traversal** (up to 20 levels) to find backgrounds
- Handles **semi-transparent** overlays and complex layouts
- Prioritizes **solid colors** (opacity ≥ 80%)
- Falls back through: element → body → html → system preference
- Works perfectly on sites like **Bluesky, Twitter/X, Reddit** in dark mode

### Text Color Adaptation
- Uses the same text color from the selected text
- **Automatic contrast checking** using WCAG standards
- Falls back to black/white if contrast ratio is below 4.5:1
- Ensures perfect readability in all scenarios

### Smart Positioning
- Appears near your cursor
- Auto-adjusts when near viewport edges
- Never clips off-screen

### Contrast Ratio Algorithm
The script uses the WCAG 2.1 formula to calculate contrast ratios:

```javascript
// Ensures 4.5:1 minimum contrast for normal text (WCAG AA)
// Automatically corrects poor contrast scenarios
```

## 🛠️ Configuration

The script works out-of-the-box, but you can customize it by editing these values:

```javascript
// Debounce delay (ms)
debounceTimer = setTimeout(() => {}, 300); // Change 300 to your preference

// Max word length
text.length < 30 // Change 30 to allow longer words

// Popup max width
max-width: 320px; // Edit in CSS

// Number of definitions shown
const meanings = entry.meanings.slice(0, 3); // Change 3 to show more/less

// DOM traversal depth
const maxDepth = 20; // Increase for even deeper scanning

// Minimum contrast ratio
if (contrastRatio < 4.5) // Change 4.5 for different standards
```

## 🔧 Technical Details

### API
Uses the [Free Dictionary API](https://dictionaryapi.dev/) for word definitions:
- **Endpoint**: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- **No authentication required**
- **No rate limiting** (reasonable usage)

### Color Detection Algorithm
1. **Traverse DOM tree** up to 20 levels deep
2. **Collect all non-transparent backgrounds** with opacity > 0.1
3. **Prioritize solid colors** with opacity ≥ 0.8
4. **Parse computed styles** including rgba values
5. **Calculate luminance** using WCAG formula:
   ```
   L = 0.2126 × R + 0.7152 × G + 0.0722 × B
   ```
6. **Check contrast ratio** between text and background:
   ```
   CR = (L1 + 0.05) / (L2 + 0.05)
   ```
7. **Auto-correct** text color if contrast < 4.5:1
8. **Fallback chain**: element → body → html → `prefers-color-scheme`

### Performance Optimizations
- **Debouncing**: 300ms delay prevents excessive API calls
- **Word caching**: Same word won't trigger a new API call
- **Minimal DOM**: Single popup element reused across all lookups
- **Efficient color parsing**: Fast-path regex for `rgb()`, `rgba()`, and `#rrggbb` — browser computation only used as a last resort
- **Single parser element**: One hidden element reused for color resolution, avoiding repeated DOM insertions
- **Event delegation**: Efficient event handling
- **Lazy loading**: Font loaded asynchronously
- **Smart traversal**: Stops at first solid background

## 🐛 Troubleshooting

### Popup not appearing?
- Ensure the word is 2-30 characters long
- Check that it contains only English letters, hyphens, or apostrophes
- Verify userscript manager is enabled

### Wrong colors or poor contrast?
- The script ensures WCAG AA compliance automatically
- Report specific websites as GitHub issues with screenshots

### Popup has white background on dark sites?
- The script traverses up to 20 DOM levels and handles opacity correctly
- Works on Bluesky, Twitter/X, Reddit, and other complex dark themes

### Definition not found?
- Not all words are in the dictionary
- Try singular form (e.g., "book" instead of "books")
- Slang and very new words may not be available

### Popup position issues?
- Clear browser cache and reload
- Check browser zoom level (100% recommended)
- Report edge cases as GitHub issues

## 📝 Changelog

### v1.3.0 (2026-06-10)
- 🔄 Added `@updateURL` / `@downloadURL` for automatic script updates via Tampermonkey/Violentmonkey
- ⚡ Eliminated DOM thrashing in color parsing — single cached element + fast regex paths
- ✨ Fixed popup fade-in/out animation (`visibility` + `opacity` transition instead of `display` toggle)
- 📐 Fixed popup positioning accuracy on first show
- 🔧 Fixed GitHub Actions workflows (path filters, version regex, semver comparison)

### v1.2.1 (2025-10-11)
- 🔧 **Fixed contrast issues** on complex dark themes (Bluesky, Twitter/X)
- 🎨 Enhanced background detection with deeper DOM traversal (20 levels)
- ✅ Added **WCAG AA compliance** with automatic contrast checking (4.5:1)
- 🔍 Improved handling of **semi-transparent overlays**
- 🌓 Better fallback to `prefers-color-scheme` system preference
- 🐛 Fixed rgba color parsing with alpha channel support

### v1.2.0 (2025-01-06)
- ✨ Added adaptive text color matching selected text
- 🎨 Improved theme detection algorithm
- 🔧 Added userscript icon
- 📚 Created comprehensive README

### v1.1.0 (2025-01-06)
- ❌ Removed close button for minimal UI
- 🎨 Implemented auto-theme based on background color
- 🔍 Smart color detection from DOM tree

### v1.0.0 (2025-01-06)
- 🎉 Initial release
- ⚡ Core functionality with IBM Plex Mono font
- 📱 Smart viewport positioning

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Bump `@version` in `word-definition-popup.user.js` (semver, must be greater than current)
4. Add a `release-notes/vX.Y.Z.md` file (optional but recommended)
5. Commit your changes and open a Pull Request

### Automated Release Process
This repo uses GitHub Actions to automate releases:
- **On PR**: validates that `@version` was bumped to a higher semver value and the tag doesn't already exist
- **On merge to main**: automatically creates a git tag, generates a release, and attaches the `.user.js` file

### Development Setup
```bash
# Clone the repo
git clone https://github.com/doniwicaksono/word-definition-popup.git

# Edit the .user.js file
# Test in your browser with userscript manager
```

### Reporting Issues
When reporting color/contrast issues, please include:
- Website URL
- Screenshot of the issue
- Browser and OS version

## 📄 License

This project is licensed under the MIT License - see below:

```
MIT License

Copyright (c) 2025 doniwicaksono

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- [Free Dictionary API](https://dictionaryapi.dev/) for providing the word definitions
- [IBM Plex](https://www.ibm.com/plex/) for the beautiful monospace font
- [Icons8](https://icons8.com/) for the userscript icon
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/) for accessibility guidelines

## 🌟 Tested On

- ✅ GitHub (light & dark themes)
- ✅ Twitter/X (light & dark themes)
- ✅ Reddit (light & dark themes)
- ✅ Bluesky (dark theme)
- ✅ Medium
- ✅ Stack Overflow
- ✅ Wikipedia
- ✅ News sites (CNN, BBC, etc.)
- ✅ Documentation sites (MDN, etc.)

---

<p align="center">Made with ❤️ for better reading experience</p>
