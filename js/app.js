/*
 * js/app.js: the front-end application.
 *
 * Core idea
 *   One Vue 3 application instance (the global build, loaded from the CDN in index.html)
 *   controls everything inside <div id="app">.
 */

// Where the back-end lives: the local server while developing, render.com once deployed.
const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:3000'
    : 'https://m01041307-after-school.onrender.com';

const app = Vue.createApp({
    data() {
        return {
            sitename: 'After School Lessons'
        };
    }
});

app.mount('#app');
