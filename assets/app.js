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
})();
