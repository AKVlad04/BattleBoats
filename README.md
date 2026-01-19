# \# Battle Boats Project

# 

# \## Cum să pornești proiectul

# 

# \### 1. Baza de Date

# Foloseste comanda docker compose --build -d in terminal 

# Apoi conectează-te cu DataGrip și creează baza de date:

# `CREATE DATABASE battleboats;`

# (Nu trebuie creat tabelul, Java îl face automat).

# \### 3. Frontend

# Deschide fișierul `frontend/index.html` în browser.

## GitHub Pages (frontend)

Repo-ul are frontend-ul static in folderul `frontend/`, iar GitHub Pages (implicit) cauta `index.html` in root, de aceea iti arata `README` in loc de joc.

Am adaugat workflow-ul `/.github/workflows/pages.yml` care publica automat folderul `frontend/` pe GitHub Pages.

### Ce mai trebuie sa faci in GitHub

1. In repo: **Settings → Pages**
2. La **Build and deployment**, selecteaza **Source: GitHub Actions**
3. Da push pe `main` (sau ruleaza manual workflow-ul din tab-ul **Actions**)

Dupa deploy, pagina ar trebui sa fie:
- `https://<user>.github.io/battj/`

> Nota: GitHub Pages serveste doar fisiere statice. Daca jocul face request-uri catre backend-ul Spring, backend-ul trebuie hostat separat, iar in `frontend/config.js` (sau fisierul de config) trebuie setat URL-ul API-ului.
