const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'teal', 'purple'];
const PROBS  = [0.22,  0.18,  0.20,   0.15,    0.14,    0.07,   0.04];
const SIZES  = ['tall', 'medium', 'short'];
const SIZE_PROBS = [0.25, 0.50, 0.25];

function weightedRandom(items, probs) {
    let r = Math.random(), cum = 0;
    for (let i = 0; i < items.length; i++) {
        cum += probs[i];
        if (r < cum) return items[i];
    }
    return items[items.length - 1];
}

function createDivs() {
    for (let i = 0; i < 40; i++) {
        const div = document.createElement('div');
        const color = weightedRandom(COLORS, PROBS);
        const size  = weightedRandom(SIZES, SIZE_PROBS);
        div.className = `item ${color} ${size}`;
        div.style.animationDelay = `${i * 30}ms`;

        div.addEventListener('click', () => {
            div.classList.toggle('selected');
        });

        document.body.appendChild(div);
    }
}

window.addEventListener('scroll', () => {
    if (window.scrollY === 0) {
        document.querySelectorAll('.item').forEach((el, i) => {
            el.style.animation = 'none';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 200 + i * 20);
        });
        setTimeout(createDivs, 200 + 40 * 20 + 100);
    }
});

createDivs();
