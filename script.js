let gamesData = [];

async function loadGames() {
    try {
        const response = await fetch('games.json');
        const data = await response.json();
        gamesData = data.games;
        sortAndRender('date-desc');
    } catch (error) {
        console.error('Error loading games:', error);
        document.getElementById('games-container').innerHTML =
            '<p style="color: #999;">Could not load games data.</p>';
    }
}

function sortGames(games, sortType) {
    const sorted = [...games];

    switch (sortType) {
        case 'date-desc':
            // Newest first, games without dates go to the bottom
            sorted.sort((a, b) => {
                if (!a.dateCompleted && !b.dateCompleted) return 0;
                if (!a.dateCompleted) return 1;
                if (!b.dateCompleted) return -1;
                return new Date(b.dateCompleted) - new Date(a.dateCompleted);
            });
            break;
        case 'rating-desc':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case 'rating-asc':
            sorted.sort((a, b) => a.rating - b.rating);
            break;
        case 'alpha':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }

    return sorted;
}

function getRatingClass(rating) {
    if (rating >= 75) return 'rating-high';
    if (rating >= 50) return 'rating-mid';
    return 'rating-low';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function renderGames(games) {
    const container = document.getElementById('games-container');

    if (games.length === 0) {
        container.innerHTML = '<p style="color: #999;">No games yet.</p>';
        return;
    }

    container.innerHTML = games.map(game => `
        <div class="game-card">
            <div class="game-title">${escapeHtml(game.title)}</div>
            <img
                class="game-cover"
                src="${escapeHtml(game.cover)}"
                alt="${escapeHtml(game.title)} cover"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 133%22><rect fill=%22%23f0f0f0%22 width=%22100%22 height=%22133%22/><text x=%2250%22 y=%2270%22 text-anchor=%22middle%22 fill=%22%23ccc%22 font-size=%2212%22>No Image</text></svg>'"
            >
            <div class="game-info">
                <div class="game-rating ${getRatingClass(game.rating)}">${game.rating}/100</div>
                <div class="game-details">${game.details ? escapeHtml(game.details) : ''}</div>
                <div class="game-date">${game.dateCompleted ? 'Completed: ' + formatDate(game.dateCompleted) : ''}</div>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sortAndRender(sortType) {
    const sorted = sortGames(gamesData, sortType);
    renderGames(sorted);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadGames();

    document.getElementById('sort-select').addEventListener('change', (e) => {
        sortAndRender(e.target.value);
    });
});
