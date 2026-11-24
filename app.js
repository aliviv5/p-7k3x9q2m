(function(){
 'use strict';
 var D=window.ANTIKOR_DATA;if(!D)return;
 // Reception stays off until the CRM/MAX handler and final legal texts are verified.
 var CONFIG=window.ANTIKOR_CONFIG||{phone:'',endpoint:'',policyReady:false,policyVersion:'',metrikaId:'',max:'https://max.ru/u/f9LHodD0cOIbzAYIX2re7tTws4j62n_qUUeIUeYYHdJiAzpBvtz0WJJWJNA',telegram:'https://t.me/Mahortov96'};
 var $=function(id){return document.getElementById(id);};
 var money=function(v){return new Intl.NumberFormat('ru-RU').format(v)+' ₽';};
 var state={brand:'',model:'',classCode:'SUV',packageIndex:1,resolved:false,modelId:''};
 var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 function emit(name,detail){document.dispatchEvent(new CustomEvent('antikorika:'+name,{detail:detail||{}}));}
 function node(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
 function currentClass(){return D.classes.find(function(c){return c.code===state.classCode;});}
 function scrollToId(id,focus){$(id).scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'start'});if(focus)window.setTimeout(function(){focus.focus({preventScroll:true});},reduced.matches?0:350);}
 var brandSelect=$('car-brand'),modelSelect=$('car-model');
 D.brands.forEach(function(b){var o=node('option','',b.name==='RAM'?'RAM (Dodge RAM)':b.name);o.value=b.name;brandSelect.appendChild(o);}); /* решение директора 24.11: подпись «RAM (Dodge RAM)» */
 function populateModels(){modelSelect.replaceChildren();var first=node('option','','Выберите модель');first.value='';modelSelect.appendChild(first);var brand=D.brands.find(function(b){return b.name===brandSelect.value;});modelSelect.disabled=!brand;if(!brand){first.textContent='Сначала выберите марку';return;}brand.models.forEach(function(m){var o=node('option','',m.name);o.value=m.id;modelSelect.appendChild(o);});}
 function updateSelection(){var summary=state.resolved?(state.brand?state.brand+' '+state.model:'Класс '+currentClass().name)+' · '+D.packages[state.packageIndex].name+' · '+money(currentClass().prices[state.packageIndex]):'Выбор автомобиля можно указать в калькуляторе выше.';$('lead-selection').textContent=summary;}
 function showUnresolved(){state.resolved=false;state.model='';state.modelId='';$('calc-result').hidden=true;$('calc-placeholder').hidden=false;updateSelection();}
 brandSelect.addEventListener('change',function(){state.brand=brandSelect.value;populateModels();showUnresolved();emit('select_brand',{brand:state.brand});});
 modelSelect.addEventListener('change',function(){var b=D.brands.find(function(x){return x.name===brandSelect.value;});var m=b&&b.models.find(function(x){return x.id===modelSelect.value;});if(!m){showUnresolved();return;}state.brand=b.name;state.model=m.name;state.modelId=m.id;state.classCode=m.classCode;state.resolved=true;renderResult(m.image,m.alt,b.name+' '+m.name);emit('calculate',{brand:b.name,model:m.name,classCode:m.classCode});});
 function updatePrices(){var c=currentClass();document.querySelectorAll('[data-price]').forEach(function(e){e.textContent=money(c.prices[Number(e.dataset.price)]);});document.querySelectorAll('[data-class]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.class===c.code));});$('price-class-caption').textContent='Цены для класса '+c.name;document.querySelectorAll('[data-caption]').forEach(function(p){p.textContent='Цены для класса '+c.name;});}
 function renderOptions(){var parent=$('result-packages');parent.replaceChildren();var c=currentClass();D.packages.forEach(function(p,index){var b=node('button','result-package');b.type='button';b.setAttribute('aria-pressed',String(index===state.packageIndex));var left=node('span');left.appendChild(node('strong','',p.short));left.appendChild(node('small','',p.hours+' · гарантия '+p.warranty));b.appendChild(left);b.appendChild(node('b','',money(c.prices[index])));b.addEventListener('click',function(){state.packageIndex=index;renderOptions();updateSelection();emit('select_package',{package:p.id,classCode:c.code});});parent.appendChild(b);});}
 function renderResult(image,alt,label){$('result-car-image').src=image;$('result-car-image').alt=alt;$('result-car-name').textContent=label;$('result-car-class').textContent='Класс автомобиля: '+currentClass().name;$('calc-placeholder').hidden=true;$('calc-result').hidden=false;renderOptions();updatePrices();updateSelection();}
 function chooseClass(code,showResult){var changed=state.classCode!==code;var c=D.classes.find(function(x){return x.code===code;});if((state.resolved&&changed)||showResult){state.brand='';state.model='';state.modelId='';brandSelect.value='';populateModels();}state.classCode=code;if(showResult||(state.resolved&&changed)){state.resolved=true;renderResult(c.image,'Пример автомобиля класса '+c.name,'Подбор по классу');}else{updatePrices();updateSelection();}emit('select_class',{classCode:code});}
 /* v7, З-3: у каждого пакета свой ряд классов (телефон и планшет); состояние одно на страницу, страница не прокручивается */
 var cardRows=[];document.querySelectorAll('.package-card .package-body').forEach(function(body){var wrap=node('div','card-class');var row=node('div','class-tabs class-tabs--card');row.setAttribute('role','group');row.setAttribute('aria-label','Класс автомобиля для цен пакета');wrap.appendChild(row);var cap=node('p','price-caption price-caption--card','');cap.setAttribute('data-caption','');wrap.appendChild(cap);body.insertBefore(wrap,body.firstChild);cardRows.push(row);});
 D.classes.forEach(function(c){var card=node('button','class-choice');card.type='button';card.dataset.class=c.code;card.setAttribute('aria-pressed','false');var im=node('img');im.src=c.image;im.alt=c.example+' — пример класса '+c.name;im.width=640;im.height=360;im.loading='lazy';card.appendChild(im);card.appendChild(node('strong','',c.name));card.appendChild(node('span','',c.label));card.addEventListener('click',function(){chooseClass(c.code,true);});$('fallback-classes').appendChild(card);function makeTab(){var tab=node('button','',c.name);tab.type='button';tab.dataset.class=c.code;tab.setAttribute('aria-pressed',String(c.code===state.classCode));tab.addEventListener('click',function(){chooseClass(c.code,false);});return tab;}
 $('package-classes').appendChild(makeTab());
 cardRows.forEach(function(row){row.appendChild(makeTab());});});
 $('missing-toggle').addEventListener('click',function(){var open=this.getAttribute('aria-expanded')!=='true';this.setAttribute('aria-expanded',String(open));$('class-picker').hidden=!open;if(open)$('class-picker').querySelector('button').focus({preventScroll:true});});
 document.querySelectorAll('[data-package]').forEach(function(b){b.addEventListener('click',function(){state.packageIndex=Number(b.dataset.package);if(state.resolved){renderOptions();updateSelection();}scrollToId('calc',state.resolved?null:brandSelect);});});
 document.querySelectorAll('[data-book]').forEach(function(b){b.addEventListener('click',function(){updateSelection();scrollToId('request',$('lead-form').elements.phone);emit('open_booking',{model:state.modelId,package:D.packages[state.packageIndex].id});});});
 /* v7: пока на экране форма заявки, нижняя кнопка не нужна и закрывает кнопку отправки; пока на экране калькулятор, закрытый виджет не перекрывает его кнопки */
 if('IntersectionObserver' in window){[['lead-form','dock-off'],['calc','fab-off']].forEach(function(p){var t=$(p[0]);if(!t)return;new IntersectionObserver(function(es){document.body.classList.toggle(p[1],es[es.length-1].isIntersecting);},{threshold:0}).observe(t);});}
 var menuButton=$('menu-toggle'),menu=$('main-menu');
 function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Открыть меню');}
 menuButton.addEventListener('click',function(){var open=this.getAttribute('aria-expanded')!=='true';menu.hidden=!open;this.setAttribute('aria-expanded',String(open));this.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
 menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',closeMenu);});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
 document.addEventListener('click',function(e){if(!menu.hidden&&!e.target.closest('.site-header'))closeMenu();});
 document.querySelectorAll('.faq-list details').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)document.querySelectorAll('.faq-list details').forEach(function(other){if(other!==d)other.open=false;});});});
 document.querySelectorAll('[data-channel]').forEach(function(a){var url=CONFIG[a.dataset.channel];if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',function(){emit('contact',{channel:a.dataset.channel});});}});
 if(CONFIG.phone){$('header-phone').href='tel:'+CONFIG.phone.replace(/[^+\d]/g,'');$('header-phone').setAttribute('aria-label','Позвонить в АНТИКОРИКА');document.querySelector('.header-phone-number').textContent=CONFIG.phone;$('header-phone').removeAttribute('title');var contactPhone=$('contact-phone');if(contactPhone){contactPhone.replaceChildren();var phone=node('a','',CONFIG.phone);phone.href=$('header-phone').href;contactPhone.appendChild(phone);}}
 /* v7, З-6: виджет мессенджеров слева внизу (телефон и планшет). Номер — заглушка до ответа владельца (CONFIG.phone). */
 (function(){var fab=$('msg-fab');if(!fab)return;var toggle=$('msg-toggle'),list=$('msg-list'),back=fab.querySelector('.msg-backdrop'),call=$('msg-call');
  if(CONFIG.phone&&call)call.href='tel:'+CONFIG.phone.replace(/[^+\d]/g,'');else if(call){call.title='Демонстрационная ссылка: номер телефона подставит владелец';}
  function setOpen(open,back2){fab.classList.toggle('is-open',open);list.hidden=!open;back.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)emit('messenger_open');if(!open&&back2)toggle.focus();}
  toggle.addEventListener('click',function(){setOpen(toggle.getAttribute('aria-expanded')!=='true',false);});
  back.addEventListener('click',function(){setOpen(false,true);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){e.preventDefault();setOpen(false,true);}});
  fab.addEventListener('focusout',function(){window.setTimeout(function(){if(toggle.getAttribute('aria-expanded')==='true'&&!fab.contains(document.activeElement))setOpen(false,false);},0);});
  list.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){emit('messenger_'+a.dataset.msg);setOpen(false,true);});});})();
 var video=document.querySelector('video');if(video){video.defaultMuted=true;video.muted=true;}
 var form=$('lead-form');var submit=form.querySelector('[type=submit]');submit.disabled=false;
 /* v9, шаг 5: скрытое поле ym_client_id — по нему продажа в CRM связывается с визитом (гайд, раздел 46.12). Номер счётчика — заглушка (CONFIG.metrikaId), даст владелец */
 var ymId='',ymWait=Promise.resolve();
 var ymOff=false,ymGen=0;/* ymOff — посетитель отказался от cookie: идентификатор не храним и в заявку не кладём; ymGen гасит запоздавшие ответы Метрики */
 function fillYm(){var gen=++ymGen;ymWait=new Promise(function(done){if(ymOff||!(CONFIG.metrikaId&&typeof window.ym==='function')){done();return;}window.ym(Number(CONFIG.metrikaId),'getClientID',function(id){if(gen===ymGen&&!ymOff){ymId=id||'';if(form.elements.ym_client_id)form.elements.ym_client_id.value=ymId;}done();});});}
 document.addEventListener('antikorika:cookie-consent',function(e){var ok=e.detail&&e.detail.choice==='accepted';ymOff=!ok;if(!ok){ymGen++;ymId='';if(form.elements.ym_client_id)form.elements.ym_client_id.value='';}else if(!ymId)fillYm();});
 fillYm();
 form.addEventListener('submit',async function(e){e.preventDefault();if(!form.reportValidity())return;var phone=form.elements.phone.value.trim();var digits=phone.replace(/\D/g,'');if(!/^[+\d\s()\-]+$/.test(phone)||!([10,11].includes(digits.length))){$('form-status').textContent='Проверьте номер телефона: укажите 10 цифр или номер с кодом +7.';form.elements.phone.setAttribute('aria-invalid','true');form.elements.phone.focus();return;}form.elements.phone.removeAttribute('aria-invalid');if(!CONFIG.endpoint||!CONFIG.policyReady){$('form-status').textContent='Онлайн-запись пока не открыта. Напишите нам в MAX — согласуем время диагностики. Данные формы не отправлены.';return;}
 submit.disabled=true;$('form-status').textContent='Отправляем заявку…';
 if(!ymId)fillYm();/* Метрика могла загрузиться уже после открытия страницы: спрашиваем ещё раз при отправке */
 await Promise.race([ymWait,new Promise(function(r){window.setTimeout(r,1500);})]);/* ответ Метрики асинхронный: ждём не дольше 1,5 с */
 var payload={name:form.elements.name.value.trim(),phone:phone,brand:state.brand,model:state.model,classCode:state.resolved?state.classCode:null,package:state.resolved?D.packages[state.packageIndex].id:null,price:state.resolved?currentClass().prices[state.packageIndex]:null,consent:true,policyVersion:CONFIG.policyVersion,consentTime:new Date().toISOString(),sourcePage:location.pathname,ym_client_id:form.elements.ym_client_id?form.elements.ym_client_id.value:''};
 try{var controller=new AbortController();var timeout=setTimeout(function(){controller.abort();},15000);try{var response=await fetch(CONFIG.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});if(!response.ok)throw new Error('request failed');}finally{clearTimeout(timeout);}$('form-status').textContent='Заявка принята. Свяжемся с вами для согласования времени диагностики.';form.reset();if(form.elements.ym_client_id)form.elements.ym_client_id.value=ymId;fillYm();emit('lead_received');}catch(error){$('form-status').textContent='Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в MAX.';}finally{submit.disabled=false;}
 });
 if('IntersectionObserver' in window&&!reduced.matches&&!window.matchMedia('(max-width:820px)').matches){
  var revealSelector='main .hero-inner > *,main .section-head,main .calc-heading,main .calc-image,main .calc-panel,main .class-picker,main .calc-result,main .class-tabs,main .price-caption,main .package-card,main .info-card,main .price-table,main .extras,main video,main .steps li,main .ba,main .section-action,main .passport-layout > *,#rvw-widget,main .demo-notice,main .team-card,main .faq-layout > *,main .request-layout > *,main .contact-card,main .map-panel';
  /* v7: карточки «стопки» (З-2) на телефоне и планшете выезжают сами за счёт sticky; появление — только на настольной сетке */
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
 /* v8, Р-9: виджет мессенджеров прячется, пока касается основной кнопки, поля или формы (нижней панели больше нет) */
 (function(){var fab=$('msg-fab');if(!fab)return;var tg=$('msg-toggle'),busy=false;
  function check(){busy=false;if(fab.classList.contains('is-open')||getComputedStyle(fab).display==='none'){document.body.classList.remove('fab-hide');return;}
   var r=tg.getBoundingClientRect();var pad=10;var hit=false;
   document.querySelectorAll('main .btn,main a,main button,main input,main select,main summary,main [role=slider],.ck-btn').forEach(function(e){if(hit)return;var b=e.getBoundingClientRect();if(b.width&&b.height&&b.right>r.left-pad&&b.left<r.right+pad&&b.bottom>r.top-pad&&b.top<r.bottom+pad)hit=true;});
   document.body.classList.toggle('fab-hide',hit);}
  function queue(){if(busy)return;busy=true;window.requestAnimationFrame(check);}
  window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue);document.addEventListener('toggle',queue,true);document.addEventListener('click',function(){window.setTimeout(queue,300);});if('MutationObserver' in window)new MutationObserver(function(){window.setTimeout(queue,250);}).observe(document.body,{attributes:true,attributeFilter:['class']});window.setTimeout(queue,300);
 })();
 /* v8.2, Т-12/Т-13/Т-15: блок «Стоимость обработки по маркам». Список — brands-config.js; Haval -> страница, остальные -> калькулятор с маркой */
 (function(){var B=window.ANTIKOR_BRANDS,grid=$('brand-grid');if(!B||!grid)return;
  var SLUG={'ГАЗ':'gaz','УАЗ':'uaz'};
  function slug(n){return SLUG[n]||n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function pickBrand(name){brandSelect.value=name;state.brand=name;populateModels();showUnresolved();emit('select_brand',{brand:name,source:'tile'});scrollToId('calc',modelSelect);}
  function tile(name,small){var li=node('li'),page=B.pages&&B.pages[name],a=node('a','brand-tile'+(small?' brand-tile--sm':''));
   a.dataset.brand=name;a.href=page||'#calc';
   a.setAttribute('aria-label',page?name+': цены по моделям, страница марки':name+': рассчитать стоимость для этой марки');
   if(!small&&B.logos&&B.logos.indexOf(slug(name))>-1){var box=node('span','brand-logo');box.setAttribute('aria-hidden','true');var ar=B.logoAR&&B.logoAR[slug(name)];if(ar){var ew=Math.sqrt(1900*ar),eh=Math.sqrt(1900/ar);if(eh>40){eh=40;ew=40*ar;}box.style.width=Math.round(ew)+'px';box.style.height=Math.round(eh)+'px';}['gray','color'].forEach(function(k){var im=node('img','brand-logo-'+k);im.src='img/brands/logo-'+slug(name)+'-'+k+((B.logosRaster&&B.logosRaster.indexOf(slug(name))>-1)?'.webp':'.svg');im.alt='';im.loading='lazy';im.decoding='async';box.appendChild(im);});a.appendChild(box);}
   a.appendChild(node('span','brand-name',name));
   a.addEventListener('click',function(e){emit('brand_tile',{brand:name,page:!!page});if(!page){e.preventDefault();pickBrand(name);}});
   li.appendChild(a);return li;}
  B.top.forEach(function(n){if(D.brands.some(function(b){return b.name===n;}))grid.appendChild(tile(n,false));});
  var all=$('brand-all-list'),toggle=$('brands-all');
  var names=D.brands.map(function(b){return b.name;});
  var lat=names.filter(function(n){return /^[A-Za-z]/.test(n);}).sort(function(a,b){return a.localeCompare(b,'en');});
  var cyr=names.filter(function(n){return !/^[A-Za-z]/.test(n);}).sort(function(a,b){return a.localeCompare(b,'ru');});
  lat.concat(cyr).forEach(function(n){all.appendChild(tile(n,false));});
  toggle.addEventListener('click',function(){var open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Свернуть список':'Все марки';all.hidden=!open;if(open){var first=all.querySelector('a');if(first)first.focus();}emit('brands_all',{open:open});});
  /* переход со страницы марки: index.html?brand=Toyota#calc */
  var qb=new URLSearchParams(location.search).get('brand');if(qb&&names.indexOf(qb)>-1){brandSelect.value=qb;state.brand=qb;populateModels();showUnresolved();}
 })();
 updatePrices();updateSelection();
})();
