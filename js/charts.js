// Plik: js/charts.js

function getChartLabel(mode) {
    const labels = { kdRatio: 'K/D Ratio', adr: 'ADR', hsPercent: 'HS %', kills: 'Zabójstwa', krRatio: 'K/R Ratio', winRate: 'Win Rate (%)' };
    return labels[mode] || 'Wartość';
}

function getChartDataPoints(matches, mode) {
    if (!matches?.length) return [];
    if (mode === 'winRate') {
        const winRatePoints = []; let wins = 0; const windowSize = 10;
        const sortedMatches = [...matches].sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < sortedMatches.length; i++) {
            if (sortedMatches[i].result === 1) wins++;
            if (i >= windowSize && sortedMatches[i - windowSize].result === 1) wins--;
            const currentWindowSize = Math.min(i + 1, windowSize);
            const currentWinRate = currentWindowSize > 0 ? (wins / currentWindowSize) * 100 : 0;
            winRatePoints.push({ x: sortedMatches[i].timestamp, y: currentWinRate });
        }
        return winRatePoints;
    } else {
        return matches.map(m => ({ x: m.timestamp, y: m[mode] })).filter(p => typeof p.y === 'number');
    }
}

function createChart(canvas, datasets, mode) {
    const yLabel = getChartLabel(mode);
    return new Chart(canvas, {
        type: 'line',
        data: { datasets },
        options: {
            scales: {
                x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd MMM yyyy' }, ticks: { color: '#ccc' } },
                y: { beginAtZero: mode === 'winRate', max: mode === 'winRate' ? 100 : undefined, title: { display: true, text: yLabel, color: '#ccc' }, ticks: { color: '#ccc' } }
            },
            responsive: true, maintainAspectRatio: false,
            plugins: { tooltip: { mode: 'index', intersect: false }, legend: { position: 'top', labels: { color: '#ccc' } } }
        }
    });
}

export function renderTrendChart(chartInstance, canvas, filteredMatchesData, player, mode) {
    if (chartInstance) chartInstance.destroy();
    if (!filteredMatchesData || !canvas) return null;
    
    const colors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)'];
    let datasets = [];

    if (player) { // Wykres dla jednego gracza
        const matches = filteredMatchesData[player] || [];
        if (matches.length > 0) {
            datasets.push({
                label: `${getChartLabel(mode)} dla ${player}`,
                data: getChartDataPoints(matches, mode),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            });
        }
    } else { // Wykres dla wszystkich
        Object.keys(filteredMatchesData).forEach((nick, index) => {
            const matches = filteredMatchesData[nick] || [];
            if (matches.length > 0) {
                datasets.push({
                    label: nick,
                    data: getChartDataPoints(matches, mode),
                    borderColor: colors[index % colors.length],
                    tension: 0.1
                });
            }
        });
    }

    if (datasets.length > 0) {
        return createChart(canvas, datasets, mode);
    }
    return null;
}