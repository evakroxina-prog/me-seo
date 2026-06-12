/**
 * GA4 + Microsoft Clarity + cookie consent — общий для всех лендингов marketexpert.cz
 * Ключ localStorage: cookie_consent (yes | no)
 * Скрипты аналитики не загружаются до явного согласия (Принять).
 *
 * Опционально в <head>:
 *   window.__GA4_MEASUREMENT_ID__ = 'G-SPKHXMCQGM';
 *   window.__GA4_ADS_ID__ = 'AW-11432613975';  // только для РК-лендингов
 *   window.__GA4_ADS_LEAD_SEND_TO__ = 'AW-11432613975/XXXXXXXX';  // метка конверсии из Google Ads
 *   window.__CLARITY_PROJECT_ID__ = 'qqt5aodv7n';
 */
(function () {
  var COOKIE_KEY = 'cookie_consent';
  var DEFAULT_GA4 = 'G-SPKHXMCQGM';
  var DEFAULT_CLARITY = 'qqt5aodv7n';

  function getConsent() {
    try {
      return localStorage.getItem(COOKIE_KEY);
    } catch (_) {
      return null;
    }
  }

  function setConsent(v) {
    try {
      localStorage.setItem(COOKIE_KEY, v);
    } catch (_) {}
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
    var raw = typeof window.__GA4_MEASUREMENT_ID__ === 'string'
      ? window.__GA4_MEASUREMENT_ID__.trim()
      : '';
    return validGa4(raw) ? raw : DEFAULT_GA4;
  }

  function adsId() {
    var raw = typeof window.__GA4_ADS_ID__ === 'string'
      ? window.__GA4_ADS_ID__.trim()
      : '';
    return validAds(raw) ? raw : null;
  }

  function clarityId() {
    var raw = typeof window.__CLARITY_PROJECT_ID__ === 'string'
      ? window.__CLARITY_PROJECT_ID__.trim()
      : '';
    return /^[a-z0-9]+$/i.test(raw) ? raw : DEFAULT_CLARITY;
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
    window.__ga4Loaded = true;
    var id = ga4Id();
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    s.onload = function () {
      gtag('config', id);
      var aw = adsId();
      if (aw) gtag('config', aw);
    };
  }

  function bootClarity() {
    if (!hasConsent() || window.__clarityLoaded) return;
    window.__clarityLoaded = true;
    var id = clarityId();
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      t.onload = function () { grantClarityConsent(); };
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
    var raw = typeof window.__GA4_ADS_LEAD_SEND_TO__ === 'string'
      ? window.__GA4_ADS_LEAD_SEND_TO__.trim()
      : '';
    return /^AW-\d+\/.+$/i.test(raw) ? raw : null;
  }

  function trackLeadConversion(meta) {
    if (!hasConsent()) return;
    if (!window.__ga4Loaded) loadAnalytics();
    if (typeof window.gtag !== 'function') return;

    var data = meta || {};
    var language = data.language || document.documentElement.lang || '';
    var packageName = data.package_name || '';

    window.gtag('event', 'generate_lead', {
      currency: 'EUR',
      value: 1,
      lead_source: 'landing_form',
      language: language,
      package_name: packageName
    });

    var sendTo = leadSendTo();
    if (sendTo) {
      window.gtag('event', 'conversion', {
        send_to: sendTo,
        value: 1,
        currency: 'EUR'
      });
    }
  }

  window.trackLeadConversion = trackLeadConversion;

  function initCookieBanner() {
    var banner = document.getElementById('cookie-banner');
    if (!banner) return;

    var stored = getConsent();
    if (stored === 'yes') {
      loadAnalytics();
      banner.remove();
      return;
    }
    if (stored === 'no') {
      banner.remove();
      return;
    }

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
        loadAnalytics();
        close();
      });
    }
    if (reject) {
      reject.addEventListener('click', function () {
        setConsent('no');
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
