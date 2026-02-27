let currentData = [];
let currentCategory = 'home';
let categorySortState = {}; // Track active sort for each category: { sortType: 'date'/'rating', state: 0/1/2 }
let categorySearchQuery = {}; // Track search query for each category

// Google Sheets configuration
const SHEET_ID = '1CPN1Qn7VpobWuoCilj2XyQn7HthcKGDImSTBQxFePGc';
const SHEET_BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`;

const categoryConfig = {
    games: {
        title: 'Story Games',
        sheet: 'storygames',
        hasDate: true,
        hasDetails: true,
        hasLink: true,
        fields: ['title', 'cover', 'rating', 'details', 'dateCompleted', 'link']
    },
    visualnovels: {
        title: 'Visual Novels',
        sheet: 'visualnovels',
        hasDate: true,
        hasDetails: true,
        hasLink: true,
        fields: ['title', 'cover', 'rating', 'details', 'dateCompleted', 'link']
    },
    othergames: {
        title: 'Other Games',
        sheet: 'othergames',
        hasDate: false,
        hasDetails: true,
        hasLink: true,
        hasStatus: true,
        fields: ['title', 'cover', 'rating', 'details', 'status', 'link']
    },
    movies: {
        title: 'Movies',
        sheet: 'movies',
        hasDate: false,
        hasDetails: false,
        hasLink: true,
        fields: ['title', 'cover', 'rating', 'link']
    },
    tvseries: {
        title: 'TV Series',
        sheet: 'tvseries',
        hasDate: false,
        hasDetails: false,
        hasSeasons: true,
        hasLink: true,
        hasTwoStateRating: true,
        fields: ['title', 'cover', 'rating', 'seasonsWatched', 'link']
    },
    anime: {
        title: 'Anime',
        sheet: 'anime',
        hasDate: false,
        hasDetails: false,
        hasLink: true,
        hasTwoStateRating: true,
        fields: ['title', 'cover', 'rating', 'link']
    },
    manga: {
        title: 'Manga/Webtoon',
        sheet: 'manga',
        hasDate: false,
        hasDetails: false,
        hasLink: true,
        hasTwoStateRating: true,
        fields: ['title', 'cover', 'rating', 'link']
    },
    backlog: {
        title: 'Backlog',
        sheet: 'backlog',
        hasDate: false,
        hasDetails: true,
        hasLink: true,
        hasBacklogStatus: true,
        fields: ['title', 'cover', 'details', 'status', 'link']
    },
    books: {
        title: 'Books',
        sheet: 'books',
        hasDate: false,
        hasDetails: false,
        hasAuthor: true,
        hasLink: true,
        fields: ['title', 'author', 'cover', 'rating', 'link']
    }
};

// Categories included in Stats page (excludes home and backlog)
const STATS_CATEGORIES = ['games', 'othergames', 'visualnovels', 'movies', 'tvseries', 'anime', 'manga', 'books'];

// Helper function to fetch data from Google Sheets
async function fetchSheetData(sheetName) {
    const url = `${SHEET_BASE_URL}/${sheetName}`;
    const response = await fetch(url);
    const data = await response.json();

    // Convert rating and seasonsWatched to numbers
    return data.map(item => ({
        ...item,
        rating: item.rating ? parseInt(item.rating, 10) : null,
        seasonsWatched: item.seasonsWatched ? parseInt(item.seasonsWatched, 10) : null
    }));
}

// Helper functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getRatingClass(rating) {
    if (rating >= 75) return 'rating-good';
    if (rating >= 50) return 'rating-okay';
    return 'rating-bad';
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

// Page transition helper
async function transitionContent(callback) {
    const container = document.getElementById('items-container');
    container.classList.add('page-fade-out');
    await new Promise(r => setTimeout(r, 150));
    await callback();
    container.classList.remove('page-fade-out');
    container.classList.add('page-fade-in');
    setTimeout(() => container.classList.remove('page-fade-in'), 300);
}

// Loading indicator functions
function showLoading(mode) {
    const container = document.getElementById('items-container');
    if (mode === 'simple') {
        container.innerHTML = `
            <div class="loading-simple">
                <div class="loading-bar"></div>
            </div>
        `;
    } else {
        const skeletons = Array(12).fill(`
            <div class="skeleton-card">
                <div class="skeleton-header"></div>
                <div class="skeleton-cover"></div>
                <div class="skeleton-info"></div>
            </div>
        `).join('');
        container.className = 'items-grid';
        container.innerHTML = `<div class="skeleton-loading-bar"></div>` + skeletons;
    }
}

// Home page loader
async function loadHomePage() {
    currentCategory = 'home';
    document.querySelector('header').style.display = 'none';
    const sheetsBtn = document.getElementById('sheets-btn');
    if (sheetsBtn) sheetsBtn.remove();

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

    // Show loading indicator
    const container = document.getElementById('items-container');
    container.className = 'home-container';
    showLoading('simple');

    try {
        // Fetch home data + stats data + backlog in parallel
        const [homeData, backlogData, ...categoryResults] = await Promise.all([
            fetch(`${SHEET_BASE_URL}/home`).then(r => r.json()),
            fetchSheetData(categoryConfig.backlog.sheet),
            ...STATS_CATEGORIES.map(catKey =>
                fetchSheetData(categoryConfig[catKey].sheet).then(data => ({
                    key: catKey,
                    config: categoryConfig[catKey],
                    data: data
                }))
            )
        ]);

        // Parse home data - first row has introduction, rest have links
        const introduction = homeData[0]?.introduction || '';
        const links = homeData
            .filter(row => row.link_name && row.link_url)
            .map(row => ({
                name: row.link_name,
                link: row.link_url,
                icon: row.link_icon || ''
            }));

        // Recently added (from categories with dates: games + visualnovels)
        const recentItems = categoryResults
            .filter(r => r.config.hasDate)
            .flatMap(r => r.data.map(item => ({ ...item, _config: r.config })))
            .filter(item => item.dateCompleted)
            .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))
            .slice(0, 5);

        // Currently playing/reading (from backlog with 'current' status)
        const currentItems = backlogData.filter(item =>
            item.status && item.status.toLowerCase() === 'current'
        );

        const container = document.getElementById('items-container');
        container.className = 'home-container';
        container.innerHTML = `
            <div class="home-sidebar-left"></div>
            <div class="home-center">
                ${recentItems.length > 0 ? `
                <div class="home-recent">
                    <h3 class="home-section-title">Recently Added</h3>
                    <div class="home-recent-cards">
                        ${recentItems.map(item => renderStatsCard(item, item._config)).join('')}
                    </div>
                </div>
                ` : ''}

                ${currentItems.length > 0 ? `
                <div class="home-recent">
                    <h3 class="home-section-title">Currently Playing / Reading</h3>
                    <div class="home-recent-cards">
                        ${currentItems.map(item => renderStatsCard(item, categoryConfig.backlog)).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="home-introduction">
                    <p>${escapeHtml(introduction).replace(/\n/g, '<br>')}</p>
                </div>

                <div class="home-links">
                    ${links.map(link => `
                        <a href="${escapeHtml(link.link)}" target="_blank" class="home-link">
                            <img src="${escapeHtml(link.icon)}" alt="${escapeHtml(link.name)}" class="home-link-icon" loading="lazy">
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

// Stats page loader
async function loadStatsPage() {
    currentCategory = 'stats';
    document.querySelector('header').style.display = '';
    document.getElementById('page-title').textContent = 'Stats';

    // Add Google Sheets link to header
    const headerLeft = document.querySelector('.header-left');
    let sheetsBtn = document.getElementById('sheets-btn');
    if (!sheetsBtn) {
        sheetsBtn = document.createElement('a');
        sheetsBtn.id = 'sheets-btn';
        sheetsBtn.href = `https://docs.google.com/spreadsheets/d/${SHEET_ID}`;
        sheetsBtn.target = '_blank';
        sheetsBtn.rel = 'noopener noreferrer';
        sheetsBtn.className = 'stats-sheets-btn';
        sheetsBtn.textContent = 'Open in Google Sheets';
    }
    headerLeft.parentElement.appendChild(sheetsBtn);

    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === 'stats');
    });

    // Hide sort controls and search for stats page
    document.querySelector('.controls-drawer').style.display = 'none';
    document.querySelector('.search-drawer').style.display = 'none';

    // Hide legends
    const legend = document.getElementById('status-legend');
    if (legend) legend.style.display = 'none';
    const backlogLegend = document.getElementById('backlog-legend');
    if (backlogLegend) backlogLegend.style.display = 'none';

    // Hide item count
    const itemCount = document.getElementById('item-count');
    if (itemCount) itemCount.style.display = 'none';

    // Clear background
    document.querySelector('.main-content').style.backgroundImage = 'none';

    // Set container class and show loading
    const container = document.getElementById('items-container');
    container.className = 'stats-container';
    showLoading('simple');

    try {
        // Fetch all category sheets in parallel
        const fetchPromises = STATS_CATEGORIES.map(catKey => {
            const config = categoryConfig[catKey];
            return fetchSheetData(config.sheet).then(data => ({
                key: catKey,
                config: config,
                data: data
            }));
        });

        const results = await Promise.all(fetchPromises);
        container.innerHTML = renderStatsPage(results);

        // Make category titles clickable
        container.querySelectorAll('.stats-category-title[data-nav-category]').forEach(title => {
            title.addEventListener('click', () => {
                transitionContent(() => loadCategory(title.dataset.navCategory));
            });
        });
    } catch (error) {
        console.error('Error loading stats:', error);
        container.innerHTML = '<p style="color: #999;">Could not load stats data.</p>';
    }
}

function renderStatsPage(results) {
    const totalItems = results.reduce((sum, r) => sum + r.data.length, 0);

    // Games Played Per Year chart
    const gameItems = results
        .filter(r => r.key === 'games' || r.key === 'visualnovels')
        .flatMap(r => r.data);

    const yearLabels = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '≤2019', 'Unknown'];
    const yearCounts = {};
    yearLabels.forEach(y => yearCounts[y] = 0);

    for (const item of gameItems) {
        if (!item.dateCompleted) {
            yearCounts['Unknown']++;
            continue;
        }
        const year = new Date(item.dateCompleted).getFullYear();
        if (isNaN(year)) {
            yearCounts['Unknown']++;
        } else if (year <= 2019) {
            yearCounts['≤2019']++;
        } else if (yearCounts[String(year)] !== undefined) {
            yearCounts[String(year)]++;
        } else {
            yearCounts['Unknown']++;
        }
    }

    const maxYearCount = Math.max(...Object.values(yearCounts), 1);

    let html = `
        <div class="stats-summary">
            <div class="stats-summary-card">
                <div class="stats-summary-value">${totalItems}</div>
                <div class="stats-summary-label">Total Items</div>
            </div>
        </div>

        <div class="stats-category-section">
            <div class="stats-category-header">
                <h2 class="stats-category-title">Story Games + Visual Novels Per Year</h2>
                <div class="stats-category-meta">
                    <span class="stats-count">${gameItems.length} items</span>
                </div>
            </div>
            <div class="stats-category-body">
                <div class="stats-chart-section">
                    <div class="stats-bins">
                        ${yearLabels.map((label) => {
                            const count = yearCounts[label];
                            const widthPct = Math.max((count / maxYearCount) * 100, 3);
                            return `
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${label}</span>
                                <div class="stats-bar-track">
                                    <div class="stats-bar-fill stats-bar-purple" style="width: ${widthPct}%;"></div>
                                </div>
                                <span class="stats-bar-count">${count}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    for (const result of results) {
        html += renderCategoryStats(result);
    }

    return html;
}

function renderStatsCard(item, config) {
    const ratingHtml = item.rating != null
        ? `<div class="item-rating ${getRatingClass(item.rating)}">${item.rating}</div>`
        : '';

    let extraInfo = '';
    if (config.hasAuthor && item.author) {
        extraInfo += `<div class="item-author">by ${escapeHtml(item.author)}</div>`;
    }
    if (config.hasDate && item.dateCompleted) {
        extraInfo += `<div class="item-date">Completed: ${formatDate(item.dateCompleted)}</div>`;
    }

    const cardContent = `
        <div class="item-card" title="${escapeHtml(item.title)}">
            <div class="item-header">
                <div class="item-title">${escapeHtml(item.title)}</div>
                ${ratingHtml}
            </div>
            <img
                class="item-cover"
                src="${item.cover ? escapeHtml(item.cover) : placeholderImage}"
                alt="${escapeHtml(item.title)} cover"
                loading="lazy"
                onload="this.classList.add('loaded')"
                onerror="this.src='${placeholderImage}'"
            >
            <div class="item-info">
                <div class="item-info-content">
                    ${extraInfo}
                </div>
            </div>
        </div>
    `;

    if (config.hasLink && item.link) {
        return `<a href="${escapeHtml(item.link)}" target="_blank" class="item-link">${cardContent}</a>`;
    }
    return cardContent;
}

function renderCategoryStats({ key, config, data }) {
    const ratedItems = data.filter(item => item.rating != null);
    const avgRating = ratedItems.length > 0
        ? Math.round(ratedItems.reduce((sum, item) => sum + item.rating, 0) / ratedItems.length)
        : 0;

    // Top 5 highest rated
    const top5 = [...ratedItems]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5);

    // Recent 5 (only for categories with dates)
    let recent5 = [];
    if (config.hasDate) {
        recent5 = [...data]
            .filter(item => item.dateCompleted)
            .sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted))
            .slice(0, 5);
    }

    // 6-bin rating distribution (highest first)
    const bins = [
        { label: '91-100',    min: 91,   max: 100,    tier: 'bin-6' },
        { label: '81-90',     min: 81,   max: 90,     tier: 'bin-5' },
        { label: '71-80',     min: 71,   max: 80,     tier: 'bin-4' },
        { label: '61-70',     min: 61,   max: 70,     tier: 'bin-3' },
        { label: '51-60',     min: 51,   max: 60,     tier: 'bin-2' },
        { label: '≤50',       min: 0,    max: 50,     tier: 'bin-1' }
    ];
    for (const item of ratedItems) {
        for (const bin of bins) {
            if (!bin.count) bin.count = 0;
            if (item.rating >= bin.min && item.rating <= bin.max) {
                bin.count++;
                break;
            }
        }
    }

    let html = `
        <div class="stats-category-section">
            <div class="stats-category-header">
                <h2 class="stats-category-title" data-nav-category="${key}" style="cursor: pointer;">${escapeHtml(config.title)}</h2>
                <div class="stats-category-meta">
                    <span class="stats-count">${data.length} items</span>
                    <span class="stats-avg-rating ${getRatingClass(avgRating)}">${avgRating} avg</span>
                </div>
            </div>
            <div class="stats-category-body">
                <div class="stats-chart-section">
                    <div class="stats-bins">
                        ${(() => {
                            const maxCount = Math.max(...bins.map(b => b.count || 0), 1);
                            return bins.map(bin => {
                                const count = bin.count || 0;
                                const widthPct = Math.max((count / maxCount) * 100, 3);
                                return `
                                <div class="stats-bar-row">
                                    <span class="stats-bar-label">${bin.label}</span>
                                    <div class="stats-bar-track">
                                        <div class="stats-bar-fill stats-bar-${bin.tier}" style="width: ${widthPct}%;"></div>
                                    </div>
                                    <span class="stats-bar-count">${count}</span>
                                </div>`;
                            }).join('');
                        })()}
                    </div>
                </div>
            </div>

            <div class="stats-cards-section">
                <h3 class="stats-section-subtitle">Top 5 Highest Rated</h3>
                <div class="stats-cards-row">
                    ${top5.map(item => renderStatsCard(item, config)).join('')}
                </div>
            </div>
    `;

    if (config.hasDate && recent5.length > 0) {
        html += `
            <div class="stats-cards-section">
                <h3 class="stats-section-subtitle">Most Recent Additions</h3>
                <div class="stats-cards-row">
                    ${recent5.map(item => renderStatsCard(item, config)).join('')}
                </div>
            </div>
        `;
    }

    html += `</div>`;

    return html;
}

// Category loader
async function loadCategory(category) {
    // Handle home page separately
    if (category === 'home') {
        loadHomePage();
        return;
    }

    // Handle stats page separately
    if (category === 'stats') {
        loadStatsPage();
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

    document.querySelector('header').style.display = '';
    document.getElementById('page-title').textContent = config.title;
    const sheetsBtn = document.getElementById('sheets-btn');
    if (sheetsBtn) sheetsBtn.remove();

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

    // Show/hide random pick button (only for backlog)
    const randomBtn = document.getElementById('random-btn');
    if (randomBtn) {
        randomBtn.style.display = config.hasBacklogStatus ? 'inline-block' : 'none';
    }

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

    // Show loading indicator
    showLoading();

    try {
        // Fetch data from Google Sheets
        currentData = await fetchSheetData(config.sheet);

        // Clear background (no background support from sheets)
        const mainContent = document.querySelector('.main-content');
        mainContent.style.backgroundImage = 'none';

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
    const authorButton = document.getElementById('author-btn');
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

    // Show/hide author button (only for books)
    if (config.hasAuthor) {
        authorButton.style.display = 'inline-block';
    } else {
        authorButton.style.display = 'none';
    }

    // Remove active class from all buttons
    dateButton.classList.remove('active');
    ratingButton.classList.remove('active');
    authorButton.classList.remove('active');
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

    if (sortState.sortType === 'author') {
        authorButton.classList.add('active');
        if (sortState.state === 0) {
            authorButton.textContent = 'Author ↓';
        } else if (sortState.state === 1) {
            authorButton.textContent = 'Author ↑';
        }
    } else {
        authorButton.textContent = 'Author';
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
    } else if (sortType === 'author') {
        if (state === 0) {
            // Author alphabetical A-Z (by first name)
            sorted.sort((a, b) => {
                const authorA = a.author || '';
                const authorB = b.author || '';
                return authorA.localeCompare(authorB);
            });
        } else if (state === 1) {
            // Author alphabetical Z-A (by first name)
            sorted.sort((a, b) => {
                const authorA = a.author || '';
                const authorB = b.author || '';
                return authorB.localeCompare(authorA);
            });
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
            <div class="item-card" title="${escapeHtml(item.title)}">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    ${ratingHtml}
                </div>
                <img
                    class="item-cover"
                    src="${item.cover ? escapeHtml(item.cover) : placeholderImage}"
                    alt="${escapeHtml(item.title)} cover"
                    loading="lazy"
                    onload="this.classList.add('loaded')"
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

    // Scroll-to-top button
    const scrollTopBtn = document.getElementById('scroll-to-top');
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

        // Show/hide scroll-to-top button
        if (scrollTopBtn) {
            scrollTopBtn.classList.toggle('visible', window.scrollY > 50);
        }
    });

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Random pick button (backlog only)
    const randomBtn = document.getElementById('random-btn');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            if (currentCategory !== 'backlog') return;
            const todoItems = currentData.filter(item =>
                item.status && item.status.toLowerCase() === 'todo'
            );
            if (todoItems.length === 0) return;

            const pick = todoItems[Math.floor(Math.random() * todoItems.length)];

            // Remove previous highlight
            document.querySelectorAll('.item-card.random-highlight').forEach(el => {
                el.classList.remove('random-highlight');
            });

            // Find and highlight the picked card
            const cards = document.querySelectorAll('.item-card');
            for (const card of cards) {
                const title = card.querySelector('.item-title');
                if (title && title.textContent === pick.title) {
                    card.classList.add('random-highlight');
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }
            }
        });
    }

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

    // Navigation with smooth transitions
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            transitionContent(() => loadCategory(item.dataset.category));
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

    document.getElementById('author-btn').addEventListener('click', () => {
        const config = categoryConfig[currentCategory];
        if (!config.hasAuthor) return;

        const currentState = categorySortState[currentCategory];

        if (currentState.sortType === 'author') {
            // Already on author sort, cycle through states
            currentState.state = (currentState.state + 1) % 3;

            if (currentState.state === 2) {
                // Third click: reset to default (rating descending for books)
                currentState.sortType = 'rating';
                currentState.state = 0;
            }
        } else {
            // Switch to author sort (state 0: A-Z)
            currentState.sortType = 'author';
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
