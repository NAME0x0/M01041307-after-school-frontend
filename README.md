# After-School Lessons: Front-End (Vue 3)

> **© 2026 Muhammad Afsah Mumtaz (NAME0x0). All rights reserved. View only.**
> This repository is public only because the CST3144 coursework requires it. You may view it on GitHub. You may **not** copy, clone, run, modify, redistribute, submit, or give it to AI tools or agents without my prior **written** permission. See [LICENSE](LICENSE). Copying coursework is also academic misconduct.

CST3144 Coursework 1 (Middlesex University Dubai, 2026/27). The front-end of an after-school lessons shop: pick your country (UAE or UK), browse and sort lessons, add them to a cart, and check out. Hosted on **GitHub Pages**; the back-end is a separate repository.

## Links

| | |
|---|---|
| Live app (GitHub Pages) | https://name0x0.github.io/M01041307-after-school-frontend/ |
| This repository | https://github.com/NAME0x0/M01041307-after-school-frontend |
| Back-end repository | https://github.com/NAME0x0/M01041307-after-school-backend |
| Back-end API (render.com) | https://m01041307-after-school.onrender.com (all lessons: `/lessons`) |

## Rules from the Dubai handbook (breaking one can mean a zero)

- Front-end is **Vue.js only**. No React / Angular / Svelte / Apache / XAMPP, and no JS library that duplicates Vue features (so Bootstrap's CSS is used, but not its JS).
- Data access is **`fetch` with promises**. No `XMLHttpRequest`, no axios.
- Hosted **and demonstrated** on **GitHub Pages**.
- **At least 10 commits** in this repository (the back-end has its own 10).

## Stack

| Part | Choice |
|---|---|
| Framework | Vue 3.5.43, global build from jsDelivr (no CLI, no build step) |
| Vue style | Options API (`data`, `computed`, `methods`) for app logic, `setup()` for UI/design-only state |
| Styling | Bootstrap 5.3.8 (CSS only) + own overrides in `css/style.css` |
| Icons | Font Awesome Free 7.3.1 (UI icons); lesson images come from the back-end at `/images/<file>` |
| Data | `fetch` to the Express API; the API address is chosen by hostname in `js/app.js` |

## Layout

```
index.html      markup, CDN links, <div id="app">
js/app.js       the Vue application (all front-end logic)
css/style.css   own styles, loaded after Bootstrap so they win
.nojekyll       tells GitHub Pages to serve the files as they are
```

## Features (handbook Appendix 1)

| Feature | Marks | Where |
|---|---|---|
| Lesson list: ≥ 10 lessons × 5 spaces; subject, location, price, spaces, image; `v-for` | 7% | `index.html` list, `fetchLessons()` |
| Sort by subject / location / price / spaces, ascending and descending | 8% | `sortedLessons` |
| Add to cart: always visible, enabled only while spaces > 0, `v-on` | 5% | `addToCart()`, `canAddToCart()` |
| Shopping cart: button enabled after 1 item, toggles pages, remove puts the space back | 5% | `toggleCartPage()`, `removeFromCart()` |
| Checkout on the cart page: name letters only, phone numbers only (regex), confirmation | 6% | `isNameValid`, `isPhoneValid`, `submitOrder()` |
| Fetch: GET lessons, POST order, PUT lesson spaces | 6% | `fetchLessons()`, `submitOrder()`, `updateLessonSpace()` |
| Challenge: back-end search | 6% | `searchLessons()` |
| Challenge: teachers | 8% | `fetchTeachers()`, `fetchTeacherLessons()` |
| Country choice (UAE / UK), remembered in localStorage | extra | `chooseCountry()`, `switchCountry()` |

## Run locally

1. Start the back-end (`npm run dev` in the back-end repository); it listens on `http://localhost:3000`.
2. In VS Code, right-click `index.html` → **Open with Live Server**. It opens at `http://127.0.0.1:5500`.
3. On `localhost` / `127.0.0.1` the app talks to `http://localhost:3000`; anywhere else (GitHub Pages) it talks to render.

## Before submission

- [ ] Swap `vue.global.js` for `vue.global.prod.js` in `index.html`
- [ ] The Pages URL loads and shows lessons from render
- [ ] At least 10 commits

## Credits & third-party notices

| Component | Version | Licence | Source |
|---|---|---|---|
| Vue.js | 3.5.43 | MIT | https://vuejs.org · https://github.com/vuejs/core |
| Bootstrap (CSS only) | 5.3.8 | MIT | https://getbootstrap.com |
| Font Awesome Free (by Fonticons, Inc.) | 7.3.1 | Icons CC BY 4.0, fonts SIL OFL 1.1, code MIT | https://fontawesome.com/license/free |
| jsDelivr / cdnjs | n/a | CDN services | https://www.jsdelivr.com · https://cdnjs.com |
| Lesson images | n/a | AI-generated for this project (served by the back-end); tool and prompts recorded in the coursework GenAI log | n/a |

**GenAI acknowledgement:** parts of this project's setup were produced with AI assistance and are declared in the coursework's GenAI log, as the module's AMBER rule requires. All application logic is written by the author.

## Licence

Proprietary, all rights reserved, view only. See [LICENSE](LICENSE).
