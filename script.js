let currentData = [];
let currentCategory = 'games';

const categoryConfig = {
    games: {
        title: 'Games',
        file: 'data/games.json',
        hasDate: true,
        hasDetails: true,
        hasLink: true,
        fields: ['title', 'cover', 'rating', 'details', 'dateCompleted', 'link']
    },
    visualnovels: {
        title: 'Visual Novels',
        file: 'data/visualnovels.json',
        hasDate: true,
        hasDetails: true,
        hasLink: true,
        fields: ['title', 'cover', 'rating', 'details', 'dateCompleted', 'link']
    },
    movies: {
        title: 'Movies',
        file: 'data/movies.json',
        hasDate: false,
        hasDetails: false,
        fields: ['title', 'cover', 'rating']
    },
    tvseries: {
        title: 'TV Series',
        file: 'data/tvseries.json',
        hasDate: false,
        hasDetails: false,
        hasSeasons: true,
        fields: ['title', 'cover', 'rating', 'seasonsWatched']
    },
    anime: {
        title: 'Anime',
        file: 'data/anime.json',
        hasDate: false,
        hasDetails: false,
        fields: ['title', 'cover', 'rating']
    },
    manga: {
        title: 'Manga',
        file: 'data/manga.json',
        hasDate: false,
        hasDetails: false,
        fields: ['title', 'cover', 'rating']
    },
    books: {
        title: 'Books',
        file: 'data/books.json',
        hasDate: false,
        hasDetails: false,
        hasAuthor: true,
        fields: ['title', 'author', 'cover', 'rating']
    }
};

async function loadCategory(category) {
    const config = categoryConfig[category];
    if (!config) return;

    currentCategory = category;
    document.getElementById('page-title').textContent = config.title;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === category);
    });

    // Update sort options based on category
    updateSortOptions(config);

    try {
        const response = await fetch(config.file);
        const data = await response.json();
        currentData = data.items || [];

        // Apply background from JSON (default: black)
        const mainContent = document.querySelector('.main-content');
        if (data.background) {
            mainContent.style.backgroundImage = `url('${data.background}')`;
        } else {
            mainContent.style.backgroundImage = 'none';
        }

        sortAndRender('date-desc');
    } catch (error) {
        console.error(`Error loading ${category}:`, error);
        document.getElementById('items-container').innerHTML =
            `<p style="color: #999;">Could not load ${config.title.toLowerCase()} data.</p>`;
    }
}

function updateSortOptions(config) {
    const dateButton = document.querySelector('.sort-btn[data-sort="date-desc"]');

    if (config.hasDate) {
        dateButton.style.display = 'inline-block';
    } else {
        dateButton.style.display = 'none';
        // If date button was active, switch to rating-desc
        if (dateButton.classList.contains('active')) {
            dateButton.classList.remove('active');
            document.querySelector('.sort-btn[data-sort="rating-desc"]').classList.add('active');
            sortAndRender('rating-desc');
        }
    }
}

function sortItems(items, sortType) {
    const sorted = [...items];

    switch (sortType) {
        case 'date-desc':
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const placeholderImage = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 133%22><rect fill=%22%23f0f0f0%22 width=%22100%22 height=%22133%22/><text x=%2250%22 y=%2270%22 text-anchor=%22middle%22 fill=%22%23ccc%22 font-size=%2212%22>No Image</text></svg>";

function renderItems(items) {
    const container = document.getElementById('items-container');
    const config = categoryConfig[currentCategory];

    if (items.length === 0) {
        container.innerHTML = `<p style="color: #999;">No ${config.title.toLowerCase()} yet.</p>`;
        return;
    }

    container.innerHTML = items.map(item => {
        let extraInfo = '';

        if (config.hasDetails && item.details) {
            extraInfo += `<div class="item-details">${escapeHtml(item.details)}</div>`;
        }

        if (config.hasAuthor && item.author) {
            extraInfo += `<div class="item-author">by ${escapeHtml(item.author)}</div>`;
        }

        if (config.hasSeasons && item.seasonsWatched) {
            extraInfo += `<div class="item-seasons">Seasons watched: ${item.seasonsWatched}</div>`;
        }

        if (config.hasDate) {
            if (item.dateCompleted) {
                extraInfo += `<div class="item-date">Completed: ${formatDate(item.dateCompleted)}</div>`;
            } else {
                extraInfo += `<div class="item-date">Completed: unknown</div>`;
            }
        }

        const cardContent = `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    <div class="item-rating ${getRatingClass(item.rating)}">${item.rating}</div>
                </div>
                <img
                    class="item-cover"
                    src="${item.cover ? escapeHtml(item.cover) : placeholderImage}"
                    alt="${escapeHtml(item.title)} cover"
                    onerror="this.src='${placeholderImage}'"
                >
                <div class="item-info">
                    ${extraInfo}
                </div>
            </div>
        `;

        if (config.hasLink && item.link) {
            return `<a href="${escapeHtml(item.link)}" target="_blank" class="item-link">${cardContent}</a>`;
        }
        return cardContent;
    }).join('');
}

function sortAndRender(sortType) {
    const sorted = sortItems(currentData, sortType);
    renderItems(sorted);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load default category
    loadCategory('games');

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            loadCategory(item.dataset.category);
        });
    });

    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Sort and render
            sortAndRender(btn.dataset.sort);
        });
    });
});
