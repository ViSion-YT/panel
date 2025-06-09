// Plik: js/admin-dashboard.js - WERSJA KOMPLETNA I ROZBUDOWANA

document.addEventListener('DOMContentLoaded', () => {
    // === KONFIGURACJA API ===
    const BIN_ID = '6843587d8561e97a5020715c';
    const MASTER_KEY = '$2a$10$ZhjsH8A4JGnTSbTLKAM1C.dU2AVJRGJScCw1K3JztaUtEi5Xw6sb6';
    const ACCESS_KEY = '$2a$10$6aDFSJOem/LcY2cUAP5Qsu7JFiGg1LFQwIP6m4JQP8zruf1BoDnNi';
    const FACEIT_API_KEY = '531c6bf2-b10d-4aed-9081-d5736b27dc39';

    // === Stan aplikacji ===
    let allTeams = [];
    let isSaving = false;

    // === Elementy DOM ===
    const teamsContainer = document.getElementById('teams-container');
    const teamCountEl = document.getElementById('team-count');
    const loadingOverlay = document.getElementById('loading-overlay');

    // === FUNKCJE API i POMOCNICZE ===
    function showLoading(show, message = 'Ładowanie...') {
        if(loadingOverlay) { loadingOverlay.innerText = message; loadingOverlay.style.display = show ? 'flex' : 'none'; }
    }

    async function fetchAllData() {
        showLoading(true, 'Wczytywanie drużyn...');
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Access-Key': ACCESS_KEY } });
            if (response.status === 404) return [];
            if (!response.ok) throw new Error(`Błąd pobierania danych: ${response.statusText}`);
            const data = await response.json();
            return data.record.teams || [];
        } catch (error) {
            console.error(error); alert('Nie udało się wczytać danych.'); return [];
        } finally {
            showLoading(false);
        }
    }

    async function saveData() {
        if (isSaving) return;
        isSaving = true;
        showLoading(true, 'Zapisywanie zmian...');
        try {
            await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
                body: JSON.stringify({ teams: allTeams })
            });
        } catch (error) {
            console.error(error); alert('Nie udało się zapisać danych.');
        } finally {
            isSaving = false;
            showLoading(false);
        }
    }
    
    async function getFaceitData(nick) {
        try {
            const r = await fetch(`https://open.faceit.com/data/v4/players?nickname=${nick}`, { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } });
            if (!r.ok) return null;
            return await r.json();
        } catch { return null; }
    };

    // === LOGIKA RENDEROWANIA UI ===
    function renderDashboard() {
        teamsContainer.innerHTML = '';
        teamCountEl.textContent = allTeams.length;
        if (allTeams.length === 0) {
            teamsContainer.innerHTML = '<p>Brak stworzonych drużyn w systemie.</p>';
            return;
        }

        allTeams.forEach((team, teamIndex) => {
            const card = document.createElement('div');
            card.className = 'team-card';
            card.dataset.teamIndex = teamIndex;

            const membersTableRows = (team.members || [])
                .map((member, memberIndex) => `
                    <tr data-member-index="${memberIndex}">
                        <td><input type="text" class="player-name-input" value="${member.name || ''}" placeholder="Nick Faceit"></td>
                        <td>
                            <select class="player-role-select">
                                <option ${member.mainRole === 'Rifler' ? 'selected' : ''}>Rifler</option>
                                <option ${member.mainRole === 'IGL' ? 'selected' : ''}>IGL</option>
                                <option ${member.mainRole === 'Snajper' ? 'selected' : ''}>Snajper</option>
                                <option ${member.mainRole === 'Support' ? 'selected' : ''}>Support</option>
                                <option ${member.mainRole === 'Lurker' ? 'selected' : ''}>Lurker</option>
                                <option ${member.mainRole === 'Entry' ? 'selected' : ''}>Entry Fragger</option>
                            </select>
                        </td>
                        <td>
                             <select class="player-status-select">
                                <option ${member.status === 'Aktywny' ? 'selected' : ''}>Aktywny</option>
                                <option ${member.status === 'Rezerwowy' ? 'selected' : ''}>Rezerwowy</option>
                                <option ${member.status === 'Zawieszony' ? 'selected' : ''}>Zawieszony</option>
                            </select>
                        </td>
                        <td><button class="delete-btn delete-player-btn" title="Usuń gracza">🗑️</button></td>
                    </tr>
                `).join('');

            card.innerHTML = `
                <div class="team-card-header">
                    <h3>${team.name}</h3>
                    <button class="delete-team-btn" data-team-name="${team.name}">Usuń Całą Drużynę</button>
                </div>
                <div class="team-card-content">
                    <h4>Ustawienia Ogólne</h4>
                    <div class="team-settings-grid">
                        <div>
                            <label>Nazwa drużyny:</label>
                            <input type="text" class="team-name-input" value="${team.name}">
                        </div>
                        <div>
                            <label>Hasło drużyny:</label>
                            <input type="text" class="team-password-input" value="${team.password}">
                        </div>
                    </div>
                    <hr>
                    <h4>Zarządzaj Składem</h4>
                    <table class="player-management-table">
                        <thead><tr><th>Nick Gracza</th><th>Rola w grze</th><th>Status</th><th>Usuń</th></tr></thead>
                        <tbody>${membersTableRows}</tbody>
                    </table>
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <input type="text" class="new-player-input" placeholder="Wpisz nick nowego gracza..." style="flex-grow: 1;">
                        <button class="add-player-btn" style="background-color: #5cb85c;">+ Dodaj</button>
                    </div>
                </div>
            `;
            teamsContainer.appendChild(card);
        });
    }

    // === OBSŁUGA ZDARZEŃ ===
    async function handleDashboardClick(e) {
        const target = e.target;
        const card = target.closest('.team-card');
        if (!card) return;
        const teamIndex = parseInt(card.dataset.teamIndex, 10);
        
        // Rozwijanie/zwijanie akordeonu
        if (target.closest('.team-card-header') && !target.classList.contains('delete-team-btn')) {
            const content = card.querySelector('.team-card-content');
            if(content) content.style.display = content.style.display === 'block' ? 'none' : 'block';
        }

        // Usuwanie całej drużyny
        if (target.classList.contains('delete-team-btn')) {
            e.stopPropagation(); // Zapobiegaj rozwijaniu
            const teamName = target.dataset.teamName;
            if (confirm(`Czy na pewno chcesz TRWALE usunąć drużynę "${teamName}" i wszystkie jej dane?`)) {
                allTeams.splice(teamIndex, 1);
                await saveData();
                renderDashboard();
            }
        }
        
        // Dodawanie gracza
        if (target.classList.contains('add-player-btn')) {
            const nickInput = card.querySelector('.new-player-input');
            const newNick = nickInput.value.trim();
            if (newNick) {
                const team = allTeams[teamIndex];
                if (team.members.some(m => m.name.toLowerCase() === newNick.toLowerCase())) {
                    alert('Ten gracz już jest w drużynie.'); return;
                }
                showLoading(true, `Weryfikacja ${newNick}...`);
                const faceitData = await getFaceitData(newNick);
                showLoading(false);
                if (!faceitData) { alert(`Nie znaleziono gracza '${newNick}' na Faceit.`); return; }

                const newMember = {
                    name: faceitData.nickname, faceitId: faceitData.player_id, faceitUrl: faceitData.faceit_url.replace('{lang}', 'pl'),
                    avatar: faceitData.avatar || '', mainRole: 'Rifler', permissions: 'Zawodnik', status: 'Aktywny'
                };
                if (!team.members) team.members = [];
                team.members.push(newMember);
                await saveData();
                renderDashboard();
            }
        }
        
        // Usuwanie gracza
        if (target.classList.contains('delete-player-btn')) {
            const memberIndex = parseInt(target.closest('tr').dataset.memberIndex, 10);
            const team = allTeams[teamIndex];
            if (confirm(`Usunąć gracza ${team.members[memberIndex].name}?`)) {
                team.members.splice(memberIndex, 1);
                await saveData();
                renderDashboard();
            }
        }
    }

    async function handleDashboardChange(e) {
        const target = e.target;
        const card = target.closest('.team-card');
        if (!card) return;
        const teamIndex = parseInt(card.dataset.teamIndex, 10);
        const team = allTeams[teamIndex];

        // Zmiana nazwy drużyny lub hasła
        if (target.classList.contains('team-name-input')) team.name = target.value;
        if (target.classList.contains('team-password-input')) team.password = target.value;
        
        // Zmiana danych gracza w tabeli
        const memberRow = target.closest('tr');
        if (memberRow) {
            const memberIndex = parseInt(memberRow.dataset.memberIndex, 10);
            const member = team.members[memberIndex];
            if (target.classList.contains('player-name-input')) member.name = target.value;
            if (target.classList.contains('player-role-select')) member.mainRole = target.value;
            if (target.classList.contains('player-status-select')) member.status = target.value;
        }

        await saveData();
    }

    // === INICJALIZACJA ===
    async function init() {
        allTeams = await fetchAllData();
        renderDashboard();
        teamsContainer.addEventListener('click', handleDashboardClick);
        teamsContainer.addEventListener('change', handleDashboardChange);
    }

    init();
});