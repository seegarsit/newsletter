(function () {
  const toolbar = document.querySelector('[data-inline-toolbar]');
  const body = document.body;
  const staticBase = body.dataset.staticBase || '/assets/';
  const toggleButton = toolbar?.querySelector('[data-inline-toggle]');
  const saveButton = toolbar?.querySelector('[data-inline-save]');
  const publishButton = toolbar?.querySelector('[data-inline-publish]');
  const cancelButton = toolbar?.querySelector('[data-inline-cancel]');
  const draftStatus = toolbar?.querySelector('[data-draft-status]');
  const publishedStatus = toolbar?.querySelector('[data-published-status]');
  const richToolbar = document.querySelector('[data-rich-toolbar]');
  const textStylePanel = document.querySelector('[data-text-style-panel]');
  const textStyleColor = document.querySelector('[data-text-style-color]');
  const textStyleSize = document.querySelector('[data-text-style-size]');
  const textStyleReset = document.querySelector('[data-text-style-reset]');
  const textStyleBackground = document.querySelector('[data-style-background]');
  const imageInput = document.querySelector('[data-image-input]');
  const editorialGrid = document.querySelector('[data-editorial-grid]');

  let originalData = null;
  let draftData = null;
  let editMode = false;
  let activeEditable = null;
  let activeStyleTarget = null;
  let activeStylePath = null;
  let activeStyleMode = null;
  let pendingImageAction = null;
  let draggingCard = null;

  const themeTokens = {
    ink: '--ink',
    ink_muted: '--ink-muted',
    ink_soft: '--ink-soft',
    accent: '--accent',
    accent_strong: '--accent-strong',
    surface: '--surface',
    surface_alt: '--surface-alt',
    card: '--card',
    highlight: '--highlight',
    highlight_text: '--highlight-text',
  };

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function formatTimestamp(value) {
    if (!value) return 'Not yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Not yet';
    }
    return date.toLocaleString();
  }

  function updateStatus(meta) {
    if (draftStatus) {
      draftStatus.textContent = `Last draft saved: ${formatTimestamp(
        meta?.draft_updated_at || meta?.draftUpdatedAt
      )}`;
    }
    if (publishedStatus) {
      publishedStatus.textContent = `Last published: ${formatTimestamp(
        meta?.published_at || meta?.publishedAt
      )}`;
    }
  }

  function findModule(data, moduleId) {
    if (!data || !Array.isArray(data.modules)) return null;
    return data.modules.find((module) => module.id === moduleId);
  }

  function findModuleByType(data, moduleType) {
    if (!data || !Array.isArray(data.modules)) return null;
    return data.modules.find((module) => module.type === moduleType);
  }

  function findResourceModule(data) {
    return findModule(data, 'resource_hub') || findModuleByType(data, 'resource_hub');
  }

  function getByPath(data, path) {
    const segments = path.split('.');
    let current = data;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (!current) return null;
      if (segment === 'modules') {
        const moduleId = segments[++i];
        current = findModule(data, moduleId);
        continue;
      }
      if (segment === 'cards') {
        const cardId = segments[++i];
        current = (current.cards || []).find((card) => card.id === cardId);
        continue;
      }
      if (Array.isArray(current)) {
        current = current[Number(segment)];
        continue;
      }
      current = current[segment];
    }
    return current;
  }

  function setByPath(data, path, value) {
    const segments = path.split('.');
    let current = data;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i];
      if (segment === 'modules') {
        const moduleId = segments[++i];
        current = findModule(data, moduleId);
        continue;
      }
      if (segment === 'cards') {
        const cardId = segments[++i];
        current = (current.cards || []).find((card) => card.id === cardId);
        continue;
      }
      if (Array.isArray(current)) {
        current = current[Number(segment)];
        continue;
      }
      current = current[segment];
    }
    const lastKey = segments[segments.length - 1];
    if (Array.isArray(current)) {
      current[Number(lastKey)] = value;
    } else if (current) {
      current[lastKey] = value;
    }
  }

  function applyTheme(theme) {
    if (!theme) return;
    Object.entries(themeTokens).forEach(([token, cssVar]) => {
      const value = theme[token];
      if (value) {
        body.style.setProperty(cssVar, value);
      }
    });
  }

  function applyTextStyle(element, style) {
    if (!element) return;
    element.style.color = style?.color || '';
    element.style.fontSize = style?.font_size || '';
  }

  function applyElementStyle(element, style) {
    if (!element) return;
    element.style.backgroundColor = style?.background_color || '';
    element.style.color = style?.text_color || '';
  }

  function getMediaItems(card) {
    return Array.isArray(card?.media) ? card.media : [];
  }

  function getMediaPath(item) {
    return item?.path || item?.src || '';
  }


  function isPdfFile(path) {
    return path?.toLowerCase().endsWith('.pdf');
  }

  function buildMediaItemsData(mediaItems) {
    return mediaItems
      .map((media) => {
        const mediaPath = getMediaPath(media);
        if (!mediaPath) return null;
        return {
          src: `${staticBase}${mediaPath}`,
          alt: media?.alt || '',
          type: isPdfFile(mediaPath) ? 'pdf' : 'image',
        };
      })
      .filter(Boolean);
  }

  function createMediaFooter(card, moduleId) {
    const mediaItems = getMediaItems(card);
    if (!mediaItems.length) return null;

    const mediaData = buildMediaItemsData(mediaItems);
    if (!mediaData.length) return null;

    const footer = document.createElement('div');
    footer.className = 'editorial-card__media-footer';
    footer.dataset.mediaItems = JSON.stringify(mediaData);

    const grid = document.createElement('div');
    grid.className = 'editorial-card__media-grid';

    if (mediaData.length === 1) {
      footer.classList.add('editorial-card__media-footer--single');
    } else if (mediaData.length > 4) {
      footer.classList.add('editorial-card__media-footer--overflow');
    } else {
      footer.classList.add('editorial-card__media-footer--grid');
    }

    const displayItems = mediaData.length > 4 ? mediaData.slice(0, 4) : mediaData;
    displayItems.forEach((media, index) => {
      const mediaItem = document.createElement('div');
      mediaItem.className = 'editorial-card__media-item';

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'editorial-card__media-thumb';
      trigger.dataset.editorialMediaTrigger = 'true';
      trigger.dataset.mediaIndex = String(index);
      trigger.dataset.moduleId = moduleId;
      trigger.dataset.cardId = card.id;
      trigger.setAttribute('aria-label', media.alt || 'Open media preview');
      attachEditorialMediaListeners(trigger);

      if (media.type === 'pdf') {
        const placeholder = document.createElement('span');
        placeholder.className = 'editorial-card__media-placeholder';
        placeholder.textContent = 'PDF';
        trigger.appendChild(placeholder);
      } else {
        const img = document.createElement('img');
        img.src = media.src;
        img.alt = media.alt;
        img.loading = 'lazy';
        trigger.appendChild(img);
      }

      mediaItem.appendChild(trigger);

      if (editMode) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className =
          'inline-remove-button inline-remove-button--compact editorial-card__media-remove';
        removeButton.dataset.mediaRemove = 'true';
        removeButton.dataset.moduleId = moduleId;
        removeButton.dataset.cardId = card.id;
        removeButton.dataset.mediaIndex = String(index);
        removeButton.textContent = 'Remove';
        mediaItem.appendChild(removeButton);
      }

      grid.appendChild(mediaItem);
    });

    if (mediaData.length > 4) {
      const moreItem = document.createElement('div');
      moreItem.className = 'editorial-card__media-item editorial-card__media-item--more';
      const moreButton = document.createElement('button');
      moreButton.type = 'button';
      moreButton.className = 'editorial-card__media-thumb editorial-card__media-thumb--more';
      moreButton.dataset.editorialMediaTrigger = 'true';
      moreButton.dataset.mediaIndex = '4';
      moreButton.dataset.moduleId = moduleId;
      moreButton.dataset.cardId = card.id;
      moreButton.setAttribute('aria-label', `Open ${mediaData.length - 4} more media items`);
      moreButton.textContent = `+${mediaData.length - 4} more`;
      attachEditorialMediaListeners(moreButton);
      moreItem.appendChild(moreButton);
      grid.appendChild(moreItem);
    }

    footer.appendChild(grid);

    if (editMode) {
      const controls = document.createElement('div');
      controls.className = 'editorial-card__media-controls';

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'inline-add-button inline-add-button--compact';
      addButton.dataset.mediaAdd = 'true';
      addButton.dataset.moduleId = moduleId;
      addButton.dataset.cardId = card.id;
      addButton.textContent = 'Add image';
      controls.appendChild(addButton);

      footer.appendChild(controls);
    }

    return footer;
  }

  const editorialLightbox = document.querySelector('[data-editorial-lightbox]');
  const editorialLightboxContent = editorialLightbox?.querySelector(
    '[data-editorial-lightbox-content]'
  );
  const editorialLightboxTitle = editorialLightbox?.querySelector(
    '[data-editorial-lightbox-title]'
  );
  const editorialLightboxPrev = editorialLightbox?.querySelector(
    '[data-editorial-lightbox-prev]'
  );
  const editorialLightboxNext = editorialLightbox?.querySelector(
    '[data-editorial-lightbox-next]'
  );
  const editorialLightboxClose = Array.from(
    editorialLightbox?.querySelectorAll('[data-editorial-lightbox-close]') || []
  );
  const editorialLightboxCloseButton = editorialLightbox?.querySelector(
    '.editorial-lightbox__close'
  );
  const editorialLightboxRemove = editorialLightbox?.querySelector(
    '[data-editorial-lightbox-remove]'
  );
  let activeEditorialMedia = [];
  let activeEditorialIndex = 0;
  let activeEditorialTrigger = null;
  let activeEditorialModuleId = null;
  let activeEditorialCardId = null;
  let lastMediaPointerUp = 0;

  function renderEditorialLightbox() {
    if (!editorialLightboxContent || !activeEditorialMedia.length) return;
    const item = activeEditorialMedia[activeEditorialIndex];
    editorialLightboxContent.innerHTML = '';

    if (editorialLightboxTitle) {
      editorialLightboxTitle.textContent = `Media ${activeEditorialIndex + 1} of ${activeEditorialMedia.length}`;
    }

    if (item.type === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = item.src;
      iframe.title = item.alt || 'Media document';
      iframe.loading = 'lazy';
      editorialLightboxContent.appendChild(iframe);
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      img.loading = 'lazy';
      editorialLightboxContent.appendChild(img);
    }

    if (editorialLightboxPrev) {
      editorialLightboxPrev.disabled = activeEditorialMedia.length <= 1;
    }
    if (editorialLightboxNext) {
      editorialLightboxNext.disabled = activeEditorialMedia.length <= 1;
    }
    if (editorialLightboxRemove) {
      editorialLightboxRemove.hidden = !editMode;
    }
  }

  function openEditorialLightbox(items, index, trigger) {
    if (!editorialLightbox || !Array.isArray(items) || items.length === 0) return;
    activeEditorialMedia = items;
    activeEditorialIndex = Math.max(0, Math.min(index, items.length - 1));
    activeEditorialTrigger = trigger;
    activeEditorialModuleId = trigger?.dataset.moduleId || null;
    activeEditorialCardId = trigger?.dataset.cardId || null;
    renderEditorialLightbox();
    editorialLightbox.removeAttribute('hidden');
    requestAnimationFrame(() => {
      editorialLightbox.classList.add('is-active');
    });
    editorialLightbox.setAttribute('aria-hidden', 'false');
    body.classList.add('is-lightbox-open');
    editorialLightboxCloseButton?.focus();
  }

  function closeEditorialLightbox() {
    if (!editorialLightbox || editorialLightbox.hasAttribute('hidden')) return;
    editorialLightbox.classList.remove('is-active');
    editorialLightbox.setAttribute('aria-hidden', 'true');
    body.classList.remove('is-lightbox-open');

    const onTransitionEnd = () => {
      editorialLightbox.setAttribute('hidden', '');
      editorialLightbox.removeEventListener('transitionend', onTransitionEnd);
      if (editorialLightboxContent) {
        editorialLightboxContent.innerHTML = '';
      }
      if (activeEditorialTrigger) {
        activeEditorialTrigger.focus();
        activeEditorialTrigger = null;
      }
      activeEditorialModuleId = null;
      activeEditorialCardId = null;
    };

    editorialLightbox.addEventListener('transitionend', onTransitionEnd);

    setTimeout(() => {
      if (!editorialLightbox.hasAttribute('hidden')) {
        editorialLightbox.setAttribute('hidden', '');
        if (editorialLightboxContent) {
          editorialLightboxContent.innerHTML = '';
        }
        if (activeEditorialTrigger) {
          activeEditorialTrigger.focus();
          activeEditorialTrigger = null;
        }
        activeEditorialModuleId = null;
        activeEditorialCardId = null;
      }
    }, 350);
  }

  function moveEditorialLightbox(step) {
    if (!activeEditorialMedia.length) return;
    activeEditorialIndex =
      (activeEditorialIndex + step + activeEditorialMedia.length) % activeEditorialMedia.length;
    renderEditorialLightbox();
  }

  function removeEditorialLightboxItem() {
    if (!editMode || !draftData || !activeEditorialModuleId || !activeEditorialCardId) return;
    const module = findModule(draftData, activeEditorialModuleId);
    const card = module?.cards?.find((item) => item.id === activeEditorialCardId);
    if (!card) return;
    const items = getMediaItems(card);
    if (!items.length) return;
    items.splice(activeEditorialIndex, 1);
    card.media = items;
    renderEditorial(module);
    if (!items.length) {
      closeEditorialLightbox();
      return;
    }
    activeEditorialMedia = buildMediaItemsData(items);
    if (activeEditorialIndex >= activeEditorialMedia.length) {
      activeEditorialIndex = activeEditorialMedia.length - 1;
    }
    renderEditorialLightbox();
  }

  function getMediaItemsFromFooter(trigger) {
    const footer = trigger.closest('.editorial-card__media-footer');
    const itemsRaw = footer?.dataset.mediaItems;
    if (!itemsRaw) return [];
    try {
      return JSON.parse(itemsRaw);
    } catch (error) {
      console.error('Unable to parse editorial media items', error);
      return [];
    }
  }

  function handleEditorialMediaTrigger(event, trigger) {
    event.preventDefault();
    event.stopPropagation();
    const items = getMediaItemsFromFooter(trigger);
    if (!items.length) return;
    const index = Number(trigger.dataset.mediaIndex || 0);
    openEditorialLightbox(items, Number.isNaN(index) ? 0 : index, trigger);
  }

  function attachEditorialMediaListeners(trigger) {
    if (!trigger) return;
    trigger.addEventListener('pointerup', (event) => {
      if (event.pointerType && event.pointerType !== 'touch') return;
      lastMediaPointerUp = Date.now();
      handleEditorialMediaTrigger(event, trigger);
    });

    trigger.addEventListener('click', (event) => {
      if (Date.now() - lastMediaPointerUp < 500) return;
      handleEditorialMediaTrigger(event, trigger);
    });
  }

  function rgbToHex(value) {
    if (!value) return '';
    if (value.startsWith('#')) return value;
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return '';
    const hex = match
      .slice(1, 4)
      .map((segment) => Number(segment).toString(16).padStart(2, '0'))
      .join('');
    return `#${hex}`;
  }

  function getTextStyles(data) {
    return data?.hero?.text_styles || {};
  }

  function ensureTextStyles(data) {
    if (!data.hero.text_styles) {
      data.hero.text_styles = {};
    }
    return data.hero.text_styles;
  }

  function getElementStyles(data) {
    return data?.hero?.element_styles || {};
  }

  function ensureElementStyles(data) {
    if (!data.hero.element_styles) {
      data.hero.element_styles = {};
    }
    return data.hero.element_styles;
  }

  function getCurrentElementStyles() {
    return getElementStyles(draftData || originalData || {});
  }

  function populateTextStyleInputs(element) {
    if (!element || !draftData) return;
    const styles = getTextStyles(draftData);
    const current = styles[element.dataset.editPath] || {};
    const computed = window.getComputedStyle(element);
    if (textStyleSize) {
      const sizeValue = current.font_size || computed.fontSize || '';
      const numeric = parseFloat(sizeValue);
      textStyleSize.value = Number.isNaN(numeric) ? '' : numeric;
    }
    if (textStyleColor) {
      textStyleColor.value = current.color || rgbToHex(computed.color) || '#000000';
    }
  }

  function populateElementStyleInputs(element) {
    if (!element || !draftData) return;
    const styles = getElementStyles(draftData);
    const current = styles[element.dataset.stylePath] || {};
    const computed = window.getComputedStyle(element);
    if (textStyleColor) {
      textStyleColor.value = current.text_color || rgbToHex(computed.color) || '#000000';
    }
    if (textStyleBackground) {
      textStyleBackground.value =
        current.background_color || rgbToHex(computed.backgroundColor) || '#ffffff';
    }
  }

  function positionTextStylePanel(element) {
    if (!textStylePanel || !element) return;
    const rect = element.getBoundingClientRect();
    const panelRect = textStylePanel.getBoundingClientRect();
    const margin = 16;
    const toolbarHeight =
      document.querySelector('[data-inline-toolbar]')?.getBoundingClientRect().height || 0;
    let top = rect.top;
    if (top + panelRect.height > window.innerHeight - margin) {
      top = window.innerHeight - panelRect.height - margin;
    }
    top = Math.max(toolbarHeight + margin, top);
    textStylePanel.style.top = `${top}px`;
    textStylePanel.style.right = `${margin}px`;
    textStylePanel.style.left = 'auto';
  }

  function setActiveTextStyleTarget(element) {
    if (!textStylePanel || !element || !draftData) return;
    activeStyleTarget = element;
    activeStylePath = element.dataset.editPath;
    activeStyleMode = 'text';
    populateTextStyleInputs(element);
    textStylePanel.dataset.mode = 'text';
    textStylePanel.removeAttribute('hidden');
    positionTextStylePanel(element);
  }

  function setActiveElementStyleTarget(element) {
    if (!textStylePanel || !element || !draftData) return;
    activeStyleTarget = element;
    activeStylePath = element.dataset.stylePath;
    activeStyleMode = 'element';
    populateElementStyleInputs(element);
    textStylePanel.dataset.mode = 'element';
    textStylePanel.removeAttribute('hidden');
    positionTextStylePanel(element);
  }

  function clearActiveTextStyleTarget() {
    activeStyleTarget = null;
    activeStylePath = null;
    activeStyleMode = null;
    textStylePanel?.setAttribute('hidden', '');
  }

  function updateTextStyle(updates) {
    if (!draftData || !activeStylePath || !activeStyleTarget || activeStyleMode !== 'text') return;
    const styles = ensureTextStyles(draftData);
    const next = { ...(styles[activeStylePath] || {}) };
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
    });
    if (Object.keys(next).length === 0) {
      delete styles[activeStylePath];
    } else {
      styles[activeStylePath] = next;
    }
    applyTextStyle(activeStyleTarget, next);
    positionTextStylePanel(activeStyleTarget);
  }

  function updateElementStyle(updates) {
    if (!draftData || !activeStylePath || !activeStyleTarget || activeStyleMode !== 'element') {
      return;
    }
    const styles = ensureElementStyles(draftData);
    const next = { ...(styles[activeStylePath] || {}) };
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
    });
    if (Object.keys(next).length === 0) {
      delete styles[activeStylePath];
    } else {
      styles[activeStylePath] = next;
    }
    applyElementStyle(activeStyleTarget, next);
    positionTextStylePanel(activeStyleTarget);
  }

  function renderHero(data) {
    const heroTitle = document.querySelector('[data-edit-path="hero.title"]');
    const issueMonth = document.querySelector('[data-edit-path="issue_month"]');
    const heroSubtitle = document.querySelector('[data-edit-path="hero.subtitle"]');
    const heroImage = document.querySelector('[data-edit-path="hero.image"]');

    if (heroTitle) heroTitle.textContent = data.hero.title || '';
    if (issueMonth) issueMonth.textContent = data.issue_month || '';
    if (heroSubtitle) {
      const text = data.hero.subtitle || '';
      heroSubtitle.innerHTML = text.replace(/\n/g, '<br />');
    }
    if (heroImage && data.hero.image) {
      heroImage.style.setProperty('--hero-image', `url('${staticBase}${data.hero.image}')`);
    }
  }

  function createEditorialCard(card, moduleId) {
    const article = document.createElement('article');
    const stackedIds = ['team-letter', 'hr-corner', 'tech-talk'];
    const isStacked = stackedIds.includes(card.id);
    article.className = `editorial-card${isStacked ? ' editorial-card--stack' : ''} editorial-card--preset-${card.style_preset || 'default'} editorial-card--align-${card.alignment || 'left'}`;
    article.id = card.id;
    article.setAttribute('aria-labelledby', `${card.id}-title`);
    article.dataset.cardId = card.id;
    article.dataset.stylePath = `modules.${moduleId}.cards.${card.id}.card`;
    applyElementStyle(article, getCurrentElementStyles()[article.dataset.stylePath] || {});

    const header = document.createElement('header');
    header.className = 'editorial-card__header';

    if (card.eyebrow || editMode) {
      const eyebrow = document.createElement('p');
      eyebrow.className = 'editorial-card__eyebrow';
      eyebrow.dataset.editPath = `modules.${moduleId}.cards.${card.id}.eyebrow`;
      eyebrow.textContent = card.eyebrow || '';
      header.appendChild(eyebrow);
    }

    if (card.title || editMode) {
      const title = document.createElement('h3');
      title.id = `${card.id}-title`;
      title.dataset.editPath = `modules.${moduleId}.cards.${card.id}.title`;
      title.textContent = card.title || '';
      header.appendChild(title);
    }

    article.appendChild(header);

    if ((card.body && card.body.content) || editMode) {
      const body = document.createElement('div');
      body.className = 'editorial-card__body';
      body.dataset.editPath = `modules.${moduleId}.cards.${card.id}.body.content`;
      body.dataset.editType = 'rich';
      body.innerHTML = card.body && card.body.content ? card.body.content : '';
      article.appendChild(body);
    }

    let hasActions = false;
    if (card.cta && card.id !== 'tech-talk' && (card.cta.label && card.cta.url || editMode)) {
      const actions = document.createElement('div');
      actions.className = 'editorial-card__actions';
      const link = document.createElement('a');
      link.className = 'button button--primary';
      link.href = card.cta.url || '#';
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.dataset.editUrlPath = `modules.${moduleId}.cards.${card.id}.cta.url`;
      link.dataset.stylePath = `modules.${moduleId}.cards.${card.id}.cta`;
      applyElementStyle(link, getCurrentElementStyles()[link.dataset.stylePath] || {});
      const label = document.createElement('span');
      label.className = 'button__label';
      label.dataset.editPath = `modules.${moduleId}.cards.${card.id}.cta.label`;
      label.textContent = card.cta.label || '';
      link.appendChild(label);
      actions.appendChild(link);

      if (editMode && getMediaItems(card).length === 0) {
        const addMediaButton = document.createElement('button');
        addMediaButton.type = 'button';
        addMediaButton.className = 'inline-add-button inline-add-button--compact';
        addMediaButton.dataset.mediaAdd = 'true';
        addMediaButton.dataset.moduleId = moduleId;
        addMediaButton.dataset.cardId = card.id;
        addMediaButton.textContent = 'Add image';
        actions.appendChild(addMediaButton);
      }

      article.appendChild(actions);
      hasActions = true;
    }

    if (editMode && getMediaItems(card).length === 0 && !hasActions) {
      const controls = document.createElement('div');
      controls.className = 'editorial-card__actions';
      const addMediaButton = document.createElement('button');
      addMediaButton.type = 'button';
      addMediaButton.className = 'inline-add-button inline-add-button--compact';
      addMediaButton.dataset.mediaAdd = 'true';
      addMediaButton.dataset.moduleId = moduleId;
      addMediaButton.dataset.cardId = card.id;
      addMediaButton.textContent = 'Add image';
      controls.appendChild(addMediaButton);
      article.appendChild(controls);
    }

    const mediaFooter = createMediaFooter(card, moduleId);
    if (mediaFooter) {
      article.appendChild(mediaFooter);
    }

    if (editMode) {
      const dragHandle = document.createElement('button');
      dragHandle.type = 'button';
      dragHandle.className = 'editorial-card__drag-handle';
      dragHandle.dataset.dragHandle = 'true';
      dragHandle.setAttribute('aria-label', 'Drag card to reorder');
      dragHandle.setAttribute('draggable', 'true');
      dragHandle.textContent = '↕';
      article.appendChild(dragHandle);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'inline-remove-button';
      removeButton.dataset.inlineRemove = 'editorial-card';
      removeButton.dataset.cardId = card.id;
      removeButton.textContent = 'Remove card';
      article.appendChild(removeButton);
    }

    return article;
  }

  function renderEditorial(module) {
    if (!editorialGrid) return;
    editorialGrid.innerHTML = '';
    module.cards.forEach((card) => {
      editorialGrid.appendChild(createEditorialCard(card, module.id));
    });
  }

  function updateEditorialOrderFromGrid(module) {
    if (!editorialGrid || !module) return;
    const orderedIds = Array.from(
      editorialGrid.querySelectorAll('.editorial-card[data-card-id]')
    ).map((card) => card.dataset.cardId);
    const cardsById = new Map(module.cards.map((card) => [card.id, card]));
    module.cards = orderedIds
      .map((id, index) => {
        const card = cardsById.get(id);
        if (!card) return null;
        card.order = index;
        return card;
      })
      .filter(Boolean);
  }

  function renderCelebrations(module) {
    const birthdaysList = document.querySelector('#birthdays-heading')?.parentElement?.querySelector('.celebrations-list');
    const anniversariesList = document.querySelector('#anniversaries-heading')?.parentElement?.querySelector('.celebrations-list');
    if (!birthdaysList || !anniversariesList) return;

    const splitMeta = (metaValue) =>
      metaValue
        .split(/[·•]/)
        .map((part) => part.trim())
        .filter(Boolean);

    const normalizeBirthday = (item) => {
      if (item.line_one || item.line_two) {
        return { lineOne: item.line_one || '', lineTwo: item.line_two || '' };
      }
      if (item.date || item.weekday || item.office) {
        const lineOne = [item.date, item.weekday].filter(Boolean).join(' • ');
        return { lineOne, lineTwo: item.office || '' };
      }
      if (item.meta) {
        const parts = splitMeta(item.meta);
        const lineOne = parts.slice(0, 2).join(' • ');
        const lineTwo = parts.slice(2).join(' • ');
        return { lineOne, lineTwo };
      }
      return { lineOne: '', lineTwo: '' };
    };

    const normalizeAnniversary = (item) => {
      if (item.line_one || item.line_two) {
        return { lineOne: item.line_one || '', lineTwo: item.line_two || '' };
      }
      if (item.tenure || item.office) {
        return { lineOne: item.tenure || '', lineTwo: item.office || '' };
      }
      if (item.meta) {
        const parts = splitMeta(item.meta);
        const lineOne = parts[0] || '';
        const lineTwo = parts.slice(1).join(' • ');
        return { lineOne, lineTwo };
      }
      return { lineOne: '', lineTwo: '' };
    };

    birthdaysList.innerHTML = '';
    module.birthdays.forEach((birthday, index) => {
      const lines = normalizeBirthday(birthday);
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'celebrations-list__primary';
      name.dataset.editPath = `modules.${module.id}.birthdays.${index}.name`;
      name.textContent = birthday.name || '';
      const lineOne = document.createElement('span');
      lineOne.className = 'celebrations-list__meta';
      lineOne.dataset.editPath = `modules.${module.id}.birthdays.${index}.line_one`;
      lineOne.textContent = lines.lineOne || '';
      const lineTwo = document.createElement('span');
      lineTwo.className = 'celebrations-list__meta';
      lineTwo.dataset.editPath = `modules.${module.id}.birthdays.${index}.line_two`;
      lineTwo.textContent = lines.lineTwo || '';
      li.appendChild(name);
      li.appendChild(lineOne);
      if (lines.lineTwo || editMode) {
        li.appendChild(lineTwo);
      }
      if (editMode) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'inline-remove-button inline-remove-button--compact';
        removeButton.dataset.inlineRemove = 'birthday';
        removeButton.dataset.itemIndex = index;
        removeButton.textContent = 'Remove';
        li.appendChild(removeButton);
      }
      birthdaysList.appendChild(li);
    });

    anniversariesList.innerHTML = '';
    module.anniversaries.forEach((anniversary, index) => {
      const lines = normalizeAnniversary(anniversary);
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'celebrations-list__primary';
      name.dataset.editPath = `modules.${module.id}.anniversaries.${index}.name`;
      name.textContent = anniversary.name || '';
      const lineOne = document.createElement('span');
      lineOne.className = 'celebrations-list__meta';
      lineOne.dataset.editPath = `modules.${module.id}.anniversaries.${index}.line_one`;
      lineOne.textContent = lines.lineOne || '';
      const lineTwo = document.createElement('span');
      lineTwo.className = 'celebrations-list__meta';
      lineTwo.dataset.editPath = `modules.${module.id}.anniversaries.${index}.line_two`;
      lineTwo.textContent = lines.lineTwo || '';
      li.appendChild(name);
      li.appendChild(lineOne);
      if (lines.lineTwo || editMode) {
        li.appendChild(lineTwo);
      }
      if (editMode) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'inline-remove-button inline-remove-button--compact';
        removeButton.dataset.inlineRemove = 'anniversary';
        removeButton.dataset.itemIndex = index;
        removeButton.textContent = 'Remove';
        li.appendChild(removeButton);
      }
      anniversariesList.appendChild(li);
    });
  }

  function renderContributors(module) {
    const grid = document.querySelector('.contributors-grid');
    if (!grid) return;
    grid.innerHTML = '';
    module.people.forEach((person, index) => {
      const card = document.createElement('article');
      card.className = 'contributor-card';
      card.dataset.stylePath = `modules.${module.id}.people.${index}.card`;
      applyElementStyle(card, getCurrentElementStyles()[card.dataset.stylePath] || {});

      if (editMode) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'inline-remove-button inline-remove-button--compact';
        removeButton.dataset.inlineRemove = 'contributor';
        removeButton.dataset.itemIndex = index;
        removeButton.textContent = 'Remove';
        card.appendChild(removeButton);
      }

      const section = document.createElement('p');
      section.className = 'contributor-card__section';
      section.dataset.editPath = `modules.${module.id}.people.${index}.section`;
      section.textContent = person.section || '';

      const media = document.createElement('div');
      media.className = 'contributor-card__media';
      const img = document.createElement('img');
      img.dataset.editPath = `modules.${module.id}.people.${index}.image`;
      img.dataset.editType = 'image';
      img.alt = `Portrait of ${person.name || 'Contributor'}`;
      img.src = `${staticBase}${person.image || 'images/logo_nav.png'}`;
      media.appendChild(img);

      const bodyEl = document.createElement('div');
      bodyEl.className = 'contributor-card__body';
      const name = document.createElement('h3');
      name.className = 'contributor-card__name';
      name.dataset.editPath = `modules.${module.id}.people.${index}.name`;
      name.textContent = person.name || '';
      const title = document.createElement('p');
      title.className = 'contributor-card__title';
      title.dataset.editPath = `modules.${module.id}.people.${index}.title`;
      title.textContent = person.title || '';
      bodyEl.appendChild(name);
      bodyEl.appendChild(title);

      if (person.secondary || editMode) {
        const secondary = document.createElement('p');
        secondary.className = 'contributor-card__meta';
        secondary.dataset.editPath = `modules.${module.id}.people.${index}.secondary`;
        secondary.textContent = person.secondary || '';
        bodyEl.appendChild(secondary);
      }

      card.appendChild(section);
      card.appendChild(media);
      card.appendChild(bodyEl);
      grid.appendChild(card);
    });
  }

  function renderResources(module) {
    const container = document.querySelector('.resource-buttons');
    if (!container) return;
    module.links = Array.isArray(module.links) ? module.links : [];
    container.innerHTML = '';
    module.links.forEach((link, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'resource-button-wrapper';

      const anchor = document.createElement('a');
      anchor.className = 'resource-button';
      anchor.href = link.url || '#';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.dataset.editUrlPath = `modules.${module.id}.links.${index}.url`;
      anchor.dataset.stylePath = `modules.${module.id}.links.${index}.button`;
      applyElementStyle(anchor, getCurrentElementStyles()[anchor.dataset.stylePath] || {});

      const span = document.createElement('span');
      span.dataset.editPath = `modules.${module.id}.links.${index}.label`;
      span.textContent = link.label || '';
      anchor.appendChild(span);

      wrapper.appendChild(anchor);

      if (editMode) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'inline-remove-button inline-remove-button--compact';
        removeButton.dataset.inlineRemove = 'resource';
        removeButton.dataset.itemIndex = index;
        removeButton.textContent = 'Remove';
        wrapper.appendChild(removeButton);
      }

      container.appendChild(wrapper);
    });
  }

  function normalizeCelebrationsData(data) {
    const celebrations = findModule(data, 'celebrations');
    if (!celebrations) return;
    celebrations.birthdays = (celebrations.birthdays || []).map((birthday) => {
      if (birthday.line_one || birthday.line_two) return birthday;
      if (birthday.date || birthday.weekday || birthday.office) {
        return {
          ...birthday,
          line_one: [birthday.date, birthday.weekday].filter(Boolean).join(' • '),
          line_two: birthday.office || '',
        };
      }
      if (birthday.meta) {
        const parts = birthday.meta
          .split(/[·•]/)
          .map((part) => part.trim())
          .filter(Boolean);
        return {
          ...birthday,
          line_one: parts.slice(0, 2).join(' • '),
          line_two: parts.slice(2).join(' • '),
        };
      }
      return { ...birthday, line_one: '', line_two: '' };
    });
    celebrations.anniversaries = (celebrations.anniversaries || []).map((anniversary) => {
      if (anniversary.line_one || anniversary.line_two) return anniversary;
      if (anniversary.tenure || anniversary.office) {
        return {
          ...anniversary,
          line_one: anniversary.tenure || '',
          line_two: anniversary.office || '',
        };
      }
      if (anniversary.meta) {
        const parts = anniversary.meta
          .split(/[·•]/)
          .map((part) => part.trim())
          .filter(Boolean);
        return {
          ...anniversary,
          line_one: parts[0] || '',
          line_two: parts.slice(1).join(' • '),
        };
      }
      return { ...anniversary, line_one: '', line_two: '' };
    });
  }

  function renderAll(data) {
    normalizeCelebrationsData(data);
    renderHero(data);
    const editorial = findModule(data, 'editorial');
    if (editorial) renderEditorial(editorial);
    const celebrations = findModule(data, 'celebrations');
    if (celebrations) renderCelebrations(celebrations);
    const contributors = findModule(data, 'contributors');
    if (contributors) renderContributors(contributors);
    const resources = findResourceModule(data);
    if (resources) renderResources(resources);
    applyTheme(data.hero.theme || {});
    syncTextStyles(data);
    syncElementStyles(data);
    syncEditableElements(data);
  }

  function syncTextStyles(data) {
    const styles = getTextStyles(data);
    document.querySelectorAll('[data-edit-path]').forEach((element) => {
      const path = element.dataset.editPath;
      const type = element.dataset.editType || 'text';
      if (!path || type === 'image') return;
      applyTextStyle(element, styles[path] || {});
    });
  }

  function syncElementStyles(data) {
    const styles = getElementStyles(data);
    document.querySelectorAll('[data-style-path]').forEach((element) => {
      const path = element.dataset.stylePath;
      if (!path) return;
      applyElementStyle(element, styles[path] || {});
    });
  }

  function syncEditableElements(data) {
    document.querySelectorAll('[data-edit-path]').forEach((element) => {
      const path = element.dataset.editPath;
      if (!path) return;
      const value = getByPath(data, path);
      const type = element.dataset.editType || 'text';
      if (type === 'rich') {
        element.innerHTML = value || '';
      } else if (type === 'multiline') {
        element.innerHTML = (value || '').replace(/\n/g, '<br />');
      } else if (type === 'image') {
        const imgValue = value || '';
        if (element.tagName === 'IMG') {
          element.src = `${staticBase}${imgValue}`;
        } else {
          element.style.setProperty('--hero-image', `url('${staticBase}${imgValue}')`);
        }
      } else {
        element.textContent = value || '';
      }
    });

    document.querySelectorAll('[data-edit-url-path]').forEach((element) => {
      const path = element.dataset.editUrlPath;
      if (!path) return;
      const value = getByPath(data, path);
      if (value) {
        element.setAttribute('href', value);
      }
    });
  }

  function setEditable(element, type) {
    if (activeEditable && activeEditable !== element) {
      activeEditable.removeAttribute('contenteditable');
    }
    activeEditable = element;
    if (type === 'rich') {
      element.setAttribute('contenteditable', 'true');
      richToolbar?.removeAttribute('hidden');
    } else if (type === 'multiline') {
      element.setAttribute('contenteditable', 'true');
      element.style.whiteSpace = 'pre-line';
      richToolbar?.setAttribute('hidden', '');
    } else {
      element.setAttribute('contenteditable', 'true');
      richToolbar?.setAttribute('hidden', '');
    }
    element.focus();
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function handlePaste(event) {
    if (!editMode || !activeEditable) return;
    const type = activeEditable.dataset.editType || 'text';
    const clipboard = event.clipboardData || window.clipboardData;
    const text = clipboard?.getData('text/plain');
    if (!text && text !== '') return;
    event.preventDefault();
    if (type === 'rich') {
      const html = escapeHtml(text).replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, html);
      return;
    }
    document.execCommand('insertText', false, text);
  }

  function handleEditableBlur(element) {
    const path = element.dataset.editPath;
    const type = element.dataset.editType || 'text';
    if (!path || !draftData) return;

    let value = '';
    if (type === 'rich') {
      value = element.innerHTML.trim();
    } else if (type === 'multiline') {
      value = element.innerText.replace(/\u00a0/g, ' ').trim();
    } else {
      value = element.textContent.trim();
    }
    setByPath(draftData, path, value);
  }

  function toggleEditMode(force) {
    editMode = typeof force === 'boolean' ? force : !editMode;
    body.classList.toggle('inline-editing', editMode);
    if (toggleButton) {
      toggleButton.textContent = `Edit Mode: ${editMode ? 'On' : 'Off'}`;
    }
    if (!editMode) {
      document.querySelectorAll('[contenteditable="true"]').forEach((el) => {
        el.removeAttribute('contenteditable');
      });
      richToolbar?.setAttribute('hidden', '');
      activeEditable = null;
      clearActiveTextStyleTarget();
    }
    renderAll(draftData || originalData);
  }

  async function fetchCurrent() {
    const response = await fetch('/admin/api/current');
    if (!response.ok) return;
    const data = await response.json();
    const content = data.content || data;
    originalData = cloneData(content);
    draftData = cloneData(content);
    updateStatus(data);
    renderAll(draftData);
  }

  async function saveChanges() {
    if (!draftData) return;
    const response = await fetch('/admin/api/current/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftData),
    });
    if (!response.ok) return;
    const data = await response.json();
    const content = data.content || draftData;
    originalData = cloneData(content);
    draftData = cloneData(content);
    updateStatus(data);
    toggleEditMode(false);
  }

  async function publishChanges() {
    if (!draftData) return;
    const confirmed = window.confirm(
      'Publish this draft to the live site? This will update what everyone sees.'
    );
    if (!confirmed) return;
    const response = await fetch('/admin/api/current/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftData),
    });
    if (!response.ok) return;
    const data = await response.json();
    const content = data.content || draftData;
    originalData = cloneData(content);
    draftData = cloneData(content);
    updateStatus(data);
    toggleEditMode(false);
  }

  function cancelChanges() {
    if (!originalData) return;
    draftData = cloneData(originalData);
    renderAll(draftData);
    toggleEditMode(false);
  }

  function handleImageClick(target) {
    if (!imageInput) return;
    pendingImageAction = { type: 'single', path: target.dataset.editPath };
    imageInput.click();
  }

  function formatAltFromFilename(filename) {
    if (!filename) return '';
    return filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch('/admin/upload-image', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.path;
  }

  function ensureEditableClick(event) {
    if (!editMode) return;
    if (
      event.target.closest('[data-text-style-panel]') ||
      event.target.closest('[data-rich-toolbar]') ||
      event.target.closest('[data-inline-toolbar]')
    ) {
      return;
    }
    const target = event.target.closest(
      '[data-edit-path], [data-edit-url-path], [data-style-path]'
    );
    if (!target) {
      if (activeEditable) {
        activeEditable.removeAttribute('contenteditable');
        activeEditable = null;
      }
      richToolbar?.setAttribute('hidden', '');
      clearActiveTextStyleTarget();
      return;
    }

    if (target.closest('a')) {
      event.preventDefault();
    }

    const urlPath = target.dataset.editUrlPath;
    if (urlPath) {
      event.preventDefault();
      const currentValue = getByPath(draftData, urlPath) || '';
      const next = window.prompt('Enter URL', currentValue);
      if (next !== null) {
        setByPath(draftData, urlPath, next.trim());
        target.setAttribute('href', next.trim());
      }
      return;
    }

    if (target.dataset.stylePath && !target.dataset.editPath) {
      setActiveElementStyleTarget(target);
      return;
    }

    const type = target.dataset.editType || 'text';
    if (type === 'image') {
      event.preventDefault();
      handleImageClick(target);
      return;
    }

    setActiveTextStyleTarget(target);
    setEditable(target, type);
  }

  function handleAddAction(type) {
    if (!draftData) return;
    if (type === 'editorial-card') {
      const module = findModule(draftData, 'editorial');
      if (!module) return;
      const id = `card-${Date.now()}`;
      module.cards.push({
        id,
        eyebrow: 'Card heading',
        title: 'Article heading',
        body: { content: 'Article text', mode: 'rich' },
        cta: { label: '', url: '' },
        order: module.cards.length,
        style_preset: 'default',
        alignment: 'left',
        media: [],
      });
      renderEditorial(module);
    }
    if (type === 'birthday') {
      const module = findModule(draftData, 'celebrations');
      if (!module) return;
      module.birthdays.push({
        name: 'New teammate',
        line_one: 'MM/DD',
        line_two: 'Location',
      });
      renderCelebrations(module);
    }
    if (type === 'anniversary') {
      const module = findModule(draftData, 'celebrations');
      if (!module) return;
      module.anniversaries.push({
        name: 'New teammate',
        line_one: 'MM/DD',
        line_two: 'Location',
      });
      renderCelebrations(module);
    }
    if (type === 'contributor') {
      const module = findModule(draftData, 'contributors');
      if (!module) return;
      module.people.push({
        section: 'Section',
        name: 'Name',
        title: 'Title',
        image: 'images/logo_nav.png',
      });
      renderContributors(module);
    }
    if (type === 'resource') {
      const module = findResourceModule(draftData);
      if (!module) return;
      module.links = Array.isArray(module.links) ? module.links : [];
      module.links.push({ label: 'New link', url: '' });
      renderResources(module);
    }
  }

  function handleRemoveAction(type, index, cardId) {
    if (!draftData) return;
    if (type === 'editorial-card') {
      const module = findModule(draftData, 'editorial');
      if (!module) return;
      module.cards = module.cards.filter((card) => card.id !== cardId);
      renderEditorial(module);
    }
    if (type === 'birthday') {
      const module = findModule(draftData, 'celebrations');
      if (!module) return;
      module.birthdays.splice(index, 1);
      renderCelebrations(module);
    }
    if (type === 'anniversary') {
      const module = findModule(draftData, 'celebrations');
      if (!module) return;
      module.anniversaries.splice(index, 1);
      renderCelebrations(module);
    }
    if (type === 'contributor') {
      const module = findModule(draftData, 'contributors');
      if (!module) return;
      module.people.splice(index, 1);
      renderContributors(module);
    }
    if (type === 'resource') {
      const module = findResourceModule(draftData);
      if (!module) return;
      module.links.splice(index, 1);
      renderResources(module);
    }
  }

  toggleButton?.addEventListener('click', () => toggleEditMode());
  saveButton?.addEventListener('click', saveChanges);
  publishButton?.addEventListener('click', publishChanges);
  cancelButton?.addEventListener('click', cancelChanges);
  document.addEventListener('click', (event) => {
    const mediaAddButton = event.target.closest('[data-media-add]');
    if (mediaAddButton) {
      event.preventDefault();
      if (!editMode) {
        toggleEditMode(true);
      }
      if (!imageInput) return;
      pendingImageAction = {
        type: 'media',
        moduleId: mediaAddButton.dataset.moduleId,
        cardId: mediaAddButton.dataset.cardId,
      };
      imageInput.click();
      return;
    }

    const mediaRemoveButton = event.target.closest('[data-media-remove]');
    if (mediaRemoveButton && editMode && draftData) {
      event.preventDefault();
      const module = findModule(draftData, mediaRemoveButton.dataset.moduleId);
      const card = module?.cards?.find((item) => item.id === mediaRemoveButton.dataset.cardId);
      if (!card) return;
      const index = Number(mediaRemoveButton.dataset.mediaIndex);
      if (!Number.isNaN(index)) {
        const items = getMediaItems(card);
        items.splice(index, 1);
        card.media = items;
        renderEditorial(module);
      }
      return;
    }

    const addButton = event.target.closest('[data-inline-add]');
    if (addButton) {
      event.preventDefault();
      if (!editMode) {
        toggleEditMode(true);
      }
      handleAddAction(addButton.dataset.inlineAdd);
      return;
    }

    const removeButton = event.target.closest('[data-inline-remove]');
    if (removeButton && editMode) {
      event.preventDefault();
      const type = removeButton.dataset.inlineRemove;
      const index = Number(removeButton.dataset.itemIndex || -1);
      const cardId = removeButton.dataset.cardId;
      handleRemoveAction(type, index, cardId);
      return;
    }

    ensureEditableClick(event);
  });

  editorialLightboxPrev?.addEventListener('click', () => {
    moveEditorialLightbox(-1);
  });

  editorialLightboxNext?.addEventListener('click', () => {
    moveEditorialLightbox(1);
  });

  editorialLightboxClose.forEach((closeButton) => {
    closeButton.addEventListener('click', closeEditorialLightbox);
  });

  editorialLightboxRemove?.addEventListener('click', () => {
    removeEditorialLightboxItem();
  });

  document.addEventListener('keydown', (event) => {
    if (!editorialLightbox || editorialLightbox.hasAttribute('hidden')) return;
    if (event.key === 'Escape') {
      closeEditorialLightbox();
    }
    if (event.key === 'ArrowLeft') {
      moveEditorialLightbox(-1);
    }
    if (event.key === 'ArrowRight') {
      moveEditorialLightbox(1);
    }
  });

  editorialGrid?.addEventListener('dragstart', (event) => {
    if (!editMode) return;
    const handle = event.target.closest('[data-drag-handle]');
    if (!handle) return;
    const card = handle.closest('[data-card-id]');
    if (!card) return;
    draggingCard = card;
    card.classList.add('editorial-card--dragging');
    event.dataTransfer?.setData('text/plain', card.dataset.cardId || '');
    event.dataTransfer?.setDragImage(card, 20, 20);
  });

  editorialGrid?.addEventListener('dragover', (event) => {
    if (!editMode || !draggingCard) return;
    event.preventDefault();
    const targetCard = event.target.closest('.editorial-card[data-card-id]');
    if (!targetCard || targetCard === draggingCard) return;
    const rect = targetCard.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    const shouldInsertAfter = offset > rect.height / 2;
    const referenceNode = shouldInsertAfter ? targetCard.nextSibling : targetCard;
    if (referenceNode !== draggingCard) {
      editorialGrid.insertBefore(draggingCard, referenceNode);
    }
  });

  editorialGrid?.addEventListener('drop', (event) => {
    if (!editMode) return;
    event.preventDefault();
    const module = draftData ? findModule(draftData, 'editorial') : null;
    updateEditorialOrderFromGrid(module);
    if (module) renderEditorial(module);
  });

  editorialGrid?.addEventListener('dragend', () => {
    if (draggingCard) {
      draggingCard.classList.remove('editorial-card--dragging');
    }
    draggingCard = null;
  });

  document.addEventListener('blur', (event) => {
    const target = event.target;
    if (target && target.matches('[data-edit-path][contenteditable="true"]')) {
      handleEditableBlur(target);
    }
  }, true);

  document.addEventListener('paste', handlePaste);

  richToolbar?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-rich-command]');
    if (!button || !activeEditable) return;
    const command = button.dataset.richCommand;
    if (command === 'createLink') {
      const url = window.prompt('Enter URL');
      if (url) {
        document.execCommand('createLink', false, url);
      }
      return;
    }
    if (command === 'callout') {
      document.execCommand('insertHTML', false, '<div class="callout">Callout text</div>');
      return;
    }
    document.execCommand(command, false, null);
  });

  textStyleSize?.addEventListener('input', (event) => {
    const value = event.target.value;
    const size = value ? `${Number(value)}px` : '';
    updateTextStyle({ font_size: size });
  });

  textStyleColor?.addEventListener('input', (event) => {
    if (activeStyleMode === 'text') {
      updateTextStyle({ color: event.target.value });
    } else if (activeStyleMode === 'element') {
      updateElementStyle({ text_color: event.target.value });
    }
  });

  textStyleBackground?.addEventListener('input', (event) => {
    updateElementStyle({ background_color: event.target.value });
  });

  textStyleReset?.addEventListener('click', () => {
    if (!draftData || !activeStylePath || !activeStyleTarget) return;
    if (activeStyleMode === 'text') {
      const styles = ensureTextStyles(draftData);
      delete styles[activeStylePath];
      applyTextStyle(activeStyleTarget, {});
      populateTextStyleInputs(activeStyleTarget);
    } else if (activeStyleMode === 'element') {
      const styles = ensureElementStyles(draftData);
      delete styles[activeStylePath];
      applyElementStyle(activeStyleTarget, {});
      populateElementStyleInputs(activeStyleTarget);
    }
  });

  window.addEventListener('resize', () => {
    if (activeStyleTarget) {
      positionTextStylePanel(activeStyleTarget);
    }
  });

  window.addEventListener('scroll', () => {
    if (activeStyleTarget) {
      positionTextStylePanel(activeStyleTarget);
    }
  });

  imageInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || !pendingImageAction || !draftData) return;
    const uploadedPath = await uploadImage(file);
    if (!uploadedPath) return;
    if (pendingImageAction.type === 'single') {
      setByPath(draftData, pendingImageAction.path, uploadedPath);
      renderAll(draftData);
    } else if (pendingImageAction.type === 'media') {
      const module = findModule(draftData, pendingImageAction.moduleId);
      const card = module?.cards?.find((item) => item.id === pendingImageAction.cardId);
      if (card) {
        const items = getMediaItems(card);
        items.push({
          path: uploadedPath,
          alt: formatAltFromFilename(file.name),
        });
        card.media = items;
        renderEditorial(module);
      }
    }
    pendingImageAction = null;
    imageInput.value = '';
  });

  if (toolbar) {
    fetchCurrent();
  }
})();
