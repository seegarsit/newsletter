(function () {
  function replaceTokens(template, replacements) {
    return Object.keys(replacements).reduce(
      (output, key) => output.replaceAll(key, replacements[key]),
      template
    );
  }

  function updateCount(container, selector, inputName) {
    const countInput = container.querySelector(`input[name='${inputName}']`);
    if (countInput) {
      countInput.value = container.querySelectorAll(selector).length;
    }
  }

  document.querySelectorAll('[data-add-card]').forEach((button) => {
    button.addEventListener('click', () => {
      const module = button.closest('[data-module]');
      const moduleIndex = module.dataset.moduleIndex;
      const list = module.querySelector('[data-card-list]');
      const template = document.getElementById('editorial-card-template');
      const index = list.querySelectorAll('[data-card]').length;
      const html = replaceTokens(template.innerHTML, {
        '__module__': moduleIndex,
        '__index__': index,
      });
      list.insertAdjacentHTML('beforeend', html);
      updateCount(module, '[data-card]', `module-${moduleIndex}-cards-count`);
    });
  });

  document.querySelectorAll('[data-add-birthday]').forEach((button) => {
    button.addEventListener('click', () => {
      const module = button.closest('[data-module]');
      const moduleIndex = module.dataset.moduleIndex;
      const list = module.querySelector('[data-birthday-list]');
      const template = document.getElementById('birthday-template');
      const index = list.querySelectorAll('[data-birthday]').length;
      const html = replaceTokens(template.innerHTML, {
        '__module__': moduleIndex,
        '__index__': index,
      });
      list.insertAdjacentHTML('beforeend', html);
      updateCount(module, '[data-birthday]', `module-${moduleIndex}-birthdays-count`);
    });
  });

  document.querySelectorAll('[data-add-anniversary]').forEach((button) => {
    button.addEventListener('click', () => {
      const module = button.closest('[data-module]');
      const moduleIndex = module.dataset.moduleIndex;
      const list = module.querySelector('[data-anniversary-list]');
      const template = document.getElementById('anniversary-template');
      const index = list.querySelectorAll('[data-anniversary]').length;
      const html = replaceTokens(template.innerHTML, {
        '__module__': moduleIndex,
        '__index__': index,
      });
      list.insertAdjacentHTML('beforeend', html);
      updateCount(
        module,
        '[data-anniversary]',
        `module-${moduleIndex}-anniversaries-count`
      );
    });
  });

  document.querySelectorAll('[data-add-contributor]').forEach((button) => {
    button.addEventListener('click', () => {
      const module = button.closest('[data-module]');
      const moduleIndex = module.dataset.moduleIndex;
      const list = module.querySelector('[data-contributor-list]');
      const template = document.getElementById('contributor-template');
      const index = list.querySelectorAll('[data-contributor]').length;
      const html = replaceTokens(template.innerHTML, {
        '__module__': moduleIndex,
        '__index__': index,
      });
      list.insertAdjacentHTML('beforeend', html);
      updateCount(module, '[data-contributor]', `module-${moduleIndex}-people-count`);
    });
  });

  document.querySelectorAll('[data-add-group]').forEach((button) => {
    button.addEventListener('click', () => {
      const module = button.closest('[data-module]');
      const moduleIndex = module.dataset.moduleIndex;
      const list = module.querySelector('[data-group-list]');
      const template = document.getElementById('group-template');
      const index = list.querySelectorAll('[data-group]').length;
      const html = replaceTokens(template.innerHTML, {
        '__module__': moduleIndex,
        '__index__': index,
      });
      list.insertAdjacentHTML('beforeend', html);
      updateCount(module, '[data-group]', `module-${moduleIndex}-groups-count`);
    });
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-link]');
    if (!button) return;

    const module = button.closest('[data-module]');
    const moduleIndex = module.dataset.moduleIndex;
    const group = button.closest('[data-group]');
    const groupIndex = group.dataset.groupIndex;
    const list = group.querySelector('[data-link-list]');
    const template = document.getElementById('link-template');
    const index = list.querySelectorAll('[data-link]').length;
    const html = replaceTokens(template.innerHTML, {
      '__module__': moduleIndex,
      '__group__': groupIndex,
      '__index__': index,
    });
    list.insertAdjacentHTML('beforeend', html);
    updateCount(
      group,
      '[data-link]',
      `module-${moduleIndex}-group-${groupIndex}-links-count`
    );
  });
})();
