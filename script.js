console.log('script.js loaded');

const grid = document.getElementById('site-grid');
const searchInput = document.getElementById('search-input');
const loginBtn = document.getElementById('login-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const letsCreateLink = document.getElementById('lets-create-link');
let allSites = [];
let dropdownVisible = false;

async function loadSites() {
    console.log('Starting loadSites()');
    try {
        console.log('Fetching repos from GitHub API...');
        const response = await fetch('https://api.github.com/search/repositories?q=topic:glbtools+fork:true', { // Added fork:true
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        console.log('API response status:', response.status);
        if (!response.ok) throw new Error(`Failed to fetch repos: ${response.status}`);
        const data = await response.json();
        const repos = data.items;
        console.log('Repos found:', repos.map(r => `${r.owner.login}/${r.name}`));

        allSites = await Promise.all(repos.map(async repo => {
            const owner = repo.owner.login;
            const repoName = repo.name;
            const configUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/main/config.json`;
            console.log(`Fetching config for ${owner}/${repoName}: ${configUrl}`);

            try {
                const configResponse = await fetch(configUrl);
                if (!configResponse.ok) {
                    console.warn(`No config.json in ${owner}/${repoName} (status: ${configResponse.status}), skipping...`);
                    return null;
                }
                const configText = await configResponse.text();
                const config = JSON.parse(configText);

                if (!config.siteTitle || !config.siteRepoOwner || !config.siteRepoName) {
                    console.warn(`Invalid config.json in ${owner}/${repoName} (missing required fields), skipping...`);
                    return null;
                }

                return {
                    name: config.siteTitle,
                    thumbnail: `https://raw.githubusercontent.com/${config.siteRepoOwner}/${config.siteRepoName}/main/${config.thumbnailPath || 'thumbnail.jpg'}`,
                    url: `https://${config.siteRepoOwner}.github.io/${config.siteRepoName}`,
                    owner: owner,
                    repo: repoName
                };
            } catch (error) {
                console.warn(`Skipping ${owner}/${repoName}: ${error.message}`);
                return null;
            }
        }));

        allSites = allSites.filter(site => site !== null);
        console.log('Filtered sites:', allSites);
        if (allSites.length === 0) {
            showNotification('No valid GLB sites found. Fork Clone.Tools to get started!', true);
        }
        renderGrid();
    } catch (error) {
        console.error('Error in loadSites:', error);
        showNotification(`Error loading sites: ${error.message}`, true);
    }
}

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    if (isError) notification.classList.add('error');
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 5000);
}

function renderGrid() {
    grid.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();
    const filteredSites = allSites.filter(site => 
        site.name.toLowerCase().includes(searchTerm) || 
        site.owner.toLowerCase().includes(searchTerm) || 
        site.repo.toLowerCase().includes(searchTerm)
    );

    filteredSites.forEach(site => {
        const box = document.createElement('div');
        box.className = 'grid-box';
        box.innerHTML = `
            <img src="${site.thumbnail}" alt="${site.name}" onerror="this.src='default-thumbnail.jpg'">
            <div class="text-row">
                <div class="name">${site.name}</div>
            </div>
        `;
        box.addEventListener('click', () => window.open(site.url, '_blank'));
        grid.appendChild(box);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded fired');
    try {
        await auth.checkSession(async (user) => {
            if (user && auth.getToken()) {
                console.log('Logged in as:', user);
                auth.updateLoginDisplay(user, loginBtn);
                profileDropdown.style.display = 'none';
                letsCreateLink.style.display = 'block'; // Always visible
            } else {
                console.log('Not logged in');
                loginBtn.innerHTML = 'Login with GitHub';
                loginBtn.classList.remove('profile');
                loginBtn.disabled = false;
                profileDropdown.style.display = 'none';
                letsCreateLink.style.display = 'block'; // Always visible
            }
        });
        console.log('Auth setup complete');
        await loadSites();
    } catch (error) {
        console.error('Auth error:', error);
        showNotification(`Login setup failed: ${error.message}`, true);
        await loadSites();
    }

    loginBtn.addEventListener('click', async () => {
        if (loginBtn.classList.contains('profile')) {
            dropdownVisible = !dropdownVisible;
            profileDropdown.style.display = dropdownVisible ? 'block' : 'none';
        } else {
            try {
                const error = await auth.loginWithGitHub();
                if (error) throw new Error(`Login failed: ${error}`);
                console.log('Login successful');
            } catch (error) {
                showNotification(error.message, true);
            }
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        loginBtn.innerHTML = 'Login with GitHub';
        loginBtn.classList.remove('profile');
        loginBtn.disabled = false;
        profileDropdown.style.display = 'none';
        dropdownVisible = false;
        letsCreateLink.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!loginBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
            dropdownVisible = false;
        }
    });

    searchInput.addEventListener('input', renderGrid);
});