# AI Resume

Resume-style AI portfolio for `Conglin (Duke) Ruan`.

This version is built to look credible for hiring managers first, then add interaction only where it helps explain selected projects. The page emphasizes:

- A trustworthy resume-like layout
- AI product manager positioning
- Quantitative and statistical depth
- Project-specific algorithm views with intermediate steps
- Concise results and experience summaries instead of portfolio-style marketing copy

## Project structure

- `index.html`: page shell
- `assets/content.js`: editable content source for profile, experience, quant skills, and project algorithms
- `assets/app.js`: small bootstrap file
- `assets/js/`: modular renderers, state helpers, widgets, and icons
- `assets/styles.css`: visual system, layout, and motion
- `CHANGELOG.md`: traceable change log
- `ROADMAP.md`: next planned improvements

## How to update content

Most future edits should happen in `assets/content.js`.

Useful places to update:

- `profile`: name, links, contact info
- `results`: headline numbers
- `quantToolkit`: quantitative and statistical areas to emphasize
- `experience`: resume-style role entries
- `projects`: project summaries, metrics, algorithm steps, and interactive widgets
- `links`: website, GitHub, scholar, and contact links

## Local preview

From this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

You can also open `index.html` directly in a browser, but using a local server is better for repeat testing.

## Notes

- This version removes the earlier role-filtered portfolio framing in favor of a cleaner resume presentation.
- The project interaction area is intentionally compact and focused on algorithm transparency.
- The site is self-contained and does not depend on external fonts, icon CDNs, or frameworks.
