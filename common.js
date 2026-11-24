/* АНТИКОРИКА — общее поведение страниц: меню, вопросы, мессенджеры, виджет связи, «гармошка» одной высоты, форма, появление блоков.
   Подключается и на главной (после data.js, перед app.js), и на страницах марок (перед brand.js). Вынесено из app.js в v8.2.
   Наружу отдаёт window.AK: хелперы и bindForm(getExtra) — страница добавляет к заявке свои поля (марка, модель, пакет, цена). */
(function(){
 'use strict';
 var CONFIG=window.ANTIKOR_CONFIG||{phone:'',endpoint:'',policyReady:false,policyVersion:'',max:'',telegram:'',metrikaId:''};
 var $=function(id){return document.getElementById(id);};
 var money=function(v){return new Intl.NumberFormat('ru-RU').format(v)+' ₽';};
 var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 function emit(name,detail){document.dispatchEvent(new CustomEvent('antikorika:'+name,{detail:detail||{}}));}
 function node(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
 function scrollToId(id,focus){$(id).scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'start'});if(focus)window.setTimeout(function(){focus.focus({preventScroll:true});},reduced.matches?0:350);}

 /* v7: пока на экране форма заявки, нижняя кнопка не нужна; пока на экране калькулятор, закрытый виджет не перекрывает его кнопки */
 if('IntersectionObserver' in window){[['lead-form','dock-off'],['calc','fab-off']].forEach(function(p){var t=$(p[0]);if(!t)return;new IntersectionObserver(function(es){document.body.classList.toggle(p[1],es[es.length-1].isIntersecting);},{threshold:0}).observe(t);});}

 /* меню */
 var menuButton=$('menu-toggle'),menu=$('main-menu');
 if(menuButton&&menu){
  var closeMenu=function(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Открыть меню');};
  menuButton.addEventListener('click',function(){var open=this.getAttribute('aria-expanded')!=='true';menu.hidden=!open;this.setAttribute('aria-expanded',String(open));this.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
  menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',closeMenu);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
  document.addEventListener('click',function(e){if(!menu.hidden&&!e.target.closest('.site-header'))closeMenu();});
 }

 /* вопросы: открыт один */
 document.querySelectorAll('.faq-list details').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)document.querySelectorAll('.faq-list details').forEach(function(other){if(other!==d)other.open=false;});});});

 /* мессенджеры и телефон */
 document.querySelectorAll('[data-channel]').forEach(function(a){var url=CONFIG[a.dataset.channel];if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',function(){emit('contact',{channel:a.dataset.channel});});}});
 var headerPhone=$('header-phone');
 if(CONFIG.phone&&headerPhone){headerPhone.href='tel:'+CONFIG.phone.replace(/[^+\d]/g,'');headerPhone.setAttribute('aria-label','Позвонить в АНТИКОРИКА');document.querySelector('.header-phone-number').textContent=CONFIG.phone;headerPhone.removeAttribute('title');var contactPhone=$('contact-phone');if(contactPhone){contactPhone.replaceChildren();var phone=node('a','',CONFIG.phone);phone.href=headerPhone.href;contactPhone.appendChild(phone);}}

 /* v7, З-6: виджет мессенджеров. Номер — заглушка до ответа владельца (CONFIG.phone). */
 (function(){var fab=$('msg-fab');if(!fab)return;var toggle=$('msg-toggle'),list=$('msg-list'),back=fab.querySelector('.msg-backdrop'),call=$('msg-call');
  if(CONFIG.phone&&call)call.href='tel:'+CONFIG.phone.replace(/[^+\d]/g,'');else if(call){call.title='Демонстрационная ссылка: номер телефона подставит владелец';}
  function setOpen(open,back2){fab.classList.toggle('is-open',open);list.hidden=!open;back.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)emit('messenger_open');if(!open&&back2)toggle.focus();}
  toggle.addEventListener('click',function(){setOpen(toggle.getAttribute('aria-expanded')!=='true',false);});
  back.addEventListener('click',function(){setOpen(false,true);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){e.preventDefault();setOpen(false,true);}});
  fab.addEventListener('focusout',function(){window.setTimeout(function(){if(toggle.getAttribute('aria-expanded')==='true'&&!fab.contains(document.activeElement))setOpen(false,false);},0);});
  list.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){emit('messenger_'+a.dataset.msg);setOpen(false,true);});});})();

 var video=document.querySelector('video');if(video){video.defaultMuted=true;video.muted=true;}

 /* форма заявки. getExtra() возвращает поля страницы; приём выключен, пока не заданы endpoint и policyReady (config.js) */
 function bindForm(getExtra){
  var form=$('lead-form');if(!form)return;var submit=form.querySelector('[type=submit]');submit.disabled=false;
  /* скрытое поле ym_client_id: по нему продажа в CRM связывается с визитом (гайд, раздел 46.12). Номер счётчика — заглушка в config.js */
  var ymId='',ymWait=Promise.resolve();
  var ymOff=false,ymGen=0;/* ymOff — посетитель отказался от cookie: идентификатор не храним и в заявку не кладём; ymGen гасит запоздавшие ответы Метрики */
  function fillYm(){var gen=++ymGen;ymWait=new Promise(function(done){if(ymOff||!(CONFIG.metrikaId&&typeof window.ym==='function')){done();return;}window.ym(Number(CONFIG.metrikaId),'getClientID',function(id){if(gen===ymGen&&!ymOff){ymId=id||'';if(form.elements.ym_client_id)form.elements.ym_client_id.value=ymId;}done();});});}
  document.addEventListener('antikorika:cookie-consent',function(e){var ok=e.detail&&e.detail.choice==='accepted';ymOff=!ok;if(!ok){ymGen++;ymId='';if(form.elements.ym_client_id)form.elements.ym_client_id.value='';}else if(!ymId)fillYm();});
  fillYm();
  form.addEventListener('submit',async function(e){e.preventDefault();if(!form.reportValidity())return;var phone=form.elements.phone.value.trim();var digits=phone.replace(/\D/g,'');if(!/^[+\d\s()\-]+$/.test(phone)||!([10,11].includes(digits.length))){$('form-status').textContent='Проверьте номер телефона: укажите 10 цифр или номер с кодом +7.';form.elements.phone.setAttribute('aria-invalid','true');form.elements.phone.focus();return;}form.elements.phone.removeAttribute('aria-invalid');if(!CONFIG.endpoint||!CONFIG.policyReady){$('form-status').textContent='Онлайн-запись пока не открыта. Напишите нам в MAX — согласуем время диагностики. Данные формы не отправлены.';return;}
   submit.disabled=true;$('form-status').textContent='Отправляем заявку…';
   /* Метрика отвечает асинхронно: если ответ ещё не пришёл, ждём его не дольше 1,5 с, чтобы первая заявка не ушла без ym_client_id */
   if(!ymId)fillYm();/* Метрика могла загрузиться уже после открытия страницы: спрашиваем ещё раз при отправке */
   await Promise.race([ymWait,new Promise(function(r){window.setTimeout(r,1500);})]);
   var payload=Object.assign({name:form.elements.name.value.trim(),phone:phone},getExtra?getExtra():{},{consent:true,policyVersion:CONFIG.policyVersion,consentTime:new Date().toISOString(),sourcePage:location.pathname,ym_client_id:form.elements.ym_client_id?form.elements.ym_client_id.value:''});
   try{var controller=new AbortController();var timeout=setTimeout(function(){controller.abort();},15000);try{var response=await fetch(CONFIG.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});if(!response.ok)throw new Error('request failed');}finally{clearTimeout(timeout);}$('form-status').textContent='Заявка принята. Свяжемся с вами для согласования времени диагностики.';form.reset();if(form.elements.ym_client_id)form.elements.ym_client_id.value=ymId;fillYm();emit('lead_received');}catch(error){$('form-status').textContent='Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в MAX.';}finally{submit.disabled=false;}
  });
 }

 /* появление блоков при прокрутке — только настольная версия и без «уменьшить анимацию» */
 if('IntersectionObserver' in window&&!reduced.matches&&!window.matchMedia('(max-width:820px)').matches){
  var revealSelector='main .hero-inner > *,main .section-head,main .calc-heading,main .calc-image,main .calc-panel,main .class-picker,main .calc-result,main .class-tabs,main .price-caption,main .package-card,main .info-card,main .price-table,main .extras,main video,main .steps li,main .ba,main .section-action,main .passport-layout > *,#rvw-widget,main .demo-notice,main .team-card,main .faq-layout > *,main .request-layout > *,main .contact-card,main .map-panel,main .brand-grid,main .model-group,main .crumbs';
  /* v7: карточки «стопки» на телефоне и планшете выезжают сами за счёт sticky; появление — только на настольной сетке */
  if(!window.matchMedia('(min-width:1100px)').matches)revealSelector=revealSelector.replace('main .info-card,','main .advantages-grid .info-card,').replace('main .steps li,','');
  document.querySelectorAll(revealSelector).forEach(function(element){if(!element.closest('.reveal'))element.classList.add('reveal');});
  document.documentElement.classList.add('js-motion');
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(element){observer.observe(element);});
 }

 /* v8, Р-14: карточки «гармошки» одной высоты — иначе верх более высокой торчит над соседней при обратной прокрутке */
 (function(){var stacks=[].slice.call(document.querySelectorAll('.stack-cards,.steps'));if(!stacks.length)return;
  function fit(){stacks.forEach(function(s){var items=[].slice.call(s.children).filter(function(c){return c.tagName==='ARTICLE'||c.tagName==='LI';});if(!items.length)return;s.style.removeProperty('--stack-h');var max=0;items.forEach(function(c){max=Math.max(max,c.offsetHeight);});s.style.setProperty('--stack-h',max+'px');});}
  fit();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);window.addEventListener('load',fit);
  var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(fit,120);});
  if('ResizeObserver' in window){var ro=new ResizeObserver(function(){clearTimeout(t);t=setTimeout(fit,60);});stacks.forEach(function(s){[].slice.call(s.children).forEach(function(c){ro.observe(c);});});}
 })();

 /* v8, Р-9: виджет мессенджеров прячется, пока касается основной кнопки, поля или формы */
 (function(){var fab=$('msg-fab');if(!fab)return;var tg=$('msg-toggle'),busy=false;
  function check(){busy=false;if(fab.classList.contains('is-open')||getComputedStyle(fab).display==='none'){document.body.classList.remove('fab-hide');return;}
   var r=tg.getBoundingClientRect();var pad=10;var hit=false;
   document.querySelectorAll('main .btn,main a,main button,main input,main select,main summary,main [role=slider],.ck-btn').forEach(function(e){if(hit)return;var b=e.getBoundingClientRect();if(b.width&&b.height&&b.right>r.left-pad&&b.left<r.right+pad&&b.bottom>r.top-pad&&b.top<r.bottom+pad)hit=true;});
   document.body.classList.toggle('fab-hide',hit);}
  function queue(){if(busy)return;busy=true;window.requestAnimationFrame(check);}
  window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue);document.addEventListener('toggle',queue,true);document.addEventListener('click',function(){window.setTimeout(queue,300);});if('MutationObserver' in window)new MutationObserver(function(){window.setTimeout(queue,250);}).observe(document.body,{attributes:true,attributeFilter:['class']});window.setTimeout(queue,300);
 })();

 window.AK={$:$,node:node,emit:emit,money:money,reduced:reduced,scrollToId:scrollToId,CONFIG:CONFIG,bindForm:bindForm};
})();
