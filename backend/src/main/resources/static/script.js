const API_URL = (window.API_BASE_URL || '') + '/api/auth';

async function register() {
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;
    const messageBox = document.getElementById("message");

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: username, password: password })
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
        messageBox.innerText = `Eroare conexiune: ${error.message}`;
    }
}

async function login() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const messageBox = document.getElementById("message");

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: username, password: password })
        });

        const text = await response.text();

        if (response.ok) {
    messageBox.style.color = "#2ecc71";
    messageBox.innerText = "Logat! Se încarcă jocul...";
    
    // 1. Salvăm numele jucătorului în memoria browserului
    localStorage.setItem("connectedUser", username);

    // 2. Redirectăm către pagina de joc (pe care o creăm acum)
    setTimeout(() => {
        window.location.href = "menu.html"; 
    }, 1000);

} else {
            messageBox.style.color = "#e74c3c";
            messageBox.innerText = "Login eșuat: " + text;
        }
    } catch (error) {
        messageBox.style.color = "#e74c3c";
        messageBox.innerText = `Eroare conexiune: ${error.message}`;
    }
}