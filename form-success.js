/**
 * Модал успешной отправки формы (Formspree) — M:E Agency
 *
 * showFormSuccess({
 *   lang: 'ru' | 'cs',
 *   email: 'seo@marketexpert.cz',   // optional
 *   whatsapp: '420705995770',       // optional, digits only
 *   blog: 'https://marketexpert.cz/ru/blog'  // optional, null to hide
 * })
 */
(function () {
  'use strict';

  var COPY = {
    ru: {
      title: 'Спасибо за заявку!',
      body: 'Мы свяжемся с вами в ближайшее время — не позже, чем через 24 часа в рабочие дни.',
      hintBefore: 'Если вопрос срочный — напишите в ',
      hintAfter: ' или на ',
      wa: 'WhatsApp',
      close: 'Понятно',
      aria: 'Заявка отправлена',
      extraBefore: 'Пока ждёте ответа — ',
      extraLink: 'загляните в блог',
      extraAfter: ': статьи о SEO, рекламе и маркетинге.',
      blogBtn: 'Читать блог'
    },
    cs: {
      title: 'Děkujeme za poptávku!',
      body: 'Ozveme se co nejdříve — nejpozději do 24 hodin v pracovní dny.',
      hintBefore: 'Je-li to urgentní, napište na ',
      hintAfter: ' nebo e-mail ',
      wa: 'WhatsApp',
      close: 'Rozumím',
      aria: 'Poptávka odeslána',
      extraBefore: 'Mezitím si ',
      extraLink: 'přečtěte náš blog',
      extraAfter: ' — články o SEO, reklamě a marketingu.',
      blogBtn: 'Přejít do blogu'
    }
  };

  var modal = null;
  var lastFocus = null;

  function ensureModal() {
    if (modal) return modal;
    var root = document.createElement('div');
    root.id = 'form-success-modal';
    root.className = 'form-success';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="form-success__backdrop" data-form-success-close></div>' +
      '<div class="form-success__panel">' +
        '<div class="form-success__icon" aria-hidden="true">✓</div>' +
        '<h2 class="form-success__title"></h2>' +
        '<p class="form-success__body"></p>' +
        '<p class="form-success__hint"></p>' +
        '<p class="form-success__extra"></p>' +
        '<div class="form-success__actions">' +
          '<a class="form-success__blog" target="_blank" rel="noopener noreferrer"></a>' +
          '<a class="form-success__wa" target="_blank" rel="noopener noreferrer"></a>' +
          '<button type="button" class="form-success__close"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    root.querySelectorAll('[data-form-success-close], .form-success__close').forEach(function (el) {
      el.addEventListener('click', hideFormSuccess);
    });
    document.addEventListener('keydown', onKeydown);

    modal = root;
    return modal;
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) hideFormSuccess();
  }

  function hideFormSuccess() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('form-success-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  window.showFormSuccess = function (opts) {
    opts = opts || {};
    var lang = (opts.lang || document.documentElement.lang || 'ru').toLowerCase();
    if (lang.indexOf('cs') === 0 || lang === 'cz') lang = 'cs';
    else lang = 'ru';
    var t = COPY[lang] || COPY.ru;
    var email = opts.email || 'seo@marketexpert.cz';
    var wa = String(opts.whatsApp || opts.whatsapp || '420705995770').replace(/\D/g, '');
    var blogUrl = opts.blog === null || opts.blog === false
      ? null
      : (opts.blog || 'https://marketexpert.cz/ru/blog');

    var el = ensureModal();
    el.setAttribute('aria-label', t.aria);
    el.querySelector('.form-success__title').textContent = t.title;
    el.querySelector('.form-success__body').textContent = t.body;

    var hint = el.querySelector('.form-success__hint');
    hint.innerHTML =
      t.hintBefore +
      '<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener noreferrer">' + t.wa + '</a>' +
      t.hintAfter +
      '<a href="mailto:' + email + '">' + email + '</a>.';

    var extra = el.querySelector('.form-success__extra');
    var blogBtn = el.querySelector('.form-success__blog');
    if (blogUrl) {
      extra.hidden = false;
      extra.innerHTML =
        t.extraBefore +
        '<a href="' + blogUrl + '" target="_blank" rel="noopener noreferrer">' + t.extraLink + '</a>' +
        t.extraAfter;
      blogBtn.hidden = false;
      blogBtn.href = blogUrl;
      blogBtn.textContent = t.blogBtn;
    } else {
      extra.hidden = true;
      blogBtn.hidden = true;
    }
    el.querySelector('.form-success__close').textContent = t.close;

    var waBtn = el.querySelector('.form-success__wa');
    waBtn.href = 'https://wa.me/' + wa;
    waBtn.textContent = t.wa;

    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('form-success-open');
    el.querySelector('.form-success__close').focus();
  };

  window.hideFormSuccess = hideFormSuccess;
})();
