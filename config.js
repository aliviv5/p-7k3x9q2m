/* АНТИКОРИКА — общие настройки для app.js (главная) и brand.js (страницы марок). Секретов здесь нет: ссылки на мессенджеры публичные. */
window.ANTIKOR_CONFIG = {
  /* Приём заявок выключен, пока не подключены CRM/MAX и не проверены юридические тексты (endpoint пустой — данные не уходят). */
  phone: '', endpoint: '', policyReady: false, policyVersion: '',
  max: 'https://max.ru/u/f9LHodD0cOIbzAYIX2re7tTws4j62n_qUUeIUeYYHdJiAzpBvtz0WJJWJNA',
  telegram: 'https://t.me/Mahortov96',
  /* ЗАГЛУШКА: номер счётчика Яндекс Метрики даст владелец. Пока пусто — скрытое поле ym_client_id остаётся пустым.
     Когда счётчик подключён: ym(<номер>, 'getClientID', fn) заполняет поле при загрузке страницы (раздел 46.12 гайда). */
  metrikaId: ''
};
