/* Шторка «до / после». «Альфа-Контекст», 16.11.2026. Своя реализация, без библиотек.
   Разметка: <figure class="ba" data-ba [data-ba-start="50"] [data-ba-label="..."]>
               <div class="ba__view"><img class="ba__img ba__after" ...><img class="ba__img ba__before" ...></div>
             </figure>
   Скрипт достраивает ползунок (role="slider"), подписи «До» и «После», перетаскивание мышью и пальцем, клавиши. Без скрипта виден только «после». */
(function () {
  'use strict';
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function make(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function init(root) {
    var view = root.querySelector('.ba__view');
    if (!view || !root.querySelector('.ba__before') || !root.querySelector('.ba__after')) return;
    var label = root.getAttribute('data-ba-label') || 'Сравнение «до» и «после»: граница между кадрами';
    var start = parseFloat(root.getAttribute('data-ba-start'));
    var pos = isFinite(start) ? clamp(start, 0, 100) : 50;   // 0 — допустимое начальное значение

    var tagB = make('span', 'ba__tag ba__tag--before', 'До');
    var tagA = make('span', 'ba__tag ba__tag--after', 'После');
    var handle = make('div', 'ba__handle');
    handle.setAttribute('role', 'slider');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.setAttribute('aria-label', label);
    var knob = make('span', 'ba__knob', '↔');
    knob.setAttribute('aria-hidden', 'true');
    handle.appendChild(knob);
    view.appendChild(tagB); view.appendChild(tagA); view.appendChild(handle);
    root.classList.add('ba--ready');

    function set(v) {
      pos = clamp(v, 0, 100);
      root.style.setProperty('--ba-pos', pos + '%');
      handle.setAttribute('aria-valuenow', String(Math.round(pos)));
      handle.setAttribute('aria-valuetext', 'Показано «до»: ' + Math.round(pos) + ' %');
    }
    function fromX(x) {
      var r = view.getBoundingClientRect();
      if (r.width > 0) set((x - r.left) / r.width * 100);
    }

    var dragging = false, activeId = null;   // ведёт один указатель: второй палец и его отпускание жест не меняют
    view.addEventListener('pointerdown', function (e) {
      if (dragging) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; activeId = e.pointerId;
      root.classList.remove('ba--key');
      root.classList.add('ba--drag');
      try { view.setPointerCapture(e.pointerId); } catch (err) { /* нет захвата — не страшно */ }
      fromX(e.clientX);
      if (e.pointerType === 'mouse') e.preventDefault();
      handle.focus({ preventScroll: true });
    });
    view.addEventListener('pointermove', function (e) { if (dragging && e.pointerId === activeId) fromX(e.clientX); });
    function stop(e) {
      if (e && e.pointerId !== activeId) return;
      dragging = false; activeId = null; root.classList.remove('ba--drag');
    }
    view.addEventListener('pointerup', stop);
    view.addEventListener('pointercancel', stop);
    view.addEventListener('lostpointercapture', stop);

    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 20 : 5, v = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = pos - step;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = pos + step;
      else if (e.key === 'PageDown') v = pos - 10;
      else if (e.key === 'PageUp') v = pos + 10;
      else if (e.key === 'Home') v = 0;
      else if (e.key === 'End') v = 100;
      if (v === null) return;
      e.preventDefault();
      root.classList.add('ba--key');   // плавность только для клавиш; при reduced-motion стиль её не включает
      set(v);
    });
    set(pos);
  }

  function boot() { Array.prototype.forEach.call(document.querySelectorAll('[data-ba]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
