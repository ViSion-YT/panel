// Plik: js/team-manager.js - WERSJA FINALNA Z POPRAWIONYM ZAPISEM

document.addEventListener('DOMContentLoaded', () => {
    // === KONFIGURACJA API ===
    const BIN_ID = '6843587d8561e97a5020715c';
    const MASTER_KEY = '$2a$10$ZhjsH8A4JGnTSbTLKAM1C.dU2AVJRGJScCw1K3JztaUtEi5Xw6sb6';
    const ACCESS_KEY = '$2a$10$6aDFSJOem/LcY2cUAP5Qsu7JFiGg1LFQwIP6m4JQP8zruf1BoDnNi';
    const FACEIT_API_KEY = '531c6bf2-b10d-4aed-9081-d5736b27dc39';

    // === Stan aplikacji ===
    const state = {
        loggedInTeamName: sessionStorage.getItem('loggedInTeamName'),
        allTeams: [],
        isSaving: false,
    };

    // === Elementy DOM ===
    const dom = {
        teamNameInput: document.getElementById('team-name'),
        teamPasswordInput: document.getElementById('team-password'),
        playerListBody: document.getElementById('player-list-body'),
        addPlayerButton: document.getElementById('add-player-button'),
        newPlayerNickInput: document.getElementById('new-player-faceit-nick'),
        saveAllButton: document.getElementById('save-all-button'),
        loadingOverlay: document.getElementById('loading-overlay')
    };

    // === FUNKCJE API i POMOCNICZE ===
    const showLoading = (show, msg = 'Ładowanie...') => { if(dom.loadingOverlay) { dom.loadingOverlay.innerText = msg; dom.loadingOverlay.style.display = show ? 'flex' : 'none'; }};
    
// Plik: js/team-manager.js

// Plik: js/team-manager.js

// NOWA, POPRAWIONA WERSJA FUNKCJI getFaceitData Z UŻYCIEM PROXY
const getFaceitData = async (nick) => {
    // Adres publicznego proxy
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    
    // Docelowy adres API Faceit
    const apiUrl = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nick)}`;

    try {
        // Wysyłamy zapytanie przez proxy, przekazując klucz API w nagłówku
        const r = await fetch(proxyUrl + apiUrl, { 
            headers: { 
                'Authorization': `Bearer ${FACEIT_API_KEY}`,
                'X-Requested-With': 'XMLHttpRequest' // Ważny nagłówek dla niektórych proxy
            }
        });

        if (!r.ok) {
            console.error(`Błąd API Faceit dla nicku "${nick}": Status ${r.status}`);
            return null;
        }
        return await r.json();
    } catch (error) {
        console.error("Błąd sieciowy podczas weryfikacji gracza:", error);
        return null;
    }
};
    
    async function fetchBinData() {
        showLoading(true);
        try {
            const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Access-Key': ACCESS_KEY } });
            if (r.status === 404) return [];
            const d = await r.json();
            return d.record.teams || [];
        } finally { showLoading(false); }
    }

    async function saveBinData() {
        if (state.isSaving) return;
        state.isSaving = true;
        showLoading(true, 'Zapisywanie zmian...');
        try {
            // ZBIERZ WSZYSTKIE DANE Z INTERFEJSU PRZED ZAPISEM
            collectDataFromUI();

            await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
                body: JSON.stringify({ teams: state.allTeams })
            });
            alert('Zmiany zapisane pomyślnie!');
        } catch (e) { console.error(e); alert('Błąd zapisu!');
        } finally { state.isSaving = false; showLoading(false); }
    }

    // === LOGIKA RENDEROWANIA UI ===
    function renderTeam() {
        const team = state.allTeams.find(t => t.name === state.loggedInTeamName);
        if (!team) return;
        dom.teamNameInput.value = team.name;
        dom.teamPasswordInput.value = team.password;
        dom.playerListBody.innerHTML = '';
        (team.members || []).forEach((member, index) => {
            const tr = dom.playerListBody.insertRow();
            tr.dataset.index = index; // Używamy indeksu do identyfikacji
            tr.innerHTML = `
                <td>
                    <img src="${member.avatar || 'vistats.png'}" alt="avatar" class="player-avatar">
                    <a href="${member.faceitUrl || '#'}" target="_blank">${member.name}</a>
                </td>
                <td><select class="player-role-select">${['Rifler','IGL','Snajper','Support','Lurker','Entry'].map(r => `<option value="${r}" ${member.mainRole === r ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
                <td><select class="player-permissions-select">${['Kapitan','Zawodnik'].map(p => `<option value="${p}" ${member.permissions === p ? 'selected' : ''}>${p}</option>`).join('')}</select></td>
                <td><select class="player-status-select">${['Aktywny','Rezerwowy','Zawieszony'].map(s => `<option value="${s}" ${member.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
                <td><button class="delete-btn delete-player-btn" title="Usuń gracza">🗑️</button></td>
            `;
        });
    }

    // === HANDLERY ZDARZEŃ ===
    
    // Ta funkcja jest teraz wywoływana TYLKO przez przycisk ZAPISZ
    function collectDataFromUI() {
        const teamIndex = state.allTeams.findIndex(t => t.name === state.loggedInTeamName);
        if (teamIndex === -1) {
            console.error("Nie można znaleźć drużyny do zapisu!");
            return;
        }
        
        const newTeamName = dom.teamNameInput.value.trim();
        const oldTeamName = state.loggedInTeamName;
        const team = state.allTeams[teamIndex];

        team.name = newTeamName;
        team.password = dom.teamPasswordInput.value.trim();
        
        // Odczytaj wartości z każdego wiersza tabeli i zaktualizuj członków
        const newMembers = [];
        dom.playerListBody.querySelectorAll('tr').forEach(row => {
            const index = parseInt(row.dataset.index, 10);
            const oldMemberData = team.members[index];
            if (oldMemberData) {
                newMembers.push({
                    ...oldMemberData, // Zachowaj ID, awatar, URL
                    mainRole: row.querySelector('.player-role-select').value,
                    permissions: row.querySelector('.player-permissions-select').value,
                    status: row.querySelector('.player-status-select').value,
                });
            }
        });
        team.members = newMembers;
        
        // Jeśli nazwa drużyny została zmieniona, zaktualizuj sessionStorage
        if (newTeamName !== oldTeamName) {
            sessionStorage.setItem('loggedInTeamName', newTeamName);
            state.loggedInTeamName = newTeamName;
        }
    }

    async function handleAddPlayer() {
        const nick = dom.newPlayerNickInput.value.trim();
        if (!nick) return;
        const team = state.allTeams.find(t => t.name === state.loggedInTeamName);
        if (team.members.some(m => m.name.toLowerCase() === nick.toLowerCase())) {
            alert('Gracz jest już w drużynie.'); return;
        }
        
        showLoading(true, `Weryfikacja ${nick}...`);
        const faceitData = await getFaceitData(nick);
        showLoading(false);

        if (!faceitData || !faceitData.player_id) {
            alert(`Nie znaleziono gracza o nicku "${nick}" na Faceit lub wystąpił błąd API.`);
            return;
        }
        
        const newMember = {
            name: faceitData.nickname,
            faceitId: faceitData.player_id,
            faceitUrl: faceitData.faceit_url.replace('{lang}', 'pl'),
            avatar: faceitData.avatar || '',
            mainRole: 'Rifler',
            permissions: 'Zawodnik',
            status: 'Aktywny'
        };

        if (!team.members) team.members = [];
        team.members.push(newMember);
        renderTeam(); // Tylko odśwież widok, nie zapisuj jeszcze
        dom.newPlayerNickInput.value = '';
    }
    
    // === INICJALIZACJA ===
    dom.playerListBody.addEventListener('click', e => {
        if (e.target.classList.contains('delete-player-btn')) {
            const team = state.allTeams.find(t => t.name === state.loggedInTeamName);
            const index = e.target.closest('tr').dataset.index;
            if (confirm(`Usunąć gracza ${team.members[index].name}?`)) {
                team.members.splice(index, 1);
                renderTeam(); // Tylko odśwież widok, nie zapisuj jeszcze
            }
        }
    });
    
    dom.addPlayerButton.addEventListener('click', handleAddPlayer);
    
    // Przycisk "ZAPISZ WSZYSTKIE ZMIANY" teraz wywołuje funkcję saveData
    dom.saveAllButton.addEventListener('click', saveBinData);

    (async function init() {
        state.allTeams = await fetchBinData();
        renderTeam();
    })();
});