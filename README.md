# Darker

A Chrome extension that finds and adjusts white colors on web pages.

## Features

- Detects white CSS variables and color properties on web pages
- Provides an easy-to-use color picker interface
- Adjusts colors in real-time as you select them
- Saves your color preferences per site for automatic reapplication
- Manage saved site preferences through the Saved Sites tab

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Navigate to any website
2. Click the Darker extension icon in your Chrome toolbar
3. Use the color pickers to adjust white colors on the page
4. Your settings will be saved automatically for each site
5. Access the "Saved Sites" tab to manage or delete your saved settings

## Development

This extension uses basic HTML, CSS, and JavaScript with Chrome Extension APIs.

### Files

- `manifest.json`: Extension configuration
- `content.js`: Runs on web pages to find and adjust colors
- `popup.html/css/js`: UI for the extension popup
- `background.js`: Background script (minimal for this extension)
- `icons/`: Extension icons in various sizes

## License

MIT