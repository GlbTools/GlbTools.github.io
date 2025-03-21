console.log('create.js loaded');

const loginBtn = document.getElementById('login-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const loginMessage = document.getElementById('login-message');
const createSection = document.getElementById('create-section');
const forkRepoBtn = document.getElementById('fork-repo-btn');
const repoNameInput = document.getElementById('repo-name');
const forkStatus = document.getElementById('fork-status');
const siteTitleInput = document.getElementById('site-title');
const siteRepoOwnerInput = document.getElementById('site-repo-owner');
const websiteRepoNameInput = document.getElementById('website-repo-name');
const thumbnailFileInput = document.getElementById('thumbnail-file');
const thumbnailDropZone = document.getElementById('thumbnail-drop-zone');
const glbRepoNameSelect = document.getElementById('glb-repo-name');
const newGlbRepoNameInput = document.getElementById('new-glb-repo-name');
const saveConfigBtn = document.getElementById('save-config-btn');
let dropdownVisible = false;
let forkedRepoName = null;
let username = null;

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
        checkForkStatus(newName);
    } catch (error) {
        forkStatus.textContent = `Error: ${error.message}`;
        forkStatus.className = 'error';
        showNotification(`Error forking repo: ${error.message}`, true);
    }
}

async function checkForkStatus(repoName) {
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
                enableNextSteps();
                populateStep3();
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

async function populateStep3() {
    siteRepoOwnerInput.value = username;
    websiteRepoNameInput.value = forkedRepoName;
    try {
        const reposResponse = await fetch(`https://api.github.com/user/repos`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (!reposResponse.ok) throw new Error('Failed to fetch user repos');
        const repos = await reposResponse.json();
        glbRepoNameSelect.innerHTML = '<option value="">Select or enter a new repo name</option>';
        repos.forEach(repo => {
            const option = document.createElement('option');
            option.value = repo.name;
            option.textContent = repo.name;
            glbRepoNameSelect.appendChild(option);
        });
    } catch (error) {
        showNotification(`Error loading repos: ${error.message}`, true);
    }
}

async function saveConfig() {
    const config = {
        glbRepoUsername: username,
        glbRepoName: glbRepoNameSelect.value || newGlbRepoNameInput.value.trim(),
        supabaseUrl: "https://dpvdliyswsijfeoppkhs.supabase.co", // From glb.tools config
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdmRsaXlzd3NpamZlb3Bwa2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MjM2NjEsImV4cCI6MjA1ODA5OTY2MX0.oDmNRb-rIuGaWVlRG68IaLVKtPxoNF0_TIwhdP6vIY4",
        siteTitle: siteTitleInput.value.trim(),
        thumbnailPath: "thumbnail.jpg",
        siteRepoOwner: username,
        websiteRepoName: forkedRepoName
    };

    if (!config.siteTitle) {
        showNotification('Please enter a site title.', true);
        return;
    }
    if (!config.glbRepoName) {
        showNotification('Please select or enter a GLB repo name.', true);
        return;
    }

    try {
        // Create GLB repo if new
        if (!glbRepoNameSelect.value && newGlbRepoNameInput.value.trim()) {
            const response = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${auth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newGlbRepoNameInput.value.trim(), private: false })
            });
            if (!response.ok) throw new Error('Failed to create GLB repo');
            showNotification(`GLB repo ${newGlbRepoNameInput.value.trim()} created!`);
        }

        // Upload thumbnail if provided
        const thumbnailFile = thumbnailFileInput.files[0];
        if (thumbnailFile) {
            if (thumbnailFile.size > 100 * 1024) {
                showNotification('Thumbnail must be less than 100KB', true);
                return;
            }
            await uploadFile(username, forkedRepoName, 'thumbnail.jpg', thumbnailFile);
        }

        // Save config.json
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
                message: 'Update config.json',
                content: content,
                sha: sha
            })
        });
        if (!response.ok) throw new Error('Failed to save config');
        showNotification('Config saved successfully!');
    } catch (error) {
        showNotification(`Error saving config: ${error.message}`, true);
    }
}

async function uploadFile(username, repoName, path, file) {
    const reader = new FileReader();
    const content = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });

    let sha = null;
    try {
        const checkResponse = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
            headers: { 'Authorization': `token ${auth.getToken()}` }
        });
        if (checkResponse.ok) {
            const fileData = await checkResponse.json();
            sha = fileData.sha;
        }
    } catch (error) {
        if (error.status !== 404) {
            throw new Error(`Failed to check file existence: ${error.message}`);
        }
    }

    const body = {
        message: sha ? `Update ${path}` : `Add ${path}`,
        content: content
    };
    if (sha) body.sha = sha;

    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${auth.getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Failed to upload ${path}`);
}

function setupDragAndDrop(input, dropZone) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
    });
    dropZone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        if (input.files.length) {
            dropZone.textContent = input.files[0].name;
            dropZone.style.backgroundImage = 'none';
        } else {
            dropZone.textContent = '';
            dropZone.style.backgroundImage = "url('dragdrop.svg')";
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    auth.checkSession(async (user) => {
        if (user && auth.getToken()) {
            username = user.login;
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

    saveConfigBtn.addEventListener('click', () => {
        saveConfig();
    });

    setupDragAndDrop(thumbnailFileInput, thumbnailDropZone);
});