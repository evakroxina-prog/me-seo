/**
 * ME Agency — Formspree adapter (SAFE v2 Gate 2)
 * Version: 2026-08-11 (Enhanced Conversions: pass email/phone to trackLeadConversion)
 *
 * - Single POST, no automatic retry
 * - Disable submit + aria-busy until response
 * - client_submission_id (UUID) for dedupe — NOT CRM lead_id
 * - provider_submission_id only if Formspree returns an id
 * - generate_lead only after real 2xx (via trackLeadConversion)
 * - Never log PII to console/analytics
 *
 * Usage:
 *   meFormAdapter.bindFormspreeForms({ service:'landing', lang:'ru', email:'…' });
 *   // or meFormAdapter.submit(form, opts)
 */
(function () {
  'use strict';

  function uuid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (_) {}
    return 'cs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function serviceFromHost() {
    if (typeof window.__ME_SERVICE__ === 'string' && window.__ME_SERVICE__) {
      return window.__ME_SERVICE__;
    }
    var h = (location.hostname || '').toLowerCase();
    if (h.indexOf('consult.') === 0) return 'consult';
    if (h.indexOf('seo.') === 0) return 'seo';
    if (h.indexOf('ads.') === 0) return 'ads';
    if (h.indexOf('reputation.') === 0) return 'reputation';
    if (h.indexOf('landing.') === 0) return 'landing';
    return '';
  }

  function localeFromDoc(fallback) {
    var lang = (document.documentElement.lang || fallback || 'ru').toLowerCase();
    if (lang.indexOf('cs') === 0 || lang === 'cz') return 'cs';
    return 'ru';
  }

  /**
   * @param {HTMLFormElement} form
   * @param {object} opts
   * @returns {Promise<{ok:boolean, client_submission_id:string, provider_submission_id?:string, error?:string}>}
   */
  function submit(form, opts) {
    opts = opts || {};
    if (!(form instanceof HTMLFormElement) || !form.action) {
      return Promise.resolve({ ok: false, client_submission_id: '', error: 'invalid_form' });
    }
    if (form.action.indexOf('formspree.io') === -1) {
      return Promise.resolve({ ok: false, client_submission_id: '', error: 'not_formspree' });
    }

    var btn =
      form.querySelector('[type="submit"]') ||
      form.querySelector('.form-submit') ||
      form.querySelector('button[type="submit"]');
    if (btn && btn.disabled) {
      return Promise.resolve({ ok: false, client_submission_id: '', error: 'busy' });
    }

    var clientId = uuid();
    var originalHTML = btn ? btn.innerHTML : '';
    var sendingLabel = opts.sendingLabel || (localeFromDoc(opts.lang) === 'cs' ? 'Odesílám…' : 'Отправка…');

    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      if (btn.classList.contains('form-submit') || btn.querySelector('span')) {
        btn.innerHTML = '<span>' + sendingLabel + '</span>';
      } else {
        btn.textContent = sendingLabel;
      }
    }

    var fd = new FormData(form);
    fd.set('client_submission_id', clientId);

    var emailVal =
      (fd.get('email') || fd.get('Email') || '').toString().trim() ||
      ((form.querySelector('input[type="email"]') || {}).value || '');
    var phoneVal =
      (fd.get('phone') || fd.get('telefon') || fd.get('tel') || fd.get('phone_number') || '')
        .toString()
        .trim() ||
      ((form.querySelector('input[type="tel"]') || {}).value || '');

    return fetch(form.action, {
      method: 'POST',
      body: fd,
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        return res
          .json()
          .then(function (data) {
            return { ok: res.ok, status: res.status, data: data || {} };
          })
          .catch(function () {
            return { ok: res.ok, status: res.status, data: {} };
          });
      })
      .then(function (r) {
        if (r.ok) {
          var providerId =
            (r.data && (r.data.id || r.data.next || r.data.submission_id)) || '';
          if (typeof providerId !== 'string') providerId = '';

          if (typeof window.trackLeadConversion === 'function') {
            window.trackLeadConversion({
              client_submission_id: clientId,
              provider_submission_id: providerId || undefined,
              service: opts.service || serviceFromHost(),
              locale: opts.locale || localeFromDoc(opts.lang),
              form_id: form.id || opts.form_id || 'leadForm',
              email: emailVal || undefined,
              phone: phoneVal || undefined
            });
          }

          if (btn) {
            var done =
              opts.successLabel ||
              (localeFromDoc(opts.lang) === 'cs' ? '✓ Odesláno' : '✓ Заявка отправлена');
            btn.innerHTML = '<span>' + done + '</span>';
            btn.classList.add('is-submitted');
            btn.disabled = true;
            btn.removeAttribute('aria-busy');
          }

          try {
            form.reset();
          } catch (_) {}

          if (typeof opts.onSuccess === 'function') {
            opts.onSuccess({
              client_submission_id: clientId,
              provider_submission_id: providerId || undefined
            });
          } else if (typeof window.showFormSuccess === 'function') {
            window.showFormSuccess({
              lang: opts.lang || localeFromDoc(),
              email: opts.email
            });
          }

          return {
            ok: true,
            client_submission_id: clientId,
            provider_submission_id: providerId || undefined
          };
        }

        var msg =
          opts.errorLabel ||
          (localeFromDoc(opts.lang) === 'cs'
            ? 'Nepodařilo se odeslat. Zkuste to znovu.'
            : 'Не удалось отправить заявку.');
        if (r.data && r.data.error) {
          msg =
            typeof r.data.error === 'string'
              ? r.data.error
              : r.data.error.message || msg;
        } else if (r.data && Array.isArray(r.data.errors)) {
          var parts = r.data.errors
            .map(function (x) {
              return (x && x.message) || '';
            })
            .filter(Boolean);
          if (parts.length) msg = parts.join(' ');
        }

        if (btn) {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
        }
        if (typeof opts.onError === 'function') opts.onError(msg);
        else alert(msg);

        return { ok: false, client_submission_id: clientId, error: msg };
      })
      .catch(function () {
        var net =
          opts.networkLabel ||
          (localeFromDoc(opts.lang) === 'cs'
            ? 'Chyba sítě. Zkuste to znovu nebo napište e-mailem.'
            : 'Ошибка сети. Попробуйте позже или напишите на email.');
        if (btn) {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
        }
        if (typeof opts.onError === 'function') opts.onError(net);
        else alert(net);
        return { ok: false, client_submission_id: clientId, error: 'network' };
      });
  }

  function bindFormspreeForms(opts) {
    opts = opts || {};
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || !form.action || form.action.indexOf('formspree.io') === -1) return;
      if (form.getAttribute('data-me-form-skip') === '1') return;
      e.preventDefault();
      submit(form, opts);
    });
  }

  window.meFormAdapter = {
    submit: submit,
    bindFormspreeForms: bindFormspreeForms,
    uuid: uuid
  };
})();
