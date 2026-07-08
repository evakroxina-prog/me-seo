/* M:E SEO blog.js cs v20260708 — tags, share, audit popup */
(function () {
  "use strict";

  var MONTHS_CS = [
    "ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince"
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function formatDateCs(iso) {
    if (!iso) return "";
    var p = String(iso).split("-");
    if (p.length !== 3) return iso;
    var d = parseInt(p[2], 10);
    var m = parseInt(p[1], 10);
    return d + ". " + m + ". " + p[0];
  }

  function renderTagsHtml(tags, linkable) {
    if (!tags || !tags.length) return "";
    return tags.map(function (t) {
      if (linkable) {
        return '<a href="/cs/blog/?tag=' + encodeURIComponent(t) + '" class="mini-tag">' + esc(t) + "</a>";
      }
      return '<span class="mini-tag">' + esc(t) + "</span>";
    }).join("");
  }

  function sortArticles(list) {
    return list.slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
  }

  function renderCard(a) {
    var cat = esc(a.category || "SEO");
    var title = esc(a.title || "");
    var excerpt = esc(a.excerpt || "");
    var dateStr = a.date ? formatDateCs(a.date) : "";
    var tagsHtml = renderTagsHtml(a.tags, false);
    var top =
      '<div class="pcardt-top"><span class="cat">' + cat + "</span>" +
      (dateStr ? '<time class="pcardt-date" datetime="' + esc(a.date) + '">' + esc(dateStr) + "</time>" : "") +
      "</div>" +
      "<h2>" + title + "</h2><p>" + excerpt + "</p>" +
      (tagsHtml ? '<div class="pcardt-tags">' + tagsHtml + "</div>" : "");

    if (a.soon) {
      return '<div class="pcardt soon" data-tags="' + esc((a.tags || []).join("|")) + '">' +
        top + '<span class="more">Brzy</span></div>';
    }

    var href = "/cs/blog/" + esc(a.slug) + "/";
    return '<a class="pcardt" href="' + href + '" data-tags="' + esc((a.tags || []).join("|")) + '">' +
      top + '<span class="more">Číst →</span></a>';
  }

  function renderGrid(list) {
    var grid = document.querySelector("[data-articles-grid]");
    if (!grid) return;

    grid.innerHTML = sortArticles(list).map(renderCard).join("");
  }

  function ensureHubChrome() {
    var grid = document.querySelector("[data-articles-grid]");
    if (!grid) return null;

    if (!document.querySelector("[data-grid-empty]")) {
      grid.insertAdjacentHTML(
        "afterend",
        '<p class="grid-empty" data-grid-empty hidden>K tomuto tématu zatím nejsou publikované články.</p>'
      );
    }
    return grid;
  }

  function collectTagCounts(articles) {
    var counts = {};
    articles.forEach(function (a) {
      (a.tags || []).forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .sort(function (a, b) {
        return counts[b] - counts[a] || a.localeCompare(b, "cs");
      })
      .map(function (t) {
        return { name: t, count: counts[t] };
      });
  }

  function getActiveTag() {
    try {
      return new URLSearchParams(window.location.search).get("tag") || "";
    } catch (e) {
      return "";
    }
  }

  function filterArticlesByTag(articles, tag) {
    if (!tag) return articles;
    return articles.filter(function (a) {
      return (a.tags || []).indexOf(tag) !== -1;
    });
  }

  function initHub(articles) {
    var grid = ensureHubChrome();
    if (!grid) return;

    var activeTag = getActiveTag();
    var emptyEl = document.querySelector("[data-grid-empty]");
    var filterBar = document.querySelector("[data-grid-filter]");

    function syncView() {
      var list = sortArticles(filterArticlesByTag(articles, activeTag));
      renderGrid(list);
      if (emptyEl) emptyEl.hidden = list.length > 0;
      if (filterBar) {
        filterBar.hidden = !activeTag;
        if (activeTag) {
          filterBar.innerHTML =
            'Zobrazeny články s tagem <strong>' + esc(activeTag) + '</strong> · ' +
            '<a href="/cs/blog/">Zobrazit vše</a>';
        }
      }
      document.querySelectorAll("[data-tag-cloud] .tag-pill").forEach(function (pill) {
        var tag = pill.getAttribute("data-tag") || "";
        var on = tag === activeTag || (!tag && !activeTag);
        pill.classList.toggle("tag-pill--active", on);
      });
    }

    if (!document.querySelector("[data-tag-cloud]")) {
      var tagItems = collectTagCounts(articles);
      var pills =
        '<button type="button" class="tag-pill tag-pill--all' + (!activeTag ? " tag-pill--active" : "") +
        '" data-tag="">Vše <span class="tag-count">' + articles.length + "</span></button>";
      tagItems.forEach(function (item, i) {
        var cls = "tag-pill tag-pill--c" + (i % 3);
        if (activeTag === item.name) cls += " tag-pill--active";
        pills +=
          '<button type="button" class="' + cls + '" data-tag="' + esc(item.name) + '">' +
          esc(item.name) + ' <span class="tag-count">' + item.count + "</span></button>";
      });
      grid.insertAdjacentHTML(
        "beforebegin",
        '<div class="tag-cloud-slot" data-tag-cloud><div class="tag-cloud-panel">' +
          '<p class="tag-cloud-label">Filtr podle témat</p><div class="tag-cloud">' + pills + "</div></div></div>" +
          '<p class="grid-filter-bar" data-grid-filter hidden></p>'
      );
      filterBar = document.querySelector("[data-grid-filter]");
      document.querySelector("[data-tag-cloud]").addEventListener("click", function (e) {
        var pill = e.target.closest(".tag-pill");
        if (!pill) return;
        var tag = pill.getAttribute("data-tag") || "";
        window.location.href = tag ? "/cs/blog/?tag=" + encodeURIComponent(tag) : "/cs/blog/";
      });
    }

    syncView();
  }

  /* --- ХАБ --- */
  /* Карточки — из этого массива (articles.json — копия для справки, хаб его не грузит) */
  var ARTICLES = [
    {"slug": "co-je-seo", "title": "Co je SEO jednoduše řečeno", "excerpt": "Jak funguje vyhledávací optimalizace, čím se liší od reklamy, komu se hodí a kde začít — bez mýtů o „top 1 za měsíc“.", "category": "SEO · Základy", "date": "2026-02-04", "tags": ["technické seo", "obsah", "spuštění"]},
    {"slug": "seo-nebo-google-ads", "title": "SEO nebo Google Ads: co zvolit v roce 2026?", "excerpt": "SEO přináší levnější návštěvnost, ale až po měsících; Google Ads hned, ale platíte za každý klik. Co zvolit podle rozpočtu a termínů.", "category": "SEO · Rozpočet", "date": "2026-02-11", "tags": ["rozpočet", "optimalizace", "spuštění"]},
    {"slug": "kolik-stoji-seo-v-cesku", "title": "Kolik stojí SEO v Česku: audit a vedení v roce 2026", "excerpt": "Z čeho se skládá cena SEO v Praze: audit od 100 €, správa od 350 €/měs. a co reálně ovlivňuje nabídku.", "category": "SEO · Rozpočet", "date": "2026-03-25", "tags": ["rozpočet", "audit"]},
    {"slug": "seo-audit-co-zahrnuje", "title": "Co zahrnuje SEO audit webu: checklist pro majitele firmy", "excerpt": "Co se na SEO auditu skutečně kontroluje — technika, obsah, konkurence, lokální SEO — a jak vypadá report s prioritami místo seznamu problémů.", "category": "SEO · Audit", "date": "2026-02-18", "tags": ["audit", "technické seo"]},
    {"slug": "technicke-seo-co-to-je", "title": "Co je technické SEO: checklist pro web v roce 2026", "excerpt": "Technické SEO je základ, bez kterého obsah nefunguje: indexace, rychlost, mobile, duplicity a minimální schema.org pro firmu.", "category": "SEO · Technika", "date": "2026-02-25", "tags": ["technické seo", "search console"]},
    {"slug": "seo-pro-ai-vyhledavani-geo", "title": "Jak optimalizovat web pro ChatGPT, Perplexity a AI Overviews (GEO)?", "excerpt": "GEO je optimalizace pro citování v ChatGPT, Perplexity a AI Overviews. Co přidat na web, aby AI pochopilo značku a začalo vás citovat.", "category": "SEO · GEO", "date": "2026-03-18", "tags": ["AI vyhledávání", "technické seo", "obsah"]},
    {"slug": "nastaveni-google-search-console", "title": "Jak nastavit Google Search Console: krok za krokem pro majitele webu", "excerpt": "Nastavení Google Search Console: ověření webu, odeslání sitemap a klíčové reporty — bez zbytečné terminologie.", "category": "SEO · Technika", "date": "2026-03-04", "tags": ["search console", "technické seo"]},
    {"slug": "sitemap-robots-canonical", "title": "Sitemap, robots.txt a canonical: k čemu slouží a jak neuškodit SEO", "excerpt": "Sitemap, robots.txt a canonical — tři soubory, které řídí indexaci webu. Jak mezi nimi nevytvořit rozpor a nepoškodit SEO.", "category": "SEO · Technika", "date": "2026-04-01", "tags": ["technické seo", "optimalizace"]},
    {"slug": "core-web-vitals-seo", "title": "Core Web Vitals a SEO: LCP, INP, CLS — co opravit jako první", "excerpt": "LCP, INP a CLS jednoduchými slovy: co měří Core Web Vitals, orientační hodnoty Google a co opravit první na typickém webu služeb.", "category": "SEO · Technika", "date": "2026-04-22", "tags": ["technické seo", "optimalizace"]},
    {"slug": "seo-po-redesignu", "title": "Web prošel redesignem — pozice klesly: co dělat s SEO", "excerpt": "Pozice klesly po redesignu nebo změně CMS? Příčiny — redirecty, 404, ztráta obsahu, indexace — a checklist obnovy.", "category": "SEO · Technika", "date": "2026-04-08", "tags": ["technické seo", "audit"]},
    {"slug": "jak-merit-vysledky-seo", "title": "Jak měřit efektivitu SEO: metriky, reporty a realistická očekávání", "excerpt": "Jak poznat, že SEO skutečně funguje: metriky v Search Console a GA4 a proč výsledek nepřijde v prvním měsíci.", "category": "SEO · Analytika", "date": "2026-04-15", "tags": ["search console", "optimalizace"]},
    {"slug": "seo-clanky-a-blog", "title": "Jak psát SEO články pro blog: struktura pro Google a AI Overviews", "excerpt": "Struktura SEO článku, který rankuje v Google a cituje se v AI odpovědích: lead-box, H2 podotázky, tabulky, FAQ a schema.", "category": "SEO · Obsah", "date": "2026-04-29", "tags": ["obsah", "AI vyhledávání"]},
    {"slug": "klicova-slova-pro-seo", "title": "Jak vybrat klíčová slova pro SEO (ne pro Google Ads)", "excerpt": "Sémantika pro SEO není totéž co klíčová slova pro reklamu: intent, klastry a priority stránek, aby obsah nekolidoval sám se sebou.", "category": "SEO · Obsah", "date": "2026-03-11", "tags": ["obsah", "optimalizace"]},
    {"slug": "seo-pro-mistni-firmy-v-cesku", "title": "SEO pro místní firmy v Česku: Google Maps, GBP a lokální dotazy", "excerpt": "Google Maps, Google Business Profile a lokální dotazy v cs/ru/en — co nastavit sám za týden a co předat agentuře.", "category": "SEO · Lokální", "date": "2026-05-06", "tags": ["lokální seo", "spuštění"]},
    {"slug": "google-maps-seo-gbp", "title": "Jak se dostat do Google Maps: nastavení Google Business Profile a local pack", "excerpt": "Jak nastavit GBP, dostat se do local packu a získávat poptávky z Google Maps — ne jen z webu, krok za krokem pro lokální firmy.", "category": "SEO · Lokální", "date": "2026-05-13", "tags": ["lokální seo", "spuštění"]},
    {"slug": "jak-zvysit-pozice-webu-ve-vyhledavani", "title": "Jak zvýšit pozice webu ve vyhledávání: 8 kroků, které skutečně fungují", "excerpt": "Osm konkrétních kroků, které skutečně posouvají web výš ve výsledcích Google — od techniky po obsah a vnitřní odkazy.", "category": "SEO · Obsah", "date": "2026-07-08", "tags": ["optimalizace", "technické seo", "obsah"]}
  ];

  if (ARTICLES.length) {
    initHub(ARTICLES);
  }

  /* --- YouTube --- */
  var CHANNEL = "https://www.youtube.com/@MEMarketExpert";
  document.querySelectorAll(".yt").forEach(function (el) {
    var id = (el.getAttribute("data-id") || "").trim();

    if (!id) {
      var ph = document.createElement("div");
      ph.className = "yt-empty";
      ph.innerHTML =
        '<div class="yt-empty-ico"></div>' +
        '<b>Video k tomuto článku brzy přibude</b>' +
        '<span>Odebírejte <a href="' + CHANNEL + '" target="_blank" rel="noopener noreferrer">YouTube kanál M:E</a>, ať vám nic neuteče</span>';
      el.replaceWith(ph);
      return;
    }

    el.classList.add("yt--ready");
    el.style.backgroundImage = "url('https://i.ytimg.com/vi/" + id + "/hqdefault.jpg')";
    var btn = document.createElement("button");
    btn.className = "yt-play";
    btn.type = "button";
    btn.setAttribute("aria-label", "Přehrát video");
    el.appendChild(btn);
    el.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.className = "yt-frame";
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      f.title = "Video M:E Agency";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      el.innerHTML = "";
      el.appendChild(f);
    }, { once: true });
  });

  /* --- COOKIE + GA4 --- */
  function initCookieConsent() {
    if (!document.querySelector('link[href="/cookie.css"]')) {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "/cookie.css";
      document.head.appendChild(css);
    }
    if (!document.getElementById("cookie-banner")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        '<div id="cookie-banner" class="cookie-banner cookie-banner--closed" role="dialog" aria-label="Soubory cookie" aria-hidden="true">' +
          '<div class="cookie-banner__inner">' +
            '<p class="cookie-banner__text">' +
              "Používáme soubory cookie pro analytiku (Google Analytics). Kliknutím na „Přijmout“ souhlasíte s jejich použitím. " +
              '<a href="https://marketexpert.cz/cookie-policy" target="_blank" rel="noopener noreferrer" class="cookie-banner__link">Zásady cookies</a>' +
            "</p>" +
            '<div class="cookie-banner__actions">' +
              '<button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-cookie-reject>Odmítnout</button>' +
              '<button type="button" class="cookie-banner__btn cookie-banner__btn--primary" data-cookie-accept>Přijmout</button>' +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }
    if (!window.__GA4_MEASUREMENT_ID__) {
      window.__GA4_MEASUREMENT_ID__ = "G-SPKHXMCQGM";
    }
    if (!document.querySelector('script[src="/me-analytics.js"]')) {
      var js = document.createElement("script");
      js.src = "/me-analytics.js";
      document.body.appendChild(js);
    }
  }

  initCookieConsent();

  /* --- Шеринг + «Была полезна?» (только на страницах статей) --- */
  function initArticleEngagement() {
    var art = document.querySelector(".wrap--art .art");
    if (!art || art.querySelector("[data-article-engage]")) return;

    var pageUrl = window.location.href;
    var pagePath = window.location.pathname || "";
    var titleEl = art.querySelector("h1");
    var shareTitle = titleEl ? titleEl.textContent.trim() : document.title;
    var encUrl = encodeURIComponent(pageUrl);
    var encTitle = encodeURIComponent(shareTitle);

    var shareLinks = [
      { id: "fb", label: "Facebook", href: "https://www.facebook.com/sharer/sharer.php?u=" + encUrl, icon: "fb" },
      { id: "ig", label: "Instagram", action: "ig", icon: "ig" },
      { id: "li", label: "LinkedIn", href: "https://www.linkedin.com/sharing/share-offsite/?url=" + encUrl, icon: "li" },
      { id: "x", label: "X", href: "https://twitter.com/intent/tweet?url=" + encUrl + "&text=" + encTitle, icon: "x" },
      { id: "tg", label: "Telegram", href: "https://t.me/share/url?url=" + encUrl + "&text=" + encTitle, icon: "tg" },
      { id: "wa", label: "WhatsApp", href: "https://wa.me/?text=" + encTitle + "%20" + encUrl, icon: "wa" },
      { id: "copy", label: "Kopírovat odkaz", action: "copy", icon: "copy" }
    ];

    var icons = {
      tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
      wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
      fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
      li: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.126 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
      x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.933zm-1.291 19.497h2.036L6.486 3.24H4.298l13.312 17.41z"/></svg>',
      copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
      share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>'
    };

    var shareBtns = shareLinks.map(function (item) {
      if (item.action === "ig" || item.action === "copy") {
        return '<button type="button" class="art-share-btn art-share-btn--' + item.id + '" data-share-action="' + item.action + '" title="' + esc(item.label) + '" aria-label="' + esc(item.label) + '">' + icons[item.icon] + "</button>";
      }
      return '<a class="art-share-btn art-share-btn--' + item.id + '" href="' + item.href + '" target="_blank" rel="noopener noreferrer" title="' + esc(item.label) + '" aria-label="' + esc(item.label) + '" data-share-network="' + item.id + '">' + icons[item.icon] + "</a>";
    }).join("");

    if (navigator.share) {
      shareBtns += '<button type="button" class="art-share-btn art-share-btn--native" data-share-native title="Sdílet" aria-label="Sdílet přes aplikaci">' + icons.share + "</button>";
    }

    var html =
      '<div class="art-engage" data-article-engage>' +
        '<div class="art-share">' +
          '<p class="art-engage-label">Sdílet článek</p>' +
          '<div class="art-share-row">' + shareBtns + "</div>" +
          '<p class="art-share-toast" data-share-toast hidden></p>' +
        "</div>" +
        '<div class="art-feedback" data-article-feedback>' +
          '<p class="art-engage-label">Byl článek užitečný?</p>' +
          '<div class="art-feedback-row">' +
            '<button type="button" class="art-feedback-btn" data-helpful="yes">Ano</button>' +
            '<button type="button" class="art-feedback-btn" data-helpful="no">Ne</button>' +
          "</div>" +
          '<p class="art-feedback-thx" data-feedback-thx hidden>Děkujeme za odpověď! <span data-feedback-no-extra hidden>Chyběly detaily? <a href="https://seo.marketexpert.cz/cs/#order">Napište nám</a> — poradíme.</span></p>' +
        "</div>" +
      "</div>";

    var anchor = art.querySelector(".related") || art.querySelector(".cta-box:last-of-type");
    if (anchor) {
      anchor.insertAdjacentHTML("beforebegin", html);
    } else {
      art.insertAdjacentHTML("beforeend", html);
    }

    var engage = art.querySelector("[data-article-engage]");
    if (!engage) return;

    var toast = engage.querySelector("[data-share-toast]");
    var toastTimer;

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
    }

    function trackShare(network) {
      if (typeof window.gtag !== "function") return;
      window.gtag("event", "share", {
        method: network,
        content_type: "article",
        item_id: pagePath,
        page_title: shareTitle
      });
    }

    function copyPageUrl(onDone) {
      function legacyCopy() {
        var ta = document.createElement("textarea");
        ta.value = pageUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.width = "1px";
        ta.style.height = "1px";
        ta.style.opacity = "0";
        ta.style.pointerEvents = "none";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, pageUrl.length);
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
      }

      if (legacyCopy()) {
        onDone(true);
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pageUrl).then(function () {
          onDone(true);
        }).catch(function () {
          onDone(legacyCopy());
        });
        return;
      }

      onDone(false);
    }

    function showCopyLinkFallback(hint) {
      var shareBox = engage.querySelector(".art-share");
      if (!shareBox) return;

      var box = shareBox.querySelector("[data-share-copy-fallback]");
      if (!box) {
        shareBox.insertAdjacentHTML(
          "beforeend",
          '<div class="art-share-copy-fallback" data-share-copy-fallback hidden>' +
            '<p class="art-share-copy-fallback__hint" data-share-copy-msg></p>' +
            '<div class="art-share-copy-fallback__row">' +
              '<input type="text" readonly data-share-copy-input class="art-share-copy-fallback__input">' +
              '<button type="button" class="art-share-copy-fallback__btn" data-share-copy-retry>Kopírovat</button>' +
            "</div>" +
          "</div>"
        );
        box = shareBox.querySelector("[data-share-copy-fallback]");
        box.querySelector("[data-share-copy-retry]").addEventListener("click", function () {
          var input = box.querySelector("[data-share-copy-input]");
          if (!input) return;
          input.focus();
          input.select();
          input.setSelectionRange(0, input.value.length);
          var ok = false;
          try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
          if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(input.value).then(function () {
              showToast("Odkaz zkopírován");
              box.hidden = true;
            }).catch(function () {
              showToast("Vyberte odkaz a stiskněte Ctrl+C");
            });
            return;
          }
          if (ok) {
            showToast("Odkaz zkopírován");
            box.hidden = true;
          } else {
            showToast("Vyberte odkaz a stiskněte Ctrl+C");
          }
        });
      }

      var msgEl = box.querySelector("[data-share-copy-msg]");
      var inputEl = box.querySelector("[data-share-copy-input]");
      if (msgEl) msgEl.textContent = hint || "Odkaz na článek — vyberte a zkopírujte (Ctrl+C):";
      if (inputEl) {
        inputEl.value = pageUrl;
        box.hidden = false;
        inputEl.focus();
        inputEl.select();
        inputEl.setSelectionRange(0, pageUrl.length);
      }
    }

    engage.querySelectorAll("[data-share-network]").forEach(function (link) {
      link.addEventListener("click", function () {
        trackShare(link.getAttribute("data-share-network") || "link");
      });
    });

    engage.querySelectorAll("[data-share-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-share-action");
        copyPageUrl(function (ok) {
          if (!ok) {
            if (action === "ig") {
              showCopyLinkFallback("Instagram nepřijímá přímý odkaz — zkopírujte URL a vložte do Stories nebo bio:");
              trackShare("instagram_copy_fallback");
            } else {
              showCopyLinkFallback("Nepodařilo se zkopírovat automaticky — vyberte odkaz níže:");
              trackShare("copy_link_fallback");
            }
            return;
          }
          if (action === "ig") {
            showToast("Odkaz zkopírován — вставьте в Instagram Stories или bio");
            trackShare("instagram_copy");
          } else {
            showToast("Odkaz zkopírován");
            trackShare("copy_link");
          }
        });
      });
    });

    var nativeBtn = engage.querySelector("[data-share-native]");
    if (nativeBtn) {
      nativeBtn.addEventListener("click", function () {
        navigator.share({ title: shareTitle, url: pageUrl, text: shareTitle }).then(function () {
          trackShare("native");
        }).catch(function () { /* cancelled */ });
      });
    }

    var feedbackKey = "me-blog-feedback-" + pagePath;
    var auditKey = "me-blog-audit-" + pagePath;
    var feedbackRow = engage.querySelector(".art-feedback-row");
    var feedbackThx = engage.querySelector("[data-feedback-thx]");
    var feedbackNoExtra = engage.querySelector("[data-feedback-no-extra]");
    var AUDIT_FORM_ACTION = "https://formspree.io/f/mwvjnnyg";
    var BLOG_BONUS_LEAD_TYPE = "blog_seo_monthly_20_bonus";

    function getStoredFeedback() {
      try { return localStorage.getItem(feedbackKey) || ""; } catch (e) { return ""; }
    }

    function getAuditState() {
      try { return localStorage.getItem(auditKey) || ""; } catch (e) { return ""; }
    }

    function setAuditState(value) {
      try { localStorage.setItem(auditKey, value); } catch (e) { /* private mode */ }
    }

    function applyFeedbackUi(mode) {
      if (feedbackRow) feedbackRow.hidden = true;
      if (feedbackThx) feedbackThx.hidden = false;
      if (feedbackNoExtra) feedbackNoExtra.hidden = mode !== "no";
    }

    function ensureAuditModal() {
      var modal = document.querySelector("[data-blog-audit-modal]");
      if (modal) return modal;

      document.body.insertAdjacentHTML(
        "beforeend",
        '<div class="blog-audit-modal" data-blog-audit-modal hidden>' +
          '<div class="blog-audit-modal__backdrop" data-blog-audit-close tabindex="-1" aria-hidden="true"></div>' +
          '<div class="blog-audit-modal__panel" role="dialog" aria-modal="true" aria-labelledby="blog-audit-title">' +
            '<button type="button" class="blog-audit-modal__close" data-blog-audit-close aria-label="Zavřít">&times;</button>' +
            '<p class="blog-audit-modal__tag">Bonus za užitečný článek</p>' +
            '<h2 id="blog-audit-title">Děkujeme za vysoké hodnocení!</h2>' +
            '<p class="blog-audit-modal__lead">Když vám materiál sedl — bonus: <strong>−20 % na první měsíc SEO správy</strong> při startu spolupráce do 14 dnů od poptávky.</p>' +
            '<form class="blog-audit-form" data-blog-audit-form action="' + AUDIT_FORM_ACTION + '" method="POST">' +
              '<input type="hidden" name="_subject" value="Blog SEO: bonus −20 % na první měsíc správy">' +
              '<input type="hidden" name="lead_type" value="' + BLOG_BONUS_LEAD_TYPE + '">' +
              '<input type="hidden" name="bonus_offer" value="−20 % na první měsíc SEO správy (14 dnů)">' +
              '<input type="hidden" name="source_page" value="">' +
              '<input type="hidden" name="article_title" value="">' +
              '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" class="blog-audit-form__hp">' +
              '<label class="blog-audit-form__label" for="blog-audit-email">Email</label>' +
              '<input type="email" id="blog-audit-email" name="email" placeholder="vy@firma.cz" required autocomplete="email">' +
              '<button type="submit">Získat slevu</button>' +
              '<p class="blog-audit-form__note">Promokód pošleme na email do 1 pracovního dne. Bez spamu.</p>' +
            "</form>" +
            '<p class="blog-audit-modal__success" data-blog-audit-success hidden>Hotovo — promokód pošleme na váš email v nejbližší pracovní den.</p>' +
            '<button type="button" class="blog-audit-modal__skip" data-blog-audit-close>Ne, díky</button>' +
          "</div>" +
        "</div>"
      );

      modal = document.querySelector("[data-blog-audit-modal]");
      if (!modal) return null;

      var form = modal.querySelector("[data-blog-audit-form]");
      var success = modal.querySelector("[data-blog-audit-success]");

      function closeAuditModal(markDismissed) {
        modal.hidden = true;
        document.body.classList.remove("blog-audit-modal-open");
        if (markDismissed && getAuditState() !== "sent") setAuditState("dismissed");
      }

      modal.querySelectorAll("[data-blog-audit-close]").forEach(function (el) {
        el.addEventListener("click", function () { closeAuditModal(true); });
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !modal.hidden) closeAuditModal(true);
      });

      if (form) {
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          if (!form.action || form.action.indexOf("formspree.io") === -1) return;

          var btn = form.querySelector('button[type="submit"]');
          if (!btn || btn.disabled) return;

          var originalLabel = btn.textContent;
          btn.disabled = true;
          btn.textContent = "Odesílání…";

          var data = new FormData(form);
          if (!data.get("source_page")) data.set("source_page", pagePath);
          if (!data.get("article_title")) data.set("article_title", shareTitle);

          fetch(form.action, {
            method: "POST",
            body: data,
            headers: { Accept: "application/json" }
          })
            .then(function (res) {
              return res.json()
                .then(function (payload) { return { ok: res.ok, data: payload }; })
                .catch(function () { return { ok: res.ok, data: {} }; });
            })
            .then(function (r) {
              if (!r.ok) {
                var msg = "Nepodařilo se odeslat. Napište na seo@marketexpert.cz";
                if (r.data && r.data.error) {
                  msg = typeof r.data.error === "string" ? r.data.error : (r.data.error.message || msg);
                }
                alert(msg);
                btn.disabled = false;
                btn.textContent = originalLabel;
                return;
              }

              setAuditState("sent");
              form.hidden = true;
              modal.querySelector(".blog-audit-modal__skip").hidden = true;
              if (success) success.hidden = false;

              if (typeof window.gtag === "function") {
                window.gtag("event", "generate_lead", {
                  lead_type: BLOG_BONUS_LEAD_TYPE,
                  article_path: pagePath,
                  article_title: shareTitle
                });
              }
              if (typeof window.trackLeadConversion === "function") {
                window.trackLeadConversion({ language: "CS", package_name: BLOG_BONUS_LEAD_TYPE });
              }

              setTimeout(function () { closeAuditModal(false); }, 2800);
            })
            .catch(function () {
              alert("Chyba sítě. Zkuste to později nebo napište na seo@marketexpert.cz");
              btn.disabled = false;
              btn.textContent = originalLabel;
            });
        });
      }

      modal.openForArticle = function (path, title) {
        if (getAuditState() === "sent" || getAuditState() === "dismissed") return;

        var sourceInput = form && form.querySelector('input[name="source_page"]');
        var titleInput = form && form.querySelector('input[name="article_title"]');
        if (sourceInput) sourceInput.value = path;
        if (titleInput) titleInput.value = title;

        if (form) {
          form.hidden = false;
          form.reset();
          if (sourceInput) sourceInput.value = path;
          if (titleInput) titleInput.value = title;
          var submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Získat slevu";
          }
        }
        if (success) success.hidden = true;
        var skipBtn = modal.querySelector(".blog-audit-modal__skip");
        if (skipBtn) skipBtn.hidden = false;

        modal.hidden = false;
        document.body.classList.add("blog-audit-modal-open");
        var emailInput = modal.querySelector("#blog-audit-email");
        if (emailInput) setTimeout(function () { emailInput.focus(); }, 50);
      };

      return modal;
    }

    var storedFeedback = getStoredFeedback();
    if (storedFeedback) applyFeedbackUi(storedFeedback);

    engage.querySelectorAll("[data-helpful]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var helpful = btn.getAttribute("data-helpful") === "yes";
        try { localStorage.setItem(feedbackKey, helpful ? "yes" : "no"); } catch (e) { /* private mode */ }

        if (typeof window.gtag === "function") {
          window.gtag("event", helpful ? "article_feedback_yes" : "article_feedback_no", {
            feedback_answer: helpful ? "yes" : "no",
            article_path: pagePath,
            article_title: shareTitle
          });
        }

        applyFeedbackUi(helpful ? "yes" : "no");

        if (helpful) {
          var modal = ensureAuditModal();
          if (modal && typeof modal.openForArticle === "function") {
            modal.openForArticle(pagePath, shareTitle);
          }
        }
      });
    });
  }

  initArticleEngagement();

  /* --- Чек-лист (Formspree + PDF) --- */
  var CHECKLIST_PDF = "/files/checklist-seo-audit-cs.pdf";

  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || !form.matches(".lm-form[data-checklist]")) return;
    if (!form.action || form.action.indexOf("formspree.io") === -1) return;

    e.preventDefault();

    var btn = form.querySelector('button[type="submit"]');
    if (!btn || btn.disabled) return;

    var magnet = form.closest(".lead-magnet");
    var success = magnet && magnet.querySelector(".lm-success");
    var originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Odesílání…";

    var data = new FormData(form);
    if (!data.get("source_page")) {
      data.set("source_page", window.location.pathname || "/cs/blog/");
    }

    fetch(form.action, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" }
    })
      .then(function (res) {
        return res.json()
          .then(function (payload) { return { ok: res.ok, data: payload }; })
          .catch(function () { return { ok: res.ok, data: {} }; });
      })
      .then(function (r) {
        if (!r.ok) {
          var msg = "Nepodařilo se odeslat. Zkuste to později nebo napište na seo@marketexpert.cz";
          if (r.data && r.data.error) {
            msg = typeof r.data.error === "string" ? r.data.error : (r.data.error.message || msg);
          }
          throw new Error(msg);
        }

        if (typeof window.trackLeadConversion === "function") {
          window.trackLeadConversion({ language: "CS", package_name: "checklist" });
        }

        form.hidden = true;
        if (success) success.hidden = false;
        window.open(CHECKLIST_PDF, "_blank", "noopener,noreferrer");
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = originalLabel;
        alert(err && err.message ? err.message : "Chyba sítě. Zkuste to později.");
      });
  });
})();
