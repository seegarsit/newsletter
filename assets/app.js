(function () {
  const forms = document.querySelectorAll('.subscribe-form');

  function showFeedback(form, message, isSuccess) {
    const feedback = form.querySelector('.form-feedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.style.color = isSuccess ? '#22c55e' : '#f87171';
  }

  function validateEmail(value) {
    return /.+@.+\..+/.test(value);
  }

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const emailInput = form.querySelector("input[type='email']");

      if (!emailInput) return;

      const email = emailInput.value.trim();
      if (!validateEmail(email)) {
        showFeedback(form, 'Enter a valid company email to subscribe.', false);
        emailInput.focus();
        return;
      }

      showFeedback(form, 'Thanks! Check your inbox for a confirmation email.', true);
      form.reset();
    });
  });

  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const gallery = document.querySelector('[data-news-gallery]');
  const lightbox = document.querySelector('[data-news-lightbox]');

  if (gallery && lightbox) {
    const triggers = Array.from(gallery.querySelectorAll('[data-news-trigger]'));
    const lightboxImage = lightbox.querySelector('[data-news-lightbox-image]');
    const lightboxCaption = lightbox.querySelector('[data-news-lightbox-caption]');
    const closeElements = Array.from(lightbox.querySelectorAll('[data-news-close]'));
    let activeTrigger = null;

    lightbox.setAttribute('aria-hidden', 'true');

    function showLightbox(trigger) {
      if (!lightboxImage || !trigger.dataset.newsImage) {
        return;
      }

      const { newsImage, newsAlt, newsCaption } = trigger.dataset;
      lightboxImage.src = newsImage;
      lightboxImage.alt = newsAlt || '';

      if (lightboxCaption) {
        if (newsCaption) {
          lightboxCaption.textContent = newsCaption;
          lightboxCaption.hidden = false;
        } else {
          lightboxCaption.textContent = '';
          lightboxCaption.hidden = true;
        }
      }

      lightbox.removeAttribute('hidden');
      requestAnimationFrame(() => {
        lightbox.classList.add('is-active');
      });
      lightbox.setAttribute('aria-hidden', 'false');
      activeTrigger = trigger;
    }

    function hideLightbox() {
      if (lightbox.hasAttribute('hidden')) {
        return;
      }

      lightbox.classList.remove('is-active');
      lightbox.setAttribute('aria-hidden', 'true');

      const onTransitionEnd = () => {
        lightbox.setAttribute('hidden', '');
        lightbox.removeEventListener('transitionend', onTransitionEnd);
        if (activeTrigger) {
          activeTrigger.focus();
          activeTrigger = null;
        }
      };

      lightbox.addEventListener('transitionend', onTransitionEnd);

      // Fallback in case transitionend doesn't fire.
      setTimeout(() => {
        if (!lightbox.hasAttribute('hidden')) {
          lightbox.setAttribute('hidden', '');
          if (activeTrigger) {
            activeTrigger.focus();
            activeTrigger = null;
          }
        }
      }, 350);
    }

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        showLightbox(trigger);
      });
    });

    closeElements.forEach((closeEl) => {
      closeEl.addEventListener('click', hideLightbox);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hideLightbox();
      }
    });
  }

  const mediaLightbox = document.querySelector('[data-media-lightbox]');
  const mediaTriggers = document.querySelectorAll('[data-media-trigger]');

  if (mediaLightbox && mediaTriggers.length) {
    const mediaContent = mediaLightbox.querySelector('[data-media-content]');
    const mediaTitle = mediaLightbox.querySelector('[data-media-title]');
    const mediaCloseEls = Array.from(mediaLightbox.querySelectorAll('[data-media-close]'));
    let activeMediaTrigger = null;

    mediaLightbox.setAttribute('aria-hidden', 'true');

    function openMedia(trigger) {
      if (!mediaContent) {
        return;
      }

      let items = [];
      const data = trigger.getAttribute('data-media-items');

      if (data) {
        try {
          items = JSON.parse(data);
        } catch (error) {
          console.error('Unable to parse media items:', error);
        }
      }

      if (!Array.isArray(items) || items.length === 0) {
        return;
      }

      mediaContent.innerHTML = '';

      const heading = trigger.getAttribute('data-media-label') || 'Media preview';

      if (mediaTitle) {
        mediaTitle.textContent = heading;
      }

      items.forEach((item, index) => {
        const figure = document.createElement('figure');
        let element;

        if (item.type === 'pdf') {
          element = document.createElement('iframe');
          element.src = item.src;
          element.title = item.alt || `${heading} document ${index + 1}`;
          element.loading = 'lazy';
        } else {
          element = document.createElement('img');
          element.src = item.src;
          element.alt = item.alt || '';
          element.loading = 'lazy';
        }

        figure.appendChild(element);

        const captionText = item.caption || item.alt;
        if (captionText) {
          const figcaption = document.createElement('figcaption');
          figcaption.textContent = captionText;
          figure.appendChild(figcaption);
        }

        mediaContent.appendChild(figure);
      });

      mediaLightbox.removeAttribute('hidden');
      requestAnimationFrame(() => {
        mediaLightbox.classList.add('is-active');
      });
      mediaLightbox.setAttribute('aria-hidden', 'false');
      activeMediaTrigger = trigger;
    }

    function closeMedia() {
      if (mediaLightbox.hasAttribute('hidden')) {
        return;
      }

      mediaLightbox.classList.remove('is-active');
      mediaLightbox.setAttribute('aria-hidden', 'true');

      const onTransitionEnd = () => {
        mediaLightbox.setAttribute('hidden', '');
        mediaLightbox.removeEventListener('transitionend', onTransitionEnd);
        if (mediaContent) {
          mediaContent.innerHTML = '';
        }
        if (activeMediaTrigger) {
          activeMediaTrigger.focus();
          activeMediaTrigger = null;
        }
      };

      mediaLightbox.addEventListener('transitionend', onTransitionEnd);

      setTimeout(() => {
        if (!mediaLightbox.hasAttribute('hidden')) {
          mediaLightbox.setAttribute('hidden', '');
          if (mediaContent) {
            mediaContent.innerHTML = '';
          }
          if (activeMediaTrigger) {
            activeMediaTrigger.focus();
            activeMediaTrigger = null;
          }
        }
      }, 350);
    }

    mediaTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        openMedia(trigger);
      });
    });

    mediaCloseEls.forEach((closer) => {
      closer.addEventListener('click', closeMedia);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMedia();
      }
    });
  }
})();
