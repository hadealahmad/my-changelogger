/* ========================================
   Changelogger — Core Application Logic
   ======================================== */

(function () {
  'use strict';

  // --- i18n ---
  const i18n = {
    en: {
      search: 'Search projects...',
      allTags: 'All',
      allCategories: 'All Categories',
      noResults: 'No projects found',
      notes: 'Notes',
      releases: 'releases',
      clickToView: 'Click to view changelog',
      close: 'Close',
      untitled: 'Untitled',
      loadError: 'Failed to load changelog file',
      defaultTitle: 'Changelogger'
    },
    ar: {
      search: 'بحث عن المشاريع...',
      allTags: 'الكل',
      allCategories: 'جميع الفئات',
      noResults: 'لم يتم العثور على مشاريع',
      notes: 'ملاحظات',
      releases: 'إصدارات',
      clickToView: 'اضغط لعرض سجل التغييرات',
      close: 'إغلاق',
      untitled: 'بدون عنوان',
      loadError: 'فشل تحميل ملف سجل التغييرات',
      defaultTitle: 'شانج لوقر'
    }
  };

  // --- State ---
  let state = {
    config: {},
    apps: [],
    tags: [],
    categories: [],
    activeApp: null,
    activeTags: new Set(),
    activeCategory: '',
    searchQuery: '',
    locale: 'en',
    theme: 'dark'
  };

  // --- DOM References ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {};

  function cacheDom() {
    els.title = $('#site-title');
    els.about = $('#site-about');
    els.logo = $('#site-logo');
    els.favicon = $('#favicon-link');
    els.customButtons = $('#custom-buttons');
    els.themeToggle = $('#theme-toggle');
    els.localeToggle = $('#locale-toggle');
    els.searchInput = $('#search-input');
    els.tagFilters = $('#tag-filters');
    els.categoryFilter = $('#category-filter');
    els.projectGrid = $('#project-grid');
    els.changelogPanel = $('#changelog-panel');
    els.footer = $('#site-footer');
  }

  // --- Markdown Parsing ---
  function parseFrontmatter(raw) {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!match) return { frontmatter: {}, body: raw };
    const yamlStr = match[1];
    const body = raw.slice(match[0].length);
    let frontmatter = {};
    try {
      frontmatter = jsyaml.load(yamlStr) || {};
    } catch (e) {
      console.warn('Failed to parse frontmatter:', e);
    }
    return { frontmatter, body };
  }

  function extractMetaComments(text) {
    const meta = {};
    const cleaned = text.replace(/<!--\s*(\w[\w-]*):\s*(.*?)\s*-->/g, (_, key, val) => {
      meta[key] = val.trim();
      return '';
    });
    return { meta, cleaned };
  }

  function parseIconRef(raw) {
    if (!raw) return { type: 'lucide', name: 'box' };
    const trimmed = raw.trim();
    if (trimmed.startsWith('lucide:')) {
      return { type: 'lucide', name: trimmed.slice(7) };
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { type: 'external', url: trimmed };
    }
    return { type: 'local', path: trimmed };
  }

  function parseChangelogBody(body) {
    const apps = [];
    const appSections = body.split(/^## /m).filter(Boolean);

    for (const section of appSections) {
      const lines = section.split('\n');
      const name = lines[0].trim();
      const rest = lines.slice(1).join('\n');

      const { meta, cleaned } = extractMetaComments(rest);

      const releases = [];
      const releaseSections = cleaned.split(/^### /m).filter(Boolean);

      for (const rSection of releaseSections) {
        const rLines = rSection.split('\n');
        const headerLine = rLines[0].trim();
        const rRest = rLines.slice(1).join('\n');

        const { meta: rMeta, cleaned: rCleaned } = extractMetaComments(rRest);

        // Parse version and date from header: "v1.2.0 — 2024-01-15" or "1.2.0 - 2024-01-15" or just "v1.2.0" or "2024-01-15"
        let version = headerLine;
        let date = '';
        const separators = ['—', '–', '-', '|'];
        for (const sep of separators) {
          if (headerLine.includes(sep)) {
            const parts = headerLine.split(sep).map(s => s.trim());
            version = parts[0] || '';
            date = parts.slice(1).join(' ').trim() || '';
            break;
          }
        }

        let html = '';
        if (rCleaned.trim()) {
          try {
            html = marked.parse(rCleaned.trim());
          } catch (e) {
            html = '<p>' + rCleaned.trim() + '</p>';
          }
        }

        releases.push({
          version,
          date,
          notes: rMeta.notes || '',
          html
        });
      }

      // Parse tags
      let tags = [];
      if (meta.tags) {
        tags = meta.tags.split(',').map(t => t.trim()).filter(Boolean);
      }

      apps.push({
        name,
        icon: parseIconRef(meta.icon),
        link: meta.link || '',
        tags,
        category: meta.category || '',
        description: meta.description || '',
        releases
      });
    }

    return apps;
  }

  // --- Icon Rendering ---
  function renderIcon(iconRef, container) {
    if (!iconRef) return;

    if (iconRef.type === 'lucide') {
      const i = document.createElement('i');
      i.setAttribute('data-lucide', iconRef.name);
      container.appendChild(i);
    } else if (iconRef.type === 'local') {
      const img = document.createElement('img');
      img.src = iconRef.path;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => {
        img.remove();
        const fallback = document.createElement('i');
        fallback.setAttribute('data-lucide', 'file');
        container.appendChild(fallback);
        lucide.createIcons({ nodes: [fallback] });
      };
      container.appendChild(img);
    } else if (iconRef.type === 'external') {
      const img = document.createElement('img');
      img.src = iconRef.url;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => {
        img.remove();
        const fallback = document.createElement('i');
        fallback.setAttribute('data-lucide', 'file');
        container.appendChild(fallback);
        lucide.createIcons({ nodes: [fallback] });
      };
      container.appendChild(img);
    }
  }

  // --- Collect Tags & Categories ---
  function collectFilters(apps) {
    const tagSet = new Set();
    const catSet = new Set();
    for (const app of apps) {
      app.tags.forEach(t => tagSet.add(t));
      if (app.category) catSet.add(app.category);
    }
    state.tags = [...tagSet].sort();
    state.categories = [...catSet].sort();
  }

  // --- Filtering ---
  function getFilteredApps() {
    return state.apps.filter(app => {
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const haystack = (
          app.name + ' ' +
          app.description + ' ' +
          app.category + ' ' +
          app.tags.join(' ')
        ).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (state.activeTags.size > 0) {
        const hasAll = [...state.activeTags].every(t => app.tags.includes(t));
        if (!hasAll) return false;
      }
      if (state.activeCategory) {
        if (app.category !== state.activeCategory) return false;
      }
      return true;
    });
  }

  // --- Render: Tag Filters ---
  function renderTagFilters() {
    const t = i18n[state.locale];
    els.tagFilters.innerHTML = '';

    if (state.tags.length === 0) return;

    const allChip = document.createElement('button');
    allChip.className = 'tag-chip' + (state.activeTags.size === 0 ? ' active' : '');
    allChip.textContent = t.allTags;
    allChip.addEventListener('click', () => {
      state.activeTags.clear();
      render();
    });
    els.tagFilters.appendChild(allChip);

    for (const tag of state.tags) {
      const chip = document.createElement('button');
      chip.className = 'tag-chip' + (state.activeTags.has(tag) ? ' active' : '');
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        if (state.activeTags.has(tag)) {
          state.activeTags.delete(tag);
        } else {
          state.activeTags.add(tag);
        }
        render();
      });
      els.tagFilters.appendChild(chip);
    }
  }

  // --- Render: Category Filter ---
  function renderCategoryFilter() {
    const t = i18n[state.locale];
    els.categoryFilter.innerHTML = `<option value="">${t.allCategories}</option>`;
    for (const cat of state.categories) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === state.activeCategory) opt.selected = true;
      els.categoryFilter.appendChild(opt);
    }
  }

  // --- Render: Project Grid ---
  function renderProjectGrid() {
    const t = i18n[state.locale];
    const filtered = getFilteredApps();

    if (filtered.length === 0) {
      els.projectGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i data-lucide="search-x"></i>
          <p>${t.noResults}</p>
        </div>
      `;
      lucide.createIcons({ nodes: [els.projectGrid] });
      return;
    }

    els.projectGrid.innerHTML = '';

    for (const app of filtered) {
      const card = document.createElement('div');
      card.className = 'project-card' + (state.activeApp === app.name ? ' active' : '');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const header = document.createElement('div');
      header.className = 'project-card-header';

      const iconEl = document.createElement('div');
      iconEl.className = 'project-icon';
      renderIcon(app.icon, iconEl);
      header.appendChild(iconEl);

      const nameWrap = document.createElement('div');
      const nameEl = document.createElement('div');
      nameEl.className = 'project-name';
      nameEl.textContent = app.name;
      nameWrap.appendChild(nameEl);

      if (app.category) {
        const catEl = document.createElement('div');
        catEl.className = 'project-category';
        catEl.textContent = app.category;
        nameWrap.appendChild(catEl);
      }

      header.appendChild(nameWrap);
      card.appendChild(header);

      if (app.description) {
        const descEl = document.createElement('div');
        descEl.className = 'project-description';
        descEl.textContent = app.description;
        card.appendChild(descEl);
      }

      if (app.tags.length > 0) {
        const tagsEl = document.createElement('div');
        tagsEl.className = 'project-tags';
        for (const tag of app.tags) {
          const tagEl = document.createElement('span');
          tagEl.className = 'project-tag';
          tagEl.textContent = tag;
          tagsEl.appendChild(tagEl);
        }
        card.appendChild(tagsEl);
      }

      const clickHandler = () => toggleChangelog(app.name);
      card.addEventListener('click', clickHandler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          clickHandler();
        }
      });

      els.projectGrid.appendChild(card);
    }

    lucide.createIcons({ nodes: [els.projectGrid] });
  }

  // --- Render: Changelog Panel ---
  function renderChangelogPanel() {
    const t = i18n[state.locale];

    if (!state.activeApp) {
      els.changelogPanel.hidden = true;
      return;
    }

    const app = state.apps.find(a => a.name === state.activeApp);
    if (!app) {
      els.changelogPanel.hidden = true;
      return;
    }

    els.changelogPanel.hidden = false;
    els.changelogPanel.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'changelog-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'changelog-header-left';

    const iconEl = document.createElement('div');
    iconEl.className = 'project-icon';
    renderIcon(app.icon, iconEl);
    headerLeft.appendChild(iconEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'changelog-title';
    titleEl.textContent = app.name;
    headerLeft.appendChild(titleEl);

    if (app.link) {
      const linkEl = document.createElement('a');
      linkEl.className = 'changelog-link';
      linkEl.href = app.link;
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      linkEl.textContent = app.link.replace(/^https?:\/\//, '').replace(/\/$/, '');
      headerLeft.appendChild(linkEl);
    }

    header.appendChild(headerLeft);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'changelog-close';
    closeBtn.title = t.close;
    closeBtn.innerHTML = '<i data-lucide="x"></i>';
    closeBtn.addEventListener('click', () => {
      state.activeApp = null;
      render();
      window.location.hash = '';
    });
    header.appendChild(closeBtn);

    els.changelogPanel.appendChild(header);

    // Release list
    const releaseList = document.createElement('div');
    releaseList.className = 'release-list';

    if (app.releases.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<i data-lucide="inbox"></i><p>No releases yet</p>`;
      releaseList.appendChild(empty);
    } else {
      for (const release of app.releases) {
        const item = document.createElement('div');
        item.className = 'release-item';

        const rHeader = document.createElement('div');
        rHeader.className = 'release-header';

        const rHeaderLeft = document.createElement('div');
        rHeaderLeft.className = 'release-header-left';

        const verEl = document.createElement('span');
        verEl.className = 'release-version';
        verEl.textContent = release.version || t.untitled;
        rHeaderLeft.appendChild(verEl);

        if (release.date) {
          const dateEl = document.createElement('span');
          dateEl.className = 'release-date';
          dateEl.textContent = release.date;
          rHeaderLeft.appendChild(dateEl);
        }

        rHeader.appendChild(rHeaderLeft);

        const chevron = document.createElement('i');
        chevron.setAttribute('data-lucide', 'chevron-down');
        chevron.className = 'release-chevron';
        rHeader.appendChild(chevron);

        rHeader.addEventListener('click', () => {
          item.classList.toggle('open');
        });

        item.appendChild(rHeader);

        const body = document.createElement('div');
        body.className = 'release-body';

        if (release.notes) {
          const notesEl = document.createElement('div');
          notesEl.className = 'release-notes';
          notesEl.textContent = release.notes;
          body.appendChild(notesEl);
        }

        if (release.html) {
          const contentEl = document.createElement('div');
          contentEl.className = 'release-content';
          contentEl.innerHTML = release.html;
          body.appendChild(contentEl);
        }

        item.appendChild(body);
        releaseList.appendChild(item);
      }
    }

    els.changelogPanel.appendChild(releaseList);
    lucide.createIcons({ nodes: [els.changelogPanel] });

    // Auto-open first release on desktop
    if (window.innerWidth > 640 && app.releases.length > 0) {
      const firstItem = releaseList.querySelector('.release-item');
      if (firstItem) firstItem.classList.add('open');
    }
  }

  // --- Render: Site Config ---
  function renderConfig() {
    const c = state.config;
    const mode = c.mode || 'template'; // template | supporter | clean
    const t = i18n[state.locale];

    // --- Logo ---
    if (c.logo) {
      els.logo.src = c.logo;
      els.logo.hidden = false;
    } else {
      els.logo.hidden = true;
    }

    // --- Title ---
    if (mode === 'clean') {
      // Clean mode: only show title if explicitly set
      if (c.title) {
        document.title = c.title;
        els.title.textContent = c.title;
        els.title.hidden = false;
      } else {
        document.title = '';
        els.title.hidden = true;
      }
    } else {
      // Template/Supporter: show title or fallback
      const displayTitle = c.title || 'Changelogger';
      document.title = displayTitle;
      els.title.textContent = displayTitle;
      els.title.hidden = false;
    }

    // --- About ---
    if (c.about) {
      els.about.textContent = c.about;
      els.about.hidden = false;
    } else {
      els.about.hidden = true;
    }

    // --- Hide the whole title wrapper if no logo and no title ---
    const headerLeft = els.logo.parentElement;
    if (mode === 'clean') {
      const hasTitle = !!c.title;
      const hasLogo = !!c.logo;
      const hasAbout = !!c.about;
      headerLeft.hidden = !hasTitle && !hasLogo && !hasAbout;
    } else {
      headerLeft.hidden = false;
    }

    // --- Favicon ---
    if (c.favicon) {
      els.favicon.href = c.favicon;
      if (c.faviconType) els.favicon.type = c.faviconType;
    }

    // --- Custom buttons ---
    els.customButtons.innerHTML = '';
    if (c.customButtons && Array.isArray(c.customButtons)) {
      for (const btn of c.customButtons) {
        const a = document.createElement('a');
        a.className = 'custom-btn';
        a.href = btn.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';

        if (btn.icon) {
          const iconSpan = document.createElement('span');
          iconSpan.setAttribute('data-lucide', btn.icon);
          a.appendChild(iconSpan);
        }

        const labelSpan = document.createElement('span');
        labelSpan.textContent = btn.label;
        a.appendChild(labelSpan);

        els.customButtons.appendChild(a);
      }
    }

    // --- Theme toggle visibility ---
    if (mode === 'clean') {
      els.themeToggle.hidden = c.allowThemeToggle === true ? false : true;
    } else {
      els.themeToggle.hidden = c.allowThemeToggle === false;
    }
    // --- Locale toggle visibility ---
    if (mode === 'clean') {
      els.localeToggle.hidden = c.allowLocaleToggle === true ? false : true;
    } else {
      els.localeToggle.hidden = c.allowLocaleToggle === false;
    }

    // --- Footer ---
    renderFooter(mode);
  }

  // --- Render: Footer ---
  function renderFooter(mode) {
    const t = i18n[state.locale];

    if (mode === 'supporter') {
      els.footer.hidden = false;
      els.footer.innerHTML = '';

      const link = document.createElement('a');
      link.href = state.config.supporterLink || 'https://github.com';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Changelogger';

      const text = state.locale === 'ar'
        ? 'صُنع بواسطة '
        : 'Made with ';
      const suffix = state.locale === 'ar'
        ? ' — عارض تغييرات بسيط'
        : ' — minimal changelog viewer';

      els.footer.appendChild(document.createTextNode(text));
      els.footer.appendChild(link);
      els.footer.appendChild(document.createTextNode(suffix));
    } else {
      els.footer.hidden = true;
    }
  }

  // --- Theme ---
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('changelogger-theme', theme); } catch (e) {}
  }

  function initTheme() {
    const c = state.config;
    let theme = 'dark';

    if (c.theme && ['dark', 'light', 'auto'].includes(c.theme)) {
      theme = c.theme;
    }

    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }

    // User override
    try {
      const saved = localStorage.getItem('changelogger-theme');
      if (saved && ['dark', 'light'].includes(saved)) {
        // Only allow override if toggles are enabled
        if (c.allowThemeToggle !== false) {
          theme = saved;
        }
      }
    } catch (e) {}

    applyTheme(theme);
  }

  // --- Locale ---
  function applyLocale(locale) {
    state.locale = locale;
    const dir = (locale === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', dir);
    try { localStorage.setItem('changelogger-locale', locale); } catch (e) {}
  }

  function initLocale() {
    const c = state.config;
    let locale = 'en';

    if (c.locale && ['en', 'ar'].includes(c.locale)) {
      locale = c.locale;
    }

    // User override
    try {
      const saved = localStorage.getItem('changelogger-locale');
      if (saved && ['en', 'ar'].includes(saved)) {
        if (c.allowLocaleToggle !== false) {
          locale = saved;
        }
      }
    } catch (e) {}

    applyLocale(locale);
  }

  // --- Render All ---
  function render() {
    const t = i18n[state.locale];

    renderConfig();
    els.searchInput.placeholder = t.search;
    renderTagFilters();
    renderCategoryFilter();
    renderProjectGrid();
    renderChangelogPanel();
  }

  // --- Toggle Changelog ---
  function toggleChangelog(appName) {
    if (state.activeApp === appName) {
      state.activeApp = null;
      window.location.hash = '';
    } else {
      state.activeApp = appName;
      window.location.hash = encodeURIComponent(appName);
    }
    render();

    // Scroll to panel
    if (state.activeApp) {
      setTimeout(() => {
        els.changelogPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  // --- Event Bindings ---
  function bindEvents() {
    els.themeToggle.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      render();
    });

    els.localeToggle.addEventListener('click', () => {
      applyLocale(state.locale === 'en' ? 'ar' : 'en');
      render();
    });

    els.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderProjectGrid();
      renderChangelogPanel();
    });

    els.categoryFilter.addEventListener('change', (e) => {
      state.activeCategory = e.target.value;
      renderProjectGrid();
    });

    // Hash routing
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const name = decodeURIComponent(hash);
        if (state.apps.find(a => a.name === name)) {
          state.activeApp = name;
          render();
        }
      } else {
        state.activeApp = null;
        render();
      }
    });
  }

  // --- Init ---
  async function init() {
    cacheDom();
    bindEvents();

    const changelogFile = 'changelog.md';

    try {
      const resp = await fetch(changelogFile);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const raw = await resp.text();

      const { frontmatter, body } = parseFrontmatter(raw);
      state.config = frontmatter;

      // Apply theme and locale before first render
      initTheme();
      initLocale();

      state.apps = parseChangelogBody(body);
      collectFilters(state.apps);

      // Check hash for active app
      const hash = window.location.hash.slice(1);
      if (hash) {
        const name = decodeURIComponent(hash);
        if (state.apps.find(a => a.name === name)) {
          state.activeApp = name;
        }
      }

      render();
    } catch (err) {
      console.error('Failed to load changelog:', err);
      const t = i18n[state.locale] || i18n.en;
      els.projectGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i data-lucide="alert-circle"></i>
          <p>${t.loadError}</p>
          <p style="font-size:0.75rem;margin-top:0.5rem;opacity:0.7;">${err.message}</p>
        </div>
      `;
      lucide.createIcons({ nodes: [els.projectGrid] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
