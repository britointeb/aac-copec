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

  // V3: cada botão controla um painel. O bloco preserva o estado de seus tópicos.
  const collapseButtons = $$('[data-collapse]');
  // O controle geral mantém seu escopo: blocos/tópicos; abertura e fechamento da página têm controles próprios.
  const blockTopicButtons = collapseButtons.filter(button => button.dataset.collapse !== 'section');
  const collapseAllButton = $('#collapse-all');
  const collapsePanel = button => document.getElementById(button.getAttribute('aria-controls'));

  function setExpanded(button, expanded) {
    const panel = collapsePanel(button);
    const action = expanded ? 'Recolher' : 'Expandir';
    const kind = button.dataset.collapseLabel || (button.dataset.collapse === 'block' ? 'bloco' : 'tópico');
    // Retira o foco do conteúdo antes de ocultá-lo, inclusive para uso por teclado.
    if (!expanded && panel.contains(document.activeElement)) button.focus({ preventScroll: true });
    panel.hidden = !expanded;
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', `${action} ${button.dataset.collapseContext}`);
    button.querySelector('.collapse-label').textContent = `${action} ${kind}`;
    button.querySelector('.collapse-icon').textContent = expanded ? '−' : '+';
    if (kind === 'tópico') button.closest('.chapter').classList.toggle('is-collapsed', !expanded);
    if (button.dataset.collapse === 'section') button.closest('.section').classList.toggle('is-section-collapsed', !expanded);
  }

  function syncCollapseAll() {
    const allExpanded = blockTopicButtons.every(button => button.getAttribute('aria-expanded') === 'true');
    collapseAllButton.setAttribute('aria-expanded', String(allExpanded));
    collapseAllButton.textContent = allExpanded ? 'Recolher Blocos/Tópicos' : 'Expandir Blocos/Tópicos';
    collapseAllButton.setAttribute('aria-label', `${allExpanded ? 'Recolher' : 'Expandir'} todos os blocos e tópicos`);
  }

  function revealDestination(target) {
    if (!target) return;
    collapseButtons.forEach(button => {
      const panel = collapsePanel(button);
      const topic = button.dataset.collapse === 'topic' && button.closest('.chapter') === target;
      const block = button.dataset.collapse === 'block' && button.closest('.copec-block-divider') === target;
      const section = button.dataset.collapse === 'section' && button.closest('.section') === target;
      if (topic || block || section || panel === target || panel.contains(target)) setExpanded(button, true);
    });
    syncCollapseAll();
  }

  collapseButtons.forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      setExpanded(button, expanded);
      syncCollapseAll();
      queueScroll();
      announce(`${button.dataset.collapseContext}: ${expanded ? 'expandido' : 'recolhido'}.`);
    });
  });
  collapseAllButton.hidden = false;
  collapseAllButton.addEventListener('click', () => {
    const expanded = blockTopicButtons.some(button => button.getAttribute('aria-expanded') !== 'true');
    blockTopicButtons.forEach(button => setExpanded(button, expanded));
    syncCollapseAll();
    queueScroll();
    announce(`Todos os blocos e tópicos foram ${expanded ? 'expandidos' : 'recolhidos'}.`);
  });
  syncCollapseAll();

  // Menu, índices e links internos reabrem o destino antes do salto da âncora.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link?.hash) revealDestination(document.getElementById(decodeURIComponent(link.hash.slice(1))));
  }, true);
  function revealHash() {
    let identifier;
    try { identifier = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(identifier);
    if (!target) return;
    revealDestination(target);
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      queueScroll();
    });
  }
  window.addEventListener('hashchange', revealHash);
  requestAnimationFrame(revealHash);

  // A impressão exibe todo o conteúdo e restaura a leitura ao fechar a prévia.
  let collapseBeforePrint = [];
  window.addEventListener('beforeprint', () => {
    collapseBeforePrint = collapseButtons.map(button => [button, button.getAttribute('aria-expanded') === 'true']);
    collapseButtons.forEach(button => setExpanded(button, true));
    syncCollapseAll();
  });
  window.addEventListener('afterprint', () => {
    collapseBeforePrint.forEach(([button, expanded]) => setExpanded(button, expanded));
    syncCollapseAll();
    queueScroll();
  });
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
  const printButton = $('#print-button');
  printButton.addEventListener('click', async () => {
    if (printButton.disabled) return;
    printButton.disabled = true;
    printButton.textContent = 'Preparando…';
    try {
      // Carregar também as imagens fora da tela antes de abrir a impressão.
      await Promise.all($$('img').map(async image => {
        image.loading = 'eager';
        if (image.decode) await image.decode().catch(() => {});
      }));
      await new Promise(resolve => requestAnimationFrame(resolve));
      printButton.disabled = false;
      printButton.textContent = 'Imprimir';
      window.print();
    } finally {
      printButton.disabled = false;
      printButton.textContent = 'Imprimir';
    }
  });
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
  // MOD 3: entrada uniforme dos 13 tópicos; faixas dos 4 blocos têm movimento próprio.
  // Observar a interseção inicial (threshold 0) também atende tópicos muito altos.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('has-entered');
        revealObserver.unobserve(entry.target);
      }
    }), { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    const observeEntry = (item, type) => {
      item.classList.add('reveal-ready');
      if (type) item.classList.add(type);
      if (motionPaused) item.classList.add('has-entered');
      revealObserver.observe(item);
    };
    $$('.chapter > .wrap').forEach(item => observeEntry(item, 'copec-topic-reveal'));
    $$('.copec-block-divider > .wrap').forEach(item => observeEntry(item, 'copec-block-reveal'));
    $$('.copec-articulation-map').forEach(item => observeEntry(item, 'copec-diagram-reveal'));
    $$('.subsection-heading, .wide-takeaway, .decision-quote, .conclusion').forEach(item => observeEntry(item));
  }

  // Cartões de articulação: mouse/foco mostram a conexão; clique/toque fixa a seleção.
  $$('.copec-articulation-map').forEach(diagram => {
    const cards = [...diagram.querySelectorAll('[data-articulation]')];
    const caption = diagram.querySelector('#articulation-status');
    const defaultCaption = caption.textContent;
    const descriptions = {
      interna: 'Articulação interna: Cmt Log, Chefias, COEx e ODS / ODG → COPEC.',
      especifica: 'Articulação específica: referência interforças da COPAC · FAB → COPEC.',
      externa: 'Articulação externa: República Federativa do Brasil → COPEC.'
    };
    let selected = '';
    const highlight = key => {
      diagram.dataset.active = key;
      cards.forEach(card => card.classList.toggle('is-highlighted', card.dataset.articulation === key));
    };
    const select = key => {
      selected = key;
      cards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.articulation === selected)));
      caption.textContent = descriptions[selected] || defaultCaption;
      highlight(selected);
    };
    diagram.querySelector('.articulation-hint').hidden = false;
    cards.forEach(card => {
      card.disabled = false;
      card.addEventListener('pointerenter', () => highlight(card.dataset.articulation));
      card.addEventListener('pointerleave', () => highlight(selected));
      card.addEventListener('focus', () => highlight(card.dataset.articulation));
      card.addEventListener('blur', () => highlight(selected));
      card.addEventListener('click', () => select(selected === card.dataset.articulation ? '' : card.dataset.articulation));
      card.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); select(''); }
      });
    });
  });

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
    const action = expanded ? 'Recolher Menu Lateral' : 'Exibir Menu Lateral';
    [menu, navToggle].forEach(button => {
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
    });
    menu.querySelector('.menu-label').textContent = action;
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
  const scrollTargets = $$('.section, .copec-block-divider');
  let scrollQueued = false;
  function updateScroll() {
    const available = document.documentElement.scrollHeight - innerHeight;
    $('#page-progress').style.width = `${available > 0 ? Math.min(100, Math.round(scrollY / available * 100)) : 0}%`;
    let active = 'inicio';
    scrollTargets.forEach(section => { if (section.getClientRects().length && section.getBoundingClientRect().top < 180) active = section.id; });
    const activeBlock = document.getElementById(active).dataset.block;
    $$('.nav-block').forEach(group => group.classList.toggle('is-current', group.dataset.block === activeBlock));
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
    number: section.dataset.number || String(index + 1),
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
      const number = document.createElement('span'); number.textContent = section.number;
      const content = document.createElement('span');
      const label = document.createElement('strong'); label.textContent = section.label;
      const title = document.createElement('small'); title.textContent = section.title;
      content.append(label, title); result.append(number, content);
      result.addEventListener('click', () => {
        const target = document.getElementById(section.id);
        revealDestination(target);
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
