/* Плашка согласия на cookie и запуск Яндекс Метрики только после согласия.
   Решение владельца 16.11.2026 (подтверждено 23.11.2026): «как в Тильде» — «Принять» / «Отклонить», без Вебвизора.
   Подключение: <link rel="stylesheet" href="cookie/cookie.css"> и <script defer src="cookie/cookie.js">.
   Ссылка «Настройки cookie» — любой <a data-cookie-settings>. Файл самостоятельный: от app.js не зависит. */
(function () {
  'use strict';

  /* Номер счётчика Яндекс Метрики (число). Даст владелец.
     Пока null — Метрика не загружается вообще, плашка работает как обычно. */
  var METRIKA_ID = (window.ANTIKOR_CONFIG && Number(window.ANTIKOR_CONFIG.metrikaId)) || null;   /* единый источник — config.js (metrikaId); этот же номер использует форма */
  /* корень сайта — от адреса самого скрипта (cookie/cookie.js -> ../), чтобы ссылка работала и на вложенных страницах (/antikor-haval/) */
  var SITE_ROOT = (function () { try { var s = document.currentScript; return s && s.src ? new URL('../', s.src).href : ''; } catch (e) { return ''; } })();

  var STORAGE_KEY = 'antikorika_cookie_consent';
  var VERSION = 1;   /* поднять число — посетителей спросят заново (например, после смены политики) */

  var ymOn = false, ymGen = 0;   /* ymGen — поколение запроса идентификатора: ответ от прошлого «согласия» после отказа игнорируется */

  /* ---------- хранение выбора ---------- */
  function readChoice() {
    try {
      var d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (d && d.v === VERSION && (d.choice === 'accepted' || d.choice === 'declined')) return d.choice;
    } catch (e) { /* пусто или повреждено — считаем, что выбора нет */ }
    return null;
  }
  function saveChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: VERSION, choice: choice, date: new Date().toISOString() }));
    } catch (e) { /* нет хранилища: выбор действует до закрытия страницы */ }
  }

  /* ---------- Яндекс Метрика ---------- */
  function validId() { return typeof METRIKA_ID === 'number' && isFinite(METRIKA_ID) && METRIKA_ID > 0 ? METRIKA_ID : 0; }

  function fillClientId(value) {
    var f = document.querySelectorAll('input[name="ym_client_id"]');
    for (var i = 0; i < f.length; i++) f[i].value = value || '';
  }

  function loadMetrika() {
    var id = validId();
    if (!id || ymOn) return;
    ymOn = true;
    var gen = ++ymGen;
    window['disableYaCounter' + id] = false;
    (function (m, e, t, r, i) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      var k = e.createElement(t); k.async = 1; k.src = r; e.head.appendChild(k);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    /* Вебвизор не включаем (webvisor не указан) */
    window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
    window.ym(id, 'getClientID', function (cid) { if (ymOn && gen === ymGen) fillClientId(cid); });
  }

  /* Отказ или отзыв: новых отправок нет, свои cookie «_ym…» на нашем домене стираем (чужие домены браузер не даёт).
     Уже загруженный скрипт полностью исчезает со следующей загрузки страницы. */
  function stopMetrika() {
    var id = validId();
    ymOn = false;
    ymGen++;
    fillClientId('');
    if (id) window['disableYaCounter' + id] = true;
    var parts = location.hostname.split('.'), doms = [''], i;
    for (i = 0; i < parts.length - 1; i++) doms.push('; domain=' + parts.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (n.indexOf('_ym') === 0) doms.forEach(function (d) {
        document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
      });
    });
  }

  /* ---------- плашка ---------- */
  var box, btnYes, btnNo, lastFocus = null, current = null;

  function build() {
    box = document.createElement('div');
    box.className = 'ck';
    box.id = 'ck-banner';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Файлы cookie');
    box.hidden = true;
    box.innerHTML =
      '<p class="ck-text" id="ck-text">Мы используем файлы cookie, в том числе для статистики посещений. ' +
      'Подробнее — в <a href="' + SITE_ROOT + 'privacy.html#cookie">политике конфиденциальности</a>.</p>' +
      '<div class="ck-actions">' +
      '<button type="button" class="ck-btn ck-yes">Принять</button>' +
      '<button type="button" class="ck-btn ck-no">Отклонить</button></div>';
    box.setAttribute('aria-describedby', 'ck-text');
    btnYes = box.querySelector('.ck-yes');
    btnNo = box.querySelector('.ck-no');
    /* в начало страницы, сразу после ссылки «К содержанию»: клавиатурный посетитель доходит до плашки первым делом */
    var skip = document.querySelector('.skip');
    if (skip && skip.parentNode === document.body) document.body.insertBefore(box, skip.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);

    btnYes.addEventListener('click', function () { choose('accepted'); });
    btnNo.addEventListener('click', function () { choose('declined'); });
    box.addEventListener('keydown', function (e) {
      /* Esc закрывает только повторно открытую плашку (выбор уже есть) и ничего не меняет */
      if (e.key === 'Escape' && current !== null) { e.preventDefault(); hide(true); }
    });
    window.addEventListener('resize', layout);
  }

  /* Ниже плашки на телефоне стоит нижняя панель с кнопкой расчёта — плашка встаёт над ней, а не поверх */
  function layout() {
    if (!box || box.hidden) return;
    var dock = document.querySelector('.mobile-dock'), h = 0;
    if (dock && window.getComputedStyle(dock).display !== 'none') h = dock.offsetHeight;
    box.style.setProperty('--ck-bottom', h ? (h + 8) + 'px' : '8px');
    document.body.style.setProperty('--ck-h', (box.offsetHeight + (h ? 0 : 8)) + 'px');
  }

  function show(focus) {
    box.hidden = false;
    document.body.classList.add('ck-open');
    layout();
    if (focus) {
      lastFocus = document.activeElement;
      /* курсор на кнопку, которая соответствует текущему выбору, иначе на «Принять» */
      (current === 'declined' ? btnNo : btnYes).focus();
    }
  }
  function hide(restore) {
    box.hidden = true;
    document.body.classList.remove('ck-open');
    document.body.style.removeProperty('--ck-h');
    if (restore && lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function choose(choice) {
    var had = current;
    current = choice;
    saveChoice(choice);
    if (choice === 'accepted') loadMetrika(); else stopMetrika();
    var restore = !!lastFocus;
    hide(restore);
    try {
      document.dispatchEvent(new CustomEvent('antikorika:cookie-consent', { detail: { choice: choice, previous: had } }));
    } catch (e) { /* старые браузеры без CustomEvent: не критично */ }
  }

  /* выбор изменён в другой вкладке (отзыв согласия на странице политики и т. п.): повторяем его здесь — счётчик останавливаем, форме сообщаем событием */
  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    var c = readChoice();
    if (c === current) return;
    var had = current;
    current = c;
    if (c === 'accepted') loadMetrika(); else stopMetrika();
    if (c === null) show(false); else hide(false);
    try {
      document.dispatchEvent(new CustomEvent('antikorika:cookie-consent', { detail: { choice: c === 'accepted' ? 'accepted' : 'declined', previous: had } }));
    } catch (err) { /* старые браузеры без CustomEvent: не критично */ }
  });

  function init() {
    build();
    current = readChoice();
    if (current === 'accepted') loadMetrika();
    if (current === null) show(false);

    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-cookie-settings]') : null;
      if (!a) return;
      e.preventDefault();
      show(true);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
