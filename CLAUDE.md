# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Chrome Extension: Darker

This is a Chrome extension that finds and adjusts near-white colors on web pages.

## Commands
- Load extension: Navigate to chrome://extensions, enable Developer mode, and "Load unpacked"
- Test: Open a web page and click the extension icon
- Lint: No formal linting setup

## Code Style Guidelines
- **JS Style**: Compact, minimal code with single-letter variables and abbreviated syntax
- **Formatting**: No semicolons, minimal whitespace, single quotes for strings
- **Variable Names**: Camel case, abbreviated when possible
- **Constants**: ALL_CAPS with underscores
- **Selectors**: Use getElementById/querySelector for DOM manipulation
- **Error Handling**: Try/catch blocks around critical operations (e.g., stylesheet access)
- **Chrome API**: Follow Chrome Extensions Manifest V3 conventions
- **Code Organization**: Keep popup, content, and background scripts separate
- **CSS**: Simple and clean with flexbox for layout