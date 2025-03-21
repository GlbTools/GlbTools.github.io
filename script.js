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
    try {
        const response = await fetch('https://api.github.com/search/repositories?q=topic:glbtools', {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!response.ok) throw new Error(`Failed to fetch repos: ${response.status}`);
        const data = await response.json();
        const repos = data.items;

        allSites = await Promise.all(repos.map(async repo => {
            const owner = repo.owner.login;
            const repoName = repo.name;
            const configUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/main/config.json`;

            try {
                const configResponse = await fetch(configUrl);
                if (!configResponse.ok) throw new Error(`No config.json in ${owner}/${repoName}`);
                const config = await configResponse.json();

                return {
                    name: config.siteTitle || repoName,
                    thumbnail: `https://raw.githubusercontent.com/${owner}/${repoName}/main/${config.thumbnailPath || 'thumbnail.jpg'}`,
                    url: `https://${owner}.github.io/${repoName}`,
                    owner: owner,
                    repo: repoName
                };
            } catch (error) {
                console.warn(`Skipping ${owner}/${repoName}: ${error.message}`);
                return null;
            }
        }));

        allSites = allSites.filter(site => site !== null);
        renderGrid();
    } catch (error) {
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

document.addEventListener('DOMContentLoaded', () => {
    loadSites();

    auth.checkSession(async (user) => {
        if (user && auth.getToken()) {
            auth.updateLoginDisplay(user, loginBtn);
            profileDropdown.style.display = 'none';
            letsCreateLink.style.display = 'none'; // Hide public link when logged in
        } else {
            loginBtn.innerHTML = 'Login with GitHub';
            loginBtn.classList.remove('profile');
            loginBtn.disabled = false;
            profileDropdown.style.display = 'none';
            letsCreateLink.style.display = 'block'; // Show public link when logged out
        }
    });

    loginBtn.addEventListener('click', async () => {
        if (loginBtn.classList.contains('profile')) {
            dropdownVisible = !dropdownVisible;
            profileDropdown.style.display = dropdownVisible ? 'block' : 'none';
        } else {
            const error = await auth.loginWithGitHub();
            if (error) showNotification(`Login failed: ${error}`, true);
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