const API_URL = (window.API_BASE_URL || '') + '/api/auth';

function mapFbAuthError(err) {
    const code = err?.code || '';
    switch (code) {
        case 'auth/weak-password':
            return 'Parola trebuie să aibă minim 6 caractere.';
        case 'auth/email-already-in-use':
            return 'Numele de utilizator este deja folosit.';
        case 'auth/invalid-email':
            return 'Nume de utilizator invalid.';
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'User sau parolă greșită.';
        case 'auth/too-many-requests':
            return 'Prea multe încercări. Așteaptă puțin și reîncearcă.';
        default:
            // fallback: show original message
            return err?.message || 'Eroare necunoscută.';
    }
}

function isNetworkError(err) {
    // Firebase errors are usually not network errors.
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch');
}

async function register() {
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;
    const messageBox = document.getElementById("message");

    const u = String(username || '').trim();
    const p = String(password || '');

    if (!u) {
        messageBox.style.color = "#e74c3c";
        messageBox.innerText = 'Introdu un nume de utilizator.';
        return;
    }
    if (p.length < 6) {
        messageBox.style.color = "#e74c3c";
        messageBox.innerText = 'Parola trebuie să aibă minim 6 caractere.';
        return;
    }

    try {
        // Prefer Firebase if wired (GitHub Pages / browser-only mode)
        if (window.__bb_fb?.fbRegister) {
            await window.__bb_fb.fbRegister(u, p);
            messageBox.style.color = "#2ecc71";
            messageBox.innerText = "Succes: Cont creat";
            return;
        }

        // Fallback to legacy backend mode
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: u, password: p })
        });

        const text = await response.text();

        if (response.ok) {
            messageBox.style.color = "#2ecc71"; // Verde
            messageBox.innerText = "Succes: " + text;
        } else {
            messageBox.style.color = "#e74c3c"; // Rosu
            messageBox.innerText = "Eroare: " + text;
        }

    } catch (error) {
        messageBox.style.color = "#e74c3c";
        if (error?.code?.startsWith('auth/')) {
            messageBox.innerText = mapFbAuthError(error);
        } else if (isNetworkError(error)) {
            messageBox.innerText = `Eroare conexiune: ${error.message}`;
        } else {
            messageBox.innerText = `Eroare: ${error.message}`;
        }
    }
}

async function login() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const messageBox = document.getElementById("message");

    const u = String(username || '').trim();
    const p = String(password || '');

    if (!u || !p) {
        messageBox.style.color = "#e74c3c";
        messageBox.innerText = 'Completează user și parolă.';
        return;
    }

    try {
        // Prefer Firebase if wired (GitHub Pages / browser-only mode)
        if (window.__bb_fb?.fbLogin) {
            await window.__bb_fb.fbLogin(u, p);

            messageBox.style.color = "#2ecc71";
            messageBox.innerText = "Logat! Se încarcă jocul...";

            localStorage.setItem("connectedUser", u);
            setTimeout(() => {
                window.location.href = "menu.html";
            }, 300);
            return;
        }

        // Fallback to legacy backend mode
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: u, password: p })
        });

        const text = await response.text();

        if (response.ok) {
            messageBox.style.color = "#2ecc71";
            messageBox.innerText = "Logat! Se încarcă jocul...";

            localStorage.setItem("connectedUser", u);

            setTimeout(() => {
                window.location.href = "menu.html";
            }, 600);

        } else {
            messageBox.style.color = "#e74c3c";
            messageBox.innerText = "Login eșuat: " + text;
        }
    } catch (error) {
        messageBox.style.color = "#e74c3c";
        if (error?.code?.startsWith('auth/')) {
            messageBox.innerText = mapFbAuthError(error);
        } else if (isNetworkError(error)) {
            messageBox.innerText = `Eroare conexiune: ${error.message}`;
        } else {
            messageBox.innerText = `Eroare: ${error.message}`;
        }
    }
}

// Allow index.html to hook onclick handlers even when it defines its own module wrapper.
window.__bb_register = register;
window.__bb_login = login;
