// script.js - Full code for ZenShows streaming site

const API_KEY = 'a45420333457411e78d5ad35d6c51a2d'; // TMDB API Key
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Dummy data and localStorage keys
const STORAGE_KEYS = {
    user: 'zenshows_user',
    myList: 'zenshows_myList',
    history: 'zenshows_history',
    settings: 'zenshows_settings',
    comments: 'zenshows_comments'
};

// Streaming sources (11 total: vidsrc + 10 more)
const STREAM_SOURCES = [
    { name: 'Vidsrc', url: (id, type) => `https://vidsrc.me/embed/${type}/${id}` },
    { name: 'Embed.su', url: (id, type) => `https://embed.su/embed/${type}/${id}` },
    { name: 'Vidplay', url: (id, type) => `https://vidplay.online/embed/${type}/${id}` },
    { name: 'MultiEmbed', url: (id, type) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=${type}` },
    { name: 'VidSrc Pro', url: (id, type) => `https://vidsrc.pro/embed/${type}/${id}` },
    { name: 'Embedsoap', url: (id, type) => `https://www.embedsoap.com/embed/${type}/${id}` },
    { name: 'VidSrc.to', url: (id, type) => `https://vidsrc.to/embed/${type}/${id}` },
    { name: 'VidSrc.me', url: (id, type) => `https://vidsrc.me/embed/${type}/${id}` }, // Duplicate for fallback
    { name: 'Embedflix', url: (id, type) => `https://embedflix.com/embed/${type}/${id}` },
    { name: 'VidSrc.cc', url: (id, type) => `https://vidsrc.cc/embed/${type}/${id}` },
    { name: 'VidSrc.in', url: (id, type) => `https://vidsrc.in/embed/${type}/${id}` }
];

// Utility functions
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)) || {};
    if (settings.darkMode) document.body.classList.add('dark-mode');
    if (settings.kidsMode) document.body.classList.add('kids-mode');
    // Apply other settings...
}

function saveSettings() {
    const settings = {
        darkMode: document.getElementById('darkMode').checked,
        notifications: document.getElementById('notifications').checked,
        autoPlay: document.getElementById('autoPlay').checked,
        kidsMode: document.getElementById('kidsMode').checked
    };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    loadSettings();
    showToast('Settings saved!');
}

// TMDB API functions
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function loadTrending() {
    const data = await fetchData('/trending/movie/day');
    if (data) renderGrid('trendingGrid', data.results, 'movie');
}

async function loadPopular() {
    const data = await fetchData('/movie/popular');
    if (data) renderGrid('popularGrid', data.results, 'movie');
}

async function loadGenres() {
    const data = await fetchData('/genre/movie/list');
    if (data) {
        const genreList = document.getElementById('genreList');
        genreList.innerHTML = data.genres.map(genre => `<button class="genre-btn" data-id="${genre.id}">${genre.name}</button>`).join('');
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', () => filterByGenre(btn.dataset.id));
        });
    }
}

async function filterByGenre(genreId) {
    const data = await fetchData(`/discover/movie&with_genres=${genreId}`);
    if (data) renderGrid('recGrid', data.results, 'movie');
}

async function search(query, type = 'movie') {
    const data = await fetchData(`/search/${type}?query=${encodeURIComponent(query)}`);
    if (data) renderGrid('searchResults', data.results, type);
}

function renderGrid(gridId, items, type) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = items.map(item => `
        <div class="card" data-id="${item.id}" data-type="${type}">
            <img src="${IMG_BASE_URL}${item.poster_path || item.backdrop_path}" alt="${item.title || item.name}">
            <h3>${item.title || item.name}</h3>
        </div>
    `).join('');
    document.querySelectorAll(`#${gridId} .card`).forEach(card => {
        card.addEventListener('click', () => showDetails(card.dataset.id, card.dataset.type));
    });
}

// Details and Player
async function showDetails(id, type) {
    const data = await fetchData(`/${type}/${id}`);
    if (data) {
        const content = `
            <h2>${data.title || data.name}</h2>
            <img src="${IMG_BASE_URL}${data.poster_path}" alt="${data.title || data.name}" style="width:200px;">
            <p>${data.overview}</p>
            <p>Rating: ${data.vote_average}/10</p>
            <button class="favorites-btn" onclick="addToList(${id}, '${type}')">Add to My List</button>
            <button class="share-btn" onclick="shareItem('${data.title || data.name}', '${window.location.href}')">Share</button>
            <button class="download-btn" onclick="downloadDummy()">Download</button>
            <button onclick="showCast(${id}, '${type}')">View Cast</button>
            <button onclick="playItem(${id}, '${type}')">Play</button>
            <div id="commentsSection"></div>
        `;
        document.getElementById('detailsContent').innerHTML = content;
        openModal('detailsModal');
        loadComments(id);
    }
}

function playItem(id, type) {
    const playerContent = document.getElementById('playerContent');
    playerContent.innerHTML = `
        <div class="quality-selector">
            <select id="sourceSelect">
                ${STREAM_SOURCES.map((src, index) => `<option value="${index}">${src.name}</option>`).join('')}
            </select>
        </div>
        <iframe id="playerIframe" src="${STREAM_SOURCES[0].url(id, type)}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>
        <div class="player-controls">
            <button class="player-btn" onclick="skipIntro()">Skip Intro</button>
            <button class="player-btn" onclick="togglePictureInPicture()">PiP</button>
            <button class="player-btn" onclick="changeSpeed()">Speed</button>
        </div>
        <div class="episode-list" id="episodeList"></div>
    `;
    document.getElementById('sourceSelect').addEventListener('change', (e) => {
        const srcIndex = e.target.value;
        document.getElementById('playerIframe').src = STREAM_SOURCES[srcIndex].url(id, type);
    });
    if (type === 'tv') loadEpisodes(id);
    addToHistory(id, type);
    openModal('playerModal');
}

async function loadEpisodes(seriesId) {
    const data = await fetchData(`/tv/${seriesId}`);
    if (data && data.seasons) {
        const episodeList = document.getElementById('episodeList');
        episodeList.innerHTML = data.seasons.map(season => `
            <div>
                <h4>Season ${season.season_number}</h4>
                ${Array.from({length: season.episode_count}, (_, i) => `<button class="episode-btn" onclick="playEpisode(${seriesId}, ${season.season_number}, ${i+1})">Ep ${i+1}</button>`).join('')}
            </div>
        `).join('');
    }
}

function playEpisode(seriesId, season, episode) {
    playItem(`${seriesId}?s=${season}&e=${episode}`, 'tv'); // Adjust for sources
}

async function showCast(id, type) {
    const data = await fetchData(`/${type}/${id}/credits`);
    if (data) {
        const castContent = data.cast.slice(0, 10).map(person => `
            <div>
                <img src="${IMG_BASE_URL}${person.profile_path}" alt="${person.name}" style="width:100px;">
                <p>${person.name} as ${person.character}</p>
            </div>
        `).join('');
        document.getElementById('castContent').innerHTML = castContent;
        openModal('castModal');
    }
}

// My List, History, etc.
function addToList(id, type) {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.myList)) || [];
    if (!list.find(item => item.id === id && item.type === type)) {
        list.push({ id, type });
        localStorage.setItem(STORAGE_KEYS.myList, JSON.stringify(list));
        showToast('Added to My List!');
    }
}

function addToHistory(id, type) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history)) || [];
    history.unshift({ id, type, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 50))); // Limit to 50
}

function loadMyList() {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.myList)) || [];
    const content = list.map(async item => {
        const data = await fetchData(`/${item.type}/${item.id}`);
        return data ? `<div class="card" onclick="showDetails(${item.id}, '${item.type}')"><img src="${IMG_BASE_URL}${data.poster_path}" alt="${data.title || data.name}"><h3>${data.title || data.name}</h3></div>` : '';
    });
    Promise.all(content).then(html => {
        document.getElementById('myListContent').innerHTML = html.join('');
        openModal('myListModal');
    });
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history)) || [];
    const content = history.map(async item => {
        const data = await fetchData(`/${item.type}/${item.id}`);
        return data ? `<div class="card" onclick="showDetails(${item.id}, '${item.type}')"><img src="${IMG_BASE_URL}${data.poster_path}" alt="${data.title || data.name}"><h3>${data.title || data.name}</h3></div>` : '';
    });
    Promise.all(content).then(html => {
        document.getElementById('historyContent').innerHTML = html.join('');
        openModal('historyModal');
    });
}

// Comments
function loadComments(id) {
    const comments = JSON.parse(localStorage.getItem(STORAGE_KEYS.comments)) || {};
    const list = comments[id] || [];
    document.getElementById('commentsList').innerHTML = list.map(c => `<div class="review-item">${c}</div>`).join('');
    document.getElementById('commentsSection').style.display = 'block';
}

function submitComment() {
    const input = document.getElementById('commentInput');
    const id = document.querySelector('.card[data-id]').dataset.id; // Assuming context
    const comments = JSON.parse(localStorage.getItem(STORAGE_KEYS.comments)) || {};
    if (!comments[id]) comments[id] = [];
    comments[id].push(input.value);
    localStorage.setItem(STORAGE_KEYS.comments, JSON.stringify(comments));
    input.value = '';
    loadComments(id);
}

// Dummy functions for extras
function shareItem(title, url) {
    document.getElementById('shareLink').value = `${url}?title=${encodeURIComponent(title)}`;
    openModal('shareModal');
}

function downloadDummy() {
    showToast('Download feature is dummy - not implemented.');
}

function skipIntro() { showToast('Skipping intro...'); }
function togglePictureInPicture() { showToast('PiP toggled.'); }
function changeSpeed() { showToast('Speed changed.'); }

// Login (dummy)
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = { username: document.getElementById('username').value };
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    showToast('Logged in!');
    closeModal('loginModal');
});

// Search
document.querySelector('.search-btn').addEventListener('click', () => openModal('searchModal'));
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value;
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    if (query.length > 2) search(query, activeTab);
});
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page === 'my-list') loadMyList();
        else if (page === 'history') loadHistory();
        else if (page === 'settings') openModal('settingsModal');
        else if (page === 'movies') loadPopular(); // Example
        else if (page === 'series') search('', 'tv'); // Example
    });
});

// Close modals
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        closeBtn.closest('.modal').style.display = 'none';
    });
});
document.getElementById('saveSettings').addEventListener('click', saveSettings);
document.getElementById('submitComment').addEventListener('click', submitComment);
document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
document.querySelector('.close-ad').addEventListener('click', () => document.getElementById('adBanner').style.display = 'none');

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadTrending();
    loadPopular();
    loadGenres();
    // Show intrusive banner after 5s
    setTimeout(() => document.getElementById('adBanner').style.display = 'block', 5000);
});
