/**
 * ME Agency — analytics + Consent Mode v2 (SAFE v2 Gate 2)
 * Version: 2026-08-11 (Enhanced Conversions)
 *
 * - Default consent: all four denied BEFORE any gtag config/event
 * - Analytics load only after accept
 * - Consent choice: version + timestamp (no PII); cookie Domain=.marketexpert.cz when Secure context
 * - Production Measurement IDs blocked on localhost / file://
 * - generate_lead uses client_submission_id (+ optional provider_submission_id), NOT CRM lead_id
 *
 * Optional head flags:
 *   window.__GA4_MEASUREMENT_ID__ = 'G-SPKHXMCQGM';
 *   window.__GA4_ADS_ID__ = 'AW-…';
 *   window.__GA4_ADS_LEAD_SEND_TO__ = 'AW-…/label';
 *   window.__CLARITY_PROJECT_ID__ = '…';
 *   window.__ME_SERVICE__ = 'consult|seo|ads|reputation|landing';
 */
(function () {
  'use strict';

  var COOKIE_KEY = 'cookie_consent';
  var CONSENT_META_KEY = 'me_consent_meta';
  var CONSENT_COOKIE = 'me_consent';
  var CONSENT_VERSION = '2026-07-20';
  var DEFAULT_GA4 = 'G-SPKHXMCQGM';
  var DEFAULT_CLARITY = 'qqt5aodv7n';
  var consentDefaultsApplied = false;

  function isNonProductionHost() {
    var h = (location.hostname || '').toLowerCase();
    if (!h || h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return true;
    if (location.protocol === 'file:') return true;
    if (/\.local$/.test(h) || h.indexOf('192.168.') === 0 || h.indexOf('10.') === 0) return true;
    return false;
  }

  function getConsent() {
    try {
      var v = localStorage.getItem(COOKIE_KEY);
      if (v === 'yes' || v === 'no') return v;
    } catch (_) {}
    try {
      var m = document.cookie.match(/(?:^|;\s*)me_consent=(yes|no)/);
      if (m) return m[1];
    } catch (_) {}
    return null;
  }

  function writeConsentCookie(v) {
    try {
      var secure = location.protocol === 'https:' ? '; Secure' : '';
      var domain = '';
      if (/\.marketexpert\.cz$/i.test(location.hostname) || /^marketexpert\.cz$/i.test(location.hostname)) {
        domain = '; Domain=.marketexpert.cz';
      }
      document.cookie =
        CONSENT_COOKIE +
        '=' +
        v +
        '; Path=/' +
        domain +
        '; Max-Age=15552000; SameSite=Lax' +
        secure;
    } catch (_) {}
  }

  function setConsent(v) {
    try {
      localStorage.setItem(COOKIE_KEY, v);
      localStorage.setItem(
        CONSENT_META_KEY,
        JSON.stringify({
          version: CONSENT_VERSION,
          choice: v,
          ts: new Date().toISOString()
        })
      );
    } catch (_) {}
    writeConsentCookie(v);
  }

  function hasConsent() {
    return getConsent() === 'yes';
  }

  function validGa4(id) {
    return typeof id === 'string' && /^G-[A-Z0-9]+$/i.test(id);
  }

  function validAds(id) {
    return typeof id === 'string' && /^AW-\d+$/i.test(id);
  }

  function ga4Id() {
    if (isNonProductionHost()) return null;
    var raw =
      typeof window.__GA4_MEASUREMENT_ID__ === 'string'
        ? window.__GA4_MEASUREMENT_ID__.trim()
        : '';
    return validGa4(raw) ? raw : DEFAULT_GA4;
  }

  function adsId() {
    if (isNonProductionHost()) return null;
    var raw =
      typeof window.__GA4_ADS_ID__ === 'string' ? window.__GA4_ADS_ID__.trim() : '';
    return validAds(raw) ? raw : null;
  }

  function clarityId() {
    if (isNonProductionHost()) return null;
    var raw =
      typeof window.__CLARITY_PROJECT_ID__ === 'string'
        ? window.__CLARITY_PROJECT_ID__.trim()
        : '';
    return /^[a-z0-9]+$/i.test(raw) ? raw : DEFAULT_CLARITY;
  }

  function ensureGtagStub() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
    }
  }

  /** Consent Mode v2 defaults — must run before config/event */
  function applyConsentDefaults() {
    if (consentDefaultsApplied) return;
    ensureGtagStub();
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500
    });
    consentDefaultsApplied = true;
  }

  function updateConsentGranted() {
    ensureGtagStub();
    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  }

  function updateConsentDenied() {
    ensureGtagStub();
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
  }

  function grantClarityConsent() {
    if (typeof window.clarity !== 'function') return;
    try {
      window.clarity('consentv2', {
        ad_Storage: 'granted',
        analytics_Storage: 'granted'
      });
    } catch (_) {}
  }

  function revokeClarity() {
    if (typeof window.clarity !== 'function') return;
    try {
      window.clarity('consent', false);
    } catch (_) {}
  }

  function bootGA4() {
    if (!hasConsent() || window.__ga4Loaded) return;
    var id = ga4Id();
    if (!id) return;
    applyConsentDefaults();
    updateConsentGranted();
    window.__ga4Loaded = true;
    ensureGtagStub();
    window.gtag('js', new Date());
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    s.onload = function () {
      window.gtag('config', id, { anonymize_ip: true });
      var aw = adsId();
      if (aw) {
        window.gtag('config', aw, { allow_enhanced_conversions: true });
      }
    };
  }

  function bootClarity() {
    if (!hasConsent() || window.__clarityLoaded) return;
    var id = clarityId();
    if (!id) return;
    window.__clarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      t.onload = function () {
        grantClarityConsent();
      };
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', id);
  }

  function loadAnalytics() {
    if (!hasConsent()) return;
    bootGA4();
    bootClarity();
  }

  window.loadGA = loadAnalytics;
  window.loadGA4 = bootGA4;
  window.loadAnalytics = loadAnalytics;

  function leadSendTo() {
    if (isNonProductionHost()) return null;
    var raw =
      typeof window.__GA4_ADS_LEAD_SEND_TO__ === 'string'
        ? window.__GA4_ADS_LEAD_SEND_TO__.trim()
        : '';
    return /^AW-\d+\/.+$/i.test(raw) ? raw : null;
  }

  /**
   * Fire once after Formspree 2xx.
   * Params: client_submission_id (required), provider_submission_id?, service, locale, form_id
   * Optional for Enhanced Conversions: email, phone (normalized + SHA-256; never logged)
   * Meaning: provider accepted form — NOT a CRM lead_id.
   */
  function newClientSubmissionId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (_) {}
    return 'cs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  function normalizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    var digits = phone.replace(/[^\d+]/g, '');
    if (!digits) return '';
    if (digits.charAt(0) !== '+') {
      var only = digits.replace(/\D/g, '');
      if (only.indexOf('420') === 0 && only.length >= 12) return '+' + only;
      if (only.length === 9) return '+420' + only;
      if (only.length >= 10) return '+' + only;
      return '';
    }
    return digits;
  }

  function sha256Hex(str) {
    if (!str || !window.crypto || !window.crypto.subtle || !window.TextEncoder) {
      return Promise.resolve('');
    }
    try {
      return window.crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(str))
        .then(function (buf) {
          return Array.prototype.map
            .call(new Uint8Array(buf), function (b) {
              return ('0' + b.toString(16)).slice(-2);
            })
            .join('');
        })
        .catch(function () {
          return '';
        });
    } catch (_) {
      return Promise.resolve('');
    }
  }

  function buildEnhancedUserData(meta) {
    var email = normalizeEmail(meta && (meta.email || meta.Email));
    var phone = normalizePhone(meta && (meta.phone || meta.phone_number || meta.telefon || meta.tel));
    var jobs = [];
    if (email) jobs.push(sha256Hex(email).then(function (h) { return h ? { email: h } : null; }));
    if (phone) jobs.push(sha256Hex(phone).then(function (h) { return h ? { phone_number: h } : null; }));
    if (!jobs.length) return Promise.resolve(null);
    return Promise.all(jobs).then(function (parts) {
      var out = {};
      parts.forEach(function (p) {
        if (p) {
          if (p.email) out.sha256_email_address = p.email;
          if (p.phone_number) out.sha256_phone_number = p.phone_number;
        }
      });
      return Object.keys(out).length ? out : null;
    });
  }

  function trackLeadConversion(meta) {
    if (!hasConsent()) return;
    var data = meta || {};
    // Prefer explicit id from form adapter; legacy callers get a one-off id (not a CRM lead_id).
    var clientId = data.client_submission_id || newClientSubmissionId();

    var dedupeKey = 'me_generate_lead_' + clientId;
    try {
      if (sessionStorage.getItem(dedupeKey) === '1') return;
    } catch (_) {}

    if (!window.__ga4Loaded) loadAnalytics();
    if (typeof window.gtag !== 'function') return;

    var locale =
      data.locale ||
      data.language ||
      document.documentElement.lang ||
      '';
    if (typeof locale === 'string') {
      locale = locale.toLowerCase().indexOf('cs') === 0 || locale.toLowerCase() === 'cz' ? 'cs' : locale;
    }

    var payload = {
      client_submission_id: clientId,
      service: data.service || window.__ME_SERVICE__ || '',
      locale: locale,
      form_id: data.form_id || ''
    };
    if (data.provider_submission_id) {
      payload.provider_submission_id = String(data.provider_submission_id);
    }

    try {
      sessionStorage.setItem(dedupeKey, '1');
    } catch (_) {}

    var sendTo = leadSendTo();

    buildEnhancedUserData(data).then(function (userData) {
      if (userData) {
        try {
          window.gtag('set', 'user_data', userData);
        } catch (_) {}
      }

      window.gtag('event', 'generate_lead', payload);

      if (sendTo) {
        var conv = {
          send_to: sendTo,
          value: 1,
          currency: 'EUR'
        };
        window.gtag('event', 'conversion', conv);
      }
    });
  }

  window.trackLeadConversion = trackLeadConversion;

  function initCookieBanner() {
    applyConsentDefaults();

    var banner = document.getElementById('cookie-banner');
    var stored = getConsent();

    if (stored === 'yes') {
      loadAnalytics();
      if (banner) banner.remove();
      return;
    }
    if (stored === 'no') {
      updateConsentDenied();
      if (banner) banner.remove();
      return;
    }

    if (!banner) return;

    banner.classList.remove('cookie-banner--closed');
    banner.removeAttribute('aria-hidden');

    var accept = banner.querySelector('[data-cookie-accept]');
    var reject = banner.querySelector('[data-cookie-reject]');

    function close() {
      try {
        banner.remove();
      } catch (_) {
        banner.classList.add('cookie-banner--closed');
        banner.setAttribute('aria-hidden', 'true');
      }
    }

    if (accept) {
      accept.addEventListener('click', function () {
        setConsent('yes');
        updateConsentGranted();
        loadAnalytics();
        close();
      });
    }
    if (reject) {
      reject.addEventListener('click', function () {
        setConsent('no');
        updateConsentDenied();
        revokeClarity();
        close();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieBanner);
  } else {
    initCookieBanner();
  }
})();
