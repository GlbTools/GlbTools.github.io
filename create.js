console.log('create.js loaded');

const loginBtn = document.getElementById('login-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const loginMessage = document.getElementById('login-message');
const createSection = document.getElementById('create-section');
const forkRepoBtn = document.getElementById('fork-repo-btn');
const repoNameInput = document.getElementById('repo-name');
const forkStatus = document.getElementById('fork-status');
let dropdownVisible = false;
let forkedRepoName = null;

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

async function forkRepo(newName) {
    try {
        forkStatus.textContent = 'Forking...';
        forkStatus.className = 'pending';
        const response = await fetch('https://api.github.com/repos/beb-cc0/beb-cc0.github.io/forks', {
            method: 'POST',
            headers: {
                'Authorization': `token ${auth.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });
        if (!response.ok) throw new Error('Failed to start fork');
        showNotification('Fork started! Waiting for it to complete...');
        forkedRepoName = newName;
        checkForkStatus(newName); // Start polling
    } catch (error) {
        forkStatus.textContent = `Error: ${error.message}`;
        forkStatus.className = 'error';
        showNotification(`Error forking repo: ${error.message}`, true);
    }
}

async function checkForkStatus(repoName) {
    const maxAttempts = 20; // ~2 minutes with 6-second intervals
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;
        try {
            const response = await fetch(`https://api.github.com/repos/${auth.getUser().login}/${repoName}`, {
                headers: { 'Authorization': `token ${auth.getToken()}` }
            });
            if (response.ok) {
                forkStatus.textContent = 'Fork Complete';
                forkStatus.className = 'complete';
                clearInterval(interval);
                enableNextSteps();
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
    }, 6000); // Check every 6 seconds
}

function enableNextSteps() {
    document.getElementById('step-3').style.opacity = '1';
    document.getElementById('step-3').style.pointerEvents = 'auto';
    document.getElementById('step-4').style.opacity = '1';
    document.getElementById('step-4').style.pointerEvents = 'auto';
    document.getElementById('step-5').style.opacity = '1';
    document.getElementById('step-5').style.pointerEvents = 'auto';
    document.getElementById('step-6').style.opacity = '1';
    document.getElementById('step-6').style.pointerEvents = 'auto';
}

document.addEventListener('DOMContentLoaded', () => {
    auth.checkSession(async (user) => {
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
});