/* Антикор: прототип сайта. Чистый JS, без библиотек и внешних запросов, без innerHTML.
   Данные — data.js (собирает build_data.py из CSV). Заявки НИКУДА не отправляются: на экране показывается,
   что ушло бы в Telegram и CRM. */
(function () {
  'use strict';

  var D = window.ANTIKOR_DATA;

  /* ---------- Одно место для данных владельца. Пусто = на странице остаётся жёлтая метка. ---------- */
  var CONFIG = {
    name: '', phone: '', address: '', telegram: '', owner: '',
    years: '7',           // срок гарантии, лет (решение владельца 03.11.2026)
    posts: '7', cars_day: '', hours: '', odor_days: '', callback: '', nearest: '',
    ymId: 0,              // ЗАГЛУШКА: номер счётчика Яндекс Метрики даст владелец
    policyVersion: 'v1 (заглушка)',
    prod: false           // боевой сайт: true. Тогда адрес ?show=... игнорируется, а отзывы-примеры выключены
  };
  /* Блоки с флагами. show_reviews: в прототипе включён и показывает ПРИМЕР оформления с пометкой.
     На боевом сайте (CONFIG.prod: true) блок отзывов выключен принудительно и ?show= не действует: выдуманные отзывы выводить нельзя (ст. 5 38-ФЗ).
     Настоящие отзывы - отдельное решение: убрать примеры из index.html и подключить их.
     Остальные скрыты; для показа в прототипе — адрес ?show=works,opening,faq4 */
  var FLAGS = { show_reviews: true, show_works: false, show_opening_banner: false, show_faq_dealer_warranty: false };
  var SHOW_ALIAS = { reviews: 'show_reviews', works: 'show_works', opening: 'show_opening_banner', faq4: 'show_faq_dealer_warranty' };

  var PK = {
    bottom: { name: 'Днище', who: 'Нужна защита днища за минимальные деньги',
      inc: ['Снятие защиты днища, мойка, сушка, обработка днища ', ['[материал]'], '. Арки и скрытые полости не входят ', ['[уточняется]']],
      incShort: 'снятие защиты днища · мойка и сушка · обработка днища. Арки и скрытые полости не входят' },
    standard: { name: 'Стандарт', who: 'Основная защита для большинства машин',
      inc: ['Снятие колёс, подкрылков, защиты; мойка, сушка; днище и арки — ', ['[материал]'], '; скрытые полости — ', ['[материал]']],
      incShort: 'снятие колёс, подкрылков и защиты · мойка и сушка · днище и арки · скрытые полости' },
    antishum: { name: 'Антишум', who: 'Новая или почти новая машина, хочется меньше шума в салоне',
      inc: ['То же, что «Стандарт», но днище и арки — шумопоглощающим составом ', ['[материал]']],
      incShort: 'снятие колёс, подкрылков и защиты · мойка и сушка · днище и арки шумопоглощающим составом · скрытые полости' },
    zinc: { name: 'Цинк', who: 'Старший пакет: составы с цинком',
      inc: ['То же, что «Стандарт», составы с цинком ', ['[материал]']],
      incShort: 'снятие колёс, подкрылков и защиты · мойка и сушка · днище и арки, скрытые полости — составы с цинком' }
  };
  var FORM_RU = { calc: 'калькулятор', quiz: 'подбор пакета по вопросам', contact: 'контакты', no_model: 'калькулятор, «моей модели нет»' };

  /* ---------- Утилиты ---------- */
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(tag, a) {
    var e = document.createElement(tag), k, i;
    if (a) {
      for (k in a) {
        if (a[k] === false || a[k] == null) continue;
        if (k === 'class') e.className = a[k];
        else if (k === 'text') e.textContent = a[k];
        else e.setAttribute(k, a[k] === true ? '' : a[k]);
      }
    }
    for (i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) { // [метка, ключ конфига] -> жёлтая заглушка
      e.appendChild(h('span', { class: 'stub', 'data-cfg': k[1] || null, text: k[0] }));
    } else if (typeof k === 'string') e.appendChild(document.createTextNode(k));
    else e.appendChild(k);
  }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }
  function rub(n) { return fmt(n) + '\u00a0₽'; }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scrollTo(el) { if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }

  /* ---------- Данные ---------- */
  var classByCode = Object.create(null), brandBySlug = Object.create(null);
  D.classes.forEach(function (c) { classByCode[c.code] = c; });
  D.brands.forEach(function (b) {
    var m = Object.create(null);
    b.models.forEach(function (x) { m[x.s] = x; });
    b.bySlug = m;
    brandBySlug[b.slug] = b;
  });
  var MAIN_CLASSES = D.classes.filter(function (c) { return !c.special; });

  function priceOf(pkg, cls) { var v = own(D.prices, pkg) && own(D.prices[pkg], cls) ? D.prices[pkg][cls] : null; return v == null ? null : v; }
  function archesOf(cls) { return own(D.arches, cls) ? D.arches[cls] : 0; }
  function total(pkg, cls, arches) {
    var p = priceOf(pkg, cls);
    if (p == null) return null;
    return p + (arches && pkg !== 'bottom' ? archesOf(cls) : 0);
  }

  /* ---------- Конфиг и флаги ---------- */
  function applyCfg(root) {
    $$('[data-cfg]', root).forEach(function (e) {
      var v = CONFIG[e.getAttribute('data-cfg')];
      if (v) { e.textContent = v; e.classList.remove('stub'); }
    });
  }
  function applyFlags() {
    var v = '';
    if (CONFIG.prod) FLAGS.show_reviews = false;   // боевой сайт: примеры отзывов не показываем, ?show= не читаем
    else try { v = new URLSearchParams(location.search).get('show') || ''; } catch (e) { v = ''; }
    v.split(',').forEach(function (k) { if (own(SHOW_ALIAS, k)) FLAGS[SHOW_ALIAS[k]] = true; });
    $$('[data-flag]').forEach(function (e) { e.hidden = !FLAGS[e.getAttribute('data-flag')]; });
  }

  /* ---------- Цели Метрики (заглушка) ---------- */
  var goals = [];
  function goal(name, params) {
    goals.push(name);
    if (window.ym && CONFIG.ymId) window.ym(CONFIG.ymId, 'reachGoal', name, params);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-goal]');
    if (t) goal(t.getAttribute('data-goal'));
  });

  /* ---------- Состояние калькулятора ---------- */
  var S = { brand: null, model: null, custom: false, customText: '', customCls: null, pkg: null, arches: false };

  function curBrand() { return S.brand && own(brandBySlug, S.brand) ? brandBySlug[S.brand] : null; }
  function curModel() { var b = curBrand(); return b && S.model && own(b.bySlug, S.model) ? b.bySlug[S.model] : null; }
  function curClass() {
    if (S.custom) return S.customCls;
    var m = curModel();
    return m ? m.c : null;
  }
  /* Повтор марки в названии не нужен: если модель уже начинается с названия марки, марку не повторяем */
  function joinName(brand, model) {
    return String(model).toLowerCase().indexOf(String(brand).toLowerCase()) === 0 ? model : brand + ' ' + model;
  }
  function carName(b, m) { return joinName(b.name, m.n); }
  function carLabel() {
    if (S.custom) return (S.customText || '').trim() || 'Машина без модели в списке';
    var m = curModel();
    return m ? carName(curBrand(), m) : '';
  }
  function pkgLabel() {
    if (!S.pkg) return '';
    return PK[S.pkg].name + (S.arches && S.pkg !== 'bottom' ? ' + шумоизоляция арок' : '');
  }

  function queryString() {
    var q = [];
    if (S.custom) {
      q.push('custom=1');
      if (S.customCls) q.push('class=' + classByCode[S.customCls].key);
      if (S.customText.trim()) q.push('car=' + encodeURIComponent(S.customText.trim()));
    } else {
      if (S.brand) q.push('brand=' + S.brand);
      if (S.model) q.push('model=' + S.model);
    }
    if (S.pkg) q.push('pkg=' + S.pkg);
    if (S.arches && S.pkg && S.pkg !== 'bottom') q.push('arches=1');
    return q.join('&');
  }
  function calcLink() {
    var base = location.href.split('#')[0].split('?')[0], q = queryString();
    return base + (q ? '?' + q : '') + '#calc';
  }
  function syncUrl() {
    try {
      var keep = location.search.replace(/^\?/, '').split('&').filter(function (p) {
        return p && !/^(brand|model|pkg|arches|custom|class|car)=/.test(p);
      });
      var q = queryString();
      var all = keep.concat(q ? [q] : []).join('&');
      history.replaceState(null, '', location.pathname + (all ? '?' + all : '') + location.hash);
    } catch (e) { /* file:// в некоторых браузерах не даёт менять адрес — ссылка собирается из состояния */ }
  }
  function readUrl() {
    var p = Object.create(null), any = false;
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('='), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1);
      try { p[k] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { p[k] = v; }
    });
    if (p.custom === '1') {
      S.custom = true; any = true;
      D.classes.forEach(function (c) { if (!c.special && c.key === p['class']) S.customCls = c.code; });
      S.customText = (p.car || '').slice(0, 80);
    } else if (p.brand && own(brandBySlug, p.brand)) {
      S.brand = p.brand; any = true;
      if (p.model && own(brandBySlug[p.brand].bySlug, p.model)) S.model = p.model;
    }
    if (p.pkg && own(PK, p.pkg)) { S.pkg = p.pkg; any = true; }
    if (p.arches === '1' && S.pkg && S.pkg !== 'bottom') S.arches = true;
    return any;
  }
  function utm() {
    var o = {}, keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'];
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i < 1) return;
      var k = kv.slice(0, i);
      if (keys.indexOf(k) >= 0) { try { o[k] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')).slice(0, 200); } catch (e) { o[k] = ''; } }
    });
    return o;
  }

  /* ---------- Выпадающий список с поиском ---------- */
  var comboSeq = 0;
  function makeCombo(o) {
    var inp = o.input, ul = o.list, shown = [], active = -1, label = '', id = 'cb' + (++comboSeq);
    function items() { return o.items(); }
    function render(q) {
      var all = items(), s = (q || '').trim().toLowerCase(), starts = [], inside = [];
      all.forEach(function (it) {
        var l = it.label.toLowerCase();
        if (!s) starts.push(it); else if (l.indexOf(s) === 0) starts.push(it); else if (l.indexOf(s) > 0) inside.push(it);
      });
      shown = starts.concat(inside);
      clear(ul); active = -1;
      if (!shown.length) ul.appendChild(h('li', { class: 'empty', role: 'option', 'aria-disabled': 'true', text: o.emptyText || 'Ничего не найдено' }));
      shown.forEach(function (it, i) {
        var li = h('li', { role: 'option', id: id + '-' + i, 'aria-selected': 'false' }, it.label, it.hint ? h('small', { text: it.hint }) : null);
        li.addEventListener('click', function () { pick(it); });
        ul.appendChild(li);
      });
      ul.hidden = false; inp.setAttribute('aria-expanded', 'true');
    }
    function close() { ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); active = -1; }
    function pick(it) { label = it.label; inp.value = label; close(); o.onPick(it); }
    function mark(i) {
      var lis = $$('li', ul);
      lis.forEach(function (li, k) { li.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      active = i;
      if (lis[i]) { inp.setAttribute('aria-activedescendant', lis[i].id); lis[i].scrollIntoView({ block: 'nearest' }); }
    }
    ul.addEventListener('mousedown', function (e) { e.preventDefault(); });
    inp.addEventListener('focus', function () { if (!inp.disabled) { render(''); inp.select(); } });
    inp.addEventListener('input', function () { render(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (ul.hidden) render(inp.value); mark(Math.min(active + 1, shown.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mark(Math.max(active - 1, 0)); }
      else if (e.key === 'Enter') { if (!ul.hidden) { e.preventDefault(); var it = shown[active >= 0 ? active : (shown.length === 1 ? 0 : -1)]; if (it) pick(it); } }
      else if (e.key === 'Escape') { close(); inp.value = label; }
    });
    inp.addEventListener('blur', function () {
      if (ul.hidden) return;
      var v = inp.value.trim().toLowerCase(), hit = null;
      items().forEach(function (it) { if (it.label.toLowerCase() === v) hit = it; });
      if (hit && hit.label !== label) { pick(hit); return; }
      close(); inp.value = label;
    });
    return {
      set: function (t) { label = t || ''; inp.value = label; },
      enable: function (on, ph) { inp.disabled = !on; if (ph) inp.placeholder = ph; }
    };
  }
  function brandItems() { return D.brands.map(function (b) { return { value: b.slug, label: b.name }; }); }
  function modelItems(slug) {
    var b = brandBySlug[slug];
    return b ? b.models.map(function (m) { return { value: m.s, label: m.n }; }) : [];
  }

  /* ---------- Калькулятор: построение ---------- */
  var el = {};
  var heroBrand, heroModel, calcBrand, calcModel;

  function buildCalc() {
    el.pkgGrid = $('#pkg-grid'); el.arches = $('#arches'); el.archesPrice = $('#arches-price'); el.archesStub = $('#arches-stub'); el.archesOff = $('#arches-off');
    el.classbox = $('#classbox'); el.className = $('#class-name'); el.classSil = $('#class-sil'); el.classNote = $('#class-note');
    el.custom = $('#custom'); el.customText = $('#custom-text'); el.silGrid = $('#sil-grid');
    el.resBody = $('#result-body'); el.formWrap = $('#calc-form-wrap');

    heroBrand = makeCombo({ input: $('#hero-brand'), list: $('#hero-brand-lb'), items: brandItems, onPick: function (it) { setBrand(it.value); } });
    heroModel = makeCombo({ input: $('#hero-model'), list: $('#hero-model-lb'), items: function () { return modelItems(S.brand); }, onPick: function (it) { setModel(it.value); } });
    calcBrand = makeCombo({ input: $('#calc-brand'), list: $('#calc-brand-lb'), items: brandItems, onPick: function (it) { setBrand(it.value); } });
    calcModel = makeCombo({ input: $('#calc-model'), list: $('#calc-model-lb'), items: function () { return modelItems(S.brand); }, onPick: function (it) { setModel(it.value); } });

    D.pkgs.forEach(function (id) {
      var p = PK[id];
      var price = h('span', { class: 'pkg-price na', 'data-price': id }), incEl = h('span', { class: 'pkg-inc' });
      p.inc.forEach(function (x) { add(incEl, x); });
      var card = h('label', { class: 'pkg' },
        h('input', { type: 'radio', name: 'pkg', value: id }),
        h('span', { class: 'pkg-body' },
          h('span', { class: 'pkg-name', text: p.name }),
          h('span', { class: 'pkg-who', text: p.who }),
          incEl,
          h('span', { class: 'pkg-inc' }, 'Срок: ', ['[N]', 'hours'], ' ч'),
          price));
      $('input', card).addEventListener('change', function () { setPkg(id); });
      el.pkgGrid.appendChild(card);
    });
    applyCfg(el.pkgGrid);
    /* телефон: состав пакетов свёрнут (у выбранного пакета виден всегда), кнопка раскрывает все */
    var tg = $('#pkg-toggle');
    tg.addEventListener('click', function () {
      var on = !el.pkgGrid.classList.contains('show-inc');
      el.pkgGrid.classList.toggle('show-inc', on);
      tg.setAttribute('aria-expanded', on ? 'true' : 'false');
      tg.textContent = on ? 'Скрыть состав пакетов' : 'Показать состав пакетов';
    });

    $('#arches-pick').addEventListener('click', function () { S.pkg = 'standard'; S.arches = true; goal('calc_package'); goal('calc_arches'); render(); el.arches.focus({ preventScroll: true }); });
    el.arches.addEventListener('change', function () { S.arches = el.arches.checked; goal('calc_arches'); render(); });
    $('#calc-nomodel').addEventListener('click', function () { setCustom(true); el.customText.focus(); });
    $('#hero-nomodel').addEventListener('click', function () { setCustom(true); scrollTo($('#calc')); setTimeout(function () { el.customText.focus({ preventScroll: true }); }, 400); });
    $('#custom-back').addEventListener('click', function () { setCustom(false); $('#calc-brand').focus(); });
    el.customText.addEventListener('input', function () { S.customText = el.customText.value; render(true); });

    MAIN_CLASSES.forEach(function (c) {
      var inp = h('input', { type: 'radio', name: 'sil', value: c.code });
      inp.addEventListener('change', function () { S.customCls = c.code; goal('calc_custom_class'); render(); });
      el.silGrid.appendChild(h('label', { class: 'sil' }, inp,
        h('span', {}, h('img', { src: 'img/' + c.sil + '.svg', width: '800', height: '450', alt: 'Силуэт автомобиля: ' + c.name, loading: 'lazy', decoding: 'async' }), c.name)));
    });

    $('#hero-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!S.brand) { $('#hero-brand').focus(); return; }
      if (!S.model) { $('#hero-model').focus(); return; }
      goal('calc_price_shown');
      scrollTo($('#calc'));
    });
  }

  /* ---------- Калькулятор: действия ---------- */
  function setBrand(slug) {
    if (slug === S.brand && !S.custom) return;
    S.brand = slug; S.model = null; S.custom = false; S.customCls = null;
    goal('calc_brand'); render();
    setTimeout(function () { var m = $('#calc-model'); if (document.activeElement && document.activeElement.id === 'calc-brand') m.focus(); }, 0);
  }
  function setModel(slug) { S.model = slug; S.custom = false; goal('calc_model'); render(); }
  function setPkg(id) {
    S.pkg = id; if (id === 'bottom') S.arches = false;
    goal('calc_package'); render();
  }
  function setCustom(on) {
    S.custom = on;
    if (on) { S.brand = null; S.model = null; goal('calc_no_model'); } else { S.customCls = null; S.customText = ''; }
    render();
  }

  /* ---------- Калькулятор: отрисовка ---------- */
  function render(keepFocus) {
    var cls = curClass(), b = curBrand(), m = curModel();
    heroBrand.set(b ? b.name : ''); calcBrand.set(b ? b.name : '');
    heroModel.set(m ? m.n : ''); calcModel.set(m ? m.n : '');
    var ph = b ? 'Начните вводить модель' : 'Сначала выберите марку';
    heroModel.enable(!!b, ph); calcModel.enable(!!b, ph);

    el.custom.hidden = !S.custom;
    $('#calc-model-field').hidden = S.custom;
    $('#calc-nomodel').hidden = S.custom;
    if (!keepFocus && el.customText.value !== S.customText) el.customText.value = S.customText;
    $$('input', el.silGrid).forEach(function (i) { i.checked = i.value === S.customCls; });

    el.classbox.hidden = !cls;
    if (cls) {
      var c = classByCode[cls];
      clear(el.className);
      el.className.appendChild(document.createTextNode(c.name));
      if (c.special) { el.className.appendChild(document.createTextNode(' ')); add(el.className, ['[название класса — уточняется]']); }
      el.classSil.src = 'img/' + (m && m.v ? m.v : c.sil) + '.svg'; /* силуэт по типу кузова модели, если он известен (build_data.py), иначе силуэт класса */
      el.classSil.alt = 'Силуэт автомобиля: ' + c.name;
      var note = '';
      if (S.custom) note = 'Проверим класс по вашей модели и подтвердим цену при звонке';
      else if (m && m.d === 2) note = 'Класс уточним: в нашей таблице он вызывает сомнения; подтвердим по вашей машине до начала работ';
      else if (m && m.d) note = 'Класс уточним: у этой модели возможны два варианта, показан старший, чтобы цена на осмотре не выросла';
      el.classNote.textContent = note; el.classNote.hidden = !note;
    }

    $$('[data-price]', el.pkgGrid).forEach(function (p) {
      var id = p.getAttribute('data-price'), v = cls ? priceOf(id, cls) : null;
      clear(p);
      if (!cls) { p.className = 'pkg-price na'; p.textContent = 'Выберите модель — покажем цену'; }
      else if (v == null) { p.className = 'pkg-price na'; p.textContent = 'Цену назовём при звонке'; }
      else { p.className = 'pkg-price'; p.appendChild(document.createTextNode(rub(v))); p.appendChild(document.createTextNode(' ')); p.appendChild(h('small', { class: 'pn', text: 'цены будут уточнены' })); }
    });
    $$('input[name=pkg]', el.pkgGrid).forEach(function (i) { i.checked = i.value === S.pkg; });

    el.arches.disabled = S.pkg === 'bottom';
    el.arches.checked = S.arches && S.pkg !== 'bottom';
    clear(el.archesPrice);
    if (cls) { el.archesPrice.appendChild(document.createTextNode('+' + rub(archesOf(cls)) + ' ')); el.archesPrice.appendChild(h('small', { class: 'pn', text: 'цены будут уточнены' })); }
    else { el.archesPrice.appendChild(document.createTextNode('+\u00a0')); add(el.archesPrice, ['[10 000]']); el.archesPrice.appendChild(document.createTextNode('\u00a0₽')); }

    if (el.archesStub) el.archesStub.hidden = S.pkg !== 'antishum';
    el.archesOff.hidden = S.pkg !== 'bottom';
    el.arches.closest('.switch').classList.toggle('off', S.pkg === 'bottom');
    renderResult();
    syncUrl();
  }

  function renderResult() {
    var cls = curClass(), r = el.resBody;
    clear(r);
    if (!cls) { el.formWrap.hidden = true; r.appendChild(h('p', { class: 'res-empty', text: 'Выберите марку и модель — здесь появится цена.' })); return; }
    if (!S.pkg) { el.formWrap.hidden = true; r.appendChild(h('p', { class: 'res-empty', text: 'Выберите пакет — здесь появится итог с ценой и составом работ.' })); return; }
    var t = total(S.pkg, cls, S.arches), inc = PK[S.pkg].incShort + (S.arches && S.pkg !== 'bottom' ? ' · шумоизоляция арок' : '');
    r.appendChild(h('p', { class: 'res-title', text: carLabel() + ' · ' + pkgLabel() }));
    if (t == null) r.appendChild(h('p', { class: 'res-price na', text: 'Цену назовём при звонке' }));
    else r.appendChild(h('p', { class: 'res-price' }, rub(t), ' ', h('small', { class: 'pn', text: 'цены будут уточнены' })));
    goal('calc_price_shown');
    r.appendChild(h('div', { class: 'res-list' },
      h('p', {}, h('b', { text: 'Что входит' }), inc + '.'),
      h('p', {}, h('b', { text: 'Что может изменить цену' }), 'сильная ржавчина, которую надо зачистить до обработки · снятие старого антикора · нестандартная защита или обвес. Об этом скажем на осмотре — до начала работ.'),
      h('p', {}, h('b', { text: 'Когда цена окончательная' }), 'после осмотра машины в боксе. Записываем её в заказ-наряд, и после этого она не меняется ', ['[уточняется]'], '.'),
      h('p', {}, h('b', { text: 'Гарантия' }), ['[N]', 'years'], ' лет на покрытие в обработанных зонах, при условиях · ', h('a', { href: '#warranty' }, 'условия'))));
    var go = h('button', { class: 'btn', type: 'button', text: 'Записаться с этим расчётом' });
    go.addEventListener('click', function () { el.formWrap.hidden = false; scrollTo(el.formWrap); setTimeout(function () { $('#calc-phone').focus({ preventScroll: true }); }, 350); goal('calc_book'); });
    var cp = h('button', { class: 'btn btn-ghost', type: 'button', text: 'Скопировать ссылку на расчёт' });
    var st = h('p', { class: 'hint', role: 'status' });
    cp.addEventListener('click', function () { copyText(calcLink(), st); goal('calc_link_copy'); });
    var sh = h('button', { class: 'btn btn-ghost', type: 'button', text: 'Отправить в Telegram' });
    sh.addEventListener('click', shareTg);
    r.appendChild(h('div', { class: 'res-btns' }, go, cp, sh, st));
    r.appendChild(h('div', { class: 'res-q' },
      h('a', { href: '#q-smell' }, 'Запах — ', ['[N]', 'odor_days'], ' дней, расскажем, как проветрить'),
      h('a', { href: '#q-cavity' }, 'Полости — список зон по вашей машине'),
      h('a', { href: '#q-conveyor' }, 'Одна машина — один пост на весь день ', ['[подтвердить]']),
      h('a', { href: '#q-queue' }, 'Ближайшая запись — ', ['[через N дней / на ближайшие дни]', 'nearest'])));
    applyCfg(r);
  }

  function copyText(text, statusEl) {
    function ok() { statusEl.textContent = 'Ссылка скопирована'; }
    function fallback() {
      var ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;left:-9999px' }); ta.value = text;
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { statusEl.textContent = 'Не удалось скопировать. Ссылка: ' + text; }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }
  function shareTg() {
    var t = total(S.pkg, curClass(), S.arches), text = carLabel() + ' · ' + pkgLabel() + (t != null ? ' — ' + rub(t) : ''), url = calcLink();
    goal('click_telegram');
    window.open('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  /* ---------- Таблица цен ---------- */
  function buildPriceTable() {
    var box = $('#price-table'), pk = D.pkgs;
    var thead = h('tr', {}, h('th', { scope: 'col', text: 'Класс (примеры моделей)' }));
    pk.forEach(function (id) { thead.appendChild(h('th', { scope: 'col', text: PK[id].name })); });
    thead.appendChild(h('th', { scope: 'col', text: '+ шумоизоляция арок' }));
    var tb = h('tbody');
    MAIN_CLASSES.forEach(function (c) {
      var tr = h('tr', {}, h('th', { scope: 'row' }, c.name, h('small', { text: c.examples.join(', ') })));
      pk.forEach(function (id) { tr.appendChild(h('td', { text: fmt(priceOf(id, c.code)) })); });
      tr.appendChild(h('td', { text: fmt(archesOf(c.code)) }));
      tb.appendChild(tr);
    });
    box.appendChild(h('table', { class: 'price-tbl' }, h('caption', { class: 'vh', text: 'Цены на антикор по классам, ₽' }), h('thead', {}, thead), tb));

    var tabs = h('div', { class: 'tabs' }), list = h('div', { class: 'tablist', role: 'tablist', 'aria-label': 'Пакет' }), panel = h('div', { role: 'tabpanel', id: 'tabpanel' });
    var btns = [];
    function select(id, focus) {
      btns.forEach(function (b) { var on = b.getAttribute('data-id') === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      clear(panel); panel.setAttribute('aria-labelledby', 'tab-' + id);
      var ul = h('ul', { class: 'tab-list' });
      MAIN_CLASSES.forEach(function (c) {
        ul.appendChild(h('li', {}, h('span', {}, c.name, h('small', { text: c.examples.join(', ') }),
          id !== 'bottom' ? h('small', { text: '+ шумоизоляция арок ' + rub(archesOf(c.code)) }) : null), h('b', { text: rub(priceOf(id, c.code)) })));
      });
      panel.appendChild(ul);
    }
    pk.forEach(function (id, i) {
      var b = h('button', { class: 'tab', type: 'button', role: 'tab', id: 'tab-' + id, 'data-id': id, 'aria-controls': 'tabpanel', text: PK[id].name });
      b.addEventListener('click', function () { select(id); });
      b.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (k) { e.preventDefault(); select(pk[(i + k + pk.length) % pk.length], true); }
      });
      btns.push(b); list.appendChild(b);
    });
    tabs.appendChild(list); tabs.appendChild(panel); box.appendChild(tabs);
    select('standard');
  }

  /* Чек-лист сравнения: «Почему это важно» на телефоне свёрнуто, на широком экране всегда открыто */
  function initCompare() {
    var mq = window.matchMedia ? window.matchMedia('(min-width:900px)') : null;
    function sync() { $$('.cmp .why').forEach(function (d) { d.open = !mq || mq.matches; }); }
    sync();
    if (mq && mq.addEventListener) mq.addEventListener('change', sync);
  }

  function heroExample() {
    var b = brandBySlug.geely, m = b && b.bySlug.coolray;
    if (m) $('#hero-example').textContent = carName(b, m) + ', пакет «' + PK.standard.name + '» — ' + rub(priceOf('standard', m.c));
  }

  /* ---------- Формы и заявки ---------- */
  function mskParts() {
    var f = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }), o = {};
    f.formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    if (o.hour === '24') o.hour = '00';
    return o;
  }
  var seq = 0;
  function nextLeadId() {
    var p = mskParts(); seq += 1;
    return p.year + '-' + p.month + '-' + p.day + '-' + ('000' + seq).slice(-4);
  }
  function phoneOk(v) {
    var d = String(v).replace(/\D/g, '');
    if (d.length === 11) return d.charAt(0) === '7' || d.charAt(0) === '8';
    return d.length === 10;
  }

  function initForm(form, type, getCtx) {
    var slot = $('.consent', form);
    if (slot) slot.appendChild($('#tpl-consent').content.cloneNode(true));
    var u = utm();
    Object.keys(u).forEach(function (k) { var i = form.elements[k]; if (i) i.value = u[k]; });
    var cb = form.elements.pd_consent, btn = $('button[type=submit]', form), hint = $('.consent-hint', form), ph = form.elements.phone, er = $('.err', form);
    function sync() { btn.disabled = !cb.checked; hint.hidden = cb.checked; }
    cb.addEventListener('change', sync); sync();
    ph.addEventListener('input', function () { er.hidden = true; ph.removeAttribute('aria-invalid'); });
    /* Отправка только через общую проверку: у формы method="dialog" (вне окна ничего не отправляет),
       а программный submit() переводим на requestSubmit(), чтобы сработала проверка согласия. */
    form.submit = function () { if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true })); };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!cb.checked) { hint.hidden = false; cb.focus(); return; }
      if (!phoneOk(ph.value)) {
        er.textContent = 'Введите телефон полностью: например, +7 900 000-00-00'; er.hidden = false; ph.setAttribute('aria-invalid', 'true'); ph.focus(); return;
      }
      submitLead(form, getCtx());
    });
  }

  function buildLead(form, ctx) {
    var p = mskParts(), v = function (n) { var i = form.elements[n]; return i && i.value ? i.value : ''; };
    var pkg = ctx.pkg || null, cls = ctx.cls || null, c = cls ? classByCode[cls] : null;
    var t = pkg && cls ? total(pkg, cls, ctx.arches) : null;
    var u = utm();
    return {
      lead_id: nextLeadId(),
      created_at: p.day + '.' + p.month + '.' + p.year + ' ' + p.hour + ':' + p.minute + ' МСК',
      form: ctx.form,
      brand: ctx.brand || '', model: ctx.model || '', class_code: cls || '', class_name: c ? c.name : '',
      model_custom: ctx.custom ? (ctx.customText || '') : '', class_selected_by_user: !!ctx.custom,
      package: pkg || '', arches: !!(ctx.arches && pkg && pkg !== 'bottom'),
      price_shown: t, price_version: D.version, calc_link: ctx.link || '',
      name: v('name'), phone: v('phone'), contact_method: v('contact_method'),
      car_age: ctx.car_age != null ? ctx.car_age : v('car_age'),
      underbody_state: ctx.underbody_state != null ? ctx.underbody_state : v('underbody_state'),
      prior_treatment: ctx.prior_treatment || '', priority: ctx.priority || '',
      utm_source: v('utm_source'), utm_medium: v('utm_medium'), utm_campaign: v('utm_campaign'), utm_content: v('utm_content'), utm_term: v('utm_term'), yclid: v('yclid'),
      metrika_client_id: v('ym_client_id'),
      page_url: location.href.split('#')[0], referrer: document.referrer || '',
      pd_consent: !!form.elements.pd_consent.checked, pd_consent_at: p.day + '.' + p.month + '.' + p.year + ' ' + p.hour + ':' + p.minute + ' МСК', policy_version: CONFIG.policyVersion
    };
  }
  /* Сообщение в мессенджер (Telegram или MAX) и письмо на почту: имя, телефон и все ответы формы (решение владельца 03.11.2026).
     В прототипе ничего не отправляется - текст только показывается на экране. */
  function tgText(l) {
    var pk = l.package ? PK[l.package].name + (l.arches ? ' + шумоизоляция арок' : '') : '';
    var car = l.model_custom ? l.model_custom + ' (класс выбран клиентом: ' + l.class_name + ')' : (l.brand ? joinName(l.brand, l.model) + ', класс: ' + l.class_name : 'не указана');
    var lines = ['Новая заявка ' + l.lead_id + ' от ' + l.created_at, 'Имя: ' + (l.name || 'не указано'), 'Телефон: ' + l.phone];
    if (l.contact_method) lines.push('Как связаться: ' + l.contact_method);
    lines.push('Машина: ' + car);
    if (pk) lines.push('Пакет: ' + pk);
    if (l.price_shown != null && l.price_shown !== '') lines.push('Цена в расчёте: ' + rub(l.price_shown));
    if (l.car_age) lines.push('Возраст машины: ' + l.car_age);
    if (l.underbody_state) lines.push('Состояние днища: ' + l.underbody_state);
    if (l.prior_treatment) lines.push('Прежняя обработка: ' + l.prior_treatment);
    if (l.priority) lines.push('Что главное: ' + l.priority);
    lines.push('Форма: ' + (FORM_RU[l.form] || l.form) + (l.calc_link ? ' · расчёт: ' + l.calc_link : ''));
    return lines.join('\n');
  }
  function submitLead(form, ctx) {
    var l = buildLead(form, ctx);
    goal(l.form === 'quiz' ? 'lead_quiz' : l.form === 'contact' ? 'lead_contact' : 'lead_calc');
    $('#out-tg').textContent = tgText(l);
    $('#out-crm').textContent = JSON.stringify(l, null, 2);
    $('#out-goals').textContent = goals.join('\n');
    var tc = l.package ? [l.brand ? joinName(l.brand, l.model) : (l.model_custom || 'машина без модели в списке'), PK[l.package].name + (l.arches ? ' + шумоизоляция арок' : ''), l.price_shown != null ? rub(l.price_shown) : 'цену назовём при звонке'].join(' · ') : 'расчёт не выбирали';
    $('#thanks-calc').textContent = tc;
    $('#thanks-copy-st').textContent = '';
    $('#thanks').dataset.link = l.calc_link || (location.href.split('#')[0]);
    var d = $('#thanks');
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    applyCfg(d);
    window.__lastLead = l;
  }
  function initThanks() {
    var d = $('#thanks');
    $('#thanks-close').addEventListener('click', function () { if (d.close) d.close(); else d.removeAttribute('open'); });
    $('#thanks-copy').addEventListener('click', function () { copyText(d.dataset.link, $('#thanks-copy-st')); goal('calc_link_copy'); });
  }

  function calcCtx() {
    var m = curModel(), b = curBrand();
    return { form: S.custom ? 'no_model' : 'calc', brand: b ? b.name : '', model: m ? m.n : '', cls: curClass(), custom: S.custom, customText: S.customText,
      pkg: S.pkg, arches: S.arches, link: calcLink() };
  }

  /* ---------- Квиз ---------- */
  var QDEF = [
    { key: 'car_age', q: 'Сколько лет машине?', opts: ['Новая, пробег до 1 000 км', 'До 3 лет', '4–10 лет', 'Старше 10 лет'] },
    { key: 'underbody_state', q: 'Что сейчас с днищем?', opts: ['Чистое, ржавчины нет', 'Есть пятна ржавчины, сколы', 'Много ржавчины, были ремонты', 'Не знаю'] },
    { key: 'prior_treatment', q: 'Машину уже обрабатывали?', opts: ['Нет или не знаю', 'Да, меньше 2 лет назад', 'Да, давно'] },
    { key: 'priority', q: 'Что для вас главное?', opts: ['Защитить днище за минимальные деньги', 'Надёжная защита днища, арок и полостей', 'Защита и меньше шума в салоне', 'Самая полная защита металла'] }
  ];
  var Q_PKG = ['bottom', 'standard', 'antishum', 'zinc'];
  var Q_WHY = ['Вы хотите защитить днище за минимальные деньги.', 'Вы хотите надёжную защиту днища, арок и скрытых полостей.', 'Вам важны защита и меньше шума в салоне.', 'Вам нужна самая полная из наших защит.'];
  var Q = { step: 0, a: [null, null, null, null], brand: null, model: null };
  var qBody;

  function qCar() {
    var b = Q.brand ? brandBySlug[Q.brand] : null, m = b && Q.model ? b.bySlug[Q.model] : null;
    return m ? { brand: b, model: m } : null;
  }
  function qGo(step, focus) {
    Q.step = step;
    if (step >= 1 && step <= 5) goal('quiz_step_' + step);
    renderQuiz(focus !== false);
  }
  function renderQuiz(focus) {
    clear(qBody);
    var s = Q.step, head;
    if (s === 0) {
      head = h('h3', { tabindex: '-1', text: 'Подберём пакет за минуту' });
      var go = h('button', { class: 'btn', type: 'button', text: 'Подобрать пакет' });
      go.addEventListener('click', function () { goal('quiz_start'); qGo(1); });
      qBody.appendChild(head); qBody.appendChild(go);
    } else if (s >= 1 && s <= 4) {
      var d = QDEF[s - 1];
      qBody.appendChild(h('p', { class: 'q-prog', text: 'Вопрос ' + s + ' из 4' }));
      qBody.appendChild(h('div', { class: 'q-bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + (s * 20) + '%' })));
      head = h('h3', { tabindex: '-1', text: d.q }); qBody.appendChild(head);
      var opts = h('div', { class: 'q-opts' });
      d.opts.forEach(function (o, i) {
        var b = h('button', { class: 'q-opt', type: 'button', 'aria-pressed': Q.a[s - 1] === i ? 'true' : 'false', text: o });
        b.addEventListener('click', function () { Q.a[s - 1] = i; qGo(s + 1); });
        opts.appendChild(b);
      });
      qBody.appendChild(opts);
      if (s > 1) qBody.appendChild(h('div', { class: 'q-nav' }, qBack(s)));
    } else if (s === 5) {
      qBody.appendChild(h('p', { class: 'q-prog', text: 'Последний шаг · необязательно' }));
      qBody.appendChild(h('div', { class: 'q-bar', 'aria-hidden': 'true' }, h('i', { style: 'width:100%' })));
      head = h('h3', { tabindex: '-1', text: 'Марка и модель' }); qBody.appendChild(head);
      qBody.appendChild(h('p', { class: 'hint', text: 'Если укажете — покажем цену для вашей машины.' }));
      var f1 = h('div', { class: 'field' }), f2 = h('div', { class: 'field' });
      var i1 = h('input', { id: 'quiz-brand', type: 'text', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'quiz-brand-lb', 'aria-autocomplete': 'list', autocomplete: 'off', placeholder: 'Начните вводить: Haval, Lada, Geely…' });
      var l1 = h('ul', { id: 'quiz-brand-lb', role: 'listbox', hidden: true });
      var i2 = h('input', { id: 'quiz-model', type: 'text', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'quiz-model-lb', 'aria-autocomplete': 'list', autocomplete: 'off', placeholder: 'Сначала выберите марку', disabled: true });
      var l2 = h('ul', { id: 'quiz-model-lb', role: 'listbox', hidden: true });
      f1.appendChild(h('label', { for: 'quiz-brand', text: 'Марка' })); f1.appendChild(h('div', { class: 'combo' }, i1, l1));
      f2.appendChild(h('label', { for: 'quiz-model', text: 'Модель' })); f2.appendChild(h('div', { class: 'combo' }, i2, l2));
      qBody.appendChild(f1); qBody.appendChild(f2);
      var nxt = h('button', { class: 'btn', type: 'button' });
      function upd() { nxt.textContent = qCar() ? 'Показать результат' : 'Пропустить и показать результат'; }
      var cb1 = makeCombo({ input: i1, list: l1, items: brandItems, onPick: function (it) { Q.brand = it.value; Q.model = null; cb2.set(''); cb2.enable(true, 'Начните вводить модель'); upd(); } });
      var cb2 = makeCombo({ input: i2, list: l2, items: function () { return modelItems(Q.brand); }, onPick: function (it) { Q.model = it.value; upd(); } });
      if (Q.brand) { cb1.set(brandBySlug[Q.brand].name); cb2.enable(true, 'Начните вводить модель'); if (Q.model) cb2.set(brandBySlug[Q.brand].bySlug[Q.model].n); }
      upd();
      nxt.addEventListener('click', function () { qGo(6); });
      qBody.appendChild(h('div', { class: 'q-nav' }, qBack(s), nxt));
    } else {
      renderQuizResult();
      head = $('h3', qBody);
    }
    if (focus && head) head.focus({ preventScroll: true });
  }
  function qBack(s) {
    var b = h('button', { class: 'btn btn-ghost', type: 'button', text: 'Назад' });
    b.addEventListener('click', function () { qGo(s - 1); });
    return b;
  }
  function renderQuizResult() {
    var pi = Q.a[3] == null ? 1 : Q.a[3], id = Q_PKG[pi], car = qCar();
    qBody.appendChild(h('h3', { tabindex: '-1', text: 'Вам подойдёт пакет «' + PK[id].name + '»' }));
    var why = h('div', { class: 'q-extra' }, h('p', { text: Q_WHY[pi] + ' Точнее скажем на осмотре: посмотрим днище и покажем вам.' }));
    if ((Q.a[0] === 0 || Q.a[0] === 1) && id === 'bottom') why.appendChild(h('p', null, 'Для новой машины подойдёт Стандарт или Антишум: заводская защита, как правило, закрывает не все зоны ', ['[уточнить]'], '. Покажем на осмотре, что есть на вашей машине. Решать вам.'));
    if (Q.a[1] === 2) why.appendChild(h('p', { text: 'Сначала посмотрим днище: возможно, нужна зачистка, и цена изменится. Скажем до начала работ.' }));
    if (Q.a[2] === 1) why.appendChild(h('p', { text: 'Покажем на осмотре, что осталось от прежнего покрытия. Возможно, хватит меньшего пакета.' }));
    qBody.appendChild(why);
    var priceBox = h('p', { class: 'q-price' });
    if (car) {
      var v = priceOf(id, car.model.c);
      priceBox.appendChild(document.createTextNode(carName(car.brand, car.model) + ': ' + (v != null ? rub(v) : 'цену назовём при звонке') + ' '));
      if (v != null) priceBox.appendChild(h('small', { class: 'pn', text: 'цены будут уточнены' }));
    } else {
      priceBox.appendChild(document.createTextNode('От ' + rub(priceOf(id, 'AB')) + ' для малых машин (А, В) '));
      priceBox.appendChild(h('small', { class: 'pn', text: 'цены будут уточнены · цена вашей машины — в калькуляторе' }));
    }
    qBody.appendChild(priceBox);
    if (!car) {
      var oc = h('button', { class: 'btn btn-ghost', type: 'button', text: 'Открыть калькулятор с этим пакетом' });
      oc.addEventListener('click', function () { S.pkg = id; if (id === 'bottom') S.arches = false; goal('quiz_to_calc'); render(); scrollTo($('#calc')); });
      qBody.appendChild(oc);
    }
    var form = $('#tpl-quiz-form').content.firstElementChild.cloneNode(true);
    qBody.appendChild(form);
    initForm(form, 'quiz', function () {
      return { form: 'quiz', brand: car ? car.brand.name : '', model: car ? car.model.n : '', cls: car ? car.model.c : null, pkg: id, arches: false,
        link: '', car_age: QDEF[0].opts[Q.a[0]] || '', underbody_state: QDEF[1].opts[Q.a[1]] || '', prior_treatment: QDEF[2].opts[Q.a[2]] || '', priority: QDEF[3].opts[Q.a[3]] || '' };
    });
    var nav = h('div', { class: 'q-nav' }, qBack(6));
    var re = h('button', { class: 'btn btn-ghost', type: 'button', text: 'Пройти заново' });
    re.addEventListener('click', function () { Q.a = [null, null, null, null]; Q.brand = null; Q.model = null; qGo(0); });
    nav.appendChild(re); qBody.appendChild(nav);
  }

  /* ---------- Прочее ---------- */
  function initCookie() {
    var b = $('#cookie'), ok = false;
    try { ok = localStorage.getItem('ak_cookie') === '1'; } catch (e) { /* нет хранилища */ }
    b.hidden = ok;
    document.body.classList.toggle('has-cookie', !ok);
    $('#cookie-ok').addEventListener('click', function () { b.hidden = true; document.body.classList.remove('has-cookie'); try { localStorage.setItem('ak_cookie', '1'); } catch (e) { /* нет хранилища */ } });
  }
  function initMetrikaId() {
    /* ЗАГЛУШКА: когда владелец даст номер счётчика и подключит код, поле уйдёт вместе с заявкой в CRM. */
    if (window.ym && CONFIG.ymId) {
      window.ym(CONFIG.ymId, 'getClientID', function (id) { $$('input[name=ym_client_id]').forEach(function (i) { i.value = id; }); });
    }
  }

  function init() {
    applyFlags();
    qBody = $('#quiz-body');
    buildCalc();
    buildPriceTable();
    heroExample();
    initCompare();
    var fromUrl = readUrl();
    initForm($('#calc-form'), 'calc', calcCtx);
    initForm($('#contact-form'), 'contact', function () { return { form: 'contact', link: '' }; });
    initThanks();
    renderQuiz(false);
    render();
    initMetrikaId();
    initCookie();
    applyCfg(document);
    if (fromUrl) setTimeout(function () { scrollTo($('#calc')); }, 50);
    window.AK = { data: D, total: total, priceOf: priceOf, archesOf: archesOf, state: S, quiz: Q, goals: goals, config: CONFIG };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
