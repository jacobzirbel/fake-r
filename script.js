createDivs();

function createDivs() {
    for (let i = 0; i < 40; i++) {
        const div = document.createElement("div");
        div.className = "item " + getRandomColor();

        document.body.appendChild(div);


        // assign an onclick event to each div 
        div.onclick = function() {
            if (div.className.includes('selected')) {
                div.className = div.className.replace('selected', '');
            } else {
                div.className += ' selected';
            }
        };
    }
}

function getRandomColor() {
    const colors = ['red', 'blue', 'purple', 'green', 'yellow', 'orange'];
    const probabilities = [0.2, 0.1, 0.15, 0.3, 0.15, 0.1];
    const random = Math.random();
    let cumulativeProbability = 0;

    for (let i = 0; i < colors.length; i++) {
        cumulativeProbability += probabilities[i];
        if (random < cumulativeProbability) {
            return colors[i];
        }
    }
}

window.addEventListener('scroll', function() {
    if (window.scrollY === 0) {
        document.body.innerHTML = '';
        createDivs();
    }
});
