/* Галерея «цилиндр»: карточки идут по дуге при прокрутке страницы.
   Собственная реализация «Альфа-Контекста» (10.11.2026), без библиотек. Версия 2: по решению владельца вид и движение 1:1 с эталоном (его параметры перечислены в README), код свой.
   Принцип: карточки лежат на боковой поверхности горизонтального цилиндра; прокрутка страницы
   внутри высокого блока крутит цилиндр, сам блок «приклеен» к окну (position: sticky).
   Подключение и параметры — README.md рядом. */
(function () {
  'use strict';

  var DEG = Math.PI / 180;

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function make(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  /* Только локальные адреса своего сайта (без чужих серверов, javascript:, data:). */
  function localUrl(u) {
    if (typeof u !== 'string') return '';
    u = u.trim();
    if (!u || /[\s,]/.test(u)) return '';
    try {
      var a = new URL(u, document.baseURI);
      if (a.protocol !== location.protocol || a.host !== location.host) return '';
      if (a.protocol !== 'http:' && a.protocol !== 'https:' && a.protocol !== 'file:') return '';
    } catch (e) { return ''; }
    return u;
  }
  /* srcset: проверяем каждого кандидата; хоть один чужой — весь srcset отбрасываем */
  function localSrcset(v) {
    if (typeof v !== 'string' || !v.trim()) return '';
    var parts = v.split(','), out = [];
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].trim().split(/\s+/);
      if (!t[0] || t.length > 2 || !localUrl(t[0])) return '';
      if (t[1] && !/^\d+(\.\d+)?[wx]$/.test(t[1])) return '';
      out.push(t.join(' '));
    }
    return out.join(', ');
  }

  function init(root) {
    var dataNode = root.querySelector('script[type="application/json"]');
    var items;
    try { items = JSON.parse(dataNode.textContent); } catch (e) { return; }
    if (!Array.isArray(items) || items.length < 2) return;
    var n = items.length;
    var ds = root.dataset;
    /* классы подписи из данных — только из белого списка на корне: data-scg-classes="stub other" */
    var okCls = (ds.scgClasses || '').split(/\s+/).filter(function (c) { return /^[A-Za-z][\w-]*$/.test(c); });
    function safeCls(c) { return typeof c === 'string' && okCls.indexOf(c) !== -1 ? c : ''; }

    /* параметры (все необязательные; значения по умолчанию совпадают с эталоном владельца) */
    var cfg = {
      angle: num(ds.scgAngle, 27),            // градусов на одну карточку
      radius: num(ds.scgRadius, 2.8),         // радиус цилиндра в высотах карточки...
      radiusMin: num(ds.scgRadiusMin, 800),   // ...но не меньше и не больше этих px
      radiusMax: num(ds.scgRadiusMax, 1350),
      ease: num(ds.scgEase, 110.5),           // постоянная сглаживания, мс: 14 % остатка пути за кадр при 60 к/с
      perspective: num(ds.scgPerspective, 1900),
      width: num(ds.scgWidth, 1600),          // исходная ширина картинки (для width/height)
      height: num(ds.scgHeight, 1000)
    };
    var L = {
      skip: ds.scgSkipLabel || 'Пропустить галерею',
      group: ds.scgLabel || 'Галерея. Стрелки вверх и вниз листают карточки',
      of: ds.scgLabelOf || 'из',
      open: ds.scgOpenLabel || 'Смотреть проект',
      hint: ds.scgHint || 'ЛИСТАЙТЕ ВНИЗ ↓',
      prev: ds.scgLabelPrev || 'Предыдущая карточка',
      next: ds.scgLabelNext || 'Следующая карточка'
    };

    /* ---------- разметка ---------- */
    var track = make('div', 'scg__track');
    track.style.setProperty('--scg-n', n);
    var pin = make('div', 'scg__pin');
    var bg = make('div', 'scg__bg');
    bg.setAttribute('aria-hidden', 'true');
    var bgLayers = [];

    var head = null;
    if (ds.scgEyebrow || ds.scgHeading) {
      head = make('div', 'scg__head');
      if (ds.scgEyebrow) head.appendChild(make('span', 'scg__eyebrow', ds.scgEyebrow));
      var h2 = make('div', 'scg__h2');   // не h2: заголовок страницы уже есть выше, здесь декоративная надпись
      h2.appendChild(document.createTextNode(ds.scgHeading || ''));
      if (ds.scgAccent) {
        h2.appendChild(document.createTextNode(' '));
        h2.appendChild(make('em', null, ds.scgAccent));
      }
      head.appendChild(h2);
      head.setAttribute('aria-hidden', 'true');
    }

    var stage = make('div', 'scg__stage');
    stage.tabIndex = 0;
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-label', L.group);
    stage.style.perspective = cfg.perspective + 'px';

    var meta = make('div', 'scg__meta');
    var count = make('p', 'scg__count');
    count.setAttribute('aria-hidden', 'true');
    var countNow = make('b', 'scg__now', two(1));
    count.appendChild(countNow);
    count.appendChild(make('span', 'scg__total', ' / ' + two(n)));
    var cap = make('div', 'scg__cap');
    cap.setAttribute('aria-live', 'polite');
    cap.setAttribute('aria-atomic', 'true');
    var capSr = make('span', 'scg__sr');
    var capTitle = make('span', 'scg__title');
    var capText = make('span', 'scg__text');
    cap.appendChild(capSr);
    cap.appendChild(capTitle);
    cap.appendChild(capText);
    var open = make('a', 'scg__open');
    open.hidden = true;
    open.appendChild(document.createTextNode(L.open + ' '));
    var arrow = make('span', null, '↗');
    arrow.setAttribute('aria-hidden', 'true');
    open.appendChild(arrow);
    meta.appendChild(count);
    meta.appendChild(cap);
    meta.appendChild(open);

    var foot = make('div', 'scg__foot');
    var hint = make('span', 'scg__hint', L.hint);
    hint.setAttribute('aria-hidden', 'true');
    var progress = make('div', 'scg__progress');
    progress.setAttribute('aria-hidden', 'true');
    var progressFill = make('i');
    progress.appendChild(progressFill);
    var nav = make('div', 'scg__nav');
    var btnPrev = make('button', 'scg__btn');
    btnPrev.appendChild(make('span', null, '←'));
    btnPrev.type = 'button';
    btnPrev.setAttribute('aria-label', L.prev);
    var btnNext = make('button', 'scg__btn');
    btnNext.appendChild(make('span', null, '→'));
    btnNext.type = 'button';
    btnNext.setAttribute('aria-label', L.next);
    nav.appendChild(btnPrev);
    nav.appendChild(btnNext);
    foot.appendChild(hint);
    foot.appendChild(progress);
    foot.appendChild(nav);

    var cards = [];
    items.forEach(function (it, i) {
      var tone = /^#[0-9a-fA-F]{3,8}$/.test(it.tone || '') ? it.tone : '#2a3038';
      var src = localUrl(it.image);
      var thumb = localUrl(it.thumb) || src;
      var cls = safeCls(it.cls);

      var layer = make('div', 'scg__bgl');
      layer.style.backgroundColor = tone;
      layer.style.visibility = 'hidden';
      if (src) {
        var bimg = make('img');
        bimg.src = thumb;
        bimg.alt = '';
        bimg.width = cfg.width;
        bimg.height = cfg.height;
        bimg.loading = 'lazy';
        bimg.decoding = 'async';
        layer.appendChild(bimg);
      }
      bg.appendChild(layer);
      bgLayers.push(layer);

      var card = make('figure', 'scg__card');
      var face = make('div', 'scg__face');
      if (src) {
        var img = make('img');
        img.src = src;
        var set = localSrcset(it.srcset);
        if (set) {
          img.srcset = set;
          img.sizes = '(min-width: 1000px) 760px, 92vw';
        }
        img.alt = it.alt || '';
        img.width = cfg.width;
        img.height = cfg.height;
        img.loading = 'lazy';
        img.decoding = 'async';
        face.appendChild(img);
      } else {
        face.style.backgroundColor = tone;
        face.appendChild(make('span', 'scg__ph', it.placeholder || ''));
        face.setAttribute('role', 'img');
        face.setAttribute('aria-label', it.alt || it.placeholder || '');
      }
      var shade = make('span', 'scg__shade');
      card.appendChild(face);
      card.appendChild(shade);
      var fc = make('figcaption', 'scg__fc');
      fc.appendChild(make('strong', cls || null, it.title || ''));
      if (it.text) fc.appendChild(make('span', null, it.text));
      card.appendChild(fc);
      stage.appendChild(card);
      cards.push({ node: card, shade: shade, vis: null });
    });
    bg.appendChild(make('div', 'scg__tint'));

    /* порядок в DOM = порядок Tab: «Пропустить» → галерея → кнопка проекта → стрелки */
    var skipHref = ds.scgSkip;
    if (skipHref) {
      var skip = make('a', 'scg__skip', L.skip);
      skip.href = skipHref;
      pin.appendChild(skip);
    }
    pin.appendChild(bg);
    if (head) pin.appendChild(head);
    pin.appendChild(stage);
    pin.appendChild(meta);
    pin.appendChild(foot);
    track.appendChild(pin);
    root.appendChild(track);
    root.classList.add('scg--ready');
    var fades = [meta, foot];
    if (head) fades.push(head);

    /* ---------- состояние ---------- */
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    /* низкое узкое окно (телефон «лёжа»): цилиндру не хватает высоты, показываем обычный список */
    var low = window.matchMedia('(max-height: 560px) and (max-width: 1000px)');
    /* Доступная высота липкой части (ревью r3, Важно 2): считаем в пикселях из --scg-pin-h с учётом шапки и нижней панели сайта.
       Меньше MIN_PIN — цилиндру не хватает места, показываем список. min-height в CSS убран: сцена не вылезает за окно */
    var MIN_PIN = 480;
    var probe = make('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:var(--scg-pin-h);visibility:hidden;pointer-events:none';
    root.appendChild(probe);
    function tooLow() { return low.matches || probe.offsetHeight < MIN_PIN; }
    var isStatic = null;   // null: режим ещё не выбран
    var inView = false;
    var cur = 0, target = 0, active = -1, goal = null, goalTimer = 0;
    var raf = 0, last = 0;
    var cardH = 0, stuck = 0, pinH = 0;
    var OVER = 0.06;      // запас в начале: цилиндр стартует чуть выше первой карточки

    function measure() {
      cardH = cards[0].node.offsetHeight;
      pinH = pin.offsetHeight;
      stuck = parseFloat(getComputedStyle(pin).top) || 0;
    }

    /* Положение цилиндра, в карточках: от −0,06 до n. Последняя карточка стоит по центру при n−1,
       остаток (до n) уходит на выход из блока: подписи гаснут. */
    function readTarget() {
      var r = track.getBoundingClientRect();
      var range = r.height - pinH;
      if (range <= 0) return 0;
      return clamp(stuck - r.top, 0, range) / range * (n + OVER) - OVER;
    }

    function setActive(i) {
      if (active === i) return;
      active = i;
      var it = items[i];
      countNow.textContent = two(i + 1);
      capSr.textContent = (i + 1) + ' ' + L.of + ' ' + n + '. ';
      capTitle.textContent = it.title || '';
      capTitle.className = 'scg__title' + (safeCls(it.cls) ? ' ' + safeCls(it.cls) : '');
      capText.textContent = it.text || '';
      var u = localUrl(it.url);
      if (u) {
        open.href = u;
        open.setAttribute('aria-label', L.open + ': ' + (it.title || ''));
        open.hidden = false;
      } else {
        open.hidden = true;
        open.removeAttribute('href');
      }
      cards.forEach(function (c, k) {
        if (k === i) c.node.removeAttribute('aria-hidden'); else c.node.setAttribute('aria-hidden', 'true');
      });
      btnPrev.setAttribute('aria-disabled', i === 0 ? 'true' : 'false');
      btnNext.setAttribute('aria-disabled', i === n - 1 ? 'true' : 'false');
      progressFill.style.width = ((i + 1) / n * 100) + '%';
    }

    /* Раскладка по цилиндру. pos — дробный номер карточки в центре. */
    function render(pos) {
      var R = clamp(cardH * cfg.radius, cfg.radiusMin, cfg.radiusMax);
      var top = Math.min(pos, n - 1);
      for (var i = 0; i < n; i++) {
        var rel = i - pos;
        var ad = Math.abs(rel);
        var c = cards[i];
        var shown = ad <= 2;
        if (shown !== c.vis) {
          c.node.style.visibility = shown ? 'visible' : 'hidden';
          c.node.style.willChange = shown ? 'transform, opacity' : '';   // подсказка только видимым карточкам
          c.vis = shown;
        }
        if (shown) {
          var a = rel * cfg.angle * DEG;
          c.node.style.transform = 'translate3d(0,' + (R * Math.sin(a)).toFixed(2) + 'px,' + (R * Math.cos(a) - R).toFixed(2) + 'px) rotateX(' + (rel * cfg.angle).toFixed(3) + 'deg) translate(-50%,-50%)';
          c.node.style.opacity = Math.max(0, 1 - ad * 0.24).toFixed(3);
          c.shade.style.opacity = Math.min(0.35, ad * 0.22).toFixed(3);
        }
        /* размытый фон: слой стоит выше всего, пока его карточка в центре, и уезжает на 22 % за шаг */
        var bo = Math.max(0, 1 - Math.abs(i - top));
        var bl = bgLayers[i];
        var bshow = bo > 0.001 ? 'visible' : 'hidden';
        if (bl.style.visibility !== bshow) {
          bl.style.visibility = bshow;
          bl.style.willChange = bo > 0.001 ? 'transform, opacity' : '';
        }
        if (bo > 0.001) {
          bl.style.opacity = bo.toFixed(3);
          bl.style.transform = 'translateY(' + (rel * 22).toFixed(2) + '%) scale(1.6)';
        }
      }
      var outro = clamp((pos - (n - 1) - 0.15) / 0.75, 0, 1);
      for (var k = 0; k < fades.length; k++) {
        fades[k].style.opacity = (1 - outro).toFixed(3);
        fades[k].style.pointerEvents = outro > 0.8 ? 'none' : '';
        /* погасшее убираем и из порядка Tab; если фокус был внутри — переносим на сцену */
        var gone = outro > 0.98;
        if (gone && fades[k].style.visibility !== 'hidden') {
          if (fades[k].contains(document.activeElement)) stage.focus({ preventScroll: true });
          fades[k].style.visibility = 'hidden';
        } else if (!gone && fades[k].style.visibility === 'hidden') {
          fades[k].style.visibility = '';
        }
      }
      setActive(clamp(Math.round(pos), 0, n - 1));
    }

    function tick(ts) {
      raf = 0;
      if (isStatic) return;
      if (!inView) { cur = target; render(cur); return; }
      var dt = last ? Math.min(ts - last, 50) : 16.67;
      last = ts;
      cur += (target - cur) * (1 - Math.exp(-dt / cfg.ease));
      if (Math.abs(target - cur) < 0.0005) {
        cur = target;
        last = 0;
      } else {
        raf = requestAnimationFrame(tick);
      }
      render(cur);
    }
    function kick() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function onScroll() {
      if (isStatic || !inView) return;
      target = readTarget();
      if (goal !== null && Math.abs(target - goal) < 0.03) goal = null;
      kick();
    }

    function snap() {
      measure();
      target = cur = readTarget();
      render(cur);
    }

    /* ---------- управление ---------- */
    function goTo(i) {
      i = clamp(i, 0, n - 1);
      goal = i;
      clearTimeout(goalTimer);
      goalTimer = setTimeout(function () { goal = null; }, 1200);
      var r = track.getBoundingClientRect();
      var range = r.height - pinH;
      var top = window.pageYOffset + r.top - stuck + (i + OVER) / (n + OVER) * range;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
    function dropGoal() {
      goal = null;
      clearTimeout(goalTimer);
    }
    /* человек сам крутит колесом, пальцем или тянет полосу: программная цель больше не нужна */
    /* нажатие на собственные стрелки (pointerdown, touchstart, клавиша) цель не сбрасывает: повторное нажатие идёт дальше по цепочке.
       А вот колесо и фактическое движение пальца сбрасывают цель везде, в том числе над стрелками (ревью r3, Важно 1) */
    function ownNav(e) { return e.target && e.target.nodeType === 1 && nav.contains(e.target); }
    ['touchstart', 'pointerdown'].forEach(function (ev) {
      window.addEventListener(ev, function (e) { if (!ownNav(e)) dropGoal(); }, { passive: true });
    });
    ['wheel', 'touchmove'].forEach(function (ev) {
      window.addEventListener(ev, dropGoal, { passive: true });
    });
    window.addEventListener('keydown', function (e) {
      if (!e.defaultPrevented && !ownNav(e)) dropGoal();   // клавиши галереи (preventDefault) и стрелок цель не сбрасывают
    });
    window.addEventListener('scrollend', dropGoal);
    function here() { return goal !== null ? goal : clamp(Math.round(target), 0, n - 1); }
    function step(dir) { goTo(here() + dir); }

    btnPrev.addEventListener('click', function () { if (here() > 0) step(-1); });
    btnNext.addEventListener('click', function () { if (here() < n - 1) step(1); });

    stage.addEventListener('keydown', function (e) {
      if (isStatic || e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.key, to = null;
      if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') to = here() - 1;
      else if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown') to = here() + 1;
      else if (k === 'Home') to = 0;
      else if (k === 'End') to = n - 1;
      if (to === null) return;
      /* у края не перехватываем: страница прокрутится дальше сама */
      if (to < 0 || to > n - 1) return;
      e.preventDefault();
      goTo(to);
    });

    /* ---------- режимы ---------- */
    /* will-change только пока блок на экране и работает: слоям не держим лишнюю память */
    function setLive() { root.classList.toggle('scg--live', inView && !isStatic); }

    function applyMode() {
      var wantStatic = reduce.matches || tooLow();
      if (wantStatic === isStatic) {
        if (!wantStatic) snap();
        return;
      }
      var wasMode = isStatic;
      isStatic = wantStatic;
      if (wasMode !== null) {
        /* смена режима посреди перехода: гасим плавную прокрутку браузера, таймер, цель и кадр */
        dropGoal();
        window.scrollTo({ top: window.pageYOffset, behavior: 'instant' });
        last = 0;
      }
      root.classList.toggle('scg--static', isStatic);
      setLive();
      if (isStatic) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        cards.forEach(function (c) {
          c.node.removeAttribute('style');
          c.node.removeAttribute('aria-hidden');
          c.vis = null;
        });
        fades.forEach(function (f) { f.removeAttribute('style'); });
      } else {
        active = -1;
        snap();
      }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var was = inView;
        inView = entries[entries.length - 1].isIntersecting;
        setLive();
        if (inView && !was && !isStatic) snap();
      }, { rootMargin: '20% 0px 20% 0px' }).observe(track);
    } else {
      inView = true;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { applyMode(); }, 80);
    });
    window.addEventListener('load', function () { if (!isStatic) snap(); });
    if (reduce.addEventListener) reduce.addEventListener('change', applyMode);
    else if (reduce.addListener) reduce.addListener(applyMode);
    if (low.addEventListener) low.addEventListener('change', applyMode);
    else if (low.addListener) low.addListener(applyMode);

    applyMode();
  }

  function start() {
    var roots = document.querySelectorAll('[data-scg]');
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
