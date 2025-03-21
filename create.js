console.log('create.js loaded');

const loginBtn = document.getElementById('login-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const loginMessage = document.getElementById('login-message');
const createSection = document.getElementById('create-section');
const forkRepoBtn = document.getElementById('fork-repo-btn');
const repoNameInput = document.getElementById('repo-name');
const forkStatus = document.getElementById('fork-status');
const glbRepoNameInput = document.getElementById('glb-repo-name');
const createGlbRepoBtn = document.getElementById('create-glb-repo-btn');
const glbRepoStatus = document.getElementById('glb-repo-status');
const pagesLink = document.getElementById('pages-link');
const pagesStatus = document.getElementById('pages-status');
const liveSiteLink = document.getElementById('live-site-link');
const portalLink = document.getElementById('portal-link');
let dropdownVisible = false;
let forkedRepoName = null;
let glbRepoName = null;

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

function normalizeRepoName(name) {
    return name.trim().replace(/\s+/g, '-');
}

async function getUsername() {
    const token = auth.getToken();
    if (!token) throw new Error('No authentication token found');
    const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch user data');
    const userData = await response.json();
    return userData.login;
}

async function forkRepo(newName) {
    try {
        const username = await getUsername();
        const normalizedName = normalizeRepoName(newName);
        forkStatus.textContent = 'Forking...';
        forkStatus.className = 'pending';
        const response = await fetch('https://api.github.com/repos/beb-cc0/beb-cc0.github.io/forks', {
            method: 'POST',
            headers: {
                'Authorization': `token ${auth.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: normalizedName })
        });
        if (!response.ok) throw new Error('Failed to start fork');
        showNotification('Fork started! Waiting for it to complete...');
        forkedRepoName = normalizedName;
        checkForkStatus(username, normalizedName);
    } catch (error) {
        forkStatus.textContent = `Error: ${error.message}`;
        forkStatus.className = 'error';
        showNotification(`Error forking repo: ${error.message}`, true);
    }
}

async function checkForkStatus(username, repoName) {
    const maxAttempts = 20;
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;
        try {
            const response = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
                headers: { 'Authorization': `token ${auth.getToken()}` }
            });
            if (response.ok) {
                forkStatus.textContent = 'Fork Complete';
                forkStatus.className = 'complete';
                clearInterval(interval);
                enableStep3();
            } else if (attempts >= maxAttempts) {
                forkStatus.textContent = 'Error: Fork timed out';
                forkStatus.className = 'error';
                clearInterval(interval);
                showNotification('Forking took too long—check your GitHub repos.', true);
            }
        } catch (error) {
            forkStatus.textContent = `Error: ${error.message}`;
            forkStatus.className = 'error';
            clearInterval(interval);
            showNotification(`Error checking fork status: ${error.message}`, true);
        }
    }, 6000);
}

async function createGlbRepo(repoName) {
    try {
        const username = await getUsername();
        const normalizedGlbName = normalizeRepoName(repoName);
        glbRepoStatus.textContent = 'Creating...';
        glbRepoStatus.className = 'pending';

        const glbResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${auth.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: normalizedGlbName, private: false })
        });
        if (!glbResponse.ok) throw new Error('Failed to create GLB repo');

        glbRepoName = normalizedGlbName;
        showNotification(`GLB repo ${normalizedGlbName} created! Setting up config...`);
        await saveConfig(username, normalizedGlbName);

        glbRepoStatus.textContent = 'Repo Created';
        glbRepoStatus.className = 'complete';

        pagesLink.href = `https://github.com/${username}/${forkedRepoName}/settings/pages`;
        pagesLink.textContent = 'Click here';

        enableStep5();
        checkPagesStatus(username, forkedRepoName); // Start checking Pages status immediately
    } catch (error) {
        glbRepoStatus.textContent = `Error: ${error.message}`;
        glbRepoStatus.className = 'error';
        showNotification(`Error: ${error.message}`, true);
    }
}

async function saveConfig(username, glbRepoName) {
    const config = {
        glbRepoUsername: username,
        glbRepoName: glbRepoName,
        supabaseUrl: "YOUR_SUPABASE_URL_HERE",
        supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY_HERE",
        siteTitle: forkedRepoName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        thumbnailPath: "thumbnail.jpg",
        siteRepoOwner: username,
        siteRepoName: forkedRepoName
    };

    const content = btoa(JSON.stringify(config, null, 2));
    const configResponse = await fetch(`https://api.github.com/repos/${username}/${forkedRepoName}/contents/config.json`, {
        headers: { 'Authorization': `token ${auth.getToken()}` }
    });
    let sha = null;
    if (configResponse.ok) {
        const configData = await configResponse.json();
        sha = configData.sha;
    }

    const response = await fetch(`https://api.github.com/repos/${username}/${forkedRepoName}/contents/config.json`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${auth.getToken()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: 'Initialize config.json',
            content: content,
            sha: sha
        })
    });
    if (!response.ok) throw new Error('Failed to save config');
}

async function checkPagesStatus(username, repoName) {
    const liveUrl = `https://${username}.github.io/${repoName}/`;
    liveSiteLink.href = liveUrl;
    portalLink.href = `${liveUrl}portal.html`;
    portalLink.textContent = 'your portal';

    const maxAttempts = 10;
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;
        try {
            const response = await fetch(liveUrl, { method: 'HEAD' });
            if (response.ok) {
                pagesStatus.textContent = 'Pages Live';
                pagesStatus.className = 'complete';
                liveSiteLink.textContent = liveUrl;
                clearInterval(interval);
                enableNextSteps();
            } else if (attempts >= maxAttempts) {
                pagesStatus.textContent = 'Not live yet—ensure Pages is enabled';
                pagesStatus.className = 'error';
                liveSiteLink.textContent = `${liveUrl} (not live yet)`;
                clearInterval(interval);
            }
        } catch (error) {
            if (attempts >= maxAttempts) {
                pagesStatus.textContent = 'Not live yet—ensure Pages is enabled';
                pagesStatus.className = 'error';
                liveSiteLink.textContent = `${liveUrl} (not live yet)`;
                clearInterval(interval);
            }
        }
    }, 6000);
}

function enableStep3() {
    document.getElementById('step-3').style.opacity = '1';
    document.getElementById('step-3').style.pointerEvents = 'auto';
}

function enableStep5() {
    document.getElementById('step-5').style.opacity = '1';
    document.getElementById('step-5').style.pointerEvents = 'auto';
    document.getElementById('step-6').style.opacity = '1'; // Enable Step 6 with Step 5
    document.getElementById('step-6').style.pointerEvents = 'auto';
}

function enableNextSteps() {
    document.getElementById('step-7').style.opacity = '1';
    document.getElementById('step-7').style.pointerEvents = 'auto';
    document.getElementById('step-8').style.opacity = '1'; // Add this line
    document.getElementById('step-8').style.pointerEvents = 'auto'; // Add this line
}

document.addEventListener('DOMContentLoaded', async () => {
    await auth.checkSession(async (user) => {
        if (user && auth.getToken()) {
            auth.updateLoginDisplay(user, loginBtn);
            createSection.style.display = 'block';
            loginMessage.style.display = 'none';
        } else {
            loginBtn.innerHTML = 'Login with GitHub';
            loginBtn.classList.remove('profile');
            loginBtn.disabled = false;
            createSection.style.display = 'none';
            loginMessage.style.display = 'block';
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
        createSection.style.display = 'none';
        loginMessage.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!loginBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
            dropdownVisible = false;
        }
    });

    forkRepoBtn.addEventListener('click', () => {
        const repoName = repoNameInput.value.trim();
        if (!repoName) {
            showNotification('Please enter a repo name.', true);
            return;
        }
        forkRepo(repoName);
    });

    createGlbRepoBtn.addEventListener('click', async () => {
        const repoName = glbRepoNameInput.value.trim();
        if (!repoName) {
            showNotification('Please enter a GLB repo name.', true);
            return;
        }
        await createGlbRepo(repoName);
    });
});