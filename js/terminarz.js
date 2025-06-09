// Plik: js/terminarz.js - WERSJA POPRAWIONA I KOMPLETNA

document.addEventListener('DOMContentLoaded', () => {
    // === KONFIGURACJA API JSONBin.io ===
    const BIN_ID = '6843587d8561e97a5020715c';
    const MASTER_KEY = '$2a$10$ZhjsH8A4JGnTSbTLKAM1C.dU2AVJRGJScCw1K3JztaUtEi5Xw6sb6';
    const ACCESS_KEY = '$2a$10$6aDFSJOem/LcY2cUAP5Qsu7JFiGg1LFQwIP6m4JQP8zruf1BoDnNi';

    // === Stan aplikacji ===
    const state = {
        loggedInTeamName: sessionStorage.getItem('loggedInTeamName'),
        allTeams: [],
        isSaving: false,
    };

    // === Elementy DOM ===
    const dom = {
        addEventButton: document.getElementById('add-event-button'),
        eventsListEl: document.getElementById('events-list'),
        loadingOverlay: document.getElementById('loading-overlay'),
        titleInput: document.getElementById('event-title'),
        dateInput: document.getElementById('event-date'),
        timeInput: document.getElementById('event-time'),
        descriptionInput: document.getElementById('event-description'),
    };

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
            if (response.status === 404) { state.allTeams = []; return; }
            if (!response.ok) throw new Error('Błąd pobierania danych');
            const data = await response.json();
            state.allTeams = data.record.teams || [];
        } catch (error) {
            console.error(error);
            alert('Nie udało się wczytać danych terminarza.');
        } finally {
            showLoading(false);
            renderEvents();
        }
    }

    async function saveData() {
        if (state.isSaving) return;
        state.isSaving = true;
        showLoading(true, 'Zapisywanie...');
        try {
            await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
                body: JSON.stringify({ teams: state.allTeams })
            });
        } catch (error) {
            console.error(error);
            alert('Nie udało się zapisać danych.');
        } finally {
            state.isSaving = false;
            showLoading(false);
        }
    }

    // === LOGIKA APLIKACJI ===
    function getTeamData() {
        const team = state.allTeams.find(t => t.name === state.loggedInTeamName);
        if (team) {
            if (!team.data) team.data = { notes: [], events: [] };
            if (!team.data.events) team.data.events = [];
            return team;
        }
        return null;
    }

    function getEventsForCurrentTeam() {
        const team = getTeamData();
        return team ? team.data.events : [];
    }

    function updateEventsForCurrentTeam(newEvents) {
        const teamIndex = state.allTeams.findIndex(t => t.name === state.loggedInTeamName);
        if (teamIndex !== -1) {
            if (!state.allTeams[teamIndex].data) state.allTeams[teamIndex].data = { notes: [], events: [] };
            state.allTeams[teamIndex].data.events = newEvents;
        }
    }

    async function addEvent() {
        if (!dom.titleInput.value || !dom.dateInput.value) {
            alert('Tytuł i data wydarzenia są wymagane.');
            return;
        }

        const newEvent = {
            id: Date.now(),
            title: dom.titleInput.value.trim(),
            date: dom.dateInput.value,
            time: dom.timeInput.value || '',
            description: dom.descriptionInput.value.trim()
        };

        const currentEvents = getEventsForCurrentTeam();
        currentEvents.push(newEvent);
        updateEventsForCurrentTeam(currentEvents);
        await saveData();
        renderEvents();

        // Wyczyść pola formularza
        dom.titleInput.value = '';
        dom.dateInput.value = '';
        dom.timeInput.value = '';
        dom.descriptionInput.value = '';
    }

    async function deleteEvent(id) {
        if (confirm('Czy na pewno chcesz usunąć to wydarzenie?')) {
            let currentEvents = getEventsForCurrentTeam();
            const updatedEvents = currentEvents.filter(event => event.id !== id);
            updateEventsForCurrentTeam(updatedEvents);
            await saveData();
            renderEvents();
        }
    }

    function renderEvents() {
        const currentEvents = getEventsForCurrentTeam();
        dom.eventsListEl.innerHTML = '';
        if (currentEvents.length === 0) {
            dom.eventsListEl.innerHTML = '<p style="text-align: center; color: #aaa;">Brak zaplanowanych wydarzeń.</p>';
            return;
        }

        currentEvents.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
            const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
            return dateA - dateB;
        });

        const now = new Date();
        currentEvents.forEach(event => {
            const eventDate = new Date(`${event.date}T${event.time || '23:59:59'}`);
            const isPast = eventDate < now;
            const card = document.createElement('div');
            card.className = 'event-item';
            if (isPast) card.classList.add('past-event');
            const dateFormatted = new Date(event.date).toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            card.innerHTML = `
                <button class="delete-event-btn" data-id="${event.id}">×</button>
                <h3>${event.title}</h3>
                <div class="event-date">${dateFormatted}${event.time ? ` o godz. ${event.time}` : ''}</div>
                ${event.description ? `<p>${event.description}</p>` : ''}
            `;
            card.querySelector('.delete-event-btn').addEventListener('click', (e) => deleteEvent(Number(e.target.dataset.id)));
            dom.eventsListEl.appendChild(card);
        });
    }

    // === INICJALIZACJA ===
    dom.addEventButton.addEventListener('click', addEvent);
    fetchData();
});