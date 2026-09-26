# XMU-China 2026 Wiki

Flask/Jinja wiki for the [iGEM](https://igem.org/) competition, built with [Frozen-Flask](https://frozen-flask.readthedocs.io/) for static export. All pages share a single layout, header, and footer. The **Members** page is implemented at `/members` (also `/team`). The home page and other pages are English placeholders using the shared header and footer. Navigation links open their corresponding pages.

## Quick start

Requires Python 3.12+ and network access (assets load from `static.igem.wiki` via `asset-map.json`).

Create a virtual environment **outside** the repo (keeps the working tree clean):

```powershell
python -m venv ..\26web-local\venv
..\26web-local\venv\Scripts\python.exe -m pip install -r dependencies.txt
```

Run the dev server:

```powershell
..\26web-local\venv\Scripts\python.exe -B app.py
```

Open http://127.0.0.1:8080/members

## Static build

**Local** — output goes to `../26web-local/preview/`:

```powershell
$env:FLASK_APP = "app.py"
..\26web-local\venv\Scripts\python.exe -m flask freeze
```

Preview the build:

```powershell
..\26web-local\venv\Scripts\python.exe -m http.server 8081 --bind 127.0.0.1 --directory ..\26web-local\preview
```

**CI** — GitLab CI detects `GITLAB_CI=true` automatically and writes to `public/` for Pages deployment. No extra configuration needed.

## Project layout

| Path | Purpose |
|---|---|
| `app.py` | Routes, asset resolution, member data, static build |
| `asset-map.json` | Local path → iGEM CDN URL mapping (80 assets) |
| `data/members.json` | Member names and mottos |
| `wiki/layout.html` | Shared HTML shell |
| `wiki/menu.html`, `wiki/footer.html` | Shared header and footer |
| `wiki/pages/` | Simple pages as `<page>.html`; complex pages in subdirectories |
| `wiki/pages/members/` | Members entry and its hero, map, and card sections |
| `static/` | CSS and JS served by Flask |
| `notices/` | Font licenses and attribution |

## Adding a page

Create `wiki/pages/example.html`:

```jinja
{% extends "layout.html" %}
{% block title %}Example{% endblock %}
{% block page_content %}
<section style="padding: 120px 24px 40px;">Page content here</section>
{% endblock %}
```

The generic route serves it at `/example` and the freezer includes it in the build. Override `page_styles` and `page_scripts` blocks as needed — no need to duplicate header or footer markup.

To enable navigation, update `wiki/menu.html`: add `href="{{ url_for('pages', page='example') }}"` and remove `aria-disabled` from the matching link.

## Assets & license

All images and fonts are hosted on iGEM servers. `asset-map.json` keys are lookup paths, not local files. Invalid or missing URLs cause a startup error with the affected keys listed.

Font licenses live in `notices/`. Project code is under [LICENSE](LICENSE); content follows [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Page development

Edit `wiki/pages/<page>.html` and replace its under-development message with page content. Every page extends `wiki/layout.html`; shared navigation and footer live in `wiki/menu.html` and `wiki/footer.html`. Placeholder pages use `static/content-page.css`; use the `page_styles` and `page_scripts` blocks for page-specific code. Members content and interactions remain separate in `wiki/pages/members/`. All page templates are included in static builds, including pages not listed in the navigation.

Complex pages may use `wiki/pages/<page>/index.html` with section templates alongside it. Both forms keep the same URL. When converting a simple page, remove its old flat file after migrating the content; flat files take precedence when both exist. Members already uses its directory entry.

## Pending manual cleanup

Keep all 28 simple `.html` files directly inside `wiki/pages/` and keep `wiki/pages/members/`. Delete only the redundant `wiki/pages/members.html`, the old `wiki/members/` directory, and the 28 other subdirectories directly inside `wiki/pages/` (each contains a duplicate `index.html`). No files were deleted automatically.
