document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Selettori DOM ---
    const calendarBar = document.getElementById('calendar-bar');
    const medList = document.getElementById('medication-list');
    const emptyState = document.getElementById('empty-state');
    
    // FAB e Menu
    const fab = document.getElementById('add-med-fab');
    const fabMenu = document.getElementById('fab-menu');
    const fabOverlay = document.getElementById('fab-menu-overlay');
    const menuBtnMedicina = document.getElementById('menu-btn-medicina');
    const menuBtnEvento = document.getElementById('menu-btn-evento');

    // Modale Medicina
    const medModal = document.getElementById('add-med-modal');
    const medCancelBtn = document.getElementById('cancel-med-button');
    const medSaveBtn = document.getElementById('save-med-button');
    const medNameInput = document.getElementById('med-name-input');
    const medTimeInput = document.getElementById('med-time-input');

    // Modale Evento
    const eventModal = document.getElementById('add-event-modal');
    const eventCancelBtn = document.getElementById('cancel-event-button');
    const eventSaveBtn = document.getElementById('save-event-button');
    const eventNameInput = document.getElementById('event-name-input');
    const eventTimeInput = document.getElementById('event-time-input');

    // --- 2. Stato dell'Applicazione ---
    let medications = []; 
    let takenRecords = {}; 
    let events = {}; // Struttura: { 'YYYY-MM-DD': [ { id, name, time } ] }
    let selectedDate = new Date(); 
    let isMenuOpen = false;

    // --- 3. Funzioni Helper ---
    const formatDateKey = (date) => {
        return date.toISOString().split('T')[0];
    };

    const saveData = () => {
        localStorage.setItem('medications', JSON.stringify(medications));
        localStorage.setItem('takenRecords', JSON.stringify(takenRecords));
        localStorage.setItem('events', JSON.stringify(events));
    };

    const loadData = () => {
        medications = JSON.parse(localStorage.getItem('medications')) || [];
        takenRecords = JSON.parse(localStorage.getItem('takenRecords')) || {};
        events = JSON.parse(localStorage.getItem('events')) || {};
    };

    const getFormattedTimeNow = () => {
        return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    // --- 4. Funzioni di Rendering (Disegno UI) ---
    const renderCalendar = (scrollBehavior = 'auto') => {
        calendarBar.innerHTML = ''; 
        const todayKey = formatDateKey(new Date());
        const selectedKey = formatDateKey(selectedDate);
        let selectedDayElement = null; 
        let lastMonth = -1;

        for (let i = -60; i <= 30; i++) {
            const date = new Date(); 
            date.setDate(date.getDate() + i); 
            
            const currentMonth = date.getMonth();

            // Se cambia il mese (o è il primo elemento), aggiungi divisore
            if (currentMonth !== lastMonth && lastMonth !== -1) {
                const monthName = date.toLocaleDateString('it-IT', { month: 'long' });
                const capitalMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                const dividerEl = document.createElement('div');
                dividerEl.className = 'calendar-month-divider';
                dividerEl.textContent = capitalMonth;
                calendarBar.appendChild(dividerEl);
            }
            // Gestione caso iniziale (per mostrare mese corrente all'inizio)
            if (i === -60) {
                lastMonth = currentMonth;
                const monthName = date.toLocaleDateString('it-IT', { month: 'long' });
                const capitalMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                const dividerEl = document.createElement('div');
                dividerEl.className = 'calendar-month-divider';
                dividerEl.textContent = capitalMonth;
                calendarBar.appendChild(dividerEl);
            }

            lastMonth = currentMonth;

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

    const renderList = () => {
        medList.innerHTML = '';
        const dateKey = formatDateKey(selectedDate);
        
        // 1. Prepara le Medicine per oggi
        const takenMedsForDay = takenRecords[dateKey] || [];
        const medsForDisplay = medications.map(med => {
            const takenEntry = takenMedsForDay.find(t => t.id === med.id);
            return {
                type: 'med',
                data: med,
                isTaken: !!takenEntry,
                takenTime: takenEntry ? takenEntry.takenAt : null,
                sortTime: med.time 
            };
        });

        // 2. Prepara gli Eventi per oggi
        const dayEvents = events[dateKey] || [];
        const eventsForDisplay = dayEvents.map(evt => {
            return {
                type: 'event',
                data: evt,
                sortTime: evt.time
            };
        });

        // 3. Unisci e Ordina
        const allItems = [...medsForDisplay, ...eventsForDisplay].sort((a, b) => 
            a.sortTime.localeCompare(b.sortTime)
        );

        if (allItems.length === 0) {
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Date helper per disabilitare "Prendi" nel futuro
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const selectedDay = new Date(selectedDate);
        selectedDay.setHours(0, 0, 0, 0);

        allItems.forEach(item => {
            const cardEl = document.createElement('div');
            
            if (item.type === 'med') {
                // RENDER MEDICINA
                const med = item.data;
                cardEl.className = 'med-card';
                if (item.isTaken) cardEl.classList.add('taken');
                
                let actionContent = '';
                if (item.isTaken) {
                    actionContent = `<span class="take-action">Presa alle ${item.takenTime}</span>`;
                } else {
                    if (selectedDay < today) { 
                        actionContent = `<span class="take-action"><i>Non presa</i></span>`;
                    } else { 
                         actionContent = `<button class="take-button" data-id="${med.id}" data-type="med">Prendi</button>`;
                    }
                }

                cardEl.innerHTML = `
                    <div class="med-info">
                        <div class="med-name-row">
                            <span class="med-name">${med.name}</span>
                        </div>
                        <span class="med-time">${med.time}</span>
                    </div>
                    <div class="card-actions">
                        ${actionContent}
                        <button class="delete-button" data-id="${med.id}" data-type="med" aria-label="Elimina">
                            <span class="material-icons-outlined">delete</span>
                        </button>
                    </div>
                `;
            } else {
                // RENDER EVENTO
                const evt = item.data;
                cardEl.className = 'med-card event-card';
                
                cardEl.innerHTML = `
                    <div class="med-info">
                        <div class="med-name-row">
                            <span class="material-icons-outlined event-icon">event</span>
                            <span class="med-name">${evt.name}</span>
                        </div>
                        <span class="med-time">${evt.time}</span>
                    </div>
                    <div class="card-actions">
                        <button class="delete-button" data-id="${evt.id}" data-type="event" aria-label="Elimina">
                            <span class="material-icons-outlined">delete</span>
                        </button>
                    </div>
                `;
            }

            medList.appendChild(cardEl);
        });
    };

    // --- 5. Funzioni di Logica ---
    
    const toggleFabMenu = (show) => {
        isMenuOpen = show;
        if (show) {
            fab.classList.add('menu-open');
            fabOverlay.classList.add('visible');
            fabMenu.classList.add('visible');
        } else {
            fab.classList.remove('menu-open');
            fabOverlay.classList.remove('visible');
            fabMenu.classList.remove('visible');
        }
    };

    const toggleModal = (modalEl, show) => {
        if (show) {
            modalEl.classList.add('visible');
        } else {
            modalEl.classList.remove('visible');
            // Reset inputs
            const inputs = modalEl.querySelectorAll('input');
            inputs.forEach(i => i.value = '');
        }
    };

    const selectDate = (newDate) => {
        selectedDate = newDate;
        renderCalendar('smooth'); 
        renderList();
    };

    // Logica Medicina
    const saveMedication = () => {
        const name = medNameInput.value.trim();
        const time = medTimeInput.value;

        if (!name || !time) {
            alert('Per favore, compila nome e orario.');
            return;
        }

        const newMed = {
            id: Date.now(),
            name: name,
            time: time
        };

        medications.push(newMed);
        saveData();
        renderList();
        toggleModal(medModal, false);
    };

    const takeMedication = (medId) => {
        const dateKey = formatDateKey(selectedDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDay = new Date(selectedDate);
        selectedDay.setHours(0, 0, 0, 0);

        if (selectedDay > today) return; // Sicurezza extra

        if (!takenRecords[dateKey]) takenRecords[dateKey] = [];
        if (takenRecords[dateKey].some(t => t.id === medId)) return;

        const takenAtTime = getFormattedTimeNow();

        takenRecords[dateKey].push({
            id: medId,
            takenAt: takenAtTime
        });

        saveData();
        renderList();
    };

    // Logica Evento
    const saveEvent = () => {
        const name = eventNameInput.value.trim();
        let time = eventTimeInput.value;
        
        // Se l'utente non mette l'ora, usa quella corrente
        if (!time) {
            time = getFormattedTimeNow();
        }

        if (!name) {
            alert('Inserisci il nome dell\'evento.');
            return;
        }

        const dateKey = formatDateKey(selectedDate);
        if (!events[dateKey]) events[dateKey] = [];

        events[dateKey].push({
            id: Date.now(),
            name: name,
            time: time
        });

        saveData();
        renderList();
        toggleModal(eventModal, false);
    };

    // Cancellazione Generica
    const deleteItem = (id, type) => {
        if (!confirm('Vuoi eliminare questo elemento?')) return;

        if (type === 'med') {
            medications = medications.filter(med => med.id !== id);
            // Pulisci anche lo storico
            for (const k in takenRecords) {
                takenRecords[k] = takenRecords[k].filter(t => t.id !== id);
                if (takenRecords[k].length === 0) delete takenRecords[k];
            }
        } else if (type === 'event') {
            const dateKey = formatDateKey(selectedDate);
            if (events[dateKey]) {
                events[dateKey] = events[dateKey].filter(e => e.id !== id);
                if (events[dateKey].length === 0) delete events[dateKey];
            }
        }
        
        saveData();
        renderList();
    };

    // --- 6. Event Listeners ---
    
    // FAB
    fab.addEventListener('click', () => toggleFabMenu(!isMenuOpen));
    fabOverlay.addEventListener('click', () => toggleFabMenu(false));

    // Menu Items
    menuBtnMedicina.addEventListener('click', () => {
        toggleFabMenu(false);
        toggleModal(medModal, true);
    });

    menuBtnEvento.addEventListener('click', () => {
        toggleFabMenu(false);
        // Pre-fill orario evento con ora attuale per comodità
        eventTimeInput.value = getFormattedTimeNow();
        toggleModal(eventModal, true);
    });

    // Modale Medicina
    medCancelBtn.addEventListener('click', () => toggleModal(medModal, false));
    medModal.addEventListener('click', (e) => { if (e.target === medModal) toggleModal(medModal, false); });
    medSaveBtn.addEventListener('click', saveMedication);

    // Modale Evento
    eventCancelBtn.addEventListener('click', () => toggleModal(eventModal, false));
    eventModal.addEventListener('click', (e) => { if (e.target === eventModal) toggleModal(eventModal, false); });
    eventSaveBtn.addEventListener('click', saveEvent);

    // Lista (Click Delegato)
    medList.addEventListener('click', (e) => {
        const takeBtn = e.target.closest('.take-button');
        if (takeBtn) {
            takeMedication(Number(takeBtn.dataset.id));
            return;
        }

        const deleteBtn = e.target.closest('.delete-button');
        if (deleteBtn) {
            const id = Number(deleteBtn.dataset.id);
            const type = deleteBtn.dataset.type; // 'med' o 'event'
            deleteItem(id, type);
            return;
        }
    });

    // --- 7. Inizializzazione ---
    loadData(); 
    renderCalendar('auto'); 
    renderList(); 
});