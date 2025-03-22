console.log('create.js loaded');

const loginBtn = document.getElementById('login-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const loginMessage = document.getElementById('login-message');
const createSection = document.getElementById('create-section');
const cloneWebsiteBtn = document.getElementById('clone-website-btn');
const websiteStatus = document.getElementById('website-status');
const glbRepoStatus = document.getElementById('glb-repo-status');
const pagesLink = document.getElementById('pages-link');
const pagesStatus = document.getElementById('pages-status');
const liveSiteLink = document.getElementById('live-site-link');
const portalLink = document.getElementById('portal-link');
const applyOauthBtn = document.getElementById('apply-oauth-btn');
const projectUrlInput = document.getElementById('project-url');
const projectApiKeyInput = document.getElementById('project-api-key');
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

async function cloneWebsite() {
    try {
        const username = await getUsername();
        const websiteRepoName = `${username}.github.io`;
        const glbRepoNameLocal = `${username}.glb`;

        // Fork the website repo
        websiteStatus.textContent = 'Cloning website...';
        websiteStatus.className = 'pending';
        const forkResponse = await fetch('https://api.github.com/repos/beb-cc0/beb-cc0.github.io/forks', {
            method: 'POST',
            headers: {
                'Authorization': `token ${auth.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: websiteRepoName })
        });
        if (!forkResponse.ok) throw new Error('Failed to fork website repo');
        forkedRepoName = websiteRepoName;

        // Create the GLB repo
        glbRepoStatus.textContent = 'Creating GLB repo...';
        glbRepoStatus.className = 'pending';
        const glbResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${auth.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: glbRepoNameLocal, private: false })
        });
        if (!glbResponse.ok) throw new Error('Failed to create GLB repo');
        glbRepoName = glbRepoNameLocal;

        showNotification(`Website cloned as ${websiteRepoName} and GLB repo created as ${glbRepoName}! Checking status...`);
        checkSetupStatus(username, websiteRepoName, glbRepoNameLocal);
    } catch (error) {
        websiteStatus.textContent = `Error: ${error.message}`;
        websiteStatus.className = 'error';
        glbRepoStatus.textContent = `Error: ${error.message}`;
        glbRepoStatus.className = 'error';
        showNotification(`Error during setup: ${error.message}`, true);
    }
}

async function checkSetupStatus(username, websiteRepoName, glbRepoName) {
    const maxAttempts = 20;
    let websiteAttempts = 0;
    let glbAttempts = 0;

    const interval = setInterval(async () => {
        websiteAttempts++;
        glbAttempts++;

        try {
            // Check website repo
            const websiteResponse = await fetch(`https://api.github.com/repos/${username}/${websiteRepoName}`, {
                headers: { 'Authorization': `token ${auth.getToken()}` }
            });
            if (websiteResponse.ok) {
                websiteStatus.textContent = 'Website Ready';
                websiteStatus.className = 'complete';
            } else if (websiteAttempts >= maxAttempts) {
                websiteStatus.textContent = 'Error: Website setup timed out';
                websiteStatus.className = 'error';
            }

            // Check GLB repo
            const glbResponse = await fetch(`https://api.github.com/repos/${username}/${glbRepoName}`, {
                headers: { 'Authorization': `token ${auth.getToken()}` }
            });
            if (glbResponse.ok) {
                glbRepoStatus.textContent = 'GLB Repo Ready';
                glbRepoStatus.className = 'complete';
            } else if (glbAttempts >= maxAttempts) {
                glbRepoStatus.textContent = 'Error: GLB repo setup timed out';
                glbRepoStatus.className = 'error';
            }

            // If both are complete, proceed and save config
            if (websiteStatus.textContent === 'Website Ready' && glbRepoStatus.textContent === 'GLB Repo Ready') {
                clearInterval(interval);
                await saveConfig(username, glbRepoName);
                enableStep5();
            } else if (websiteAttempts >= maxAttempts && glbAttempts >= maxAttempts) {
                clearInterval(interval);
                showNotification('Setup took too long—check your GitHub repos.', true);
            }
        } catch (error) {
            websiteStatus.textContent = `Error: ${error.message}`;
            websiteStatus.className = 'error';
            glbRepoStatus.textContent = `Error: ${error.message}`;
            glbRepoStatus.className = 'error';
            clearInterval(interval);
            showNotification(`Error checking setup status: ${error.message}`, true);
        }
    }, 6000);
}

async function saveConfig(username, glbRepoName, projectUrl = "YOUR_SUPABASE_URL_HERE", projectApiKey = "YOUR_SUPABASE_ANON_KEY_HERE") {
    const config = {
        glbRepoUsername: username,
        glbRepoName: glbRepoName,
        supabaseUrl: projectUrl,
        supabaseAnonKey: projectApiKey,
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
            message: 'Update config.json with Supabase credentials',
            content: content,
            sha: sha
        })
    });
    if (!response.ok) throw new Error('Failed to save config');
}

async function checkPagesStatus(username) { // Removed repoName parameter since it's always username.github.io
    const liveUrl = `https://${username}.github.io/`;
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

async function applyOAuth() {
    const projectUrl = projectUrlInput.value.trim();
    const projectApiKey = projectApiKeyInput.value.trim();

    if (!projectUrl || !projectApiKey) {
        showNotification('Please enter both Project URL and Project API Key.', true);
        return;
    }

    try {
        const username = await getUsername();
        showNotification('Applying Supabase credentials...');
        await saveConfig(username, glbRepoName, projectUrl, projectApiKey);
        showNotification('Supabase credentials applied successfully! Your site is ready.');
    } catch (error) {
        showNotification(`Error applying Supabase credentials: ${error.message}`, true);
    }
}

function enableStep5() {
    document.getElementById('step-5').style.opacity = '1';
    document.getElementById('step-5').style.pointerEvents = 'auto';
    document.getElementById('step-6').style.opacity = '1';
    document.getElementById('step-6').style.pointerEvents = 'auto';
    checkPagesStatus(await getUsername()); // Start checking Pages status immediately
}

function enableNextSteps() {
    document.getElementById('step-7').style.opacity = '1';
    document.getElementById('step-7').style.pointerEvents = 'auto';
    document.getElementById('step-8').style.opacity = '1';
    document.getElementById('step-8').style.pointerEvents = 'auto';
    document.getElementById('step-9').style.opacity = '1';
    document.getElementById('step-9').style.pointerEvents = 'auto';
    document.getElementById('step-10').style.opacity = '1';
    document.getElementById('step-10').style.pointerEvents = 'auto';
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

    cloneWebsiteBtn.addEventListener('click', () => {
        cloneWebsite();
    });

    applyOauthBtn.addEventListener('click', applyOAuth);
});