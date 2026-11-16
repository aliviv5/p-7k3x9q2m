/* Галерея «стопка карточек» (drag-stack-gallery). Чистый JS, без библиотек и внешних запросов.
   Разметка (фото, подписи) лежит в HTML; скрипт только читает её и двигает карточки: строк с HTML не собирает.
   Настройки на корне [data-dsg]: data-axis="x|y" (по умолчанию x), data-step="100" (пикселей на карточку),
   data-start="0", data-label (название для скринридера), data-hint-x / data-hint-y (подсказки).
   «Уменьшение движения» (prefers-reduced-motion) — скрипт выключается, остаётся список; переключение на лету. */
(function () {
  'use strict';

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var roots = document.querySelectorAll('[data-dsg]');
  for (var r = 0; r < roots.length; r++) {
    if (roots[r].getAttribute('data-dsg-ready') === '1') { continue; }   // скрипт могли подключить второй раз (например, два блока T123): корень уже занят
    roots[r].setAttribute('data-dsg-ready', '1');
    new Gallery(roots[r]);
  }

  /* power2.out и power3.out как в образце: 1 − (1 − t)^3 и 1 − (1 − t)^4 */
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function outQuart(t) { return 1 - Math.pow(1 - t, 4); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function num(v, d, a, b) { v = parseFloat(v); return isNaN(v) ? d : clamp(v, a, b); }

  function Gallery(root) {
    var stage = root.querySelector('.dsg__stage');
    var cards = Array.prototype.slice.call(root.querySelectorAll('.dsg__card'));
    var n = cards.length;
    if (!stage || n < 2) { return; }

    var axis = 'x';                                                 // читается при включении: ось можно сменить на лету
    var step = num(root.getAttribute('data-step'), 100, 40, 300);   // сколько пикселей перетаскивания = одна карточка
    var startIdx = Math.round(num(root.getAttribute('data-start'), 0, 0, n - 1));
    // параметры образца по умолчанию: сдвиг соседней карточки 100, наклон 55° на шаг, глубина 450; можно переопределить
    var SPACING = num(root.getAttribute('data-spacing'), 100, 0, 800);
    var ROT = num(root.getAttribute('data-rot'), 55, 0, 80);
    var DEPTH = num(root.getAttribute('data-depth'), 450, 0, 1500);
    var INTRO_MS = 1500, INTRO_STAGGER = 100, TWEEN_MS = 500;

    var live = false, listeners = [], dotsBox = null, dots = [], sr = null, io = null;
    var pos = startIdx, idx = -1, tween = null, introOn = true, introT0 = null, inview = true, raf = 0;
    var drag = null, touch = null, suppressUntil = 0, resume = null, savedStyle = null, savedDrag = null;
    var hintOrig = null;
    var hintEl = root.querySelector('.dsg__hint');

    function on(t, type, fn, opts) { t.addEventListener(type, fn, opts || false); listeners.push([t, type, fn, opts || false]); }
    function offAll() { listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); listeners = []; }

    /* ---------- положение карточки по смещению off = индекс − позиция ---------- */
    function pose(off) {
      var a = Math.abs(off);
      return {
        m: off * SPACING,                           // сдвиг вдоль оси
        z: -a * DEPTH,                              // глубина
        rot: off * ROT * (axis === 'y' ? 1 : -1),   // наклон: по X для вертикали, по Y для горизонтали
        s: 1 - 0.25 * Math.min(1, a),               // масштаб 1 → 0,75
        o: Math.max(0.4, 1 - a * 0.25)              // прозрачность как в образце
      };
    }
    function mix(f, t, k) { return f + (t - f) * k; }

    function render() {
      var now = performance.now();
      var introK = 1;
      for (var i = 0; i < n; i++) {
        var off = i - pos, p = pose(off);
        var m = p.m, rot = p.rot, s = p.s, o = p.o;
        if (introOn) {
          var k = introT0 === null ? 0 : outQuart(clamp((now - introT0 - i * INTRO_STAGGER) / INTRO_MS, 0, 1));
          introK = Math.min(introK, k);
          m = mix(p.m + (axis === 'y' ? window.innerHeight : window.innerWidth), p.m, k);
          rot = mix(axis === 'y' ? 90 : -90, p.rot, k);
          s = mix(0.5, p.s, k);
          o = mix(0, p.o, k);
        }
        var c = cards[i];
        c.style.transform = (axis === 'y'
          ? 'translate3d(0,' + m + 'px,' + p.z + 'px) rotateX(' + rot + 'deg)'
          : 'translate3d(' + m + 'px,0,' + p.z + 'px) rotateY(' + rot + 'deg)') + ' scale(' + s + ')';
        c.style.opacity = o;
      }
      if (introOn && introT0 !== null && now - introT0 >= INTRO_MS + (n - 1) * INTRO_STAGGER) { introOn = false; }
      setIdx(clamp(Math.round(pos), 0, n - 1));
    }

    function setIdx(i) {
      if (i === idx) { return; }
      idx = i;
      for (var j = 0; j < n; j++) {
        cards[j].classList.toggle('is-active', j === i);
        cards[j].setAttribute('aria-hidden', j === i ? 'false' : 'true');
        if (dots[j]) { dots[j].setAttribute('aria-current', j === i ? 'true' : 'false'); }
      }
      root.setAttribute('data-dsg-index', String(i));
    }

    function announce() {
      if (!sr) { return; }
      var cap = cards[idx].querySelector('figcaption');
      sr.textContent = 'Фото ' + (idx + 1) + ' из ' + n + (cap ? ': ' + cap.textContent : '');
    }

    /* ---------- цикл анимации: крутится, только пока что-то движется и блок на экране ---------- */
    function want() { return !!(tween || (introOn && introT0 !== null)); }
    function kick() { if (!raf && live) { raf = requestAnimationFrame(frame); } }
    function frame(ts) {
      raf = 0;
      if (!live) { return; }
      if (!inview) {                                  // вне экрана не анимируем: мгновенно доводим до конца
        if (tween) { pos = tween.to; tween = null; render(); announce(); }
        if (introOn && introT0 !== null) { introOn = false; }   // вступление, которое уже началось, дожимаем; не начавшееся ждёт показа
        render();
        return;
      }
      if (tween) {
        var k = clamp((ts - tween.t0) / tween.dur, 0, 1);
        pos = mix(tween.from, tween.to, outCubic(k));
        if (k >= 1) { pos = tween.to; tween = null; render(); announce(); }
      }
      render();
      if (want()) { kick(); }
    }

    function goTo(i, ms) {
      i = clamp(Math.round(i), 0, n - 1);
      tween = { from: pos, to: i, t0: performance.now(), dur: ms || TWEEN_MS };
      kick();
    }
    function goal() { return tween ? tween.to : clamp(Math.round(pos), 0, n - 1); }

    function finishIntro() { if (introOn) { introOn = false; if (introT0 === null) { introT0 = 0; } render(); } }

    /* ---------- перетаскивание ---------- */
    function rubber(p) {                              // за краями стопка поддаётся с сопротивлением
      if (p < 0) { return p * 0.35; }
      if (p > n - 1) { return (n - 1) + (p - (n - 1)) * 0.35; }
      return p;
    }
    function dragBegin(c) {
      finishIntro();
      tween = null;
      drag = { c0: c, p0: pos, moved: false, samples: [{ t: performance.now(), c: c }] };
      root.classList.add('dsg--grabbing', 'dsg--touched');
    }
    function dragMove(c) {
      if (!drag) { return; }
      var d = c - drag.c0, t = performance.now();
      if (Math.abs(d) > 5) { drag.moved = true; }
      pos = rubber(drag.p0 - d / step);
      drag.samples.push({ t: t, c: c });
      while (drag.samples.length > 2 && t - drag.samples[0].t > 120) { drag.samples.shift(); }
      render();
    }
    function dragEnd() {
      if (!drag) { return; }
      var s = drag.samples, a = s[0], b = s[s.length - 1], v = 0;
      if (b.t - a.t > 8 && performance.now() - b.t < 80) { v = (b.c - a.c) / (b.t - a.t); }   // пикселей в мс
      var target = clamp(Math.round(pos - v * 320 / step), 0, n - 1);                          // «бросок»: прибавляем путь по инерции
      var span = Math.abs(target - pos);
      if (drag.moved) { suppressUntil = performance.now() + 350; }      // клик после перетаскивания не считаем нажатием на карточку
      drag = null;
      root.classList.remove('dsg--grabbing');
      goTo(target, clamp(TWEEN_MS + Math.max(0, span - 1) * 120, TWEEN_MS, 1100));
    }
    function coord(e) { return axis === 'y' ? e.clientY : e.clientX; }

    /* мышь и перо — события указателя */
    function onPointerDown(e) {
      if (e.pointerType === 'touch' || (e.button !== undefined && e.button !== 0)) { return; }
      try { stage.setPointerCapture(e.pointerId); } catch (x) { /* не критично */ }
      dragBegin(coord(e));
      drag.id = e.pointerId;
    }
    function onPointerMove(e) { if (drag && drag.id === e.pointerId) { dragMove(coord(e)); } }
    function onPointerUp(e) { if (drag && drag.id === e.pointerId) { dragEnd(); } }

    /* палец — события касания: нужно самим решить, отдать ли жест странице */
    function onTouchStart(e) {
      if (e.touches.length !== 1) { touch = null; if (drag) { dragEnd(); } return; }
      var t = e.touches[0];
      touch = { x: t.clientX, y: t.clientY, mode: null, stopped: false };
      if (drag) { dragEnd(); }
      if (tween) {                                   // палец лёг на едущую стопку: останавливаем её там, где она сейчас (ревью r1, Важно 2)
        tween = null; touch.stopped = true;
        render();
      }
    }
    function onTouchMove(e) {
      if (!touch || e.touches.length !== 1) { return; }
      var t = e.touches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
      var main = axis === 'y' ? dy : dx, cross = axis === 'y' ? dx : dy;
      if (touch.mode === null) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 3) { return; }
        if (Math.abs(main) < Math.abs(cross)) { touch.mode = 'page'; return; }       // жест поперёк оси: страница листается сама
        if (axis === 'y' && !tween) {                                                  // у краёв стопки прокрутку отдаём странице
          var settled = Math.abs(pos - Math.round(pos)) < 0.05;
          if (settled && ((Math.round(pos) <= 0 && main > 0) || (Math.round(pos) >= n - 1 && main < 0))) { touch.mode = 'page'; return; }
        }
        touch.mode = 'drag';
        dragBegin(axis === 'y' ? touch.y : touch.x);
      }
      if (touch.mode === 'drag') {
        if (e.cancelable) { e.preventDefault(); }
        dragMove(coord(t));
      }
    }
    function onTouchEnd() {
      if (touch && touch.mode === 'drag' && drag) { dragEnd(); }
      else if (touch && touch.stopped && !drag) { goTo(Math.round(pos)); }     // только остановили и отпустили: доводим до ближайшей карточки
      touch = null;
    }

    function onClick(e) {
      if (performance.now() < suppressUntil) { return; }
      var el = e.target, c = null;
      while (el && el !== stage) { if (el.classList && el.classList.contains('dsg__card')) { c = el; break; } el = el.parentNode; }
      if (!c) { return; }
      var i = cards.indexOf(c);
      if (i !== goal()) { root.classList.add('dsg--touched'); goTo(i); }
    }

    function onKey(e) {
      var g = goal(), t = null;
      var k = e.key;
      if (k === 'ArrowLeft') { t = g - 1; }
      else if (k === 'ArrowRight') { t = g + 1; }
      else if (axis === 'y' && k === 'ArrowUp') { t = g - 1; }
      else if (axis === 'y' && k === 'ArrowDown') { t = g + 1; }
      else if (k === 'Home') { t = 0; }
      else if (k === 'End') { t = n - 1; }
      else { return; }
      if (t < 0 || t > n - 1) { return; }             // у края клавишу не перехватываем: страница прокрутится сама
      e.preventDefault();
      finishIntro();
      root.classList.add('dsg--touched');
      goTo(t);
    }

    /* ---------- включение и выключение ---------- */
    function enable() {
      if (live) { return; }
      live = true;
      axis = root.getAttribute('data-axis') === 'y' ? 'y' : 'x';
      root.classList.add('dsg--live');
      savedDrag = [];
      cards.forEach(function (c) { var im = c.querySelector('img'); savedDrag.push(im ? im.getAttribute('draggable') : null); });
      stage.setAttribute('tabindex', '0');
      stage.setAttribute('role', 'group');
      stage.setAttribute('aria-roledescription', 'карусель');
      stage.setAttribute('aria-label', (root.getAttribute('data-label') || 'Фото') + (axis === 'y' ? '. Стрелки вверх и вниз листают фото' : '. Стрелки влево и вправо листают фото'));
      cards.forEach(function (c) { var im = c.querySelector('img'); if (im) { im.setAttribute('draggable', 'false'); } });

      dotsBox = document.createElement('div');
      dotsBox.className = 'dsg__dots';
      dots = cards.map(function (c, i) {
        var b = document.createElement('button'), cap = c.querySelector('figcaption');
        b.type = 'button';
        b.className = 'dsg__dot';
        b.setAttribute('aria-label', 'Фото ' + (i + 1) + ' из ' + n + (cap ? ': ' + cap.textContent : ''));
        b.addEventListener('click', function () { finishIntro(); root.classList.add('dsg--touched'); goTo(i); });
        dotsBox.appendChild(b);
        return b;
      });
      stage.parentNode.insertBefore(dotsBox, stage.nextSibling);
      sr = document.createElement('p');
      sr.className = 'dsg__sr';
      sr.setAttribute('aria-live', 'polite');
      root.appendChild(sr);

      if (hintEl) {
        hintOrig = hintEl.textContent;
        var h = root.getAttribute('data-hint-' + axis);
        if (h) { hintEl.textContent = h; }
      }

      on(stage, 'pointerdown', onPointerDown);
      on(stage, 'pointermove', onPointerMove);
      on(stage, 'pointerup', onPointerUp);
      on(stage, 'pointercancel', onPointerUp);
      on(stage, 'lostpointercapture', onPointerUp);
      on(stage, 'touchstart', onTouchStart, { passive: true });
      on(stage, 'touchmove', onTouchMove, { passive: false });
      on(stage, 'touchend', onTouchEnd);
      on(stage, 'touchcancel', onTouchEnd);
      on(stage, 'click', onClick);
      on(stage, 'keydown', onKey);
      on(stage, 'dragstart', function (e) { e.preventDefault(); });

      idx = -1; tween = null; drag = null; touch = null;
      if (resume !== null) { pos = resume; introOn = false; introT0 = 0; resume = null; }   // смена оси на лету: остаёмся на той же карточке без нового вступления
      else { pos = startIdx; introOn = true; introT0 = null; }
      cards.forEach(function (c) { c.classList.remove('is-active'); });
      render();
      setIdx(startIdx);

      if ('IntersectionObserver' in window) {
        inview = false;
        io = new IntersectionObserver(function (es) {
          var e = es[es.length - 1];
          inview = e.isIntersecting;
          root.classList.toggle('dsg--inview', inview);
          if (inview) {
            if (introOn && introT0 === null) { introT0 = performance.now(); }
            kick();
          } else { kick(); }                                                   // кадр доведёт движение до конца без анимации
        }, { threshold: 0.2 });
        io.observe(stage);
      } else {
        inview = true;
        root.classList.add('dsg--inview');
        introT0 = performance.now();
        kick();
      }
    }

    function disable() {
      if (!live) { return; }
      live = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (io) { io.disconnect(); io = null; }
      offAll();
      drag = null; touch = null; tween = null;
      cards.forEach(function (c, i) {
        c.style.removeProperty('transform'); c.style.removeProperty('opacity');            // чужие inline-стили страницы не трогаем (ревью r1, Мелочь)
        if (!c.getAttribute('style')) { c.removeAttribute('style'); }
        c.removeAttribute('aria-hidden'); c.classList.remove('is-active');
        var im = c.querySelector('img');
        if (im) { if (savedDrag && savedDrag[i] !== null) { im.setAttribute('draggable', savedDrag[i]); } else { im.removeAttribute('draggable'); } }
      });
      if (dotsBox && dotsBox.parentNode) { dotsBox.parentNode.removeChild(dotsBox); }
      if (sr && sr.parentNode) { sr.parentNode.removeChild(sr); }
      dotsBox = null; sr = null; dots = [];
      ['tabindex', 'role', 'aria-roledescription', 'aria-label'].forEach(function (a) { stage.removeAttribute(a); });
      root.removeAttribute('data-dsg-index');
      root.classList.remove('dsg--live', 'dsg--grabbing', 'dsg--inview', 'dsg--touched');
      if (hintEl && hintOrig !== null) { hintEl.textContent = hintOrig; }
    }

    function sync() { if (mq && mq.matches) { disable(); } else { enable(); } }
    sync();
    /* data-axis сменили на лету: завершаем жест и перестраиваем управление, описание и отрисовку по новой оси (ревью r1, Важно 1) */
    if (window.MutationObserver) {
      new MutationObserver(function () {
        var want = root.getAttribute('data-axis') === 'y' ? 'y' : 'x';
        if (!live || want === axis) { return; }
        resume = clamp(Math.round(pos), 0, n - 1);
        disable();
        enable();
      }).observe(root, { attributes: true, attributeFilter: ['data-axis'] });
    }
    if (mq) {
      if (mq.addEventListener) { mq.addEventListener('change', sync); } else if (mq.addListener) { mq.addListener(sync); }
    }
  }
})();
