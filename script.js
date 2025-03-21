console.log('script.js loaded');

const loginBtn = document.getElementById('login-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const letsCreateLink = document.getElementById('lets-create-link');
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await auth.checkSession(async (user) => {
            if (user && auth.getToken()) {
                console.log('Logged in as:', user);
                auth.updateLoginDisplay(user, loginBtn);
                profileDropdown.style.display = 'none';
                letsCreateLink.style.display = 'none';
            } else {
                console.log('Not logged in');
                loginBtn.innerHTML = 'Login with GitHub';
                loginBtn.classList.remove('profile');
                loginBtn.disabled = false;
                profileDropdown.style.display = 'none';
                letsCreateLink.style.display = 'block';
            }
        });
        console.log('Auth setup complete');
        // Uncomment loadSites() once login works
        // loadSites();
    } catch (error) {
        console.error('Auth error:', error);
        showNotification(`Login setup failed: ${error.message}`, true);
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
});