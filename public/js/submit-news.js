(function () {
  const { api } = window.SHEREBLOG;
  const { escapeHtml, toast } = window.SHEREBLOG.utils;

  async function loadCategories() {
    const select = document.getElementById('categoryId');
    try {
      const { categories } = await api.getCategories();
      categories.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    } catch (err) {
      // Category list is a nice-to-have here; the submission itself
      // still works without it if the backend defaults the category.
    }
  }

  function formToPayload(form) {
    const fd = new FormData(form);
    return {
      submitterName: fd.get('submitterName')?.trim(),
      email: fd.get('email')?.trim(),
      phone: fd.get('phone')?.trim() || null,
      title: fd.get('title')?.trim(),
      categoryId: fd.get('categoryId') || null,
      description: fd.get('description')?.trim(),
      fullStory: fd.get('fullStory')?.trim(),
      source: fd.get('source')?.trim() || null,
      location: fd.get('location')?.trim() || null,
      additionalInfo: fd.get('additionalInfo')?.trim() || null,
      consentGiven: fd.get('consent') === 'on',
    };
  }

  const form = document.getElementById('submit-news-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const payload = formToPayload(form);
    if (!payload.consentGiven) {
      toast('Please confirm the consent checkbox before submitting.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    try {
      await api.submitNews(payload);
      toast('Thank you — your story has been submitted for review.');
      form.reset();
    } catch (err) {
      toast(err.message || 'Could not submit your story. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Story';
    }
  });

  loadCategories();
})();
