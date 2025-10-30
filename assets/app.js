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
})();
