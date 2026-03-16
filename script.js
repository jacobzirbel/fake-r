// ── Config ────────────────────────────────────────────────────────────────────

const ALL_COLORS = ['red','blue','green','yellow','orange','teal','purple','pink','indigo','lime'];

const config = {
    enabled: new Set(ALL_COLORS),
    density: window.innerWidth < 768 ? 5 : 40,
    sizes: 'uniform',
    style: 'flat',
    theme: 'dark',
    layout: 'single',
    sort: 'random',
    purpleLuck: 4,
};

const stats = { seen: 0, purples: 0, selected: 0, threads: 0 };

// base probabilities (purple overridden by purpleLuck)
const BASE_PROBS = { red:22, blue:18, green:18, yellow:12, orange:11, teal:7, pink:5, indigo:4, lime:3, purple:4 };

function getProbs() {
    const out = {};
    let total = 0;
    for (const c of config.enabled) {
        out[c] = c === 'purple' ? config.purpleLuck : (BASE_PROBS[c] ?? 5);
        total += out[c];
    }
    // normalize
    for (const c in out) out[c] /= total;
    return out;
}

function weightedRandom(probs) {
    let r = Math.random(), cum = 0;
    for (const [k, v] of Object.entries(probs)) {
        cum += v;
        if (r < cum) return k;
    }
    return Object.keys(probs)[0];
}

const SIZE_SETS = {
    uniform: () => 'medium',
    varied:  () => weightedRandom({ tall:.2, medium:.55, short:.25 }),
    chaos:   () => weightedRandom({ tall:.25, medium:.3, short:.3, wide:.15 }),
};

// ── Block variants ────────────────────────────────────────────────────────────

const VARIANTS = ['plain','tagged','scored','avatar','banner','striped'];
const VARIANT_PROBS = { plain:.3, tagged:.2, scored:.2, avatar:.15, banner:.1, striped:.05 };

function randomInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function makeInner(variant) {
    if (variant === 'tagged') {
        const n = randomInt(1, 3);
        let tags = '';
        for (let i = 0; i < n; i++)
            tags += `<span class="tag" style="opacity:${0.4 + i * 0.15}"></span>`;
        return `<div class="inner-tags">${tags}</div>`;
    }
    if (variant === 'scored') {
        const dots = randomInt(3, 9);
        let d = '';
        for (let i = 0; i < dots; i++) d += `<span class="dot"></span>`;
        return `<div class="inner-dots">${d}</div>`;
    }
    if (variant === 'avatar') {
        return `<div class="inner-avatar"><div class="av-circle"></div><div class="av-lines"><span></span><span></span></div></div>`;
    }
    if (variant === 'banner') {
        return `<div class="inner-banner"><span></span></div>`;
    }
    if (variant === 'striped') {
        return `<div class="inner-stripes"><span></span><span></span><span></span></div>`;
    }
    return '';
}

// ── Ripple ────────────────────────────────────────────────────────────────────

function ripple(el, e) {
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    el.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
}

// ── Threads ───────────────────────────────────────────────────────────────────

function createThread(parentColor) {
    const probs = getProbs();
    const count = randomInt(2, 6);
    const wrap = document.createElement('div');
    wrap.className = 'thread-wrap';

    for (let i = 0; i < count; i++) {
        const color = Math.random() < 0.4 ? parentColor : weightedRandom(probs);
        const child = document.createElement('div');
        child.className = `item thread-item ${color} ${weightedRandom({short:.5, medium:.4, tall:.1})}`;
        child.style.animationDelay = `${i * 50}ms`;
        const variant = weightedRandom(VARIANT_PROBS);
        child.innerHTML = makeInner(variant) + `<div class="thread-depth-line"></div>`;

        child.addEventListener('click', e => {
            e.stopPropagation();
            ripple(child, e);
            child.classList.toggle('selected');
            stats.selected += child.classList.contains('selected') ? 1 : -1;
            updateStats();
        });

        if (color === 'purple') stats.purples++;
        stats.seen++;
        wrap.appendChild(child);
    }
    stats.threads++;
    updateStats();
    return wrap;
}

// ── Create item ───────────────────────────────────────────────────────────────

function createItem(probs, i) {
    const color = weightedRandom(probs);
    const sizeMode = SIZE_SETS[config.sizes] || SIZE_SETS.uniform;
    const size = sizeMode();
    const variant = weightedRandom(VARIANT_PROBS);

    const el = document.createElement('div');
    el.className = `item ${color} ${size}`;
    el.style.animationDelay = `${i * 25}ms`;
    el.innerHTML = makeInner(variant);

    if (color === 'purple') stats.purples++;
    stats.seen++;

    let threadWrap = null;

    el.addEventListener('click', e => {
        ripple(el, e);

        if (threadWrap) {
            // collapse
            threadWrap.classList.add('collapsing');
            threadWrap.addEventListener('animationend', () => threadWrap.remove(), { once: true });
            threadWrap = null;
            el.classList.remove('open');
            return;
        }

        const wasSelected = el.classList.contains('selected');
        el.classList.toggle('selected');
        stats.selected += el.classList.contains('selected') ? 1 : -1;
        updateStats();

        // open thread on double-meaning click (selected→open thread)
        if (!wasSelected) {
            threadWrap = createThread(color);
            el.after(threadWrap);
            el.classList.add('open');
        }
    });

    return el;
}

// ── Feed ──────────────────────────────────────────────────────────────────────

function buildFeed() {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';

    if (config.enabled.size === 0) {
        feed.innerHTML = '<div class="empty-msg">no colors selected</div>';
        return;
    }

    feed.className = `layout-${config.layout}`;
    const probs = getProbs();

    let items = Array.from({ length: Number(config.density) }, (_, i) => createItem(probs, i));

    if (config.sort === 'color') {
        items.sort((a, b) => {
            const order = ALL_COLORS;
            const ca = [...a.classList].find(c => ALL_COLORS.includes(c));
            const cb = [...b.classList].find(c => ALL_COLORS.includes(c));
            return order.indexOf(ca) - order.indexOf(cb);
        });
    } else if (config.sort === 'size') {
        const sizeOrder = { tall: 0, medium: 1, short: 2, wide: 3 };
        items.sort((a, b) => {
            const sa = [...a.classList].find(c => sizeOrder[c] !== undefined) ?? 'medium';
            const sb = [...b.classList].find(c => sizeOrder[c] !== undefined) ?? 'medium';
            return sizeOrder[sa] - sizeOrder[sb];
        });
    }

    items.forEach(el => feed.appendChild(el));
    updateStats();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function updateStats() {
    document.getElementById('stats').innerHTML = `
        <div class="stat-row"><span>seen</span><strong>${stats.seen}</strong></div>
        <div class="stat-row purple-stat"><span>purples</span><strong>${stats.purples}</strong></div>
        <div class="stat-row"><span>selected</span><strong>${stats.selected}</strong></div>
        <div class="stat-row"><span>threads</span><strong>${stats.threads}</strong></div>
    `;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function buildColorToggles() {
    const container = document.getElementById('color-toggles');
    container.innerHTML = '';
    for (const color of ALL_COLORS) {
        const btn = document.createElement('button');
        btn.className = `color-toggle ${color} ${config.enabled.has(color) ? 'active' : ''}`;
        btn.title = color;
        btn.addEventListener('click', () => {
            if (config.enabled.has(color)) {
                config.enabled.delete(color);
                btn.classList.remove('active');
            } else {
                config.enabled.add(color);
                btn.classList.add('active');
            }
            buildFeed();
        });
        container.appendChild(btn);
    }
}

function bindButtonGroup(id, key, rebuild) {
    document.getElementById(id).querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(id).querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            config[key] = btn.dataset.val;
            if (rebuild) buildFeed();
        });
    });
}

function applyTheme(theme) {
    const themes = {
        dark:   { '--bg': '#111', '--sidebar-bg': '#1a1a1a', '--sidebar-border': '#2a2a2a', '--text': '#aaa' },
        light:  { '--bg': '#e8e8e8', '--sidebar-bg': '#f0f0f0', '--sidebar-border': '#ccc', '--text': '#555' },
        amoled: { '--bg': '#000', '--sidebar-bg': '#0a0a0a', '--sidebar-border': '#1a1a1a', '--text': '#888' },
        warm:   { '--bg': '#1a1008', '--sidebar-bg': '#241808', '--sidebar-border': '#3a2a10', '--text': '#aa8866' },
    };
    const vars = themes[theme] || themes.dark;
    for (const [k, v] of Object.entries(vars))
        document.documentElement.style.setProperty(k, v);
}

// ── Init ──────────────────────────────────────────────────────────────────────

buildColorToggles();
bindButtonGroup('density-btns', 'density', true);
bindButtonGroup('size-btns', 'sizes', true);
bindButtonGroup('sort-btns', 'sort', true);
bindButtonGroup('layout-btns', 'layout', true);
document.getElementById('style-btns').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('style-btns').querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.body.className = document.body.className.replace(/style-\w+/, '').trim();
        if (btn.dataset.val !== 'flat') document.body.classList.add('style-' + btn.dataset.val);
        config.style = btn.dataset.val;
    });
});

document.getElementById('theme-btns').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('theme-btns').querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        config.theme = btn.dataset.val;
        applyTheme(config.theme);
    });
});

const luckSlider = document.getElementById('purple-luck');
const luckVal = document.getElementById('luck-val');
luckSlider.addEventListener('input', () => {
    config.purpleLuck = parseInt(luckSlider.value);
    luckVal.textContent = config.purpleLuck + '%';
    buildFeed();
});

document.getElementById('btn-regen').addEventListener('click', buildFeed);

window.addEventListener('scroll', () => {
    if (window.scrollY === 0) buildFeed();
});

const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
sidebarToggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    sidebarToggle.classList.toggle('open', open);
    sidebarToggle.textContent = open ? '✕' : '⚙';
});

applyTheme('dark');
buildFeed();
