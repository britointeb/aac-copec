/* Aquisições complexas — experiência nativa, sem bibliotecas ou serviços externos. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reducedMotion.matches;
  const status = $('#interaction-status');

  function announce(text) { status.textContent = text; }
  function enter(element) {
    if (motionPaused) return;
    element.classList.remove('revealing');
    requestAnimationFrame(() => element.classList.add('revealing'));
  }
  // Os painéis permanecem no HTML, com seleção por mouse, toque e teclado.
  function setupTabs(attribute) {
    const tabs = $$(`[${attribute}]`);
    const select = (tab, focus = false) => {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        panel.hidden = !selected;
        if (selected) enter(panel);
      });
      if (focus) tab.focus();
      announce(tab.textContent.trim());
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); select(tabs[next], true); }
      });
    });
  }
  $$('[data-tab-group]').forEach(group => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    function select(tab, focus = false) {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        panel.hidden = !selected;
        if (selected) enter(panel);
      });
      if (focus) tab.focus();
      announce(tab.textContent.trim());
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % tabs.length;
        if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); select(tabs[next], true); }
      });
    });
  });
  $('#print-button').addEventListener('click', () => window.print());
  let detailsBeforePrint = [];
  window.addEventListener('beforeprint', () => {
    detailsBeforePrint = $$('details').map(item => [item, item.open]);
    detailsBeforePrint.forEach(([item]) => item.open = true);
  });
  window.addEventListener('afterprint', () => detailsBeforePrint.forEach(([item, open]) => item.open = open));
  const motionButton = $('#motion-toggle');
  function syncMotion() {
    document.documentElement.classList.toggle('motion-paused', motionPaused);
    motionButton.setAttribute('aria-pressed', String(motionPaused));
    motionButton.textContent = motionPaused ? 'Ativar animações' : 'Pausar animações';
    if (motionPaused) {
      $$('.reveal-ready').forEach(item => item.classList.add('has-entered'));
    }
  }
  motionButton.addEventListener('click', () => { motionPaused = !motionPaused; syncMotion(); });
  reducedMotion.addEventListener('change', () => { motionPaused = reducedMotion.matches; syncMotion(); });
  syncMotion();
  if ('IntersectionObserver' in window && !motionPaused) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('has-entered'); revealObserver.unobserve(entry.target); }
    }), { threshold: 0.06 });
    $$('.chapter-heading, .subsection-heading, .wide-takeaway, .decision-quote, .conclusion').forEach(item => {
      item.classList.add('reveal-ready'); revealObserver.observe(item);
    });
  }

  // Abre a bibliografia antes de navegar a uma referência recolhida.
  $$('a[href^="#ref-"]').forEach(link => link.addEventListener('click', () => {
    $('#referencias details').open = true;
  }));
  if (location.hash.startsWith('#ref-')) $('#referencias details').open = true;

  const menu = $('#menu-button');
  const navToggle = $('#nav-toggle');
  const sidebar = $('#site-sidebar');
  const backdrop = $('#menu-backdrop');
  const compactNav = matchMedia('(max-width: 1100px)');
  let desktopSidebarOpen = true;
  function setMenu(open) {
    const expanded = Boolean(open);
    if (!compactNav.matches) desktopSidebarOpen = expanded;
    sidebar.classList.toggle('open', expanded);
    sidebar.inert = !expanded;
    sidebar.setAttribute('aria-hidden', String(!expanded));
    document.body.classList.toggle('sidebar-collapsed', !compactNav.matches && !expanded);
    document.body.classList.toggle('menu-open', compactNav.matches && expanded);
    backdrop.hidden = !compactNav.matches || !expanded;
    const action = expanded ? 'Recolher barra lateral' : 'Exibir barra lateral';
    [menu, navToggle].forEach(button => {
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
    });
    menu.querySelector('.menu-label').textContent = expanded ? 'Recolher menu' : 'Exibir menu';
    navToggle.querySelector('.nav-toggle-icon').textContent = expanded ? '−' : '+';
    if (!expanded && sidebar.contains(document.activeElement)) menu.focus({ preventScroll: true });
  }
  // No computador, a navegação e a busca preservam a preferência da barra.
  function closeMenu() { if (compactNav.matches) setMenu(false); }
  function toggleMenu() {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    setMenu(expanded);
    announce(expanded ? 'Barra lateral exibida.' : 'Barra lateral recolhida.');
  }
  menu.addEventListener('click', toggleMenu);
  navToggle.addEventListener('click', toggleMenu);
  backdrop.addEventListener('click', () => { closeMenu(); menu.focus(); });
  $$('#main-nav a, .sidebar-brand').forEach(link => link.addEventListener('click', () => {
    const destination = document.querySelector(link.hash);
    const moveFocus = compactNav.matches;
    closeMenu();
    if (moveFocus && destination) {
      destination.tabIndex = -1;
      destination.focus({ preventScroll: true });
    }
  }));
  document.addEventListener('keydown', event => {
    if (!compactNav.matches || !sidebar.classList.contains('open')) return;
    if (event.key === 'Escape') { closeMenu(); menu.focus(); }
    if (event.key === 'Tab') {
      const focusable = [...sidebar.querySelectorAll('a,button'), menu].filter(item => item.getClientRects().length && !item.disabled);
      const current = focusable.indexOf(document.activeElement);
      const next = (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      event.preventDefault();
      focusable[next].focus();
    }
  });
  compactNav.addEventListener('change', () => setMenu(compactNav.matches ? false : desktopSidebarOpen));
  setMenu(!compactNav.matches);

  const chapters = $$('.section');
  let scrollQueued = false;
  function updateScroll() {
    const available = document.documentElement.scrollHeight - innerHeight;
    $('#page-progress').style.width = `${available > 0 ? Math.min(100, Math.round(scrollY / available * 100)) : 0}%`;
    let active = 'inicio';
    chapters.forEach(section => { if (section.getBoundingClientRect().top < 180) active = section.id; });
    $$('#main-nav a').forEach(link => {
      const selected = link.hash === `#${active}`;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    scrollQueued = false;
  }
  const queueScroll = () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } };
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);
  window.addEventListener('load', queueScroll);
  updateScroll();

  const search = $('#search-dialog');
  const searchInput = $('#search-input');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const searchSections = chapters.map((section, index) => ({
    id: section.id,
    number: index + 1,
    label: section.dataset.label,
    title: section.querySelector('h1,h2').innerText.replace(/\s+/g, ' '),
    text: normalize(section.textContent)
  }));
  let searchTrigger = null;
  function renderSearch() {
    const words = normalize(searchInput.value).trim().split(/\s+/).filter(Boolean);
    const found = searchSections.filter(section => words.every(word => section.text.includes(word)));
    $('#search-results').replaceChildren();
    $('#search-status').textContent = !words.length ? 'Escolha um tema ou digite um termo para filtrar.' : `${found.length} ${found.length === 1 ? 'assunto encontrado' : 'assuntos encontrados'}.`;
    found.forEach(section => {
      const result = document.createElement('button'); result.className = 'search-result';
      const number = document.createElement('span'); number.textContent = String(section.number).padStart(2, '0');
      const content = document.createElement('span');
      const label = document.createElement('strong'); label.textContent = section.label;
      const title = document.createElement('small'); title.textContent = section.title;
      content.append(label, title); result.append(number, content);
      result.addEventListener('click', () => {
        const target = document.getElementById(section.id);
        search.close();
        location.hash = section.id;
        target.querySelectorAll('.reveal-ready').forEach(item => item.classList.add('has-entered'));
        target.scrollIntoView({ behavior: motionPaused ? 'auto' : 'smooth', block: 'start' });
        const heading = target.querySelector('h1,h2'); heading.tabIndex = -1; heading.focus({ preventScroll: true });
        target.classList.remove('section-highlight'); requestAnimationFrame(() => target.classList.add('section-highlight'));
      });
      $('#search-results').append(result);
    });
  }
  function openSearch() {
    searchTrigger = document.activeElement;
    closeMenu();
    search.showModal(); document.body.classList.add('modal-open'); renderSearch(); searchInput.focus();
  }
  $('#search-open').addEventListener('click', openSearch);
  $('#search-close').addEventListener('click', () => search.close());
  searchInput.addEventListener('input', renderSearch);
  search.addEventListener('close', () => { document.body.classList.remove('modal-open'); if (searchTrigger?.isConnected) searchTrigger.focus({ preventScroll: true }); });
  search.addEventListener('click', event => {
    if (event.target !== search) return;
    const bounds = search.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) search.close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.matches('input,textarea,select,[contenteditable="true"]') && !search.open) {
      event.preventDefault(); openSearch();
    }
  });
})();
