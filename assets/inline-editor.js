(function () {
  const toolbar = document.querySelector('[data-inline-toolbar]');
  if (!toolbar) return;

  const body = document.body;
  const staticBase = body.dataset.staticBase || '/assets/';
  const toggleButton = toolbar.querySelector('[data-inline-toggle]');
  const saveButton = toolbar.querySelector('[data-inline-save]');
  const cancelButton = toolbar.querySelector('[data-inline-cancel]');
  const styleButton = toolbar.querySelector('[data-inline-style]');
  const stylePanel = document.querySelector('[data-style-panel]');
  const styleClose = document.querySelector('[data-style-close]');
  const themeInputs = Array.from(document.querySelectorAll('[data-theme-token]'));
  const richToolbar = document.querySelector('[data-rich-toolbar]');
  const textStylePanel = document.querySelector('[data-text-style-panel]');
  const textStyleSize = document.querySelector('[data-text-style-size]');
  const textStyleReset = document.querySelector('[data-text-style-reset]');
  const imageInput = document.querySelector('[data-image-input]');
  const editorialGrid = document.querySelector('[data-editorial-grid]');

  let originalData = null;
  let draftData = null;
  let editMode = false;
  let activeEditable = null;
  let activeStyleTarget = null;
  let activeStylePath = null;
  let pendingImagePath = null;
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

  function findModule(data, moduleId) {
    if (!data || !Array.isArray(data.modules)) return null;
    return data.modules.find((module) => module.id === moduleId);
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

  function getTextStyles(data) {
    return data?.hero?.text_styles || {};
  }

  function ensureTextStyles(data) {
    if (!data.hero.text_styles) {
      data.hero.text_styles = {};
    }
    return data.hero.text_styles;
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
  }

  function setActiveTextStyleTarget(element) {
    if (!textStylePanel || !element || !draftData) return;
    activeStyleTarget = element;
    activeStylePath = element.dataset.editPath;
    populateTextStyleInputs(element);
    textStylePanel.removeAttribute('hidden');
  }

  function clearActiveTextStyleTarget() {
    activeStyleTarget = null;
    activeStylePath = null;
    textStylePanel?.setAttribute('hidden', '');
  }

  function updateTextStyle(updates) {
    if (!draftData || !activeStylePath || !activeStyleTarget) return;
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
    article.draggable = editMode;

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

    if (card.cta && card.cta.label && card.cta.url && card.id !== 'tech-talk') {
      const actions = document.createElement('div');
      actions.className = 'editorial-card__actions';
      const link = document.createElement('a');
      link.className = 'button button--primary';
      link.href = card.cta.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = card.cta.label;
      actions.appendChild(link);
      article.appendChild(actions);
    }

    if (editMode) {
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
    const orderedIds = Array.from(editorialGrid.querySelectorAll('[data-card-id]')).map(
      (card) => card.dataset.cardId
    );
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

    birthdaysList.innerHTML = '';
    module.birthdays.forEach((birthday, index) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'celebrations-list__primary';
      name.dataset.editPath = `modules.${module.id}.birthdays.${index}.name`;
      name.textContent = birthday.name || '';
      const meta = document.createElement('span');
      meta.className = 'celebrations-list__meta';
      meta.dataset.editPath = `modules.${module.id}.birthdays.${index}.meta`;
      meta.textContent = birthday.meta || '';
      li.appendChild(name);
      li.appendChild(meta);
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
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'celebrations-list__primary';
      name.dataset.editPath = `modules.${module.id}.anniversaries.${index}.name`;
      name.textContent = anniversary.name || '';
      const meta = document.createElement('span');
      meta.className = 'celebrations-list__meta';
      meta.dataset.editPath = `modules.${module.id}.anniversaries.${index}.meta`;
      meta.textContent = anniversary.meta || '';
      li.appendChild(name);
      li.appendChild(meta);
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

      card.appendChild(section);
      card.appendChild(media);
      card.appendChild(bodyEl);
      grid.appendChild(card);
    });
  }

  function renderResources(module) {
    const container = document.querySelector('.resource-buttons');
    if (!container) return;
    container.innerHTML = '';
    module.links.forEach((link, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'resource-button-wrapper';

      const anchor = document.createElement('a');
      anchor.className = 'resource-button';
      anchor.href = link.url || '#';
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.dataset.editUrlPath = `modules.${module.id}.links.${index}.url`;

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

  function renderAll(data) {
    renderHero(data);
    const editorial = findModule(data, 'editorial');
    if (editorial) renderEditorial(editorial);
    const celebrations = findModule(data, 'celebrations');
    if (celebrations) renderCelebrations(celebrations);
    const contributors = findModule(data, 'contributors');
    if (contributors) renderContributors(contributors);
    const resources = findModule(data, 'resource_hub');
    if (resources) renderResources(resources);
    applyTheme(data.hero.theme || {});
    syncTextStyles(data);
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
    originalData = cloneData(data);
    draftData = cloneData(data);
    renderAll(draftData);
    populateThemeInputs(draftData.hero.theme || {});
  }

  function populateThemeInputs(theme) {
    themeInputs.forEach((input) => {
      const token = input.dataset.themeToken;
      input.value = theme[token] || '#ffffff';
    });
  }

  async function saveChanges() {
    if (!draftData) return;
    const response = await fetch('/admin/api/current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftData),
    });
    if (response.ok) {
      originalData = cloneData(draftData);
      toggleEditMode(false);
    }
  }

  function cancelChanges() {
    if (!originalData) return;
    draftData = cloneData(originalData);
    renderAll(draftData);
    populateThemeInputs(draftData.hero.theme || {});
    toggleEditMode(false);
  }

  function handleImageClick(target) {
    if (!imageInput) return;
    pendingImagePath = target.dataset.editPath;
    imageInput.click();
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
    const target = event.target.closest('[data-edit-path], [data-edit-url-path]');
    if (!target) return;

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
      });
      renderEditorial(module);
    }
    if (type === 'birthday') {
      const module = findModule(draftData, 'celebrations');
      if (!module) return;
      module.birthdays.push({ name: 'New teammate', meta: '' });
      renderCelebrations(module);
    }
    if (type === 'anniversary') {
      const module = findModule(draftData, 'celebrations');
      if (!module) return;
      module.anniversaries.push({ name: 'New teammate', meta: '' });
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
      const module = findModule(draftData, 'resource_hub');
      if (!module) return;
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
      const module = findModule(draftData, 'resource_hub');
      if (!module) return;
      module.links.splice(index, 1);
      renderResources(module);
    }
  }

  toggleButton?.addEventListener('click', () => toggleEditMode());
  saveButton?.addEventListener('click', saveChanges);
  cancelButton?.addEventListener('click', cancelChanges);
  styleButton?.addEventListener('click', () => {
    if (!stylePanel) return;
    stylePanel.toggleAttribute('hidden');
  });
  styleClose?.addEventListener('click', () => stylePanel?.setAttribute('hidden', ''));

  themeInputs.forEach((input) => {
    input.addEventListener('input', (event) => {
      if (!draftData) return;
      const token = event.target.dataset.themeToken;
      if (!draftData.hero.theme) draftData.hero.theme = {};
      draftData.hero.theme[token] = event.target.value;
      applyTheme(draftData.hero.theme);
    });
  });

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-inline-add]');
    if (addButton && editMode) {
      event.preventDefault();
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

  editorialGrid?.addEventListener('dragstart', (event) => {
    if (!editMode) return;
    const card = event.target.closest('[data-card-id]');
    if (!card) return;
    draggingCard = card;
    card.classList.add('editorial-card--dragging');
    event.dataTransfer?.setData('text/plain', card.dataset.cardId || '');
    event.dataTransfer?.setDragImage(card, 20, 20);
  });

  editorialGrid?.addEventListener('dragover', (event) => {
    if (!editMode || !draggingCard) return;
    event.preventDefault();
    const targetCard = event.target.closest('[data-card-id]');
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

  textStyleReset?.addEventListener('click', () => {
    if (!draftData || !activeStylePath || !activeStyleTarget) return;
    const styles = ensureTextStyles(draftData);
    delete styles[activeStylePath];
    applyTextStyle(activeStyleTarget, {});
    populateTextStyleInputs(activeStyleTarget);
  });

  imageInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || !pendingImagePath || !draftData) return;
    const uploadedPath = await uploadImage(file);
    if (!uploadedPath) return;
    setByPath(draftData, pendingImagePath, uploadedPath);
    renderAll(draftData);
    pendingImagePath = null;
    imageInput.value = '';
  });

  fetchCurrent();
})();
