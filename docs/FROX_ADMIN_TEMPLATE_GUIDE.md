# Frox Admin Panel — Design System & Implementation Guide
> Полная документация для воспроизведения дизайна шаблона с помощью Claude Code

---

## 📋 Обзор проекта

**Название:** Frox — Multipurpose TailwindCSS Dashboard Template
**Стек:** HTML5 + TailwindCSS + Vanilla JS + jQuery + Chart.js
**Шаблонизатор (source):** Pug (.pug)
**Режимы:** Light / Dark (переключатель через `class="dark"` на `<html>`)
**Макет:** CSS Grid, 2 колонки: `grid-cols-[257px,1fr]` + 2 строки (header, content)

---

## 🗂 Структура страниц (полный список)

### Дашборды
- `index.html` — Ecommerce Dashboard (главная)
- `finance-dashboard.html` — Finance Dashboard
- `jobs-dashboard.html` — Jobs Dashboard
- `cms-dashboard.html` — CMS Dashboard
- `crm-dashboard.html` — CRM Dashboard
- `analytics-dashboard-1.html` / `analytics-dashboard-2.html`
- `project-dashboard.html` — Project Management
- `crypto-dashboard.html` — Crypto Dashboard
- `help-center-dashboard.html`
- `course-dashboard.html`
- `file-manage-dashboard.html`

### Ecommerce
- `product-list.html`, `product-grid.html`, `product-details.html`
- `order-list.html`, `order-details.html`
- `transactions-list.html`, `customers-lists.html`
- `reviews-list.html`, `seller-details.html`

### Finance
- `finance-cards.html`, `finance-transactions.html`

### CRM
- `crm-events.html`, `crm-customers.html`, `crm-customer-details.html`, `crm-customer-edit.html`

### CMS
- `cms-post-listing-grid.html`, `cms-post-listing-list.html`
- `cms-media.html`, `cms-add-post.html`, `cms-comment.html`

### Jobs
- `jobs-listing-1.html`, `jobs-listing-2.html`, `jobs-add-new-job.html`

### Коммуникации
- `chat-page-1.html`, `chat-page-2.html`, `chat-page-3.html`
- `mailbox-inbox.html`, `mailbox-read.html`, `mailbox-chat.html`
- `social-feed-1.html`, `social-feed-2.html`, `social-feed-3.html`

### Авторизация
- `sign-in.html`, `sign-up.html`, `sign-up-success.html`
- `reset-password.html`, `password-required.html`

### Прочее
- `components.html` — библиотека компонентов

---

## 🎨 Дизайн-система (Color Tokens)

### CSS Custom Properties (`:root`)

```css
/* Accent Colors */
--blue-accent: #2775ff;
--green-accent: #50d1b2;
--violet-accent: #7747ca;
--orange-accent: #ec8c56;
--yellow-accent: #ece663;
--indigo-accent: #5415f1;
--emerald-accent: #5eea8d;
--fuchsia-accent: #dd50d6;
--red-accent: #e23738;
--sky-accent: #0bd6f4;
--pink-accent: #fb7bb8;
--neutral-accent: #e8edf2;

/* Brand Color */
--color-brands: #7364db;

/* Gray Scale (Light Mode) */
--gray-0: #ffffff;
--gray-100: #f5f5fa;
--gray-200: #e2e2ea;
--gray-300: #c6cbd9;
--gray-400: #9a9aaf;
--gray-500: #7e7e8f;
--gray-600: #656575;
--gray-700: #535362;
--gray-800: #2e2e3a;
--gray-900: #262631;
--gray-1000: #16161e;
--gray-1100: #07070c;
--neutral-bg: #ffffff;

/* Gray Scale (Dark Mode) */
--dark-gray-0: #000000;
--dark-gray-100: #0f0f12;
--dark-gray-200: #1e1e24;
--dark-gray-300: #2c2c35;
--dark-gray-400: #64646f;
--dark-gray-500: #8b8b93;
--dark-gray-600: #70707c;
--dark-gray-700: #8a8a98;
--dark-gray-800: #a9a9b7;
--dark-gray-900: #d0d0da;
--dark-gray-1000: #eaeaf4;
--dark-gray-1100: #f1f1f1;
--dark-neutral-bg: #1f2128;
--dark-neutral-border: #313442;

/* Semantic Colors */
--primary: #508fda;
--secondary: #8d99ae;
--success: #06d6a0;
--danger: #ef476f;
--warning: #ffd166;
--info: #38a0c2;
```

### Фоновые акценты (для карточек/блоков)
```css
--bg-1: #eae4e9;  --bg-2: #fff3ea;  --bg-3: #fde2e4;
--bg-4: #fad2e1;  --bg-5: #dbece5;  --bg-6: #bee1e6;
--bg-7: #f0efeb;  --bg-8: #dfe7fd;  --bg-9: #d1ecfd;
--bg-10: #ddd3fa;
```

---

## 🔤 Типографика

**Шрифты:**
- `Noto Sans` (основной): weights 400, 500, 600, 700, 800
- `Chivo`: weights 400, 700, 900
- Google Fonts URL: `https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&family=Noto+Sans:wght@400;500;600;700;800&display=swap`

### Tailwind Font Sizes (кастомные)
```js
'header-1': ['40px', '60px'],   // line-height
'header-2': ['32px', '39px'],
'header-3': ['28px', '34px'],
'header-4': ['28px', '34px'],
'header-5': ['24px', '30px'],
'header-6': ['20px', '18px'],
'header-7': ['18px', '22px'],
'normal': ['14px', '16px'],         // основной текст
'subtitle': ['16px', '16px'],
'subtitle-semibold': ['16px', '20px'],
'btn-label': ['16px', '16px'],
'mini-btn-label': ['14px', '12px'],
'desc': ['12px', '16px'],
'mini-desc': ['9px', '11px'],
```

---

## 🏗 Структура Layout (HTML)

```html
<html class="scroll-smooth overflow-x-hidden" lang="en">
<head>
  <link rel="stylesheet" href="assets/styles/tailwind.min.css">
  <link rel="stylesheet" href="assets/styles/style.min.css">
  <!-- Google Fonts -->
</head>
<body class="w-screen relative overflow-x-hidden min-h-screen bg-gray-100 scrollbar-hide dark:bg-[#000]">

  <!-- Главная обёртка — CSS Grid -->
  <div class="wrapper mx-auto text-gray-900 font-normal grid scrollbar-hide
              grid-cols-[257px,1fr] grid-rows-[auto,1fr]" id="layout">

    <!-- SIDEBAR — занимает 2 строки -->
    <aside class="bg-white row-span-2 border-r border-neutral relative flex flex-col
                  justify-between p-[25px] dark:bg-dark-neutral-bg dark:border-dark-neutral-border">
      ...
    </aside>

    <!-- HEADER — 1 строка, 2 колонка -->
    <header class="flex items-center justify-between flex-wrap bg-neutral-bg p-5 gap-5
                   md:py-6 md:pl-[25px] md:pr-[38px] lg:flex-nowrap dark:bg-dark-neutral-bg">
      ...
    </header>

    <!-- MAIN CONTENT — 2 строка, 2 колонка -->
    <main>
      ...
    </main>

  </div>
</body>
```

**Поведение sidebar (collapse):**
- При collapse: `layout` теряет `grid-cols-[257px,1fr]`, получает класс `minimize`
- Кнопка `#sidebar-btn` переключает состояние
- На мобильных (< 650px) sidebar автоматически сворачивается

---

## 🧭 Сайдбар — детальная структура

```html
<aside class="bg-white row-span-2 border-r border-neutral relative flex flex-col
              justify-between p-[25px] dark:bg-dark-neutral-bg dark:border-dark-neutral-border">

  <!-- Кнопка сворачивания -->
  <div id="sidebar-btn" class="absolute p-2 border-neutral right-0 border bg-white
       rounded-full cursor-pointer duration-300 translate-x-1/2 hover:opacity-75
       dark:bg-dark-neutral-bg dark:border-dark-neutral-border">
    <img src="assets/images/icons/icon-arrow-left.svg" alt="left chevron icon">
  </div>

  <div>
    <!-- Логотип -->
    <a class="mb-10" href="index.html">
      <img class="logo-maximize" src="assets/images/icons/icon-logo.svg" alt="Frox logo">
      <img class="logo-minimize ml-[10px]" src="assets/images/icons/icon-favicon.svg" alt="Frox logo">
    </a>

    <!-- Меню — аккордеон через checkbox -->
    <div class="sidemenu-item rounded-xl relative">
      <input class="sr-only peer" type="checkbox" value="dashboard" name="sidemenu" id="dashboard">
      <label class="flex items-center justify-between w-full cursor-pointer py-[17px] px-[21px]
                    focus:outline-none peer-checked:border-transparent active" for="dashboard">
        <div class="flex items-center gap-[10px]">
          <img src="assets/images/icons/icon-favorite-chart.svg" alt="icon">
          <span class="text-normal font-semibold text-gray-500 sidemenu-title dark:text-gray-dark-500">
            Dashboard
          </span>
        </div>
      </label>
      <!-- Каретка -->
      <img class="absolute right-2 transition-all duration-150 caret-icon pointer-events-none
                  peer-checked:rotate-180 top-[22px]"
           src="assets/images/icons/icon-arrow-down.svg" alt="caret icon">
      <!-- Подменю -->
      <div class="hidden peer-checked:block">
        <ul class="text-gray-300 child-menu z-10 pl-[53px]">
          <li class="pb-2 transition-opacity duration-150 hover:opacity-75">
            <a class="text-normal" href="index.html">Ecommerce</a>
          </li>
          ...
        </ul>
      </div>
    </div>

    <!-- Разделитель -->
    <div class="w-full bg-neutral h-[1px] mb-[21px] dark:bg-dark-neutral-border"></div>

    <!-- Секция категорий (после основного меню) -->
    <!-- Top Sellers блок -->
    <!-- Upgrade Card блок -->
  </div>

  <!-- Переключатель темы (внизу сайдбара) -->
  <div> <!-- ThemeToggle --> </div>
</aside>
```

### Пункты меню сайдбара с иконками

| Раздел | Иконка |
|--------|--------|
| Dashboard | `icon-favorite-chart.svg` |
| Ecommerce | `icon-products.svg` |
| Finance | `icon-wallet.svg` |
| Jobs | `icon-job.svg` |
| CMS | `icon-cms.svg` |
| CRM | `icon-crm.svg` |
| Analytics | `icon-analytics.svg` |
| Project Manage | `icon-project.svg` |
| Chat / Message | `icon-chat.svg` |
| Social Network | `icon-network.svg` |
| Crypto | `icon-crypto.svg` |
| Mailbox | `icon-mailbox.svg` |
| File Manage | `icon-folder.svg` |
| Help Center | `icon-question-mark.svg` |
| Course Online | `icon-course.svg` |

---

## 🔝 Header — детальная структура

```html
<header class="flex items-center justify-between flex-wrap bg-neutral-bg p-5 gap-5
               md:py-6 md:pl-[25px] md:pr-[38px] lg:flex-nowrap dark:bg-dark-neutral-bg lg:gap-0">

  <!-- Логотип (скрыт на десктопе, показывается когда sidebar свёрнут) -->
  <a class="hidden logo" href="index.html">
    <img src="assets/images/icons/icon-logo.svg" alt="Frox logo" class="md:mr-[100px] lg:mr-[133px]">
  </a>

  <!-- Поисковая строка -->
  <div class="order-last lg:order-first">
    <!-- Search Bar -->
  </div>

  <!-- Browse Dropdown -->
  <div class="items-center justify-center hidden rounded-lg border border-neutral
              dark:border-dark-neutral-border gap-x-[10px] px-[18px] py-[11px] sm:flex">
    <div class="flex items-center gap-[11px]">
      <img src="assets/images/icons/icon-export.svg" alt="export icon">
      <span class="text-normal font-semibold text-gray-500 dark:text-gray-dark-500">Browse</span>
    </div>
    <img src="assets/images/icons/icon-arrow-down.svg" alt="down icon">
  </div>

  <!-- Правая группа: чат + уведомления + аватар пользователя -->
  <div class="flex items-center order-2 user-noti gap-[30px] xl:gap-[48px] lg:order-3 lg:mr-0">
    <!-- Chat Dropdown Icon -->
    <!-- Notification Dropdown Icon -->
    <!-- User Avatar + Dropdown -->
    <img src="assets/images/avatar-layouts-5.png" alt="user avatar">
  </div>

</header>
```

---

## 🎛 JavaScript — функционал

### Подключаемые библиотеки (vendors)
```html
<!-- Vendors -->
<script src="assets/scripts/vendors/jquery-3.6.0.min.js"></script>
<script src="assets/scripts/vendors/modernizr-3.6.0.min.js"></script>
<script src="assets/scripts/vendors/jquery-migrate-3.3.0.min.js"></script>

<!-- Plugins -->
<script src="assets/scripts/plugins/perfect-scrollbar.min.js"></script>
<script src="assets/scripts/plugins/swiper-bundle.min.js"></script>
<script src="assets/scripts/plugins/select2.min.js"></script>
<script src="assets/scripts/plugins/wow.js"></script>

<!-- Charts -->
<script src="assets/scripts/chart.min.js"></script>
<script src="assets/scripts/chart-utils.min.js"></script>

<!-- App -->
<script src="assets/scripts/app.js"></script>
```

### Ключевые JS-функции (app.js)

**1. Переключение темы (Dark/Light)**
```js
// Читает localStorage["color-theme"]
// Добавляет/удаляет класс "dark" на <html>
// Checkbox #theme-toggle управляет состоянием
```

**2. Сворачивание Sidebar**
```js
let sideBarBtn = document.getElementById("sidebar-btn");
let layout = document.getElementById("layout");

sideBarBtn.addEventListener("click", function() {
  layout.classList.toggle("grid-cols-[257px,1fr]");
  layout.classList.toggle("minimize");
  sideBarBtn.classList.toggle("reverse");
});

// Автосворачивание на мобильных (< 650px)
function collapseSideBar() {
  if (window.innerWidth < 650 && !sideBarBtn.classList.contains("reverse")) {
    sideBarBtn.click();
  }
}
window.addEventListener("resize", collapseSideBar);
window.addEventListener("load", collapseSideBar);
```

**3. Активный пункт меню (jQuery)**
```js
$(document).ready(function() {
  if (localStorage) {
    var index = localStorage.sideMenuItem;
    makeSidebarActive($(".sidemenu-item").eq(index));
  }
  $(".sidemenu-item").click(function() {
    if (localStorage) localStorage.sideMenuItem = $(this).index();
    makeSidebarActive($(this));
  });
});
```

**4. Fullscreen**
```js
document.getElementById("sidebar-expand").addEventListener("click", toggleFullScreen);
```

**5. Модальные окна (через DaisyUI checkbox-modal)**
```js
// Details modal
document.querySelectorAll(".show-detail").forEach(btn => {
  btn.addEventListener("click", () => { detailModal.checked = true; });
});
// Project modal, Share modal, Mail modal — аналогично
```

---

## 📊 Графики (Chart.js)

### Используемые типы и цвета

**Performance Chart** (`#performanceChart`) — Line, stacked area:
```js
datasets: [
  { label: "Completed", backgroundColor: "#FC8D9D" },
  { label: "Pending",   backgroundColor: "#F3BCFD" },
  { label: "Unpaid",    backgroundColor: "#80B7FB" },
  { label: "Delivered", backgroundColor: "#B9A2FB" }
]
```

**Revenue Chart** (`#revenueChart`) — Line:
```js
datasets: [
  { label: "Direct", backgroundColor: "#5415F1" },
  { label: "Social", backgroundColor: "#DD50D6" }
]
```

**Visit Chart** (`#visitChart`) — Doughnut:
```js
data: [300, 50, 100, 150],
backgroundColor: ["#FC8D9D", "#F3BCFD", "#80B7FB", "#B9A2FB"]
```

**Department Chart** (`#departmentChart`) — Doughnut (cutout: 75):
```js
backgroundColor: ["#2775FF", "#50D1B2", "#7364DB", "#E23738"]
```

**Seller Chart** (`#sellerChart`) — Line (tension: 0.3):
```js
{ borderColor: "#50D1B2" }, // Order
{ borderColor: "#EC8C56" }, // Earnings
{ borderColor: "#E23738" }  // Refunds
```

**Bar Chart** (`#barChart`) — Stacked Bar (barThickness: 12, borderRadius: 70):
```js
{ backgroundColor: "#7747CA" }, // Instagram
{ backgroundColor: "#2775FF" }, // Facebook
{ backgroundColor: "#FB7BB8" }  // Twitter
```

**Общие настройки Chart.js legend:**
```js
legend: {
  labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle" }
}
```

---

## 🖼 Полный список иконок (268 SVG файлов)

Все иконки находятся в `assets/images/icons/` и используются через `<img src="...">`.

### Основные иконки интерфейса
```
icon-logo.svg           — логотип Frox
icon-favicon.svg        — favicon
icon-arrow-left.svg     — chevron влево (sidebar toggle)
icon-arrow-down.svg     — chevron вниз (аккордеон)
icon-arrow-right.svg    — chevron вправо
icon-arrow-up-down.svg  — сортировка
icon-search-normal.svg  — поиск
icon-notification-bing.svg — уведомления
icon-messages.svg       — сообщения
icon-user.svg           — пользователь
icon-logout.svg         — выход
icon-setting.svg / icon-setting-2.svg — настройки
icon-sun.svg / icon-sun-active.svg    — светлая тема
icon-moon.svg / icon-moon-active.svg  — тёмная тема
icon-menu.svg           — гамбургер
icon-close.svg          — закрыть
icon-edit.svg / icon-edit-2.svg — редактировать
icon-trash.svg          — удалить
icon-add.svg / icon-add-circle.svg — добавить
icon-eye.svg            — просмотр
icon-filter.svg / icon-filter-2.svg — фильтр
icon-export.svg         — экспорт
icon-export-green.svg   — экспорт зелёный
icon-export-red.svg     — экспорт красный
icon-print.svg          — печать
icon-share.svg          — поделиться
icon-bookmark.svg       — закладка
icon-star.svg / icon-star-yellow.svg / icon-star-2.svg — звезда
icon-like.svg / icon-like-linear.svg — лайк
icon-calendar-1.svg / icon-calendar-2.svg / icon-calendar-3.svg — календарь
icon-clock.svg          — время
icon-location.svg       — геолокация
icon-grid.svg           — грид вид
icon-row-vertical.svg   — список вид
icon-3-dots.svg         — контекстное меню
icon-more.svg           — ещё
```

### Иконки разделов меню
```
icon-favorite-chart.svg — Dashboard
icon-products.svg       — Ecommerce / Products
icon-wallet.svg         — Finance
icon-job.svg            — Jobs
icon-cms.svg            — CMS
icon-crm.svg            — CRM
icon-analytics.svg      — Analytics
icon-project.svg        — Project Management
icon-chat.svg           — Chat
icon-network.svg        — Social Network
icon-crypto.svg         — Crypto
icon-mailbox.svg        — Mailbox
icon-folder.svg / icon-folder-2.svg / icon-folder-open.svg — File Manager
icon-question-mark.svg  — Help Center
icon-course.svg         — Course Online
```

### Иконки финансов и платёжных систем
```
icon-wallet.svg, icon-money.svg, icon-payments.svg
icon-transactions.svg, icon-trade.svg
icon-bitcoin.svg, icon-bitcoin-card.svg
icon-ethereum.svg, icon-binance.svg, icon-cardano.svg
icon-bnb.svg, icon-tether.svg, icon-trx.svg, icon-xrp.svg
icon-usd.svg, icon-usdc.svg, icon-uni.svg
icon-master-card.svg, icon-Visa.svg, icon-Stripe.svg
icon-orders.svg, icon-refunds.svg, icon-bag-2.svg, icon-bag-happy.svg
icon-cart.svg, icon-economy.svg
```

### Иконки файлов и медиа
```
icon-file.svg, icon-doc.svg, icon-pdf.svg, icon-jpg.svg
icon-txt.svg, icon-xls.svg, icon-svg.svg, icon-psd.svg
icon-gif.svg, icon-zip.svg, icon-avi.svg, icon-mkv.svg, icon-mp3.svg
icon-gallery.svg, icon-gallery-fill.svg, icon-gallery-favorite.svg
icon-image.svg, icon-video.svg, icon-video-square.svg
icon-music-square.svg, icon-insert-image.svg, icon-insert-video.svg
icon-insert-file.svg, icon-insert-link.svg
```

### Иконки соцсетей
```
icon-facebook.svg / icon-facebook-2.svg
icon-twitter.svg / icon-twitter-2.svg
icon-instagram-2.svg
icon-linkedin-2.svg / icon-LinkedIN.svg
icon-google.svg / icon-google+.svg
icon-dribbble.svg
icon-Behance.svg / icon-_behance.svg
icon-Pinterest.svg
icon-Invision.svg
icon-DuckDuckGo.svg
icon-blogger.svg
```

### Иконки статусов и действий
```
icon-tick-circle.svg    — успех/галочка
icon-close-circle.svg   — ошибка
icon-check-circle.svg   — чекбокс
icon-shield-check.svg / icon-shield-tick.svg — безопасность
icon-verify.svg         — верификация
icon-flag.svg           — флаг
icon-medal-star.svg     — награда
icon-thunder.svg / icon-flash.svg / icon-lightning.svg — молния
icon-done.svg / icon-done-mail.png — готово
```

### Иконки профиля и команды
```
icon-user.svg, icon-user-square.svg
icon-profile-2user.svg  — множество пользователей
icon-people.svg         — люди
icon-clients.svg        — клиенты
icon-mailbox-user.svg   — пользователь почты
icon-input-user.svg     — ввод пользователя
icon-input-phone.svg    — ввод телефона
icon-email.svg / icon-sms.svg / icon-inbox.svg
icon-message.svg / icon-message-edit.svg / icon-messages.svg
icon-messages-2.svg / icon-messages-3.svg
icon-send-1.svg / icon-send-2.svg
icon-direct-right.svg / icon-directbox-default.svg
icon-snooze.svg / icon-starred.svg
icon-paper-clip.svg / icon-microphone-2.svg
```

### Иконки форматирования (текстовый редактор)
```
icon-bold.svg, icon-italicized.svg, icon-underlined.svg
icon-strikethrough.svg, icon-align-left.svg, icon-indent.svg
icon-ordered-list.svg, icon-unordered-list.svg
icon-textcolor.svg, icon-backgroundcolor.svg, icon-paragraphformat.svg
icon-redo.svg, icon-undo.svg
icon-insert-image.svg, icon-insert-video.svg, icon-insert-link.svg
icon-insert-file.svg
```

### Иконки технологий
```
icon-react.svg, icon-tailwind.svg, icon-sass.svg, icon-css.svg
icon-bootstrap.svg, icon-webpack.svg, icon-redux.svg, icon-pug.svg
icon-code.svg / icon-code-pink.svg / icon-code-violet.svg
icon-programming-arrows.svg
```

### Иконки стран/флагов
```
icon-united-states.svg, icon-france.svg, icon-india.svg
icon-brasil.svg, icon-sweden.svg, icon-turkey.svg, icon-Vietnam.svg
```

### Иконки графиков и аналитики
```
icon-chart.svg / icon-chart-2.svg
icon-bar-chart.svg, icon-graph.svg
icon-favorite-chart.svg
icon-analytics.svg
icon-toggle.svg / icon-toggle-horizontal.svg
icon-element-3.svg, icon-layer.svg, icon-shapes.svg
icon-color-swatch.svg
icon-maximize-3.svg
```

### Прочие иконки
```
icon-home-2.svg / icon-home-hashtag.svg
icon-headphone.svg, icon-down.svg
icon-up-long.svg, icon-arrow-left-long.svg, icon-arrow-right-long.svg
icon-caret-down.svg
icon-add-square.svg / icon-add-square-fill.svg
icon-close-modal.svg / icon-close-square.svg
icon-auth.svg, icon-dashboard.svg, icon-work.svg
icon-date.svg, icon-briefcase.svg
icon-hashtag.svg, icon-social.svg
icon-tree.svg, icon-smile.svg
icon-landing-reset-password.svg, icon-landing-success-1.svg, icon-password-required.svg
icon-done-mail.png (PNG)
```

---

## 🧩 Tailwind Config (кастомизация)

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['src/views/*.pug', 'src/views/*/*.pug', 'dist/*.html'],
  theme: {
    extend: {
      colors: {
        // gray: { 0, 100, 200, ..., 1100 } — через CSS vars
        // accent: blue, green, violet, orange, yellow, indigo, emerald, fuchsia, red, sky, pink, neutral
        // system: color-brands, neutral-bg, dark-neutral-bg, dark-neutral-border, gray-dark-*
      },
      fontSize: {
        // header-1 ... header-7, normal, subtitle, btn-label, desc, mini-desc
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
    require('tailwind-scrollbar-hide'),
    require('daisyui'),
  ],
}
```

### CSS утилиты (кастомные)
```css
.filter-black { filter: brightness(0%); }           /* иконки в тёмном цвете */
.filter-white { filter: brightness(0) invert(1); }  /* иконки в белом цвете */
.scrollbar-hide { /* скрыть скроллбар */ }
```

---

## 📐 Компоненты — паттерны

### Карточка статистики
```html
<div class="bg-white rounded-2xl p-6 dark:bg-dark-neutral-bg">
  <div class="flex items-center justify-between mb-4">
    <div class="p-3 rounded-xl bg-[#EAF1FB]">
      <img src="assets/images/icons/icon-bag-happy.svg" alt="icon">
    </div>
    <span class="text-desc text-green-accent">+12%</span>
  </div>
  <h3 class="text-header-5 font-bold text-gray-1100 dark:text-gray-dark-1100">$12,500</h3>
  <p class="text-normal text-gray-500 dark:text-gray-dark-500">Total Revenue</p>
</div>
```

### Таблица данных
```html
<div class="bg-white rounded-2xl p-6 dark:bg-dark-neutral-bg">
  <table class="w-full">
    <thead>
      <tr class="border-b border-neutral dark:border-dark-neutral-border">
        <th class="text-desc font-semibold text-gray-400 text-left pb-4">Name</th>
        ...
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-neutral dark:border-dark-neutral-border hover:bg-gray-100 dark:hover:bg-dark-neutral-bg">
        ...
      </tr>
    </tbody>
  </table>
</div>
```

### Dropdown (через DaisyUI)
```html
<div class="dropdown">
  <label tabindex="0" class="dropdown-label cursor-pointer">
    <!-- trigger -->
  </label>
  <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box">
    <li><a href="#">Item</a></li>
  </ul>
</div>
```

### Modal (через DaisyUI checkbox)
```html
<input type="checkbox" id="my-modal" class="modal-toggle">
<div class="modal">
  <div class="modal-box bg-neutral-bg dark:bg-dark-neutral-bg">
    <label for="my-modal" class="absolute right-4 top-4 cursor-pointer">
      <img src="assets/images/icons/icon-close-modal.svg" alt="close">
    </label>
    <!-- содержимое -->
  </div>
</div>
```

### Кнопки
```html
<!-- Primary -->
<button class="bg-color-brands text-white text-btn-label font-semibold
               px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
  Button
</button>

<!-- Secondary / Outline -->
<button class="border border-neutral text-gray-500 text-btn-label font-semibold
               px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors
               dark:border-dark-neutral-border dark:text-gray-dark-500">
  Button
</button>
```

### Badge / Статус
```html
<!-- Success -->
<span class="text-desc font-semibold text-green-accent bg-[#E6F9F5] px-3 py-1 rounded-full">
  Active
</span>

<!-- Danger -->
<span class="text-desc font-semibold text-red-accent bg-[#FDECEC] px-3 py-1 rounded-full">
  Inactive
</span>
```

---

## 🌙 Dark Mode

Переключение через `class="dark"` на `<html>`:

```js
// Добавить тёмную тему:
document.documentElement.classList.add("dark");
localStorage.setItem("color-theme", "dark");

// Убрать тёмную тему:
document.documentElement.classList.remove("dark");
localStorage.setItem("color-theme", "light");
```

Все компоненты используют `dark:` префикс Tailwind:
- `dark:bg-dark-neutral-bg` (вместо `bg-white`)
- `dark:border-dark-neutral-border` (вместо `border-neutral`)
- `dark:text-gray-dark-500` (вместо `text-gray-500`)
- `dark:bg-[#000]` (body background)

---

## 📁 Структура файлов для Claude Code

```
project/
├── index.html
├── assets/
│   ├── styles/
│   │   ├── tailwind.min.css    ← основные стили
│   │   └── style.min.css       ← кастомные стили
│   ├── scripts/
│   │   ├── vendors/
│   │   │   ├── jquery-3.6.0.min.js
│   │   │   └── modernizr-3.6.0.min.js
│   │   ├── plugins/
│   │   │   ├── perfect-scrollbar.min.js
│   │   │   ├── swiper-bundle.min.js
│   │   │   ├── select2.min.js
│   │   │   └── wow.js
│   │   ├── chart.min.js
│   │   ├── chart-utils.min.js
│   │   └── app.js              ← основная логика
│   └── images/
│       └── icons/              ← 268 SVG иконок
```

---

## ✅ Чеклист для Claude Code

При создании новой страницы обязательно:

1. **Layout:** `<html class="scroll-smooth overflow-x-hidden">` + body + `#layout` grid
2. **CSS:** подключить `tailwind.min.css` + `style.min.css` + Google Fonts
3. **Sidebar:** checkbox-аккордеон с иконками и `row-span-2`
4. **Header:** поиск + browse dropdown + уведомления + аватар
5. **Dark mode:** все элементы должны иметь `dark:` классы
6. **JS:** jQuery + Chart.js + app.js (sidebar collapse, theme toggle, modals)
7. **Responsive:** на мобильных sidebar сворачивается автоматически
8. **Иконки:** использовать `<img src="assets/images/icons/...">` (не font-icons)
9. **Шрифт:** `Noto Sans` для основного текста
10. **Цвета:** брендовый цвет `#7364db` (`--color-brands`)

---

*Создано автоматически на основе анализа шаблона Frox Admin Template*
