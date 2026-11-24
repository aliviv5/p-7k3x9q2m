/* АНТИКОРИКА — настройки блока «Стоимость обработки по маркам» (v8.2, 24.11.2026; v8.3 — финальный порядок плиток).
   Один файл на оба места: блок на главной (app.js) и «Другие марки» на страницах марок (генератор).
   Чтобы поменять порядок плиток — правьте только массив top (имена — как в data.js, brands[].name). */
window.ANTIKOR_BRANDS = {
  /* ФИНАЛЬНЫЙ порядок 16 плиток — Дмитрий Зорин, 24.11.2026 (site/brands/research-2026-11-24.md, раздел 11, таблица 11.3).
     Резерв при замене: Tenet. Mercedes-Benz и BMW в 16 не входят (спрос 13 и 8, Москва). */
  top: ["Haval", "Lada", "Toyota", "Mazda", "Geely", "Kia", "Chery", "Hyundai",
        "Nissan", "Renault", "Volkswagen", "Skoda", "Ford", "Changan", "Belgee", "Honda"],
  /* марки, у которых уже есть страница: имя -> путь от корня сайта. Остальные плитки ведут в калькулятор с выбранной маркой */
  pages: { "Haval": "antikor-haval/" },
  /* марки, для которых положены логотипы в img/brands/logo-<имя-файла>-gray.svg и -color.svg
     (имя файла: строчными, пробелы и скобки — дефис; список — site/brands/logos-needed.md).
     Марки без логотипа показывают название текстом. */
  logos: ["haval", "lada", "toyota", "mazda", "geely", "kia", "chery", "hyundai", "nissan", "renault", "volkswagen", "skoda", "ford", "changan", "honda", "audi", "bmw", "cadillac", "chevrolet", "chrysler", "citroen", "daewoo", "datsun", "dodge", "dongfeng", "fiat", "great-wall", "hummer", "infiniti", "iran-khodro", "jaecoo", "jaguar", "jeep", "jetour", "land-rover", "lexus", "lixiang", "mercedes-benz", "mini", "mitsubishi", "moskvich", "omoda", "opel", "peugeot", "porsche", "ram", "smart", "ssangyong", "suzuki", "tank", "tesla", "volvo", "zeekr", "uaz", "exeed", "haima", "knewstar", "lynk-co", "swm", "voyah", "belgee", "baic", "evolute", "alfa-romeo", "gac", "gaz", "hongqi", "jac", "jetta", "kaiyi", "lifan", "subaru", "tenet", "solaris", "skywell", "soueast", "sollers", "genesis", "faw", "wey", "jeland"],
  /* марки, у которых логотип растровый (img/brands/logo-<имя>-gray.webp и -color.webp, высота до 160 px); у остальных — вектор .svg (v9.3) */
  logosRaster: ["alfa-romeo", "gac", "gaz", "hongqi", "jac", "jetta", "kaiyi", "lifan", "subaru", "tenet", "renault", "lada", "uaz", "solaris", "skywell", "soueast", "sollers", "genesis", "faw", "wey", "jeland"],
  /* отношение ширины к высоте каждого логотипа (по viewBox) — приложение подбирает размер одинаковой площади */
  logoAR: {"audi": 2.83, "bmw": 1.0, "cadillac": 2.44, "changan": 1.16, "chery": 2.6, "chevrolet": 2.14, "chrysler": 8.63, "citroen": 1.03, "daewoo": 5.19, "datsun": 1.81, "dodge": 5.71, "dongfeng": 3.88, "fiat": 1.32, "ford": 2.78, "geely": 1.85, "great-wall": 5.42, "haval": 8.18, "honda": 8.14, "hummer": 1.0, "hyundai": 7.77, "infiniti": 2.56, "iran-khodro": 0.89, "jaecoo": 6.46, "jaguar": 8.1, "jeep": 2.41, "jetour": 6.14, "kia": 4.0, "lada": 5.13, "land-rover": 1.91, "lexus": 4.57, "lixiang": 6.5, "mazda": 4.14, "mercedes-benz": 3.95, "mini": 2.28, "mitsubishi": 0.93, "moskvich": 4.33, "nissan": 1.2, "omoda": 7.5, "opel": 1.13, "peugeot": 7.64, "porsche": 1.12, "ram": 10.61, "renault": 1.06, "skoda": 7.14, "smart": 1.0, "ssangyong": 2.4, "suzuki": 5.14, "tank": 0.79, "tesla": 0.77, "toyota": 6.05, "uaz": 1.74, "volkswagen": 1.0, "volvo": 1.0, "zeekr": 3.97, "exeed": 9.0, "haima": 6.12, "knewstar": 14.44, "lynk-co": 6.66, "swm": 3.7, "voyah": 2.58, "belgee": 1.67, "baic": 5.09, "evolute": 7.92, "alfa-romeo": 0.99, "gac": 1.09, "gaz": 1.03, "hongqi": 0.54, "jac": 2.62, "jetta": 2.49, "kaiyi": 2.18, "lifan": 1.33, "subaru": 1.82, "tenet": 9.93, "solaris": 2.17, "skywell": 1.58, "soueast": 1.56, "sollers": 1.43, "genesis": 3.01, "faw": 3.7, "wey": 0.85, "jeland": 7.69}
};
