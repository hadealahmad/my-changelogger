# Changelogger

A minimalistic, single-file changelog viewer. All data lives in one Markdown file. No build step, no backend — just open `index.html` or deploy to GitHub Pages.

## Features

- Single `changelog.md` data source with YAML frontmatter
- Three page modes: **template**, **supporter** (with credit footer), **clean** (your branding only)
- Dark and light mode (auto, dark, light)
- Arabic and English UI with full RTL/LTR support
- Project grid with icons, tags, categories, and descriptions
- Expandable changelog panel per project
- Search and filter by tags and category
- Lucide icons, local SVGs, or external SVG URLs for projects
- Custom header buttons (GitHub link, etc.)
- URL hash routing for deep links (`#ProjectName`)
- Responsive and mobile-friendly
- Print-friendly styles
- Zero dependencies at runtime (all via CDN)

## Quick Start

1. Clone or download this repository
2. Edit `changelog.md` with your projects and releases
3. Open `index.html` in a browser
4. That's it

## Project Structure

```
changelogger/
├── index.html          # The app
├── style.css           # Shadcn-inspired styles
├── app.js              # Core logic
├── changelog.md        # Your data
├── icons/              # Custom SVG icons
├── assets/             # Logo, favicon
├── README.md
└── .gitignore
```

## Adding a New Project

Add a new section at the bottom of `changelog.md` using a level-2 heading (`##`):

```markdown
## My New Project

<!-- icon: lucide:rocket -->
<!-- link: https://example.com/my-project -->
<!-- tags: javascript, react -->
<!-- category: Web -->
<!-- description: A short description of this project. -->

### v1.0.0 — 2024-06-21

- Initial release
- Core functionality
```

### Project Metadata

All project metadata is placed in HTML comments (`<!-- -->`) after the project heading:

| Key | Required | Description |
|-----|----------|-------------|
| `icon` | No | Icon reference (see below) |
| `link` | No | Project URL shown in the header |
| `tags` | No | Comma-separated list of tags |
| `category` | No | Category name for filtering |
| `description` | No | Short description shown on the card |

### Icon Formats

The `icon` field supports three formats:

| Format | Example | Description |
|--------|---------|-------------|
| Lucide icon | `lucide:box` | Uses [Lucide](https://lucide.dev) icon by name |
| Local SVG | `icons/myapp.svg` | Loads SVG from the `icons/` folder |
| External URL | `https://example.com/icon.svg` | Loads SVG from any URL |

Available Lucide icon names: https://lucide.dev/icons

## Adding a New Release

Add a level-3 heading (`###`) under the project section:

```markdown
### v1.2.0 — 2024-07-15

<!-- notes: This release fixes several bugs -->

- Fixed authentication timeout
- Improved error messages
- Added support for custom themes
```

### Release Format

The release heading supports these formats:

```
### v1.0.0 — 2024-06-21
### v1.0.0 - 2024-06-21
### 1.0.0 | 2024-06-21
### v1.0.0
### 2024-06-21
```

Separators supported: `—` (em dash), `–` (en dash), `-` (hyphen), `|` (pipe)

### Release Metadata

| Key | Required | Description |
|-----|----------|-------------|
| `notes` | No | A note or warning shown in italic above the release notes |

### Release Content

Write standard Markdown under each release heading. Bullet lists, bold, code blocks, blockquotes — all supported:

```markdown
### v2.0.0 — 2024-06-21

<!-- notes: Breaking changes — see migration guide -->

- **Breaking:** Removed deprecated API endpoints
- Added GraphQL support
- Fixed `NullPointerException` in auth module
- Updated dependencies to latest versions

> Migration: Update your API base URL from `/v1/` to `/v2/`.
```

## Frontmatter Customization

The YAML frontmatter at the top of `changelog.md` controls the site appearance and behavior:

```yaml
---
title: "My Changelog"
logo: "assets/logo.png"
favicon: "assets/favicon.ico"
faviconType: "image/png"
about: "A short tagline about your changelog"
mode: template
theme: auto
locale: en
allowThemeToggle: true
allowLocaleToggle: true
customButtons:
  - label: "GitHub"
    url: "https://github.com/you/repo"
    icon: "github"
  - label: "Website"
    url: "https://yoursite.com"
    icon: "globe"
---
```

### Frontmatter Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `title` | string | "Changelogger" | Site title shown in the header |
| `logo` | string | — | Path to logo image (shown in header) |
| `favicon` | string | — | Path to favicon |
| `faviconType` | string | "image/png" | MIME type of favicon |
| `about` | string | — | Tagline shown below the title |
| `mode` | string | "template" | Page mode: `template`, `supporter`, or `clean` |
| `theme` | string | "dark" | Default theme: `dark`, `light`, or `auto` |
| `locale` | string | "en" | Default language: `en` or `ar` |
| `allowThemeToggle` | boolean | true | Show/hide the theme toggle button |
| `allowLocaleToggle` | boolean | true | Show/hide the language toggle button |
| `supporterLink` | string | "https://github.com" | Link URL in the supporter footer |
| `customButtons` | array | — | Buttons shown in the header |

### Page Modes

The `mode` field controls how the page presents itself:

| Mode | Description |
|------|-------------|
| `template` | Default. Shows title, logo, about — falls back to "Changelogger" branding if not set. Best for GitHub use. |
| `supporter` | Same as template, plus a footer credit: "Made with Changelogger — minimal changelog viewer". |
| `clean` | Only shows elements you explicitly set. No fallback branding. No footer. Purely your content. |

**Template mode** — ready for GitHub:
```yaml
mode: template
```

**Supporter mode** — shows credit in footer:
```yaml
mode: supporter
```

**Clean mode** — your branding only, no defaults:
```yaml
mode: clean
title: "My Product Updates"
logo: "assets/logo.svg"
```

In `clean` mode, the title and about are hidden unless you set them. The logo is only shown if provided. Theme/locale toggles are hidden by default and must be explicitly enabled with `allowThemeToggle: true`.

### Custom Buttons

Each button in `customButtons` supports:

| Key | Required | Description |
|-----|----------|-------------|
| `label` | Yes | Button text |
| `url` | Yes | Button link |
| `icon` | No | Lucide icon name (e.g., `github`, `globe`, `external-link`) |

## Deployment to GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings > Pages**
3. Set **Source** to "Deploy from a branch"
4. Select your branch and folder (`/ (root)`)
5. Save — your site will be live at `https://yourusername.github.io/repo-name/`

No build step required. All files are served as-is.

## Theme and Locale

- **Theme**: Click the sun/moon icon in the header to toggle dark/light mode. The user's choice is saved in `localStorage`.
- **Locale**: Click the globe icon to switch between English and Arabic. RTL layout adjusts automatically.

To disable toggles or set defaults, use the frontmatter:

```yaml
theme: dark           # Force dark mode, hide toggle
allowThemeToggle: false
locale: ar            # Force Arabic, hide toggle
allowLocaleToggle: false
```

## Suggested Features

Here are additional features you can implement with minimal effort:

### Permalink to Release

Each release has a deep link via URL hash: `#ProjectName`. When you open a project, the URL updates automatically. Share the link to send someone directly to that project's changelog.

### Copy Release Link

You can add a "copy link" button to each release header by extending `app.js`. The release content is already stable — just add a button that copies `window.location.href + '#' + appName`.

### RSS Feed

Create a `feed.xml` file manually or use a build script. The changelog data is structured enough to generate RSS entries from each release section.

### Print-Friendly

The CSS already includes `@media print` styles that hide the header, filters, and toggle buttons, and expand all release bodies automatically.

### Export as JSON

Extend `app.js` to add a button that serializes `state.apps` as JSON and triggers a download:

```javascript
function exportJson() {
  const blob = new Blob([JSON.stringify(state.apps, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'changelog.json';
  a.click();
  URL.revokeObjectURL(url);
}
```

### Version Comparison

For a simple diff view, render two releases side by side and highlight added/removed lines using CSS classes and text comparison.

### Search Across All Releases

The search currently filters by project name, description, tags, and category. To search within release content, extend the `getFilteredApps()` function to also check `release.html` and `release.notes`.

## License

MIT
