// Plik: js/taktyki.js - WERSJA POPRAWIONA I KOMPLETNA

document.addEventListener('DOMContentLoaded', () => {
    // === KONFIGURACJA API JSONBin.io ===
    const BIN_ID = '6843587d8561e97a5020715c';
    const ACCESS_KEY = '$2a$10$6aDFSJOem/LcY2cUAP5Qsu7JFiGg1LFQwIP6m4JQP8zruf1BoDnNi';

    // === Stan aplikacji ===
    const state = {
        loggedInTeamName: sessionStorage.getItem('loggedInTeamName'),
        allNotes: [], // Tutaj przechowamy notatki tylko naszej drużyny
    };

    // === Elementy DOM ===
    const dom = {
        tacticsListEl: document.getElementById('tactics-list'),
        mapFilter: document.getElementById('map-filter'),
        categoryFilter: document.getElementById('category-filter'),
        loadingOverlay: document.getElementById('loading-overlay')
    };
    // Ukryty div do renderowania treści z Quill
    const quillRenderer = document.createElement('div');
    new Quill(quillRenderer);

    // === FUNKCJE API i POMOCNICZE ===
    function showLoading(show, message = 'Ładowanie...') {
        if (dom.loadingOverlay) {
            dom.loadingOverlay.innerText = message;
            dom.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    async function fetchData() {
        showLoading(true);
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Access-Key': ACCESS_KEY } });
            if (response.status === 404) { state.allNotes = []; return; }
            if (!response.ok) throw new Error('Błąd pobierania danych');
            const data = await response.json();
            const teams = data.record.teams || [];
            const currentTeam = teams.find(t => t.name === state.loggedInTeamName);
            // Pobieramy notatki tylko dla naszej drużyny, upewniając się, że struktura istnieje
            state.allNotes = currentTeam && currentTeam.data ? currentTeam.data.notes || [] : [];
        } catch (error) {
            console.error(error);
            alert('Nie udało się wczytać bazy wiedzy.');
        } finally {
            showLoading(false);
            filterAndRender(); // Renderuj po pobraniu danych
        }
    }

    // === LOGIKA APLIKACJI ===
    function filterAndRender() {
        const selectedMap = dom.mapFilter.value;
        const selectedCategory = dom.categoryFilter.value;

        const filteredNotes = state.allNotes.filter(note => {
            const mapMatch = (selectedMap === 'Wszystkie') || (note.map === selectedMap);
            const categoryMatch = (selectedCategory === 'Wszystkie') || (note.category === selectedCategory);
            return mapMatch && categoryMatch;
        });

        renderTactics(filteredNotes);
    }

    function renderTactics(notesToRender) {
        dom.tacticsListEl.innerHTML = '';
        if (notesToRender.length === 0) {
            dom.tacticsListEl.innerHTML = '<p style="text-align: center; color: #aaa;">Brak notatek spełniających kryteria. <a href="notatnik.html">Stwórz nową!</a></p>';
            return;
        }

        notesToRender.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        notesToRender.forEach(note => {
            const card = document.createElement('div');
            card.className = 'tactic-card';
            
            // Konwertuj format Quill na HTML
            quillRenderer.querySelector('.ql-editor').innerHTML = '';
            if (note.content) {
                try {
                    quillRenderer.firstChild.__quill.setContents(note.content);
                } catch (e) { console.warn("Nie udało się sparsować treści notatki:", e); }
            }
            const contentHtml = quillRenderer.querySelector('.ql-editor').innerHTML;
            
            const mapOption = dom.mapFilter.querySelector(`option[value="${note.map}"]`);
            const mapText = mapOption ? mapOption.text : note.map;

            card.innerHTML = `
                <button class="edit-button" onclick="window.location.href='notatnik.html'">Przejdź do Edytora</button>
                <h3>${note.title}</h3>
                <div class="note-meta">
                    ${note.map && note.map !== 'Brak' ? `<span class="map-tag">${mapText}</span>` : ''}
                    <span class="category-tag">${note.category}</span>
                </div>
                <div class="tactic-content ql-snow"><div class="ql-editor">${contentHtml}</div></div>
            `;

            card.querySelector('h3').addEventListener('click', (e) => {
                // Upewnij się, że kliknięcie nie pochodzi z przycisku
                if (e.target.tagName.toLowerCase() !== 'button') {
                    const content = card.querySelector('.tactic-content');
                    content.style.display = content.style.display === 'none' ? 'block' : 'none';
                }
            });

            dom.tacticsListEl.appendChild(card);
        });
    }

    // === INICJALIZACJA ===
    dom.mapFilter.addEventListener('change', filterAndRender);
    dom.categoryFilter.addEventListener('change', filterAndRender);
    fetchData();
});