console.log('create.js loaded');

const loginBtn = document.getElementById('login-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const loginMessage = document.getElementById('login-message');
const createSection = document.getElementById('create-section');
const createRepoBtn = document.getElementById('create-repo-btn');
const repoNameInput = document.getElementById('repo-name');
let dropdownVisible = false;

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

async function createRepo(repoName) {
    try {
        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: { 
                'Authorization': `token ${auth.getToken()}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ name: repoName, private: false })
        });
        if (!response.ok) throw new Error('Failed to create repo');
        showNotification(`Repository ${repoName} created! Now fork Clone.Tools into it manually.`);
    } catch (error) {
        showNotification(`Error creating repo: ${error.message}`, true);
    }
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

    createRepoBtn.addEventListener('click', () => {
        const repoName = repoNameInput.value.trim();
        if (!repoName) {
            showNotification('Please enter a repo name.', true);
            return;
        }
        createRepo(repoName);
    });
});