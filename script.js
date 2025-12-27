let currentData = [];
let currentCategory = 'home';
let categorySortState = {}; // Track active sort for each category: { sortType: 'date'/'rating', state: 0/1/2 }
let categorySearchQuery = {}; // Track search query for each category

const categoryConfig = {
    games: {
        title: 'Story Games',
        file: 'data/storygames.json',
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
    othergames: {
        title: 'Other Games',
        file: 'data/othergames.json',
        hasDate: false,
        hasDetails: true,
        hasLink: true,
        hasStatus: true,
        fields: ['title', 'cover', 'rating', 'details', 'status', 'link']
    },
    movies: {
        title: 'Movies',
        file: 'data/movies.json',
        hasDate: false,
        hasDetails: false,
        hasLink: true,
        fields: ['title', 'cover', 'rating', 'link']
    },
    tvseries: {
        title: 'TV Series',
        file: 'data/tvseries.json',
        hasDate: false,
        hasDetails: false,
        hasSeasons: true,
        hasLink: true,
        hasTwoStateRating: true,
        fields: ['title', 'cover', 'rating', 'seasonsWatched', 'link']
    },
    anime: {
        title: 'Anime',
        file: 'data/anime.json',
        hasDate: false,
        hasDetails: false,
        hasLink: true,
        hasTwoStateRating: true,
        fields: ['title', 'cover', 'rating', 'link']
    },
    manga: {
        title: 'Manga/Webtoon',
        file: 'data/manga.json',
        hasDate: false,
        hasDetails: false,
        hasLink: true,
        hasTwoStateRating: true,
        fields: ['title', 'cover', 'rating', 'link']
    },
    backlog: {
        title: 'Backlog',
        file: 'data/backlog.json',
        hasDate: false,
        hasDetails: true,
        hasLink: true,
        hasBacklogStatus: true,
        fields: ['title', 'cover', 'details', 'status', 'link']
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

// Helper functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

const placeholderImage = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 133%22><rect fill=%22%23f0f0f0%22 width=%22100%22 height=%22133%22/><text x=%2250%22 y=%2270%22 text-anchor=%22middle%22 fill=%22%23ccc%22 font-size=%2212%22>No Image</text></svg>";

// Home page loader
async function loadHomePage() {
    currentCategory = 'home';
    document.getElementById('page-title').textContent = 'Home';

    // Clear search input for home page
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === 'home');
    });

    // Hide sort controls and search for home page
    document.querySelector('.controls-drawer').style.display = 'none';
    document.querySelector('.search-drawer').style.display = 'none';

    // Hide status legend
    const legend = document.getElementById('status-legend');
    if (legend) {
        legend.style.display = 'none';
    }

    // Hide backlog legend
    const backlogLegend = document.getElementById('backlog-legend');
    if (backlogLegend) {
        backlogLegend.style.display = 'none';
    }

    // Hide item count
    const itemCount = document.getElementById('item-count');
    if (itemCount) {
        itemCount.style.display = 'none';
    }

    // Clear background
    const mainContent = document.querySelector('.main-content');
    mainContent.style.backgroundImage = 'none';

    try {
        const response = await fetch('data/home.json');
        const data = await response.json();

        const container = document.getElementById('items-container');
        container.className = 'home-container';
        container.innerHTML = `
            <div class="home-sidebar-left"></div>
            <div class="home-center">
                <div class="home-introduction">
                    <p>${escapeHtml(data.introduction).replace(/\n/g, '<br>')}</p>
                </div>
                <div class="home-links">
                    ${data.links.map(link => `
                        <a href="${escapeHtml(link.link)}" target="_blank" class="home-link">
                            <img src="${escapeHtml(link.icon)}" alt="${escapeHtml(link.name)}" class="home-link-icon">
                            <span class="home-link-name">${escapeHtml(link.name)}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
            <div class="home-sidebar-right"></div>
        `;
    } catch (error) {
        console.error('Error loading home page:', error);
        document.getElementById('items-container').innerHTML =
            '<p style="color: #999;">Could not load home data.</p>';
    }
}

// Category loader
async function loadCategory(category) {
    // Handle home page separately
    if (category === 'home') {
        loadHomePage();
        return;
    }

    const config = categoryConfig[category];
    if (!config) return;

    currentCategory = category;

    // Restore category-specific search query
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = categorySearchQuery[category] || '';
    }

    document.getElementById('page-title').textContent = config.title;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === category);
    });

    // Show/hide status legend for vibing games
    const legend = document.getElementById('status-legend');
    if (legend) {
        legend.style.display = config.hasStatus ? 'flex' : 'none';
    }

    // Show/hide backlog legend
    const backlogLegend = document.getElementById('backlog-legend');
    if (backlogLegend) {
        backlogLegend.style.display = config.hasBacklogStatus ? 'flex' : 'none';
    }

    // Show sort controls and search drawer
    document.querySelector('.controls-drawer').style.display = 'block';
    document.querySelector('.search-drawer').style.display = 'block';

    // Reset container class
    document.getElementById('items-container').className = 'items-grid';

    // Get saved sort state for this category, or set default
    if (!categorySortState[category]) {
        if (config.hasStatus) {
            categorySortState[category] = { sortType: 'status', state: 0 }; // Default: status (playing first)
        } else if (config.hasBacklogStatus) {
            categorySortState[category] = { sortType: 'backlogStatus', state: 0 }; // Default: backlog status (current first)
        } else if (config.hasDate) {
            categorySortState[category] = { sortType: 'date', state: 0 }; // Default: date descending
        } else {
            categorySortState[category] = { sortType: 'rating', state: 0 }; // Default: rating descending
        }
    }

    // Update sort button UI based on category
    updateSortButtons(config, categorySortState[category]);

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

        // Apply the current sort state
        applySortState(categorySortState[category]);
    } catch (error) {
        console.error(`Error loading ${category}:`, error);
        document.getElementById('items-container').innerHTML =
            `<p style="color: #999;">Could not load ${config.title.toLowerCase()} data.</p>`;
    }
}

function updateSortButtons(config, sortState) {
    const dateButton = document.getElementById('date-btn');
    const ratingButton = document.getElementById('rating-btn');
    const alphaButton = document.getElementById('alpha-btn');

    // Show/hide date button based on category, or replace with status button for vibing games
    if (config.hasStatus) {
        dateButton.style.display = 'inline-block';
        dateButton.dataset.sort = 'status';
    } else if (config.hasBacklogStatus) {
        dateButton.style.display = 'inline-block';
        dateButton.dataset.sort = 'backlogStatus';
    } else if (config.hasDate) {
        dateButton.style.display = 'inline-block';
        dateButton.dataset.sort = 'date';
    } else {
        dateButton.style.display = 'none';
    }

    // Show/hide rating button (hide for backlog since it has no ratings)
    if (config.hasBacklogStatus) {
        ratingButton.style.display = 'none';
    } else {
        ratingButton.style.display = 'inline-block';
    }

    // Remove active class from all buttons
    dateButton.classList.remove('active');
    ratingButton.classList.remove('active');
    alphaButton.classList.remove('active');

    // Update button text and active state based on current sort
    if (sortState.sortType === 'status') {
        dateButton.classList.add('active');
        if (sortState.state === 0) {
            dateButton.textContent = 'Status ↓';
        } else if (sortState.state === 1) {
            dateButton.textContent = 'Status ↑';
        }
    } else if (sortState.sortType === 'backlogStatus') {
        dateButton.classList.add('active');
        if (sortState.state === 0) {
            dateButton.textContent = 'Status ↓';
        } else if (sortState.state === 1) {
            dateButton.textContent = 'Status ↑';
        }
    } else if (sortState.sortType === 'date') {
        dateButton.classList.add('active');
        if (sortState.state === 0) {
            dateButton.textContent = 'Date ↓';
        } else if (sortState.state === 1) {
            dateButton.textContent = 'Date ↑';
        }
    } else {
        dateButton.textContent = (config.hasStatus || config.hasBacklogStatus) ? 'Status' : 'Date';
    }

    if (sortState.sortType === 'rating') {
        ratingButton.classList.add('active');
        if (sortState.state === 0) {
            ratingButton.textContent = 'Rating ↓';
        } else if (sortState.state === 1) {
            ratingButton.textContent = 'Rating ↑';
        }
    } else {
        ratingButton.textContent = 'Rating';
    }

    if (sortState.sortType === 'alpha') {
        alphaButton.classList.add('active');
        if (sortState.state === 0) {
            alphaButton.textContent = 'A-Z ↓';
        } else if (sortState.state === 1) {
            alphaButton.textContent = 'Z-A ↑';
        }
    } else {
        alphaButton.textContent = 'A-Z';
    }
}

function sortItems(items, sortState) {
    const sorted = [...items];
    const { sortType, state } = sortState;

    if (sortType === 'status') {
        if (state === 0) {
            // Status: actively playing > sometimes playing > no status
            sorted.sort((a, b) => {
                const getStatusPriority = (status) => {
                    if (!status) return 3;
                    const statusLower = status.toLowerCase();
                    if (statusLower === 'playing') return 1;
                    if (statusLower === 'sometimes') return 2;
                    return 3;
                };
                return getStatusPriority(a.status) - getStatusPriority(b.status);
            });
        } else if (state === 1) {
            // Status: no status > sometimes playing > actively playing (reverse)
            sorted.sort((a, b) => {
                const getStatusPriority = (status) => {
                    if (!status) return 3;
                    const statusLower = status.toLowerCase();
                    if (statusLower === 'playing') return 1;
                    if (statusLower === 'sometimes') return 2;
                    return 3;
                };
                return getStatusPriority(b.status) - getStatusPriority(a.status);
            });
        }
        // state === 2 means reset to default
    } else if (sortType === 'backlogStatus') {
        if (state === 0) {
            // Backlog Status: current > todo > dropped (green > yellow > red)
            sorted.sort((a, b) => {
                const getStatusPriority = (status) => {
                    if (!status) return 3;
                    const statusLower = status.toLowerCase();
                    if (statusLower === 'current') return 1;
                    if (statusLower === 'todo') return 2;
                    if (statusLower === 'dropped') return 3;
                    return 4;
                };
                return getStatusPriority(a.status) - getStatusPriority(b.status);
            });
        } else if (state === 1) {
            // Backlog Status: dropped > todo > current (reverse)
            sorted.sort((a, b) => {
                const getStatusPriority = (status) => {
                    if (!status) return 3;
                    const statusLower = status.toLowerCase();
                    if (statusLower === 'current') return 1;
                    if (statusLower === 'todo') return 2;
                    if (statusLower === 'dropped') return 3;
                    return 4;
                };
                return getStatusPriority(b.status) - getStatusPriority(a.status);
            });
        }
        // state === 2 means reset to default
    } else if (sortType === 'date') {
        if (state === 0) {
            // Date descending (newest first)
            sorted.sort((a, b) => {
                if (!a.dateCompleted && !b.dateCompleted) return 0;
                if (!a.dateCompleted) return 1;
                if (!b.dateCompleted) return -1;
                return new Date(b.dateCompleted) - new Date(a.dateCompleted);
            });
        } else if (state === 1) {
            // Date ascending (oldest first)
            sorted.sort((a, b) => {
                if (!a.dateCompleted && !b.dateCompleted) return 0;
                if (!a.dateCompleted) return 1;
                if (!b.dateCompleted) return -1;
                return new Date(a.dateCompleted) - new Date(b.dateCompleted);
            });
        }
        // state === 2 means reset to default (date descending), which is same as state 0
    } else if (sortType === 'rating') {
        if (state === 0) {
            // Rating descending (highest first)
            sorted.sort((a, b) => b.rating - a.rating);
        } else if (state === 1) {
            // Rating ascending (lowest first)
            sorted.sort((a, b) => a.rating - b.rating);
        }
        // state === 2 means reset to default
    } else if (sortType === 'alpha') {
        if (state === 0) {
            // Alphabetical A-Z
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else if (state === 1) {
            // Alphabetical Z-A
            sorted.sort((a, b) => b.title.localeCompare(a.title));
        }
        // state === 2 means reset to default
    }

    return sorted;
}

function renderItems(items) {
    const container = document.getElementById('items-container');
    const config = categoryConfig[currentCategory];

    // Update item count
    const itemCount = document.getElementById('item-count');
    if (itemCount) {
        itemCount.textContent = `Showing ${items.length} items`;
        itemCount.style.display = 'inline';
    }

    if (items.length === 0) {
        container.innerHTML = `<p style="color: #ccc7c7ff;">No ${config.title.toLowerCase()} yet.</p>`;
        if (itemCount) {
            itemCount.textContent = `Showing 0 items`;
        }
        return;
    }

    container.innerHTML = items.map(item => {
        let extraInfo = '';
        let statusCircle = '';

        // Handle status for vibing games
        if (config.hasStatus) {
            const statusLower = item.status ? item.status.toLowerCase() : '';
            let circleClass = '';

            if (statusLower === 'playing') {
                circleClass = 'status-circle-green';
            } else if (statusLower === 'sometimes') {
                circleClass = 'status-circle-yellow';
            } else {
                // Empty or no status = red circle
                circleClass = 'status-circle-red';
            }

            statusCircle = `<div class="status-circle ${circleClass}"></div>`;
        }

        // Handle status for backlog
        if (config.hasBacklogStatus) {
            const statusLower = item.status ? item.status.toLowerCase() : '';
            let circleClass = '';

            if (statusLower === 'current') {
                circleClass = 'status-circle-green';
            } else if (statusLower === 'todo') {
                circleClass = 'status-circle-yellow';
            } else if (statusLower === 'dropped') {
                circleClass = 'status-circle-red';
            } else {
                circleClass = 'status-circle-red';
            }

            statusCircle = `<div class="status-circle ${circleClass}"></div>`;
        }

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

        const ratingHtml = config.hasBacklogStatus ? '' : `<div class="item-rating ${getRatingClass(item.rating)}">${item.rating}</div>`;

        const cardContent = `
            <div class="item-card">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    ${ratingHtml}
                </div>
                <img
                    class="item-cover"
                    src="${item.cover ? escapeHtml(item.cover) : placeholderImage}"
                    alt="${escapeHtml(item.title)} cover"
                    onerror="this.src='${placeholderImage}'"
                >
                <div class="item-info">
                    <div class="item-info-content">
                        ${extraInfo}
                    </div>
                    ${statusCircle}
                </div>
            </div>
        `;

        if (config.hasLink && item.link) {
            return `<a href="${escapeHtml(item.link)}" target="_blank" class="item-link">${cardContent}</a>`;
        }
        return cardContent;
    }).join('');
}

function filterItems(items, query) {
    if (!query || query.trim() === '') {
        return items;
    }

    const lowerQuery = query.toLowerCase();
    return items.filter(item => {
        return item.title.toLowerCase().includes(lowerQuery);
    });
}

function applySortState(sortState) {
    const query = categorySearchQuery[currentCategory] || '';
    let filtered = filterItems(currentData, query);
    const sorted = sortItems(filtered, sortState);
    renderItems(sorted);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load default category
    loadCategory('home');

    // Add scroll listener for drawers padding
    window.addEventListener('scroll', () => {
        const controlsDrawer = document.querySelector('.controls-drawer');
        const searchDrawer = document.querySelector('.search-drawer');

        if (window.scrollY > 10) {
            if (controlsDrawer) controlsDrawer.classList.add('scrolled');
            if (searchDrawer) searchDrawer.classList.add('scrolled');
        } else {
            if (controlsDrawer) controlsDrawer.classList.remove('scrolled');
            if (searchDrawer) searchDrawer.classList.remove('scrolled');
        }
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            categorySearchQuery[currentCategory] = e.target.value;
            const currentState = categorySortState[currentCategory];
            if (currentState) {
                applySortState(currentState);
            }
        });
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            loadCategory(item.dataset.category);
        });
    });

    // Sort buttons - Three-state toggle behavior
    document.getElementById('date-btn').addEventListener('click', () => {
        const config = categoryConfig[currentCategory];
        if (!config.hasDate && !config.hasStatus && !config.hasBacklogStatus) return;

        const currentState = categorySortState[currentCategory];
        const sortType = config.hasStatus ? 'status' : (config.hasBacklogStatus ? 'backlogStatus' : 'date');

        if (currentState.sortType === sortType) {
            // Already on this sort, cycle through states
            if (config.hasStatus || config.hasBacklogStatus) {
                // Status button only has 2 states
                currentState.state = currentState.state === 0 ? 1 : 0;
            } else {
                // Date button has 3 states
                currentState.state = (currentState.state + 1) % 3;

                if (currentState.state === 2) {
                    // Third click: reset to default (date descending)
                    currentState.state = 0;
                }
            }
        } else {
            // Switch to this sort type (state 0)
            currentState.sortType = sortType;
            currentState.state = 0;
        }

        updateSortButtons(config, currentState);
        applySortState(currentState);
    });

    document.getElementById('rating-btn').addEventListener('click', () => {
        const config = categoryConfig[currentCategory];
        const currentState = categorySortState[currentCategory];

        if (currentState.sortType === 'rating') {
            // Already on rating sort, cycle through states
            if (config.hasTwoStateRating) {
                // Two-state rating button (anime): descending <-> ascending
                currentState.state = currentState.state === 0 ? 1 : 0;
            } else {
                // Three-state rating button (other categories)
                currentState.state = (currentState.state + 1) % 3;

                if (currentState.state === 2) {
                    // Third click: reset to default
                    if (config.hasStatus) {
                        // Reset to status
                        currentState.sortType = 'status';
                        currentState.state = 0;
                    } else if (config.hasDate) {
                        // Reset to date descending
                        currentState.sortType = 'date';
                        currentState.state = 0;
                    } else {
                        // Reset to rating descending
                        currentState.state = 0;
                    }
                }
            }
        } else {
            // Switch to rating sort (state 0: descending)
            currentState.sortType = 'rating';
            currentState.state = 0;
        }

        updateSortButtons(config, currentState);
        applySortState(currentState);
    });

    document.getElementById('alpha-btn').addEventListener('click', () => {
        const config = categoryConfig[currentCategory];
        const currentState = categorySortState[currentCategory];

        if (currentState.sortType === 'alpha') {
            // Already on alpha sort, cycle through states
            currentState.state = (currentState.state + 1) % 3;

            if (currentState.state === 2) {
                // Third click: reset to default
                if (config.hasStatus) {
                    // Reset to status
                    currentState.sortType = 'status';
                    currentState.state = 0;
                } else if (config.hasBacklogStatus) {
                    // Reset to backlog status
                    currentState.sortType = 'backlogStatus';
                    currentState.state = 0;
                } else if (config.hasDate) {
                    // Reset to date descending
                    currentState.sortType = 'date';
                    currentState.state = 0;
                } else {
                    // Reset to rating descending
                    currentState.sortType = 'rating';
                    currentState.state = 0;
                }
            }
        } else {
            // Switch to alpha sort (state 0: A-Z)
            currentState.sortType = 'alpha';
            currentState.state = 0;
        }

        updateSortButtons(config, currentState);
        applySortState(currentState);
    });
});
