/**
 * GA4 + cookie consent — общий для всех лендингов marketexpert.cz
 * Ключ localStorage: cookie_consent (yes | no)
 *
 * Опционально в <head>:
 *   window.__GA4_MEASUREMENT_ID__ = 'G-SPKHXMCQGM';
 *   window.__GA4_ADS_ID__ = 'AW-11432613975';  // только для РК-лендингов
 *   window.__GA4_ADS_LEAD_SEND_TO__ = 'AW-11432613975/XXXXXXXX';  // метка конверсии из Google Ads
 */
(function () {
  var COOKIE_KEY = 'cookie_consent';
  var DEFAULT_GA4 = 'G-SPKHXMCQGM';

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

  function loadGA4() {
    if (window.__ga4Loaded) return;
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

  window.loadGA = loadGA4;
  window.loadGA4 = loadGA4;

  function leadSendTo() {
    var raw = typeof window.__GA4_ADS_LEAD_SEND_TO__ === 'string'
      ? window.__GA4_ADS_LEAD_SEND_TO__.trim()
      : '';
    return /^AW-\d+\/.+$/i.test(raw) ? raw : null;
  }

  function trackLeadConversion(meta) {
    if (getConsent() !== 'yes') return;
    if (!window.__ga4Loaded) loadGA4();
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

  function initCookieBanner() {
    var banner = document.getElementById('cookie-banner');
    if (!banner) return;

    var stored = getConsent();
    if (stored === 'yes') {
      loadGA4();
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
        loadGA4();
        close();
      });
    }
    if (reject) {
      reject.addEventListener('click', function () {
        setConsent('no');
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
