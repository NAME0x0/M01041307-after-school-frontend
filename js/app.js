/*
 * js/app.js: country selection, lesson browsing, cart and checkout.
 * Options API holds shop data and actions; setup() holds UI status.
 * Requests use fetch with promises, matching the coursework API.
 */

// Use the local API during development and the hosted API on GitHub Pages.
const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:3000'
    : 'https://m01041307-after-school.onrender.com';

const app = Vue.createApp({
    setup() {
        return {
            isLoading: Vue.ref(false),
            isSubmitting: Vue.ref(false),
            errorMessage: Vue.ref(''),
            lessonErrorMessage: Vue.ref(''),
            teacherErrorMessage: Vue.ref(''),
            availabilityWarning: Vue.ref('')
        };
    },

    data() {
        let country = '';
        try {
            const savedCountry = localStorage.getItem('country');
            if (savedCountry === 'UAE' || savedCountry === 'UK') {
                country = savedCountry;
            }
        } catch {
            // Country selection also works when browser storage is unavailable.
        }

        return {
            API_URL,
            sitename: 'After School Lessons',
            country,
            lessons: [],
            visibleLessonIds: [],
            sortBy: 'topic',
            sortOrder: 'asc',
            cart: [],
            showCartPage: false,
            customerName: '',
            customerPhone: '',
            orderConfirmation: '',
            searchText: '',
            teachers: [],
            selectedTeacher: '',
            checkoutId: ''
        };
    },

    computed: {
        // Empty cards show the layout while lessons load or after a failed load.
        showLessonPlaceholders() {
            return this.sortedLessons.length === 0
                && (this.isLoading || this.lessonErrorMessage !== '');
        },

        // Sort a new array so the catalogue's order is not changed.
        sortedLessons() {
            const visible = this.lessons.filter(lesson => this.visibleLessonIds.includes(lesson.id));
            const direction = this.sortOrder === 'desc' ? -1 : 1;

            return visible.sort((first, second) => {
                if (this.sortBy === 'price' || this.sortBy === 'space') {
                    return (first[this.sortBy] - second[this.sortBy]) * direction;
                }
                return first[this.sortBy].localeCompare(second[this.sortBy]) * direction;
            });
        },

        hasVisibleRatings() {
            return this.sortedLessons.some(lesson => this.ratingValue(lesson) !== null);
        },

        cartCount() {
            return this.cart.length;
        },

        // Repeated IDs represent multiple spaces in the same lesson.
        cartLessons() {
            return this.cart.map(id => this.lessons.find(lesson => lesson.id === id));
        },

        isNameValid() {
            // Full names may contain words of letters separated by single spaces.
            return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(this.customerName.trim());
        },

        isPhoneValid() {
            return /^[0-9]+$/.test(this.customerPhone.trim());
        },

        canCheckout() {
            return !this.isSubmitting && this.cartCount > 0
                && this.isNameValid && this.isPhoneValid;
        }
    },

    methods: {
        // Clamp to 0–5, then round to the nearest half star.
        ratingValue(lesson) {
            if (typeof lesson.rating !== 'number' || !Number.isFinite(lesson.rating)) {
                return null;
            }
            const value = Math.max(0, Math.min(5, lesson.rating));
            return Math.round(value * 2) / 2;
        },

        ratingStars(lesson) {
            const rating = this.ratingValue(lesson) ?? 0;
            const stars = [];
            for (let position = 1; position <= 5; position += 1) {
                if (rating >= position) {
                    stars.push('fa-solid fa-star');
                } else if (rating >= position - 0.5) {
                    stars.push('fa-solid fa-star-half-stroke');
                } else {
                    stars.push('fa-regular fa-star');
                }
            }
            return stars;
        },

        ratingLabel(lesson) {
            const rating = this.ratingValue(lesson);
            if (rating === null) {
                return 'Not rated';
            }
            return 'Rating: ' + rating + ' out of 5 stars';
        },

        chooseCountry(country) {
            if (this.country || (country !== 'UAE' && country !== 'UK')) {
                return Promise.resolve();
            }

            this.country = country;
            this.errorMessage = '';
            this.lessonErrorMessage = '';
            try {
                localStorage.setItem('country', country);
            } catch {
                // The current visit can continue without saving the preference.
            }
            return Promise.all([this.fetchLessons(), this.fetchTeachers()]);
        },

        switchCountry() {
            if (this.isSubmitting) {
                return;
            }

            this.country = '';
            this.lessons = [];
            this.visibleLessonIds = [];
            this.teachers = [];
            this.cart = [];
            this.showCartPage = false;
            this.searchText = '';
            this.selectedTeacher = '';
            this.customerName = '';
            this.customerPhone = '';
            this.orderConfirmation = '';
            this.errorMessage = '';
            this.lessonErrorMessage = '';
            this.teacherErrorMessage = '';
            this.isLoading = false;
            this.checkoutId = '';
            this.availabilityWarning = '';

            try {
                localStorage.removeItem('country');
            } catch {
                // Switching countries does not depend on browser storage.
            }
        },

        fetchLessons() {
            return this.loadLessons('/lessons?country=' + encodeURIComponent(this.country));
        },

        // All lesson requests share ID mapping and cart reservations.
        loadLessons(path) {
            if (!this.country || this.isSubmitting) {
                return Promise.resolve();
            }

            this.isLoading = true;
            this.lessonErrorMessage = '';

            return fetch(this.API_URL + path)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Lesson request failed: ' + response.status);
                    }
                    return response.json();
                })
                .then(documents => {
                    if (!Array.isArray(documents)) {
                        throw new Error('Expected a lesson list.');
                    }

                    documents.forEach(document => {
                        const reserved = this.cart.filter(id => id === document._id).length;
                        const lesson = {
                            ...document,
                            id: document._id,
                            space: Math.max(0, document.space - reserved)
                        };
                        const knownLesson = this.lessons.find(item => item.id === lesson.id);
                        if (knownLesson) {
                            Object.assign(knownLesson, lesson);
                        } else {
                            this.lessons.push(lesson);
                        }
                    });

                    // Keep the catalogue for cart lookups; only the displayed IDs change.
                    this.visibleLessonIds = documents.map(lesson => lesson._id);
                })
                .catch(() => {
                    this.lessonErrorMessage = 'Unable to load lessons. Please try again.';
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        retryLessons() {
            if (this.selectedTeacher) {
                return this.filterByTeacher();
            }
            return this.searchLessons();
        },

        canAddToCart(lesson) {
            return !!this.country && !this.isLoading && !this.isSubmitting
                && lesson.space > 0;
        },

        addToCart(lesson) {
            if (!this.canAddToCart(lesson)) {
                return;
            }
            this.cart.push(lesson.id);
            lesson.space -= 1;
            this.orderConfirmation = '';
            this.availabilityWarning = '';
            this.checkoutId = '';
        },

        toggleCartPage() {
            if (!this.isSubmitting && (this.cartCount > 0 || this.showCartPage)) {
                this.showCartPage = !this.showCartPage;
            }
        },

        removeFromCart(index) {
            if (this.isSubmitting
                || !Number.isInteger(index) || index < 0 || index >= this.cart.length) {
                return;
            }
            const lesson = this.lessons.find(item => item.id === this.cart[index]);
            this.cart.splice(index, 1);
            lesson.space += 1;
            this.orderConfirmation = '';
            this.availabilityWarning = '';
            this.checkoutId = '';
        },

        submitOrder() {
            if (!this.canCheckout) {
                return Promise.resolve();
            }

            this.isSubmitting = true;
            this.errorMessage = '';
            this.orderConfirmation = '';
            this.availabilityWarning = '';

            if (!this.checkoutId) {
                this.checkoutId = crypto.randomUUID();
            }

            // These snapshots remain available after the cart is cleared.
            const order = {
                checkoutId: this.checkoutId,
                name: this.customerName.trim(),
                phone: this.customerPhone.trim(),
                lessonIDs: this.cart.slice(),
                spaces: this.cartCount
            };
            const lessonUpdates = [...new Set(this.cart)].map(id => {
                const lesson = this.lessons.find(item => item.id === id);
                return { id, space: lesson.space };
            });

            return fetch(this.API_URL + '/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Order request failed: ' + response.status);
                    }
                    return response;
                })
                .catch(() => {
                    this.errorMessage = 'Your order was not placed. Please try again.';
                    return null;
                })
                .then(response => {
                    if (response === null) {
                        return;
                    }

                    // A successful POST is final, even if availability updates fail.
                    this.orderConfirmation = 'Order confirmed. ' + order.spaces
                        + (order.spaces === 1 ? ' space booked.' : ' spaces booked.');
                    this.cart = [];
                    this.customerName = '';
                    this.customerPhone = '';
                    this.checkoutId = '';

                    const updateSpaces = () => Promise.all(
                        lessonUpdates.map(lesson => this.updateLessonSpace(lesson))
                    );
                    return updateSpaces()
                        .catch(() => updateSpaces())
                        .catch(() => {
                            this.availabilityWarning = 'Your order is confirmed, but the remaining spaces could not be updated.';
                        });
                })
                .finally(() => {
                    this.isSubmitting = false;
                });
        },

        updateLessonSpace(lesson) {
            return fetch(this.API_URL + '/lessons/' + encodeURIComponent(lesson.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ space: lesson.space })
            }).then(response => {
                if (!response.ok) {
                    throw new Error('Availability request failed: ' + response.status);
                }
            });
        },

        searchLessons() {
            if (!this.country || this.isSubmitting) {
                return Promise.resolve();
            }
            this.selectedTeacher = '';
            const query = this.searchText.trim();
            if (!query) {
                return this.fetchLessons();
            }
            return this.loadLessons('/search?q=' + encodeURIComponent(query)
                + '&country=' + encodeURIComponent(this.country));
        },

        fetchTeachers() {
            if (!this.country) {
                return Promise.resolve();
            }
            return fetch(this.API_URL + '/teachers?country=' + encodeURIComponent(this.country))
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Teacher request failed: ' + response.status);
                    }
                    return response.json();
                })
                .then(documents => {
                    if (!Array.isArray(documents)) {
                        throw new Error('Expected a teacher list.');
                    }
                    this.teachers = documents.map(teacher => ({
                        ...teacher,
                        id: teacher._id,
                        name: teacher.firstName + ' ' + teacher.lastName
                    }));
                    this.teacherErrorMessage = '';
                })
                .catch(() => {
                    this.teacherErrorMessage = 'Unable to load teachers. Please try again.';
                });
        },

        filterByTeacher() {
            if (!this.country || this.isSubmitting) {
                return Promise.resolve();
            }
            this.searchText = '';
            if (!this.selectedTeacher) {
                return this.fetchLessons();
            }
            return this.fetchTeacherLessons(this.selectedTeacher);
        },

        fetchTeacherLessons(teacherId) {
            return this.loadLessons('/teachers/' + encodeURIComponent(teacherId) + '/lessons');
        }
    },

    mounted() {
        if (this.country) {
            return Promise.all([this.fetchLessons(), this.fetchTeachers()]);
        }
    }
});

app.mount('#app');
