// Plik: js/ui.js - Projektant Interfejsu dla Panelu Analizy
export const formatValue = (v, p = 1) => (v === undefined || v === null || isNaN(v)) ? 'N/A' : v.toFixed(p);
export const calculateAverage = (t, c, p = 1) => (c === 0) ? 'N/A' : formatValue(t / c, p);

export function updateProgress(bar, textEl, value, text) {
    if (bar) bar.value = value;
    if (textEl) textEl.innerText = text;
}
export function showLoading(indicatorEl, show = true) {
    if (indicatorEl) indicatorEl.style.display = show ? 'block' : 'none';
}
export function showError(errorEl, message) {
    if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
}
export function hideError(errorEl) {
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
}

export function renderSummaryTable(containerEl, summaryData) {
    if (!containerEl || !summaryData) return;
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Gracz</th><th>Mecze</th><th>WR%</th><th>Śr. K/D</th><th>Śr. ADR</th><th>Σ K</th><th>Σ D</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    const sortedPlayers = Object.values(summaryData).sort((a, b) => (b.kd || 0) - (a.kd || 0));
    
    sortedPlayers.forEach(stats => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stats.name}</td><td>${stats.played}</td>
            <td>${calculateAverage(stats.wins * 100, stats.played)}%</td>
            <td class="${stats.kd > 1.2 ? 'highlight-better' : ''}">${formatValue(stats.kd, 2)}</td>
            <td>${formatValue(stats.adr, 1)}</td>
            <td>${stats.kills}</td><td>${stats.deaths}</td>`;
        tbody.appendChild(tr);
    });
    containerEl.innerHTML = ''; containerEl.appendChild(table);
}

export function renderMapPerformance(containerEl, mapPerformanceData) {
    if (!containerEl || !mapPerformanceData) return;
    containerEl.innerHTML = '';
    
    for (const nick in mapPerformanceData) {
        const playerMapStats = mapPerformanceData[nick];
        if (Object.keys(playerMapStats).length === 0) continue;
        const playerDiv = document.createElement('div');
        playerDiv.innerHTML = `<h4>Statystyki map dla: ${nick}</h4>`;
        const table = document.createElement('table');
        table.innerHTML = `<thead><tr><th>Mapa</th><th>Mecze</th><th>WR%</th><th>Śr. K/D</th><th>Śr. ADR</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        Object.entries(playerMapStats).sort((a, b) => b[1].played - a[1].played).forEach(([mapName, stats]) => {
            tbody.innerHTML += `<tr><td>${mapName}</td><td>${stats.played}</td><td>${calculateAverage(stats.wins * 100, stats.played)}%</td><td>${formatValue(stats.kd, 2)}</td><td>${formatValue(stats.adr, 1)}</td></tr>`;
        });
        playerDiv.appendChild(table); containerEl.appendChild(playerDiv);
    }
}