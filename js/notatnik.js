// Plik: js/notatnik.js - WERSJA POPRAWIONA I KOMPLETNA

document.addEventListener('DOMContentLoaded', () => {
    // === KONFIGURACJA API ===
    const BIN_ID = '6843587d8561e97a5020715c';
    const MASTER_KEY = '$2a$10$ZhjsH8A4JGnTSbTLKAM1C.dU2AVJRGJScCw1K3JztaUtEi5Xw6sb6';
    const ACCESS_KEY = '$2a$10$6aDFSJOem/LcY2cUAP5Qsu7JFiGg1LFQwIP6m4JQP8zruf1BoDnNi';

    // === Stan aplikacji ===
    const state = {
        loggedInTeamName: sessionStorage.getItem('loggedInTeamName'),
        allTeams: [],
        currentNoteId: null,
        isSaving: false,
    };

    // === Elementy DOM ===
    const dom = {
        notesListEl: document.getElementById('notes-list'),
        newNoteButton: document.getElementById('new-note-button'),
        saveNoteButton: document.getElementById('save-note-button'),
        deleteNoteButton: document.getElementById('delete-note-button'),
        editorHeaderEl: document.getElementById('editor-header'),
        editorFieldsEl: document.getElementById('editor-fields'),
        titleInput: document.getElementById('note-title-input'),
        categorySelect: document.getElementById('note-category-select'),
        mapSelect: document.getElementById('note-map-select'),
        loadingOverlay: document.getElementById('loading-overlay')
    };
    let quill;

    // === FUNKCJE API ===
    const showLoading = (show, msg = 'Ładowanie...') => { if(dom.loadingOverlay) { dom.loadingOverlay.innerText = msg; dom.loadingOverlay.style.display = show ? 'flex' : 'none'; }};
    
    async function fetchData() {
        showLoading(true, 'Wczytywanie bazy wiedzy...');
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Access-Key': ACCESS_KEY } });
            if (response.status === 404) { state.allTeams = []; return; }
            if (!response.ok) throw new Error(`Błąd pobierania danych: ${response.statusText}`);
            const data = await response.json();
            state.allTeams = data.record.teams || [];
        } catch (error) {
            console.error(error); alert('Nie udało się wczytać danych.');
        } finally {
            showLoading(false);
            renderNotesList();
        }
    }

    async function saveData() {
        if (state.isSaving) return;
        state.isSaving = true;
        showLoading(true, 'Zapisywanie zmian...');
        try {
            await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
                body: JSON.stringify({ teams: state.allTeams })
            });
        } catch (error) {
            console.error(error); alert('Nie udało się zapisać danych.');
        } finally {
            state.isSaving = false;
            showLoading(false);
        }
    }

    // === LOGIKA APLIKACJI (POPRAWIONA) ===
    function getTeamData() {
        const team = state.allTeams.find(t => t.name === state.loggedInTeamName);
        if (team) {
            // Upewnij się, że struktura danych istnieje
            if (!team.data) team.data = { notes: [], events: [] };
            if (!team.data.notes) team.data.notes = [];
            return team;
        }
        return null;
    }

    function getNotesForCurrentTeam() {
        const team = getTeamData();
        return team ? team.data.notes : [];
    }

    function updateNotesForCurrentTeam(newNotes) {
        const teamIndex = state.allTeams.findIndex(t => t.name === state.loggedInTeamName);
        if (teamIndex !== -1) {
            if (!state.allTeams[teamIndex].data) state.allTeams[teamIndex].data = { notes: [], events: [] };
            state.allTeams[teamIndex].data.notes = newNotes;
        }
    }

    function initializeQuill() {
        quill = new Quill('#editor-container', {
            modules: { toolbar: [[{ 'header': [1, 2, false] }], ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']] },
            placeholder: 'Zacznij pisać taktykę, analizę lub notatkę...',
            theme: 'snow'
        });
    }

    function renderNotesList() {
        const currentNotes = getNotesForCurrentTeam();
        dom.notesListEl.innerHTML = '';
        if (currentNotes.length === 0) {
            dom.notesListEl.innerHTML = '<p style="text-align: center; color: #aaa;">Brak notatek. Stwórz swoją pierwszą!</p>';
            return;
        }

        currentNotes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        currentNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item';
            noteEl.dataset.id = note.id;
            if (note.id === state.currentNoteId) noteEl.classList.add('active');
            const mapOption = dom.mapSelect.querySelector(`option[value="${note.map}"]`);
            const mapText = mapOption ? mapOption.text : note.map;
            noteEl.innerHTML = `
                <div class="note-title">${note.title || 'Nowa Notatka'}</div>
                <div class="note-meta">
                    ${note.map && note.map !== 'Brak' ? `<span class="map-tag">${mapText}</span>` : ''}
                    <span class="category-tag">${note.category}</span>
                </div>`;
            noteEl.addEventListener('click', () => selectNote(note.id));
            dom.notesListEl.appendChild(noteEl);
        });
    }

    function selectNote(id) {
        const currentNotes = getNotesForCurrentTeam();
        state.currentNoteId = id;
        const note = currentNotes.find(n => n.id === id);
        if (note) {
            dom.editorHeaderEl.style.display = 'none';
            dom.editorFieldsEl.style.display = 'block';
            dom.titleInput.value = note.title;
            dom.categorySelect.value = note.category;
            dom.mapSelect.value = note.map;
            quill.setContents(note.content || '');
        }
        renderNotesList();
    }
    
    async function createNewNote() {
        let currentNotes = getNotesForCurrentTeam();
        const newNote = { id: Date.now(), title: 'Nowa Notatka', category: 'Taktyka', map: 'Brak', content: '', updatedAt: Date.now() };
        currentNotes.push(newNote);
        updateNotesForCurrentTeam(currentNotes);
        await saveData();
        selectNote(newNote.id); // Przełącz na nową notatkę po zapisie
    }
    
    async function updateCurrentNote() {
        if (!state.currentNoteId) return;
        let currentNotes = getNotesForCurrentTeam();
        const noteIndex = currentNotes.findIndex(n => n.id === state.currentNoteId);
        if (noteIndex !== -1) {
            currentNotes[noteIndex] = {
                ...currentNotes[noteIndex],
                title: dom.titleInput.value.trim() || 'Notatka bez tytułu',
                category: dom.categorySelect.value,
                map: dom.mapSelect.value,
                content: quill.getContents(),
                updatedAt: Date.now()
            };
            updateNotesForCurrentTeam(currentNotes);
            await saveData();
            renderNotesList();
            alert('Notatka zapisana!');
        }
    }

    async function deleteCurrentNote() {
        if (!state.currentNoteId) return;
        if (confirm('Czy na pewno chcesz usunąć tę notatkę?')) {
            let currentNotes = getNotesForCurrentTeam();
            const updatedNotes = currentNotes.filter(n => n.id !== state.currentNoteId);
            updateNotesForCurrentTeam(updatedNotes);
            await saveData();
            state.currentNoteId = null;
            renderNotesList();
            dom.editorHeaderEl.style.display = 'block';
            dom.editorFieldsEl.style.display = 'none';
        }
    }

    // === INICJALIZACJA ===
    initializeQuill();
    dom.newNoteButton.addEventListener('click', createNewNote);
    dom.saveNoteButton.addEventListener('click', updateCurrentNote);
    dom.deleteNoteButton.addEventListener('click', deleteCurrentNote);
    fetchData(); // Wczytaj dane na samym końcu
});