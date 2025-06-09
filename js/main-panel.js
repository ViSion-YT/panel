// Plik: js/main-panel.js - WERSJA FINALNA
document.addEventListener('DOMContentLoaded', () => {
    const BIN_ID = '6843587d8561e97a5020715c';
    const MASTER_KEY = '$2a$10$ZhjsH8A4JGnTSbTLKAM1C.dU2AVJRGJScCw1K3JztaUtEi5Xw6sb6';
    const ACCESS_KEY = '$2a$10$6aDFSJOem/LcY2cUAP5Qsu7JFiGg1LFQwIP6m4JQP8zruf1BoDnNi';

    const state = { userRole: sessionStorage.getItem('userRole'), loggedInTeamName: sessionStorage.getItem('loggedInTeamName') };
    const dom = {
        headerInfo: document.getElementById('headerInfo'), logoutButton: document.getElementById('logoutButton'),
        adminPanel: document.getElementById('adminPanel'), playerLoginPanel: document.getElementById('playerLoginPanel'),
        createTeamButton: document.getElementById('createTeamButton'), loginTeamButton: document.getElementById('loginTeamButton'),
        allBoxes: [document.getElementById('analysisBox'), document.getElementById('trainingBox'), document.getElementById('teamBox')],
        adminDashboardBox: document.getElementById('adminDashboardBox')
    };

    const showLoading = (show, msg = 'Ładowanie...') => { if(dom.loadingOverlay) { dom.loadingOverlay.innerText = msg; dom.loadingOverlay.style.display = show ? 'flex' : 'none'; }};
    const fetchData = async () => {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Access-Key': ACCESS_KEY } });
            if (response.status === 404) return [];
            if (!response.ok) throw new Error(`Błąd pobierania danych: ${response.statusText}`);
            const data = await response.json();
            return data.record.teams || [];
        } catch (error) {
            console.error(error); alert('Nie udało się połączyć z bazą drużyn.'); return [];
        }
    };

    const saveData = async (teamsData) => {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
                body: JSON.stringify({ teams: teamsData })
            });
            if (!response.ok) throw new Error(`Błąd zapisu danych: ${response.statusText}`);
            return true;
        } catch (error) {
            console.error(error); alert('Nie udało się zapisać zmian.'); return false;
        }
    };

    async function createTeam() {
        const nameInput = document.getElementById('newTeamName'), passInput = document.getElementById('newTeamPassword'), linksInput = document.getElementById('newTeamFaceitLinks'), statusEl = document.getElementById('adminStatus');
        const name = nameInput.value.trim(), password = passInput.value.trim(), linksText = linksInput.value.trim();
        if (!name || !password || !linksText) { statusEl.innerText = 'Wszystkie pola są wymagane.'; return; }
        const faceitLinks = linksText.split('\n').map(link => link.trim()).filter(Boolean);
        if (faceitLinks.length === 0) { statusEl.innerText = 'Podaj przynajmniej jeden link Faceit.'; return; }
        statusEl.innerText = 'Tworzenie drużyny...';
        const teams = await fetchData();
        if (teams.some(team => team.name.toLowerCase() === name.toLowerCase())) { statusEl.innerText = 'Drużyna o tej nazwie już istnieje.'; return; }
        const newTeam = { name, password, members: faceitLinks.map(link => ({ faceitUrl: link, name: link.split('/').pop() })), data: { notes: [], events: [] } };
        teams.push(newTeam);
        if (await saveData(teams)) {
            statusEl.innerText = `Drużyna "${name}" utworzona!`; statusEl.style.color = 'lightgreen';
            nameInput.value = ''; passInput.value = ''; linksInput.value = '';
        } else { statusEl.innerText = 'Błąd podczas tworzenia drużyny.'; }
    }

    async function loginToTeam() {
        const nameInput = document.getElementById('loginTeamName'), passInput = document.getElementById('loginTeamPassword'), statusEl = document.getElementById('playerLoginStatus');
        const name = nameInput.value.trim(), password = passInput.value;
        if (!name || !password) { statusEl.innerText = 'Wpisz nazwę drużyny i hasło.'; return; }
        statusEl.innerText = 'Logowanie...';
        const teams = await fetchData();
        const team = teams.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (team && team.password === password) {
            sessionStorage.setItem('loggedInTeamName', team.name);
            window.location.reload();
        } else { statusEl.innerText = 'Nieprawidłowa nazwa drużyny lub hasło.'; }
    }

    window.logout = function() {
        sessionStorage.removeItem('loggedInTeamName');
        sessionStorage.removeItem('userRole');
        window.location.replace('gate.html');
    }

    function updateUI() {
        const isAdmin = state.userRole === 'admin';
        const isPlayer = state.userRole === 'player';
        const isLoggedInToTeam = !!state.loggedInTeamName;

        dom.adminPanel.style.display = isAdmin ? 'flex' : 'none';
        dom.playerLoginPanel.style.display = !isAdmin && !isLoggedInToTeam ? 'flex' : 'none';
        if (dom.adminDashboardBox) dom.adminDashboardBox.style.display = isAdmin ? 'flex' : 'none';

        dom.allBoxes.forEach(box => {
            box.style.display = 'flex';
            const overlay = box.querySelector('.locked-overlay');
            if (overlay) overlay.style.display = (!isAdmin && !isLoggedInToTeam) ? 'flex' : 'none'; // Blokujemy dla gracza bez drużyny

            const buttons = box.querySelectorAll('button');
             // Aktywujemy przyciski tylko dla zalogowanego gracza (i admina)
             buttons.forEach(btn => btn.disabled = !(isAdmin || isLoggedInToTeam));
             // Przycisk analizy drużyny (pierwszy w panelu Analizy) jest specjalny - blokujemy go jesli nie ma zalogowanej drużyny
             if(box.id === 'analysisBox' && buttons.length > 0) {
                  buttons[0].disabled = !isLoggedInToTeam;
             }
        });

        if (isAdmin) {
            headerInfo.innerText = 'Rola: Administrator';
        } else if (isLoggedInToTeam) {
            headerInfo.innerText = `Zalogowano do drużyny: ${state.loggedInTeamName}`;
        } else {
            headerInfo.innerText = 'Witaj! Zaloguj się do drużyny, aby rozpocząć.';
        }
        dom.logoutButton.style.display = (isAdmin || isLoggedInToTeam) ? 'inline-block' : 'none';
    }

    // Plik: js/main-panel.js (dodaj na końcu, wewnątrz DOMContentLoaded)

    // === INICJALIZACJA LICZNIKA ONLINE ===
    function initializeOnlineCounter() {
        const onlineCountEl = document.getElementById('online-count');
        if (!onlineCountEl) return;

        let currentUsers = Math.floor(Math.random() * 5) + 3; // Startowa liczba: 3-7
        onlineCountEl.textContent = currentUsers;

        setInterval(() => {
            if (Math.random() > 0.5) {
                const change = Math.random() > 0.5 ? 1 : -1;
                let newCount = currentUsers + change;
                if (newCount < 1) newCount = 1;
                if (newCount > 15) newCount = 15;
                currentUsers = newCount;
                onlineCountEl.style.color = '#f0ad4e';
                onlineCountEl.textContent = currentUsers;
                setTimeout(() => { onlineCountEl.style.color = '#fff'; }, 500);
            }
        }, 3000);
    }

    initializeOnlineCounter();

    if (dom.createTeamButton) dom.createTeamButton.addEventListener('click', createTeam);
    if (dom.loginTeamButton) dom.loginTeamButton.addEventListener('click', loginToTeam);
    updateUI();
});