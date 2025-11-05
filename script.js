document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Selettori DOM ---
    const calendarBar = document.getElementById('calendar-bar');
    const medList = document.getElementById('medication-list');
    const emptyState = document.getElementById('empty-state');
    const fab = document.getElementById('add-med-fab');
    const modal = document.getElementById('add-med-modal');
    const cancelBtn = document.getElementById('cancel-med-button');
    const saveBtn = document.getElementById('save-med-button');
    const nameInput = document.getElementById('med-name-input');
    const timeInput = document.getElementById('med-time-input');

    // --- 2. Stato dell'Applicazione ---
    let medications = []; 
    let takenRecords = {}; 
    let selectedDate = new Date(); // Inizia con la data di oggi

    // --- 3. Funzioni Helper ---
    const formatDateKey = (date) => {
        return date.toISOString().split('T')[0];
    };

    const saveData = () => {
        localStorage.setItem('medications', JSON.stringify(medications));
        localStorage.setItem('takenRecords', JSON.stringify(takenRecords));
    };

    const loadData = () => {
        medications = JSON.parse(localStorage.getItem('medications')) || [];
        takenRecords = JSON.parse(localStorage.getItem('takenRecords')) || {};
    };

    // --- 4. Funzioni di Rendering (Disegno UI) ---
    const renderCalendar = (scrollBehavior = 'auto') => {
        calendarBar.innerHTML = ''; 
        const todayKey = formatDateKey(new Date());
        const selectedKey = formatDateKey(selectedDate);
        let selectedDayElement = null; 

        for (let i = -60; i <= 30; i++) {
            const date = new Date(); 
            date.setDate(date.getDate() + i); 
            
            const dateKey = formatDateKey(date);
            const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
            const dayNumber = date.getDate();

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.innerHTML = `
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNumber}</span>
            `;

            if (dateKey === todayKey) {
                dayEl.classList.add('today');
            }
            
            if (dateKey === selectedKey) {
                dayEl.classList.add('selected');
                selectedDayElement = dayEl; 
            }

            dayEl.addEventListener('click', () => {
                selectDate(date);
            });

            calendarBar.appendChild(dayEl);
        }
        
        if (selectedDayElement) {
            selectedDayElement.scrollIntoView({
                behavior: scrollBehavior, 
                block: 'nearest',
                inline: 'center'
            });
        }
    };

    const renderMedications = () => {
        medList.innerHTML = '';
        
        if (medications.length === 0) {
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        const dateKey = formatDateKey(selectedDate);
        const takenMedsForDay = takenRecords[dateKey] || [];
        const sortedMeds = [...medications].sort((a, b) => a.time.localeCompare(b.time));
        
        // MODIFICATO: Clona e azzera l'ora per un confronto corretto
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const selectedDay = new Date(selectedDate);
        selectedDay.setHours(0, 0, 0, 0);

        for (const med of sortedMeds) {
            const takenEntry = takenMedsForDay.find(t => t.id === med.id);
            const isTaken = !!takenEntry;

            const cardEl = document.createElement('div');
            cardEl.className = 'med-card';
            if (isTaken) {
                cardEl.classList.add('taken');
            }
            
            let takeActionContent = '';
            if (isTaken) {
                takeActionContent = `<span class="take-action">Presa alle ${takenEntry.takenAt}</span>`;
            } else {
                // MODIFICATO: Confronta usando selectedDay (senza ora)
                if (selectedDay < today) { 
                    // È un giorno passato e non è stata presa
                    takeActionContent = `<span class="take-action"><i>Non presa</i></span>`;
                } else { 
                    // È oggi o nel futuro (takeMedication bloccherà il futuro)
                     takeActionContent = `<button class="take-button" data-id="${med.id}">Prendi</button>`;
                }
            }

            cardEl.innerHTML = `
                <div class="med-info">
                    <span class="med-name">${med.name}</span>
                    <span class="med-time">${med.time}</span>
                </div>
                <div class="card-actions">
                    ${takeActionContent}
                    <button class="delete-button" data-id="${med.id}" aria-label="Elimina medicina">
                        <span class="material-icons-outlined">delete</span>
                    </button>
                </div>
            `;
            medList.appendChild(cardEl);
        }
    };

    // --- 5. Funzioni di Logica (Azioni Utente) ---
    const selectDate = (newDate) => {
        selectedDate = newDate;
        renderCalendar('smooth'); 
        renderMedications();
    };

    const toggleModal = (show) => {
        if (show) {
            modal.classList.add('visible');
        } else {
            modal.classList.remove('visible');
            nameInput.value = '';
            timeInput.value = '';
        }
    };

    const saveMedication = () => {
        const name = nameInput.value.trim();
        const time = timeInput.value;

        if (!name || !time) {
            alert('Per favore, compila sia il nome che l\'orario.');
            return;
        }

        const newMed = {
            id: Date.now(),
            name: name,
            time: time
        };

        medications.push(newMed);
        saveData();
        renderMedications();
        toggleModal(false);
    };

    const takeMedication = (medId) => {
        const dateKey = formatDateKey(selectedDate);
        
        // MODIFICATO: Logica di confronto corretta
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDay = new Date(selectedDate);
        selectedDay.setHours(0, 0, 0, 0);

        // Confronta solo i giorni (selectedDay) con oggi (today)
        if (selectedDay > today) {
            alert("Non puoi segnare come presa una medicina in una data futura.");
            return;
        }

        if (!takenRecords[dateKey]) {
            takenRecords[dateKey] = [];
        }

        if (takenRecords[dateKey].some(t => t.id === medId)) {
            return;
        }

        const takenAtTime = new Date().toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });

        takenRecords[dateKey].push({
            id: medId,
            takenAt: takenAtTime
        });

        saveData();
        renderMedications();
    };

    const deleteMedication = (medId) => {
        if (!confirm('Sei sicuro di voler eliminare questa medicina? Verrà rimossa anche da tutta la cronologia.')) {
            return;
        }

        medications = medications.filter(med => med.id !== medId);
        for (const dateKey in takenRecords) {
            takenRecords[dateKey] = takenRecords[dateKey].filter(t => t.id !== medId);
            if (takenRecords[dateKey].length === 0) {
                delete takenRecords[dateKey];
            }
        }
        saveData();
        renderMedications();
    };

    // --- 6. Event Listeners ---
    fab.addEventListener('click', () => toggleModal(true));
    cancelBtn.addEventListener('click', () => toggleModal(false));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            toggleModal(false);
        }
    });
    saveBtn.addEventListener('click', saveMedication);

    medList.addEventListener('click', (e) => {
        const takeButton = e.target.closest('.take-button');
        if (takeButton) {
            const id = Number(takeButton.dataset.id);
            takeMedication(id);
            return;
        }
        const deleteButton = e.target.closest('.delete-button');
        if (deleteButton) {
            const id = Number(deleteButton.dataset.id);
            deleteMedication(id);
            return;
        }
    });

    // --- 7. Inizializzazione ---
    loadData(); 
    renderCalendar('auto'); 
    renderMedications(); 
});