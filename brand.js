/* АНТИКОРИКА — поведение страницы марки (v8.2): выбор модели и пакета -> подпись в форме и переход к форме.
   Общее (меню, вопросы, виджет связи, форма) — в common.js. Страница собрана генератором site/brands/tools/make_brand_page.py. */
(function(){
 'use strict';
 var AK=window.AK;if(!AK)return;
 var $=AK.$,brand=document.body.dataset.brand||'';
 var state={model:'',pkg:'',pkgId:'',classCode:'',price:null};
 var summary=$('lead-selection'),phone=$('lead-form')?$('lead-form').elements.phone:null;
 function pick(btn){
  state={model:btn.dataset.model,pkg:btn.dataset.pkg,pkgId:btn.dataset.pkgId,classCode:btn.dataset.class,price:Number(btn.dataset.price)};
  document.querySelectorAll('.model-price').forEach(function(b){b.setAttribute('aria-pressed',String(b===btn));});
  if(summary)summary.textContent=brand+' '+state.model+' · '+state.pkg+' · '+AK.money(state.price);
  AK.emit('select_package',{brand:brand,model:state.model,package:state.pkgId,classCode:state.classCode});
  AK.scrollToId('request',phone);
 }
 document.querySelectorAll('.model-price').forEach(function(b){b.addEventListener('click',function(){pick(b);});});
 document.querySelectorAll('[data-book]').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();AK.emit('open_booking',{brand:brand,model:state.model});AK.scrollToId('request',phone);});});
 document.querySelectorAll('.brand-tile').forEach(function(a){a.addEventListener('click',function(){AK.emit('brand_tile',{brand:a.dataset.brand,from:brand});});});
 AK.bindForm(function(){return {brand:brand,model:state.model,classCode:state.classCode||null,package:state.pkgId||null,price:state.price};});
})();
