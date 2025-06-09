// Plik: js/app.js - WERSJA FINALNA, KOMPLETNA, Z PROXY NETLIFY

document.addEventListener('DOMContentLoaded', () => {
    // === KONFIGURACJA ===
    const BIN_ID = '6843587d8561e97a5020715c';
    const ACCESS_KEY = '$2a$10$6aDFSJOem/LcY2cUAP5Qsu7JFiGg1LFQwIP6m4JQP8zruf1BoDnNi';
    const MAX_MATCH_FETCH = 100;
    const API_DELAY = 100;

    // === STAN APLIKACJI ===
    const state = {
        loggedInTeamName: sessionStorage.getItem('loggedInTeamName'),
        teamMembers: [], // { name, faceitId }
        analysisResults: null,
    };

    // === ELEMENTY DOM ===
    const dom = {
        teamNameEl: document.getElementById('analyzed-team-name'),
        analysisTypeRadios: document.querySelectorAll('input[name="analysis-type"]'),
        customNicksDiv: document.getElementById('custom-nicknames-config'),
        customNicksInput: document.getElementById('custom-nicknames-input'),
        dateFrom: document.getElementById('date-from'),
        dateTo: document.getElementById('date-to'),
        mapFilter: document.getElementById('map-filter'),
        fetchButton: document.getElementById('fetch-data-button'),
        loadingIndicator: document.getElementById('loading-indicator'),
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        errorEl: document.getElementById('error-message'),
        resultsContainer: document.getElementById('results-container'),
        summaryOutput: document.getElementById('player-summary-output'),
        mapPerfOutput: document.getElementById('map-performance-output'),
    };
    
    // === MODUŁ API (zintegrowany z proxy Netlify) ===
    const api = {
        delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        callFaceit: async (endpoint, params = {}) => {
            const proxyEndpoint = `/api/faceit-proxy`;
            const queryParams = { endpoint: endpoint, ...params };
            const url = `${proxyEndpoint}?${new URLSearchParams(queryParams)}`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (!response.ok) { throw new Error(data.message || data.error || `Błąd proxy: ${response.statusText}`); }
                return data;
            } catch (error) { throw error; }
        },
        getPlayerId: async (nick) => (await api.callFaceit('/players', { nickname: nick }))?.player_id,
        getHistory: (id, from, to) => api.callFaceit(`/players/${id}/history`, { game: 'cs2', limit: MAX_MATCH_FETCH, from, to }),
        getMatch: async (id) => { try { return (await api.callFaceit(`/matches/${id}/stats`))?.rounds?.[0]; } catch { return null; } },
        fetchTeams: async () => {
             const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Access-Key': ACCESS_KEY } });
             if (r.status === 404) return [];
             if (!r.ok) throw new Error('Nie udało się pobrać danych drużyny z bazy.');
             return (await r.json()).record.teams || [];
        },
    };
    
    // === MODUŁ UI (zintegrowany) ===
    const ui = {
        showLoading: (show) => { dom.loadingIndicator.style.display = show ? 'block' : 'none'; },
        updateProgress: (val, txt) => { if (dom.progressBar) dom.progressBar.value = val; if (dom.progressText) dom.progressText.innerText = txt; },
        showError: (msg) => { if (dom.errorEl) { dom.errorEl.innerText = msg; dom.errorEl.style.display = 'block'; } },
        hideError: () => { if (dom.errorEl) dom.errorEl.style.display = 'none'; },
        format: (v, p = 1) => (v === undefined || v === null || isNaN(v)) ? 'N/A' : v.toFixed(p),
        calculateAverage: (t, c, p = 1) => (c === 0) ? 'N/A' : ui.format(t / c, p),
        renderAll: (results) => {
            ui.renderSummary(results); ui.renderMapPerf(results);
            dom.resultsContainer.style.display = 'block';
        },
        renderSummary: (results) => {
            if (!results || !results.summary) { dom.summaryOutput.innerHTML = '<p>Brak danych podsumowania.</p>'; return; }
            const table = document.createElement('table');
            table.innerHTML = `<thead><tr><th>Gracz</th><th>Mecze</th><th>WR%</th><th>Śr. K/D</th><th>Śr. ADR</th><th>Σ K</th><th>Σ D</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');
            Object.values(results.summary).sort((a,b) => (b.kd || 0) - (a.kd || 0)).forEach(s => {
                tbody.innerHTML += `<tr><td>${s.name}</td><td>${s.played}</td><td>${ui.calculateAverage(s.wins * 100, s.played)}%</td><td class="${s.kd > 1.2 ? 'highlight-better' : ''}">${ui.format(s.kd, 2)}</td><td>${ui.format(s.adr, 1)}</td><td>${s.kills}</td><td>${s.deaths}</td></tr>`;
            });
            dom.summaryOutput.innerHTML = ''; dom.summaryOutput.appendChild(table);
        },
        renderMapPerf: (results) => {
            dom.mapPerfOutput.innerHTML = '';
            if (!results || !results.mapPerformance) { dom.mapPerfOutput.innerHTML = '<p>Brak danych.</p>'; return; }
            for(const nick in results.mapPerformance) {
                const mapStats = results.mapPerformance[nick];
                if(Object.keys(mapStats).length === 0) continue;
                const playerDiv = document.createElement('div');
                playerDiv.innerHTML = `<h4>Statystyki map dla: ${nick}</h4>`;
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>Mapa</th><th>Mecze</th><th>WR%</th><th>Śr. K/D</th><th>Śr. ADR</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                Object.entries(mapStats).sort((a,b)=>b[1].played-a[1].played).forEach(([map, s]) => {
                    tbody.innerHTML += `<tr><td>${map}</td><td>${s.played}</td><td>${ui.calculateAverage(s.wins * 100, s.played)}%</td><td>${ui.format(s.kd,2)}</td><td>${ui.format(s.adr,1)}</td></tr>`;
                });
                playerDiv.appendChild(table);
                dom.mapPerfOutput.appendChild(playerDiv);
            }
        },
    };
    
    // === LOGIKA PRZETWARZANIA DANYCH ===
    function processMatchData(details, playerId) {
        if (!details?.teams) return null;
        const playerTeam = details.teams.find(t => t.players.some(p => p.player_id === playerId));
        const playerDetails = playerTeam?.players.find(p => p.player_id === playerId);
        if (!playerTeam || !playerDetails || !playerDetails.player_stats) return null;
        const pS = playerDetails.player_stats;
        const kills = parseInt(pS.Kills || 0);
        const deaths = parseInt(pS.Deaths || 0);
        return {
            kills, deaths,
            kdRatio: deaths > 0 ? (kills / deaths) : kills,
            adr: parseFloat(pS["Average Damage per Round"] || 0),
            map: details.round_stats.Map, result: pS.Result === "1" ? 1 : 0,
        };
    }
    function initializeSummaryStats() { return { name: '', played: 0, wins: 0, kills: 0, deaths: 0, kd_sum: 0, adr_sum: 0, kd: 0, adr: 0 }; }

    // === GŁÓWNA LOGIKA APLIKACJI ===
    async function initialize() {
        ui.showLoading(dom.loadingIndicator); ui.updateProgress(dom.progressBar, dom.progressText, 0, 'Wczytywanie składu drużyny...');
        try {
            const teams = await api.fetchTeams();
            const team = (teams || []).find(t => t.name === state.loggedInTeamName);
            if (!team || !team.members) throw new Error('Brak danych drużyny w bazie.');
            state.teamMembers = team.members.filter(m => m.faceitId);
            if(state.teamMembers.length === 0) throw new Error('Żaden z członków drużyny nie ma zapisanego ID Faceit. Odśwież ich w panelu zarządzania.');
            dom.teamNameEl.textContent = team.name;
        } catch(e) { ui.showError(dom.errorEl, `Błąd inicjalizacji: ${e.message}`);
        } finally { ui.showLoading(false); }
    }

    async function fetchAndAnalyze() {
        ui.hideError(); ui.showLoading(dom.loadingIndicator, true); dom.fetchButton.disabled = true;
        try {
            const type = document.querySelector('input[name="analysis-type"]:checked').value;
            let playersToAnalyze;
            if (type === 'team') {
                playersToAnalyze = state.teamMembers;
            } else {
                const customNicks = dom.customNicksInput.value.replace(/\n/g, ',').split(',').map(n => n.trim()).filter(Boolean);
                if (customNicks.length === 0) throw new Error('Wpisz nicki do analizy.');
                ui.updateProgress(dom.progressBar, dom.progressText, 10, `Weryfikacja ${customNicks.length} graczy...`);
                playersToAnalyze = (await Promise.all(customNicks.map(async nick => {
                    await api.delay(); const id = await api.getPlayerId(nick);
                    if(!id) console.warn(`Nie znaleziono gracza: ${nick}`);
                    return id ? { name: nick, faceitId: id } : null;
                }))).filter(Boolean);
                if (playersToAnalyze.length === 0) throw new Error('Żaden z podanych graczy nie został znaleziony.');
            }

            const from = dom.dateFrom.value ? Date.parse(dom.dateFrom.value)/1000 : null;
            const to = dom.dateTo.value ? Date.parse(dom.dateTo.value + "T23:59:59Z")/1000 : null;
            
            ui.updateProgress(dom.progressBar, dom.progressText, 20, 'Pobieranie historii meczów...');
            let allMatches = new Map();
            for (const player of playersToAnalyze) {
                const history = await api.getHistory(player.faceitId, from, to);
                history.forEach(match => allMatches.set(match.match_id, match));
                await api.delay();
            }
            if (allMatches.size === 0) throw new Error('Nie znaleziono meczów w podanym zakresie.');
            
            ui.updateProgress(dom.progressBar, dom.progressText, 50, `Pobieranie szczegółów ${allMatches.size} meczów...`);
            const detailsMap = new Map();
            const matchIds = Array.from(allMatches.keys());
            for (let i = 0; i < matchIds.length; i++) {
                if (i > 0 && i % 10 === 0) await api.delay(200);
                const details = await api.getMatch(matchIds[i]);
                if (details) detailsMap.set(matchIds[i], details);
            }

            ui.updateProgress(dom.progressBar, dom.progressText, 80, 'Przetwarzanie danych...');
            const results = { summary: {}, mapPerformance: {} };
            const mapFilter = dom.mapFilter.value;
            playersToAnalyze.forEach(player => {
                const s = initializeSummaryStats(); s.name = player.name;
                results.summary[player.name] = s; results.mapPerformance[player.name] = {};
                
                allMatches.forEach(match => {
                    if (!match.players.some(p => p.player_id === player.faceitId)) return;
                    const details = detailsMap.get(match.match_id);
                    if (!details || (mapFilter && details.round_stats?.Map !== mapFilter)) return;
                    const pData = processMatchData(details, player.faceitId);
                    if (!pData) return;

                    s.played++; s.wins += pData.result; s.kills += pData.kills; s.deaths += pData.deaths;
                    s.kd_sum += pData.kdRatio; s.adr_sum += pData.adr;
                    
                    const map = pData.map;
                    if(!results.mapPerformance[player.name][map]) results.mapPerformance[player.name][map] = initializeSummaryStats();
                    const mapS = results.mapPerformance[player.name][map];
                    mapS.played++; mapS.wins += pData.result; mapS.kd_sum += pData.kdRatio; mapS.adr_sum += pData.adr;
                });
                if (s.played > 0) { s.kd = s.kd_sum / s.played; s.adr = s.adr_sum / s.played; }
                for (const map in results.mapPerformance[player.name]) {
                    const mapS = results.mapPerformance[player.name][map];
                    if (mapS.played > 0) { mapS.kd = mapS.kd_sum / mapS.played; mapS.adr = mapS.adr_sum / mapS.played; }
                }
            });
            
            ui.updateProgress(dom.progressBar, dom.progressText, 100, 'Gotowe!');
            state.analysisResults = results;
            ui.renderAll(results);
        } catch (e) { ui.showError(dom.errorEl, `Błąd Analizy: ${e.message}`);
        } finally { ui.showLoading(false); dom.fetchButton.disabled = false; }
    }

    // === INICJALIZACJA ===
    dom.fetchButton.addEventListener('click', fetchAndAnalyze);
    dom.analysisTypeRadios.forEach(r => r.addEventListener('change', e => {
        dom.customNicksDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
    }));
    initialize();
});