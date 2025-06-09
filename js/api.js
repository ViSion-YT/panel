// Plik: js/api.js - Specjalista od Komunikacji

// === KONFIGURACJA ===
const PROXY_URL = 'proxy.php';
const MAX_MATCH_FETCH = 100;
const API_DELAY = 100; // Domyślne opóźnienie między zapytaniami

// === FUNKCJE POMOCNICZE ===
export const delay = (ms = API_DELAY) => new Promise(resolve => setTimeout(resolve, ms));

// === FUNKCJE API ===
async function callProxy(endpoint, queryParams = {}) {
    queryParams.endpoint = endpoint;
    const url = `${PROXY_URL}?${new URLSearchParams(queryParams)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            const message = errorData.errors?.[0]?.message || response.statusText;
            throw new Error(`Błąd API (${response.status}): ${message}`);
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

export const getPlayerId = async (nickname) => {
    try {
        const data = await callProxy(`/players`, { nickname });
        return data?.player_id || null;
    } catch (error) {
        console.warn(`Nie udało się pobrać ID dla gracza: ${nickname}`, error.message);
        return null;
    }
};

export const getPlayerMatchHistory = async (playerId, from, to) => {
    const params = { game: 'cs2', limit: MAX_MATCH_FETCH, from, to };
    const data = await callProxy(`/players/${playerId}/history`, params);
    return data.items || [];
};

export const getMatchDetails = async (matchId) => {
    try {
        const data = await callProxy(`/matches/${matchId}/stats`);
        return data?.rounds?.[0] || null;
    } catch (error) {
        if (!error.message.includes('404')) console.error(`Błąd pobierania szczegółów meczu ${matchId}:`, error);
        return null;
    }
};

export const fetchTeamsData = async (binId, accessKey) => {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: { 'X-Access-Key': accessKey } });
        if (response.status === 404) return [];
        if (!response.ok) throw new Error('Nie udało się pobrać danych drużyny z bazy.');
        const data = await response.json();
        return data.record.teams || [];
    } catch (error) { throw error; }
};