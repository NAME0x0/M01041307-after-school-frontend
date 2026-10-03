/*
 * js/app.js: the front-end application.
 *
 * Core idea
 *   One Vue 3 application instance (the global build, loaded from the CDN in index.html)
 *   controls everything inside <div id="app">. It:
 *     1. asks the visitor which country they are in (UAE or UK) and remembers the answer,
 *     2. loads that country's lessons from the Express back-end with fetch,
 *     3. lets the visitor sort, search, browse by teacher, and add lessons to a cart,
 *     4. checks out: saves the order (POST) and updates each lesson's spaces (PUT).
 *
 * Style (hybrid)
 *   Options API (data / computed / methods, as taught in W01-W02) for the app logic,
 *   plus setup() for UI/design-only state. Revisit when the W04 lecture arrives.
 *
 * How to read the TODOs
 *   Each TODO names the handbook criterion (Appendix 1) and its marks.
 *   The indented lines under it are the steps, in order. The code is yours to write.
 */

// Where the back-end lives: the local server while developing, render.com once deployed.
const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:3000'
    : 'https://m01041307-after-school.onrender.com';

const app = Vue.createApp({

    // ------------------------------------------------------------------
    // UI / design-only state (the setup() half of the hybrid approach)
    // ------------------------------------------------------------------
    setup() {
        // TODO UI state (not marked): things that only change how the page looks, e.g.
        //
        //     - a "loading" flag while a fetch is waiting for the back-end
        //     - an error message to show when the back-end cannot be reached
        //     - grid view or list view for the lessons
        //
        //   Create each one with Vue.ref(<starting value>), then return them in the
        //   object below so the template can use them like data properties.
        return {};
    },

    // ------------------------------------------------------------------
    // App state (Options API)
    // ------------------------------------------------------------------
    data() {
        return {
            sitename: 'After School Lessons'

            // TODO Country choice (extra): the chosen country, 'UAE' or 'UK'.
            //   Start it from localStorage, so a returning visitor is not asked again.
            //   If nothing is saved yet, start with "no country" so the question is shown.

            // TODO Lesson list (7%): an empty array, filled by fetchLessons().

            // TODO Sort (8%): the attribute to sort by ('topic', 'location', 'price' or 'space')
            //   and the direction ('asc' or 'desc').

            // TODO Shopping cart (5%):
            //     - the cart: an array of lesson IDs, one entry per space added
            //     - which page is showing: the lessons page or the cart page

            // TODO Checkout (6%): the name and phone typed by the user (bound with v-model),
            //   and the confirmation message shown after a successful order.

            // TODO Search challenge (6%): the search text typed by the user.

            // TODO Teachers challenge (8%): the list of teachers and the teacher currently selected.
        };
    },

    // ------------------------------------------------------------------
    // Values worked out from the state (recalculated only when their inputs change)
    // ------------------------------------------------------------------
    computed: {

        // TODO Sort (8%): sortedLessons
        //   1. Make a copy of the lessons array (never sort the original in place).
        //   2. Compare two lessons on the chosen attribute:
        //          text   (topic, location) -> alphabetical comparison
        //          number (price, space)    -> numeric comparison
        //   3. If the direction is descending, flip the result of the comparison.
        //   4. Return the sorted copy. The lesson list's v-for loops over THIS, not over lessons.
        sortedLessons() {},

        // TODO Shopping cart (5%): cartCount
        //   Return how many spaces are in the cart (the length of the cart array).
        //   The cart button shows it, and is enabled only when it is at least 1.
        cartCount() {},

        // TODO Shopping cart (5%): cartLessons
        //   For each lesson ID in the cart, find the matching lesson object,
        //   so the cart page can show its topic, location and price.
        cartLessons() {},

        // TODO Checkout (6%): isNameValid
        //   Test the name with a regular expression that accepts letters only.
        //   (Decide whether a space between first and last name is allowed, and be ready to explain why.)
        isNameValid() {},

        // TODO Checkout (6%): isPhoneValid
        //   Test the phone with a regular expression that accepts digits only.
        isPhoneValid() {},

        // TODO Checkout (6%): canCheckout
        //   True only when BOTH the name and the phone are valid (and the cart is not empty).
        //   The checkout button is always visible; bind its disabled attribute to the opposite of this.
        canCheckout() {}
    },

    // ------------------------------------------------------------------
    // Actions (called from the template with v-on / @)
    // ------------------------------------------------------------------
    methods: {

        // TODO Country choice (extra): chooseCountry(country)
        //   1. Store the country in data.
        //   2. Save it in localStorage, so the next visit skips the question.
        //   3. Load that country's lessons and teachers.
        chooseCountry(country) {},

        // TODO Country choice (extra): switchCountry()
        //   1. Remove the saved country from localStorage and from data.
        //   2. Empty the cart (its lessons belong to the old country).
        //   3. The country question appears again, because no country is chosen.
        switchCountry() {},

        // TODO Fetch GET (2%) + Lesson list (7%): fetchLessons()
        //   1. fetch API_URL + '/lessons?country=' + the chosen country.
        //   2. .then(response => response.json()) turns the reply into an array.
        //   3. .then(lessons => ...) stores the array in data, and the page updates itself.
        //   4. .catch(...) shows a friendly error if the back-end cannot be reached.
        fetchLessons() {},

        // TODO Add to cart (5%): canAddToCart(lesson)
        //   Return true while the lesson still has spaces left (space > 0).
        //   The button stays visible, and its disabled attribute is bound to the opposite of this.
        canAddToCart(lesson) {},

        // TODO Add to cart (5%): addToCart(lesson)
        //   1. Do nothing if canAddToCart(lesson) is false.
        //   2. Push the lesson's ID onto the cart.
        //   3. Lower the lesson's space by 1 (the page updates itself).
        addToCart(lesson) {},

        // TODO Shopping cart (5%): toggleCartPage()
        //   Switch between the lessons page and the cart page (the same button does both).
        toggleCartPage() {},

        // TODO Shopping cart (5%): removeFromCart(index)
        //   1. Find the lesson whose ID is at that position in the cart.
        //   2. Remove that one entry from the cart.
        //   3. Give the space back: raise that lesson's space by 1.
        removeFromCart(index) {},

        // TODO Checkout (6%) + Fetch POST (2%) + Fetch PUT (2%): submitOrder()
        //   1. Stop if canCheckout is false.
        //   2. Build the order: name, phone, lessonIDs (the cart array), spaces (how many entries).
        //   3. fetch POST to API_URL + '/orders' with that order as a JSON body
        //      (method 'POST', header Content-Type: application/json, body JSON.stringify(order)).
        //   4. When it succeeds, call updateLessonSpace() once for each DIFFERENT lesson in the cart.
        //   5. Show the confirmation message, then empty the cart and the form.
        submitOrder() {},

        // TODO Fetch PUT (2%): updateLessonSpace(lesson)
        //   fetch PUT to API_URL + '/lessons/' + the lesson's ID, with the body { space: <its new space> }.
        //   This SETS the value (the back-end's PUT can set any attribute); it does not add or subtract.
        updateLessonSpace(lesson) {},

        // TODO Search challenge (6%): searchLessons()
        //   1. If the search box is empty, show the full list again (fetchLessons) and stop.
        //   2. Otherwise fetch API_URL + '/search?q=' + the text + '&country=' + the country.
        //      Encode the text first (encodeURIComponent), so spaces and symbols survive the URL.
        //   3. Show the results in the lesson list.
        //   Searching in the BACK-END is what earns the full 6% (front-end filtering only gets 3%).
        searchLessons() {},

        // TODO Teachers challenge (8%): fetchTeachers()
        //   fetch API_URL + '/teachers?country=' + the country, and store the list for the picker.
        fetchTeachers() {},

        // TODO Teachers challenge (8%): fetchTeacherLessons(teacherId)
        //   1. fetch API_URL + '/teachers/' + teacherId + '/lessons'.
        //   2. Show those lessons in the list (and a way to go back to all lessons).
        fetchTeacherLessons(teacherId) {}
    },

    // ------------------------------------------------------------------
    // Runs once, when the app first appears on the page
    // ------------------------------------------------------------------
    mounted() {
        // TODO If a country was saved from an earlier visit, load its lessons and teachers straight away.
    }
});

app.mount('#app');
