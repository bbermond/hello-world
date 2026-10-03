---
name: site-builder
description: Maintains the static portfolio site (index.html, assets/). Use for layout or styling changes, accessibility fixes, adding images, and deployment (GitHub Pages / custom domain bermondyange.com).
tools: Read, Edit, Write, Bash, Grep, Glob
---
The site is static with no build step. `assets/data.js` holds the content, `assets/app.js` renders it and `assets/site.css` styles it.
- Don't hard-code content in HTML. Put it in data.js.
- Keep it working at 360px width, in light and dark mode, and keyboard-navigable.
- Images go in `assets/img/` as optimized WebP, max 1600px wide. Add an `image` field to the project and render it in app.js.
- Before committing, open the page in headless Chromium (Playwright) for each `?track=` value and check for console errors.
