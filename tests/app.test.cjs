// Exercise the shop logic with documented API responses, without placing live orders.
// The Vue stub binds Options API methods/computed values and unwraps setup() refs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const lessonA = {
    _id: '66f000000000000000000101', topic: 'Football', location: 'Al Barsha',
    country: 'UAE', currency: 'AED', price: 95, space: 5, image: 'football.webp'
};
const lessonB = {
    _id: '66f000000000000000000102', topic: 'Art', location: 'Jumeirah',
    country: 'UAE', currency: 'AED', price: 180, space: 2, image: 'art.webp'
};
const lessonC = {
    _id: '66f000000000000000000103', topic: 'Coding', location: 'Downtown',
    country: 'UAE', currency: 'AED', price: 9, space: 0, image: 'coding.webp'
};
const ukLesson = { ...lessonA, _id: '66f000000000000000000201', country: 'UK', currency: 'GBP' };
const uaeTeacher = {
    _id: '66f100000000000000000101', firstName: 'Fatima', lastName: 'Al Mansoori',
    country: 'UAE', lessonIDs: [lessonB._id, lessonC._id]
};
const ukTeacher = { ...uaeTeacher, _id: '66f100000000000000000201', country: 'UK', lessonIDs: [ukLesson._id] };
const plain = value => JSON.parse(JSON.stringify(value));
const reply = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(structuredClone(body))
});
const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};

function makeApp({ country, hostname = '127.0.0.1', storageFails = false, handleFetch } = {}) {
    const storage = new Map(country === undefined ? [] : [['country', country]]);
    const lessons = structuredClone([lessonA, lessonB, lessonC, ukLesson]);
    const teachers = structuredClone([uaeTeacher, ukTeacher]);
    const orders = [];
    const requests = [];
    let options;
    let mountTarget;

    function serve(request) {
        const url = new URL(request.url);
        const country = url.searchParams.get('country');
        if (request.method === 'POST' && url.pathname === '/orders') {
            // Model the unique checkout ID contract required by the real API.
            if (orders.some(order => order.checkoutId === request.body.checkoutId)) {
                return reply({ _id: 'order-1' });
            }
            orders.push(request.body);
            return reply({ _id: 'order-1' }, 201);
        }
        if (request.method === 'PUT' && url.pathname.startsWith('/lessons/')) {
            const lesson = lessons.find(item => item._id === decodeURIComponent(url.pathname.split('/')[2]));
            if (!lesson) {
                return reply({ error: 'Not found' }, 404);
            }
            lesson.space = request.body.space;
            return reply({ matchedCount: 1, modifiedCount: 1 });
        }
        if (url.pathname === '/lessons') {
            return reply(lessons.filter(item => item.country === country));
        }
        if (url.pathname === '/search') {
            const query = url.searchParams.get('q').toLowerCase();
            return reply(lessons.filter(item => item.country === country
                && [item.topic, item.location, item.price, item.space].some(
                    value => String(value).toLowerCase().includes(query)
                )));
        }
        if (url.pathname === '/teachers') {
            return reply(teachers.filter(item => item.country === country));
        }
        if (url.pathname.startsWith('/teachers/') && url.pathname.endsWith('/lessons')) {
            const teacher = teachers.find(item => item._id === decodeURIComponent(url.pathname.split('/')[2]));
            return teacher ? reply(lessons.filter(item => teacher.lessonIDs.includes(item._id)))
                : reply({ error: 'Not found' }, 404);
        }
        return reply({ error: 'Not found' }, 404);
    }

    const context = {
        crypto: { randomUUID },
        location: { hostname },
        localStorage: {
            getItem(key) {
                if (storageFails) { throw new Error('Storage blocked'); }
                return storage.get(key) ?? null;
            },
            setItem(key, value) {
                if (storageFails) { throw new Error('Storage blocked'); }
                storage.set(key, value);
            },
            removeItem(key) {
                if (storageFails) { throw new Error('Storage blocked'); }
                storage.delete(key);
            }
        },
        fetch(url, settings = {}) {
            const request = {
                url,
                method: settings.method || 'GET',
                headers: settings.headers,
                body: settings.body ? JSON.parse(settings.body) : undefined
            };
            requests.push(request);
            return Promise.resolve().then(() => handleFetch ? handleFetch(request, serve) : serve(request));
        },
        Vue: {
            ref: value => ({ value }),
            createApp(configuration) {
                options = configuration;
                return { mount: target => { mountTarget = target; } };
            }
        }
    };
    vm.runInNewContext(source, context, { filename: 'app.js' });
    const app = options.data();
    for (const [key, ref] of Object.entries(options.setup())) {
        Object.defineProperty(app, key, {
            get: () => ref.value,
            set: value => { ref.value = value; }
        });
    }
    for (const [name, method] of Object.entries(options.methods)) {
        app[name] = method.bind(app);
    }
    for (const [name, computed] of Object.entries(options.computed)) {
        Object.defineProperty(app, name, { get: () => computed.call(app) });
    }

    return { app, storage, requests, lessons, orders, mountTarget, mount: () => options.mounted.call(app) };
}

async function basket(options) {
    const fixture = makeApp(options);
    await fixture.app.chooseCountry('UAE');
    const { app } = fixture;
    app.addToCart(app.lessons.find(item => item.id === lessonA._id));
    app.addToCart(app.lessons.find(item => item.id === lessonA._id));
    app.addToCart(app.lessons.find(item => item.id === lessonB._id));
    app.customerName = 'Afsah Mumtaz';
    app.customerPhone = '0501234567';
    app.toggleCartPage();
    return fixture;
}

test('initial state exposes the image API URL and selects local or hosted endpoints', () => {
    const local = makeApp();
    assert.equal(local.mountTarget, '#app');
    assert.equal(local.app.API_URL, 'http://localhost:3000');
    assert.equal(makeApp({ hostname: 'localhost' }).app.API_URL, 'http://localhost:3000');
    assert.equal(makeApp({ hostname: 'name0x0.github.io' }).app.API_URL, 'https://m01041307-after-school.onrender.com');
    assert.equal(local.app.country, '');
    assert.equal(local.app.cartCount, 0);
    assert.equal(local.app.canCheckout, false);
});

test('country selection is remembered and maps lesson IDs and teacher names', async () => {
    const { app, storage, requests } = makeApp();
    await app.chooseCountry('UAE');
    assert.equal(storage.get('country'), 'UAE');
    assert.equal(app.lessons.length, 3);
    assert.equal(app.lessons[0].id, lessonA._id);
    assert.equal(app.teachers[0].id, uaeTeacher._id);
    assert.equal(app.teachers[0].name, 'Fatima Al Mansoori');
    assert.equal(app.isLoading, false);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(item => new URL(item.url).searchParams.get('country') === 'UAE'));
});

test('saved countries load on mount; invalid saved values and choices are ignored', async () => {
    const saved = makeApp({ country: 'UK' });
    await saved.mount();
    assert.deepEqual(plain(saved.app.visibleLessonIds), [ukLesson._id]);
    assert.equal(saved.app.teachers[0].id, ukTeacher._id);
    const invalid = makeApp({ country: 'XX' });
    await invalid.mount();
    await invalid.app.chooseCountry('XX');
    assert.equal(invalid.app.country, '');
    assert.equal(invalid.requests.length, 0);
});

test('blocked browser storage does not prevent selection or country switching', async () => {
    const { app } = makeApp({ storageFails: true });
    await app.chooseCountry('UAE');
    assert.equal(app.sortedLessons.length, 3);
    app.switchCountry();
    assert.equal(app.country, '');
});

test('all four sort fields support both directions without changing catalogue order', async () => {
    const { app } = makeApp();
    await app.chooseCountry('UAE');
    const original = app.lessons.map(item => item.id);
    const fields = {
        topic: ['Art', 'Coding', 'Football'],
        location: ['Al Barsha', 'Downtown', 'Jumeirah'],
        price: [9, 95, 180],
        space: [0, 2, 5]
    };
    for (const [field, expected] of Object.entries(fields)) {
        app.sortBy = field;
        app.sortOrder = 'asc';
        assert.deepEqual(plain(app.sortedLessons.map(item => item[field])), expected);
        app.sortOrder = 'desc';
        assert.deepEqual(plain(app.sortedLessons.map(item => item[field])), expected.slice().reverse());
    }
    assert.deepEqual(plain(app.lessons.map(item => item.id)), plain(original));
});

test('adding stops at zero spaces and removing restores exactly one space', async () => {
    const { app } = makeApp();
    await app.chooseCountry('UAE');
    const lesson = app.lessons[0];
    for (let i = 0; i < 6; i += 1) { app.addToCart(lesson); }
    assert.equal(lesson.space, 0);
    assert.equal(app.cartCount, 5);
    assert.equal(app.canAddToCart(lesson), false);
    app.removeFromCart(1);
    assert.equal(app.cartCount, 4);
    assert.equal(lesson.space, 1);
    app.removeFromCart(-1);
    app.removeFromCart(4);
    app.removeFromCart(0.5);
    assert.equal(app.cartCount, 4);
});

test('search keeps hidden cart lessons and refreshes subtract reservations only once', async () => {
    const { app } = await basket();
    app.searchText = 'Art';
    await app.searchLessons();
    assert.deepEqual(plain(app.sortedLessons.map(item => item.id)), [lessonB._id]);
    assert.deepEqual(plain(app.cartLessons.map(item => item.id)), [lessonA._id, lessonA._id, lessonB._id]);
    await app.searchLessons();
    assert.equal(app.cartLessons[2].space, 1);
    app.removeFromCart(0);
    assert.equal(app.lessons.find(item => item.id === lessonA._id).space, 4);
    await app.fetchLessons();
    assert.equal(app.lessons.find(item => item.id === lessonA._id).space, 4);
    assert.equal(app.lessons.find(item => item.id === lessonB._id).space, 1);
});

test('server search encodes text and empty search restores all lessons and clears teacher selection', async () => {
    const { app, requests } = makeApp();
    await app.chooseCountry('UAE');
    app.selectedTeacher = uaeTeacher._id;
    app.searchText = ' Art & paint? ';
    await app.searchLessons();
    const url = new URL(requests.at(-1).url);
    assert.equal(url.pathname, '/search');
    assert.equal(url.searchParams.get('q'), 'Art & paint?');
    assert.equal(url.searchParams.get('country'), 'UAE');
    assert.equal(app.selectedTeacher, '');
    assert.equal(app.sortedLessons.length, 0);
    app.searchText = '   ';
    await app.searchLessons();
    assert.equal(new URL(requests.at(-1).url).pathname, '/lessons');
    assert.equal(app.sortedLessons.length, 3);
});

test('teacher filtering uses its REST endpoint and All Teachers restores the full list', async () => {
    const { app, requests } = makeApp();
    await app.chooseCountry('UAE');
    app.searchText = 'Football';
    app.selectedTeacher = uaeTeacher._id;
    await app.filterByTeacher();
    assert.equal(new URL(requests.at(-1).url).pathname, '/teachers/' + uaeTeacher._id + '/lessons');
    assert.equal(app.searchText, '');
    assert.deepEqual(plain(app.sortedLessons.map(item => item.topic)), ['Art', 'Coding']);
    app.selectedTeacher = '';
    await app.filterByTeacher();
    assert.equal(app.sortedLessons.length, 3);
});

test('country switching clears shop state and the saved preference', async () => {
    const { app, storage } = await basket();
    app.searchText = 'Art';
    app.selectedTeacher = uaeTeacher._id;
    app.switchCountry();
    assert.equal(storage.has('country'), false);
    assert.equal(app.country, '');
    assert.equal(app.customerName, '');
    assert.equal(app.customerPhone, '');
    assert.equal(app.searchText, '');
    assert.equal(app.selectedTeacher, '');
    assert.equal(app.cartCount, 0);
    assert.equal(app.showCartPage, false);
    assert.equal(app.lessons.length, 0);
    assert.equal(app.visibleLessonIds.length, 0);
    assert.equal(app.teachers.length, 0);
    await app.chooseCountry('UK');
    assert.deepEqual(plain(app.lessons.map(item => item.id)), [ukLesson._id]);
    assert.equal(app.teachers[0].id, ukTeacher._id);
});

test('name and phone validation reject empty or invalid values and allow full names', () => {
    const { app } = makeApp();
    for (const value of ['', ' ', 'Afsah1', 'Afsah  Mumtaz', 'Afsah-Mumtaz']) {
        app.customerName = value;
        assert.equal(app.isNameValid, false, value);
    }
    for (const value of ['Afsah', 'Afsah Mumtaz', ' Afsah Mumtaz ']) {
        app.customerName = value;
        assert.equal(app.isNameValid, true, value);
    }
    for (const value of ['', ' ', '+97150', '050 123', 'phone']) {
        app.customerPhone = value;
        assert.equal(app.isPhoneValid, false, value);
    }
    app.customerPhone = ' 0501234567 ';
    assert.equal(app.isPhoneValid, true);
});

test('invalid checkout makes no order request', async () => {
    const { app, requests } = await basket();
    const count = requests.length;
    app.customerName = '123';
    await app.submitOrder();
    assert.equal(requests.length, count);
    assert.equal(app.cartCount, 3);
});

test('checkout posts repeated IDs and sends one absolute-space PUT per distinct lesson', async () => {
    const { app, orders, requests, lessons } = await basket();
    assert.equal(app.canCheckout, true);
    await app.submitOrder();
    assert.deepEqual(orders, [{
        checkoutId: requests.find(item => item.method === 'POST').body.checkoutId,
        name: 'Afsah Mumtaz', phone: '0501234567',
        lessonIDs: [lessonA._id, lessonA._id, lessonB._id], spaces: 3
    }]);
    const updates = requests.filter(item => item.method === 'PUT');
    assert.deepEqual(updates.map(item => item.body), [{ space: 3 }, { space: 1 }]);
    assert.ok(updates.every(item => item.headers['Content-Type'] === 'application/json'));
    assert.equal(lessons.find(item => item._id === lessonA._id).space, 3);
    assert.equal(app.cartCount, 0);
    assert.equal(app.customerName, '');
    assert.equal(app.customerPhone, '');
    assert.match(app.orderConfirmation, /3 spaces booked/);
    assert.equal(app.canCheckout, false);
    assert.equal(app.isSubmitting, false);
    app.toggleCartPage();
    assert.equal(app.showCartPage, false);
});

test('double checkout and cart or country changes are blocked while an order is saving', async () => {
    const gate = deferred();
    const fixture = await basket({
        handleFetch(request, serve) {
            return request.method === 'POST' ? gate.promise.then(() => serve(request)) : serve(request);
        }
    });
    const { app } = fixture;
    const first = app.submitOrder();
    const second = app.submitOrder();
    app.addToCart(app.lessons[0]);
    app.removeFromCart(0);
    app.switchCountry();
    app.toggleCartPage();
    assert.equal(app.cartCount, 3);
    assert.equal(app.country, 'UAE');
    assert.equal(app.showCartPage, true);
    assert.equal(app.canCheckout, false);
    gate.resolve();
    await Promise.all([first, second]);
    assert.equal(fixture.orders.length, 1);
});

test('failed POST keeps the cart and a second attempt sends the same checkout ID', async () => {
    let failPost = true;
    const { app, requests, orders } = await basket({
        handleFetch(request, serve) {
            return request.method === 'POST' && failPost
                ? reply({ error: 'Unavailable' }, 503) : serve(request);
        }
    });
    await app.submitOrder();
    const firstPost = requests.find(item => item.method === 'POST');
    assert.equal(typeof firstPost.body.checkoutId, 'string');
    assert.notEqual(firstPost.body.checkoutId, '');
    assert.equal(app.checkoutId, firstPost.body.checkoutId);
    assert.deepEqual(plain(app.cart), [lessonA._id, lessonA._id, lessonB._id]);
    assert.equal(app.customerName, 'Afsah Mumtaz');
    assert.equal(app.customerPhone, '0501234567');
    assert.equal(app.isSubmitting, false);
    assert.equal(app.canCheckout, true);
    assert.equal(app.errorMessage, 'Your order was not placed. Please try again.');
    assert.equal(requests.filter(item => item.method === 'PUT').length, 0);
    failPost = false;
    await app.submitOrder();
    const posts = requests.filter(item => item.method === 'POST');
    assert.equal(posts.length, 2);
    assert.deepEqual(posts[1].body, posts[0].body);
    assert.equal(orders.length, 1);
    assert.equal(app.checkoutId, '');
    assert.equal(app.cartCount, 0);
});

test('a successful POST does not depend on parsing its response body', async () => {
    const { app, orders } = await basket({
        handleFetch(request, serve) {
            const response = serve(request);
            if (request.method === 'POST') {
                response.json = () => { throw new Error('No response body'); };
            }
            return response;
        }
    });
    await app.submitOrder();
    assert.equal(orders.length, 1);
    assert.equal(app.cartCount, 0);
    assert.equal(app.errorMessage, '');
});

test('HTTP failures, rejected fetches and malformed lists produce an error and stop loading', async () => {
    for (const failure of [
        () => reply({ error: 'Not implemented yet' }, 501),
        () => Promise.reject(new Error('Network failed')),
        () => reply({ lessons: [] })
    ]) {
        const { app } = makeApp({
            handleFetch(request, serve) {
                return request.url.includes('/lessons?') ? failure() : serve(request);
            }
        });
        await app.chooseCountry('UAE');
        assert.equal(app.isLoading, false);
        assert.match(app.lessonErrorMessage, /Unable to load lessons/);
        assert.equal(app.lessons.length, 0);
    }
});

test('teacher failures are visible instead of being treated as an empty successful list', async () => {
    const { app } = makeApp({
        handleFetch(request, serve) {
            return request.url.includes('/teachers?') ? reply({ error: 'Not implemented yet' }, 501) : serve(request);
        }
    });
    await app.chooseCountry('UAE');
    assert.match(app.teacherErrorMessage, /Unable to load teachers/);
    assert.equal(app.errorMessage, '');
    assert.equal(app.sortedLessons.length, 3);
    assert.equal(app.teachers.length, 0);
});

test('teacher errors remain visible after another lesson search', async () => {
    const { app } = makeApp({
        handleFetch(request, serve) {
            return request.url.includes('/teachers?')
                ? reply({ error: 'Unavailable' }, 503) : serve(request);
        }
    });
    await app.chooseCountry('UAE');
    const teacherError = app.teacherErrorMessage;
    assert.match(teacherError, /Unable to load teachers/);
    app.addToCart(app.lessons.find(item => item.id === lessonA._id));
    app.searchText = 'Art';
    await app.searchLessons();
    assert.equal(app.teacherErrorMessage, teacherError);
    assert.equal(app.cartCount, 1);
    assert.deepEqual(plain(app.sortedLessons.map(item => item.topic)), ['Art']);
    app.switchCountry();
    assert.equal(app.teacherErrorMessage, '');
});

test('teacher retry preserves the country and cart and clears the teacher error on success', async () => {
    let teachersUnavailable = true;
    const { app, storage } = makeApp({
        handleFetch(request, serve) {
            return request.url.includes('/teachers?') && teachersUnavailable
                ? reply({ error: 'Unavailable' }, 503) : serve(request);
        }
    });
    await app.chooseCountry('UAE');
    const lesson = app.lessons.find(item => item.id === lessonA._id);
    app.addToCart(lesson);
    app.addToCart(lesson);
    assert.doesNotMatch(app.teacherErrorMessage, /choose your country again/);
    app.lessonErrorMessage = 'Unable to load lessons. Please try again.';
    teachersUnavailable = false;
    await app.fetchTeachers();
    assert.equal(app.teacherErrorMessage, '');
    assert.equal(app.lessonErrorMessage, 'Unable to load lessons. Please try again.');
    assert.equal(app.country, 'UAE');
    assert.equal(storage.get('country'), 'UAE');
    assert.deepEqual(plain(app.cart), [lessonA._id, lessonA._id]);
    assert.equal(lesson.space, 3);
    assert.equal(app.teachers[0].name, 'Fatima Al Mansoori');
});

test('ratings calculate five full, half or empty stars for each score', () => {
    const { app } = makeApp();
    for (const [rating, full, half, empty] of [
        [0, 0, 0, 5], [0.5, 0, 1, 4], [1, 1, 0, 4],
        [2.5, 2, 1, 2], [3, 3, 0, 2], [4.5, 4, 1, 0], [5, 5, 0, 0]
    ]) {
        const stars = app.ratingStars({ rating });
        assert.equal(stars.length, 5);
        assert.equal(stars.filter(icon => icon === 'fa-solid fa-star').length, full, rating);
        assert.equal(stars.filter(icon => icon === 'fa-solid fa-star-half-stroke').length, half, rating);
        assert.equal(stars.filter(icon => icon === 'fa-regular fa-star').length, empty, rating);
    }
});

test('rating values clamp to the scale and round at quarter-star boundaries', () => {
    const { app } = makeApp();
    for (const [rating, expected] of [
        [-10, 0], [8, 5], [0.24, 0], [0.25, 0.5], [0.74, 0.5], [0.75, 1],
        [4.24, 4], [4.25, 4.5], [4.74, 4.5], [4.75, 5]
    ]) {
        assert.equal(app.ratingValue({ rating }), expected, rating);
        const stars = app.ratingStars({ rating });
        const displayedScore = stars.filter(icon => icon === 'fa-solid fa-star').length
            + stars.filter(icon => icon === 'fa-solid fa-star-half-stroke').length / 2;
        assert.equal(displayedScore, expected, rating);
    }
});

test('missing or invalid ratings are labelled Not rated with five outlined stars', () => {
    const { app } = makeApp();
    for (const rating of [undefined, null, NaN, Infinity, -Infinity, '', '4.5', {}, []]) {
        assert.equal(app.ratingValue({ rating }), null);
        assert.equal(app.ratingLabel({ rating }), 'Not rated');
        assert.deepEqual(plain(app.ratingStars({ rating })), Array(5).fill('fa-regular fa-star'));
    }
});


test('successful POST clears the cart before PUTs and two failed update rounds cannot repost the order', async () => {
    let app;
    const fixture = await basket({
        handleFetch(request, serve) {
            if (request.method === 'PUT') {
                assert.equal(app.cartCount, 0);
                assert.equal(app.customerName, '');
                assert.equal(app.customerPhone, '');
                assert.equal(app.checkoutId, '');
                assert.match(app.orderConfirmation, /3 spaces booked/);
                assert.equal(app.isSubmitting, true);
                assert.equal(app.canCheckout, false);
                return reply({ error: 'Unavailable' }, 503);
            }
            return serve(request);
        }
    });
    app = fixture.app;
    await app.submitOrder();
    assert.equal(fixture.orders.length, 1);
    assert.equal(fixture.requests.filter(item => item.method === 'POST').length, 1);
    const updates = fixture.requests.filter(item => item.method === 'PUT');
    assert.equal(updates.length, 4);
    assert.deepEqual(updates.map(item => item.body), [
        { space: 3 }, { space: 1 }, { space: 3 }, { space: 1 }
    ]);
    assert.match(app.orderConfirmation, /3 spaces booked/);
    assert.equal(app.cartCount, 0);
    assert.equal(app.errorMessage, '');
    assert.equal(app.availabilityWarning,
        'Your order is confirmed, but the remaining spaces could not be updated.');
    assert.equal(app.isSubmitting, false);
    assert.equal(app.canCheckout, false);
    await app.submitOrder();
    assert.equal(fixture.requests.filter(item => item.method === 'POST').length, 1);
    assert.equal(fixture.requests.filter(item => item.method === 'PUT').length, 4);
});

test('a failed PUT retries the complete snapshot once and clears the warning when the retry succeeds', async () => {
    const attempts = new Map();
    const { app, requests, orders, lessons } = await basket({
        handleFetch(request, serve) {
            if (request.method === 'PUT') {
                attempts.set(request.url, (attempts.get(request.url) || 0) + 1);
                if (request.url.endsWith(lessonA._id) && attempts.get(request.url) === 1) {
                    return reply({ error: 'Unavailable' }, 503);
                }
            }
            return serve(request);
        }
    });
    await app.submitOrder();
    assert.deepEqual([...attempts.values()], [2, 2]);
    assert.equal(requests.filter(item => item.method === 'PUT').length, 4);
    assert.equal(requests.filter(item => item.method === 'POST').length, 1);
    assert.equal(orders.length, 1);
    assert.equal(lessons.find(item => item._id === lessonA._id).space, 3);
    assert.equal(lessons.find(item => item._id === lessonB._id).space, 1);
    assert.equal(app.availabilityWarning, '');
    assert.match(app.orderConfirmation, /3 spaces booked/);
});

test('adding, removing or switching country after a failed POST creates a new checkout ID', async () => {
    for (const change of ['add', 'remove', 'switch']) {
        const { app, requests } = await basket({
            handleFetch(request, serve) {
                return request.method === 'POST' ? reply({ error: 'Unavailable' }, 503) : serve(request);
            }
        });
        await app.submitOrder();
        const firstId = app.checkoutId;
        if (change === 'add') {
            app.addToCart(app.lessons.find(item => item.id === lessonA._id));
        } else if (change === 'remove') {
            app.removeFromCart(0);
        } else {
            app.switchCountry();
            await app.chooseCountry('UK');
            app.addToCart(app.lessons.find(item => item.id === ukLesson._id));
            app.customerName = 'Afsah Mumtaz';
            app.customerPhone = '0501234567';
        }
        assert.equal(app.checkoutId, '', change);
        await app.submitOrder();
        const posts = requests.filter(item => item.method === 'POST');
        assert.equal(posts.length, 2, change);
        assert.notEqual(posts[1].body.checkoutId, firstId, change);
        assert.equal(app.checkoutId, posts[1].body.checkoutId, change);
    }
});

test('a lost POST reply reuses its checkout ID with an idempotent fake API', async () => {
    let loseReply = true;
    const { app, requests, orders } = await basket({
        handleFetch(request, serve) {
            const response = serve(request);
            if (request.method === 'POST' && loseReply) {
                loseReply = false;
                return Promise.reject(new Error('Reply lost after the order was saved'));
            }
            return response;
        }
    });
    await app.submitOrder();
    assert.equal(orders.length, 1);
    assert.equal(app.cartCount, 3);
    const checkoutId = app.checkoutId;
    await app.submitOrder();
    const posts = requests.filter(item => item.method === 'POST');
    assert.equal(posts.length, 2);
    assert.equal(posts[0].body.checkoutId, checkoutId);
    assert.equal(posts[1].body.checkoutId, checkoutId);
    assert.equal(orders.length, 1);
    assert.equal(app.cartCount, 0);
    assert.match(app.orderConfirmation, /3 spaces booked/);
});

test('lesson ratings come from API data and absent ratings remain absent', async () => {
    const { app } = makeApp({
        handleFetch(request, serve) {
            return request.url.endsWith('/lessons?country=UAE')
                ? reply([{ ...lessonA, rating: 3.5 }, lessonB, { ...lessonC, rating: 0 }])
                : serve(request);
        }
    });
    await app.chooseCountry('UAE');
    const rated = app.lessons.find(item => item.id === lessonA._id);
    const unrated = app.lessons.find(item => item.id === lessonB._id);
    const zero = app.lessons.find(item => item.id === lessonC._id);
    assert.equal(rated.rating, 3.5);
    assert.equal(app.ratingLabel(rated), 'Rating: 3.5 out of 5 stars');
    assert.equal(unrated.rating, undefined);
    assert.equal(app.ratingValue(unrated), null);
    assert.equal(zero.rating, 0);
    assert.equal(app.ratingLabel(zero), 'Rating: 0 out of 5 stars');
});

test('empty lesson cards show during loading and disappear when real lessons arrive', async () => {
    const pendingLessons = deferred();
    const fixture = makeApp({
        country: 'UAE',
        handleFetch(request, serve) {
            return request.url.includes('/lessons?') ? pendingLessons.promise : serve(request);
        }
    });
    const loading = fixture.mount();
    assert.equal(fixture.app.isLoading, true);
    assert.equal(fixture.app.showLessonPlaceholders, true);
    assert.equal(fixture.app.lessons.length, 0);
    assert.equal(fixture.app.cartCount, 0);
    pendingLessons.resolve(reply([lessonA]));
    await loading;
    assert.equal(fixture.app.showLessonPlaceholders, false);
    assert.equal(fixture.app.sortedLessons.length, 1);
    assert.equal(fixture.app.sortedLessons[0].topic, 'Football');
});

test('empty lesson cards stay after a failed load but disappear after a successful empty load', async () => {
    for (const [response, showPlaceholders] of [
        [reply({ error: 'Unavailable' }, 503), true],
        [reply([]), false]
    ]) {
        const { app } = makeApp({
            handleFetch(request, serve) {
                return request.url.includes('/lessons?') ? response : serve(request);
            }
        });
        await app.chooseCountry('UAE');
        assert.equal(app.isLoading, false);
        assert.equal(app.showLessonPlaceholders, showPlaceholders);
        assert.equal(app.lessonErrorMessage !== '', showPlaceholders);
        assert.equal(app.lessons.length, 0);
        assert.equal(app.visibleLessonIds.length, 0);
        assert.equal(app.cartCount, 0);
        assert.equal(app.canCheckout, false);
    }
});

test('a successful search with no matches never shows empty lesson cards', async () => {
    const { app } = makeApp();
    await app.chooseCountry('UAE');
    app.searchText = 'nothing matches this query';
    await app.searchLessons();
    assert.equal(app.sortedLessons.length, 0);
    assert.equal(app.showLessonPlaceholders, false);
    assert.equal(app.errorMessage, '');
    assert.equal(app.lessonErrorMessage, '');
    assert.equal(app.isLoading, false);
});

test('lesson Retry clears its error and hides empty lesson cards when it succeeds', async () => {
    let failLessons = true;
    const { app, requests } = makeApp({
        handleFetch(request, serve) {
            return request.url.includes('/lessons?') && failLessons
                ? reply({ error: 'Unavailable' }, 503) : serve(request);
        }
    });
    await app.chooseCountry('UAE');
    assert.match(app.lessonErrorMessage, /Unable to load lessons/);
    assert.equal(app.showLessonPlaceholders, true);
    failLessons = false;
    await app.retryLessons();
    assert.equal(app.lessonErrorMessage, '');
    assert.equal(app.showLessonPlaceholders, false);
    assert.equal(app.sortedLessons.length, 3);
    assert.equal(requests.at(-1).url, 'http://localhost:3000/lessons?country=UAE');
});

test('lesson Retry preserves search or teacher filters, the cart and a failed checkout ID', async () => {
    for (const filter of ['search', 'teacher']) {
        let failLessonRequest = false;
        const { app, requests } = await basket({
            handleFetch(request, serve) {
                if (request.method === 'POST') {
                    return reply({ error: 'Unavailable' }, 503);
                }
                if (failLessonRequest && (request.url.includes('/search?')
                    || request.url.includes('/teachers/' + uaeTeacher._id + '/lessons'))) {
                    return reply({ error: 'Unavailable' }, 503);
                }
                return serve(request);
            }
        });
        await app.submitOrder();
        const checkoutId = app.checkoutId;
        const orderError = app.errorMessage;
        const cart = plain(app.cart);
        failLessonRequest = true;
        if (filter === 'search') {
            app.searchText = 'Art';
            await app.searchLessons();
        } else {
            app.selectedTeacher = uaeTeacher._id;
            await app.filterByTeacher();
        }
        const failedUrl = requests.at(-1).url;
        assert.match(app.lessonErrorMessage, /Unable to load lessons/);
        assert.equal(app.errorMessage, orderError);
        failLessonRequest = false;
        await app.retryLessons();
        assert.equal(requests.at(-1).url, failedUrl);
        assert.equal(app.lessonErrorMessage, '');
        assert.equal(app.errorMessage, orderError);
        assert.equal(app.checkoutId, checkoutId);
        assert.deepEqual(plain(app.cart), cart);
        assert.equal(app.searchText, filter === 'search' ? 'Art' : '');
        assert.equal(app.selectedTeacher, filter === 'teacher' ? uaeTeacher._id : '');
    }
});

test('stars help is shown only when a visible lesson has a valid rating, including zero', async () => {
    const unrated = makeApp();
    await unrated.app.chooseCountry('UAE');
    assert.equal(unrated.app.hasVisibleRatings, false);

    const { app } = makeApp({
        handleFetch(request, serve) {
            const response = serve(request);
            if (request.url.includes('/lessons?') || request.url.includes('/search?')) {
                return response.json().then(documents => reply(documents.map(document => {
                    if (document._id === lessonA._id) {
                        return { ...document, rating: 4.5 };
                    }
                    if (document._id === lessonC._id) {
                        return { ...document, rating: 0 };
                    }
                    return document;
                })));
            }
            return response;
        }
    });
    await app.chooseCountry('UAE');
    assert.equal(app.hasVisibleRatings, true);
    app.searchText = 'Art';
    await app.searchLessons();
    assert.equal(app.hasVisibleRatings, false);
    app.searchText = 'Coding';
    await app.searchLessons();
    assert.equal(app.hasVisibleRatings, true);
    app.searchText = 'nothing matches this query';
    await app.searchLessons();
    assert.equal(app.hasVisibleRatings, false);
});
