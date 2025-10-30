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

  function initCarousel(carousel) {
    const viewport = carousel.querySelector('[data-carousel-viewport]');
    const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
    const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');

    if (!viewport || slides.length === 0) {
      return;
    }

    let activeIndex = 0;
    let timerId;
    const slideCount = slides.length;

    function goTo(index) {
      activeIndex = (index + slideCount) % slideCount;
      viewport.style.transform = `translateX(-${activeIndex * 100}%)`;
      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === activeIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });
    }

    function stopAutoRotate() {
      if (timerId) {
        clearInterval(timerId);
        timerId = undefined;
      }
    }

    function startAutoRotate() {
      stopAutoRotate();
      timerId = setInterval(() => {
        goTo(activeIndex + 1);
      }, 6000);
    }

    if (prev) {
      prev.addEventListener('click', () => {
        goTo(activeIndex - 1);
        startAutoRotate();
      });
    }

    if (next) {
      next.addEventListener('click', () => {
        goTo(activeIndex + 1);
        startAutoRotate();
      });
    }

    dots.forEach((dot, dotIndex) => {
      dot.addEventListener('click', () => {
        goTo(dotIndex);
        startAutoRotate();
      });
    });

    carousel.addEventListener('mouseenter', stopAutoRotate);
    carousel.addEventListener('mouseleave', startAutoRotate);

    goTo(0);
    startAutoRotate();
  }

  document.querySelectorAll('[data-carousel]').forEach(initCarousel);
})();
