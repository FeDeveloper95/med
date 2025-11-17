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

    // Modali
    const medModal = document.getElementById('add-med-modal');
    const medCancelBtn = document.getElementById('cancel-med-button');
    const medSaveBtn = document.getElementById('save-med-button');
    const medNameInput = document.getElementById('med-name-input');
    const medTimeInput = document.getElementById('med-time-input');

    const eventModal = document.getElementById('add-event-modal');
    const eventCancelBtn = document.getElementById('cancel-event-button');
    const eventSaveBtn = document.getElementById('save-event-button');
    const eventNameInput = document.getElementById('event-name-input');
    const eventTimeInput = document.getElementById('event-time-input');

    // --- 2. Stato dell'Applicazione ---
    let medications = []; 
    let takenRecords = {}; 
    let events = {}; 
    let selectedDate = new Date(); 
    let isMenuOpen = false;

    // Stato Calendario Infinito
    let minDateOffset = -15; // Giorni caricati nel passato inizialmente
    let maxDateOffset = 30;  // Giorni caricati nel futuro inizialmente
    let isLoadingDays = false; // Semaforo per evitare caricamenti doppi

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

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    // --- 4. Logica Calendario Infinito ---

    // Crea l'elemento HTML per un singolo giorno
    const createDayElement = (date) => {
        const dateKey = formatDateKey(date);
        const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
        const dayNumber = date.getDate();

        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.dataset.date = dateKey; // Utile per ritrovarlo
        
        // Aggiungi classe 'today' se necessario
        if (dateKey === formatDateKey(new Date())) {
            dayEl.classList.add('today');
        }

        dayEl.innerHTML = `
            <span class="day-name">${dayName}</span>
            <span class="day-number">${dayNumber}</span>
        `;

        dayEl.addEventListener('click', () => {
            selectDate(date);
        });

        return dayEl;
    };

    // Crea l'elemento Divisore Mese
    const createMonthDivider = (date) => {
        const monthName = date.toLocaleDateString('it-IT', { month: 'long' });
        const dividerEl = document.createElement('div');
        dividerEl.className = 'calendar-month-divider';
        dividerEl.textContent = capitalize(monthName);
        return dividerEl;
    };

    // Aggiunge giorni al DOM (Past = Prepend, Future = Append)
    const addDays = (direction, count = 30) => {
        if (isLoadingDays) return;
        isLoadingDays = true;

        // Salviamo la larghezza attuale per correggere lo scroll se andiamo nel passato
        const oldScrollWidth = calendarBar.scrollWidth;
        const oldScrollLeft = calendarBar.scrollLeft;

        if (direction === 'future') {
            let currentMonth = new Date();
            currentMonth.setDate(currentMonth.getDate() + maxDateOffset);
            currentMonth = currentMonth.getMonth();

            for (let i = 1; i <= count; i++) {
                maxDateOffset++;
                const date = new Date();
                date.setDate(date.getDate() + maxDateOffset);
                
                // Controllo cambio mese
                if (date.getDate() === 1) {
                    calendarBar.appendChild(createMonthDivider(date));
                } else if (i === 1 && maxDateOffset === -14) { 
                    // Hack per mostrare il mese corrente all'avvio se necessario
                    // (Non strettamente necessario se la logica scroll gestisce tutto, ma utile per sicurezza)
                }

                calendarBar.appendChild(createDayElement(date));
            }
        } else if (direction === 'past') {
            for (let i = 1; i <= count; i++) {
                minDateOffset--;
                const date = new Date();
                date.setDate(date.getDate() + minDateOffset);

                const dayEl = createDayElement(date);
                calendarBar.insertBefore(dayEl, calendarBar.firstChild);

                // Se è il primo del mese, aggiungi il divisore PRIMA del giorno (quindi sopra/sinistra)
                if (date.getDate() === 1) {
                    calendarBar.insertBefore(createMonthDivider(date), dayEl);
                }
            }
            
            // Correggi lo scroll in modo che l'utente non veda saltare la lista
            const newScrollWidth = calendarBar.scrollWidth;
            calendarBar.scrollLeft = newScrollWidth - oldScrollWidth + oldScrollLeft;
        }

        isLoadingDays = false;
        updateCalendarSelection(); // Aggiorna visivamente la selezione sui nuovi elementi
    };

    // Aggiorna solo le classi CSS (selected) senza rifare il DOM
    const updateCalendarSelection = () => {
        const selectedKey = formatDateKey(selectedDate);
        
        // Rimuovi selezione precedente
        const prevSelected = calendarBar.querySelector('.calendar-day.selected');
        if (prevSelected) prevSelected.classList.remove('selected');

        // Aggiungi nuova selezione
        const newSelected = calendarBar.querySelector(`.calendar-day[data-date="${selectedKey}"]`);
        if (newSelected) {
            newSelected.classList.add('selected');
            
            // Nota: Lo scrollIntoView lo facciamo solo al click esplicito o init, 
            // non durante il caricamento infinito automatico.
        }
    };

    // Inizializzazione Calendario
    const initCalendar = () => {
        calendarBar.innerHTML = '';
        
        // Inseriamo un divisore iniziale per il mese corrente (o quello più vecchio)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + minDateOffset);
        calendarBar.appendChild(createMonthDivider(startDate));

        // Carica range iniziale
        // Simuliamo un loop manuale per il primo caricamento per evitare complessità di addDays('future') da zero
        let lastMonth = startDate.getMonth();

        for (let i = minDateOffset; i <= maxDateOffset; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            if (date.getMonth() !== lastMonth) {
                calendarBar.appendChild(createMonthDivider(date));
                lastMonth = date.getMonth();
            }
            
            calendarBar.appendChild(createDayElement(date));
        }

        // Scroll al giorno selezionato (oggi)
        setTimeout(() => {
            updateCalendarSelection();
            const selectedEl = calendarBar.querySelector('.calendar-day.selected');
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest', inline: 'center' });
            }
        }, 0);
    };

    // Listener per Scroll Infinito
    calendarBar.addEventListener('scroll', () => {
        const scrollLeft = calendarBar.scrollLeft;
        const scrollWidth = calendarBar.scrollWidth;
        const clientWidth = calendarBar.clientWidth;

        // Se siamo vicini all'inizio (sinistra) -> Carica Passato
        if (scrollLeft < 100) {
            addDays('past', 15);
        }

        // Se siamo vicini alla fine (destra) -> Carica Futuro
        if (scrollLeft + clientWidth > scrollWidth - 100) {
            addDays('future', 15);
        }
    });

    // --- 5. Rendering Lista (Medicine/Eventi) ---
    const renderList = () => {
        medList.innerHTML = '';
        const dateKey = formatDateKey(selectedDate);
        
        // 1. Prepara Medicine
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

        // 2. Prepara Eventi
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

    // --- 6. Logica Interattiva ---
    
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
            const inputs = modalEl.querySelectorAll('input');
            inputs.forEach(i => i.value = '');
        }
    };

    const selectDate = (newDate) => {
        selectedDate = newDate;
        updateCalendarSelection();
        renderList();
        
        // Scroll smooth verso il giorno selezionato
        const dateKey = formatDateKey(newDate);
        const el = calendarBar.querySelector(`.calendar-day[data-date="${dateKey}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    };

    // Azioni Dati
    const saveMedication = () => {
        const name = medNameInput.value.trim();
        const time = medTimeInput.value;
        if (!name || !time) { alert('Inserisci nome e orario.'); return; }
        medications.push({ id: Date.now(), name, time });
        saveData();
        renderList();
        toggleModal(medModal, false);
    };

    const takeMedication = (medId) => {
        const dateKey = formatDateKey(selectedDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        const sDate = new Date(selectedDate);
        sDate.setHours(0,0,0,0);
        if (sDate > today) return;

        if (!takenRecords[dateKey]) takenRecords[dateKey] = [];
        if (takenRecords[dateKey].some(t => t.id === medId)) return;

        takenRecords[dateKey].push({ id: medId, takenAt: getFormattedTimeNow() });
        saveData();
        renderList();
    };

    const saveEvent = () => {
        const name = eventNameInput.value.trim();
        let time = eventTimeInput.value || getFormattedTimeNow();
        if (!name) { alert('Inserisci nome evento.'); return; }
        
        const dateKey = formatDateKey(selectedDate);
        if (!events[dateKey]) events[dateKey] = [];
        events[dateKey].push({ id: Date.now(), name, time });
        
        saveData();
        renderList();
        toggleModal(eventModal, false);
    };

    const deleteItem = (id, type) => {
        if (!confirm('Eliminare elemento?')) return;
        if (type === 'med') {
            medications = medications.filter(m => m.id !== id);
            for (const k in takenRecords) {
                takenRecords[k] = takenRecords[k].filter(t => t.id !== id);
                if (!takenRecords[k].length) delete takenRecords[k];
            }
        } else {
            const k = formatDateKey(selectedDate);
            if (events[k]) {
                events[k] = events[k].filter(e => e.id !== id);
                if (!events[k].length) delete events[k];
            }
        }
        saveData();
        renderList();
    };

    // --- 7. Event Listeners ---
    fab.addEventListener('click', () => toggleFabMenu(!isMenuOpen));
    fabOverlay.addEventListener('click', () => toggleFabMenu(false));

    menuBtnMedicina.addEventListener('click', () => { toggleFabMenu(false); toggleModal(medModal, true); });
    menuBtnEvento.addEventListener('click', () => { 
        toggleFabMenu(false); 
        eventTimeInput.value = getFormattedTimeNow(); 
        toggleModal(eventModal, true); 
    });

    medCancelBtn.addEventListener('click', () => toggleModal(medModal, false));
    medSaveBtn.addEventListener('click', saveMedication);
    medModal.addEventListener('click', e => { if(e.target === medModal) toggleModal(medModal, false); });

    eventCancelBtn.addEventListener('click', () => toggleModal(eventModal, false));
    eventSaveBtn.addEventListener('click', saveEvent);
    eventModal.addEventListener('click', e => { if(e.target === eventModal) toggleModal(eventModal, false); });

    medList.addEventListener('click', (e) => {
        const take = e.target.closest('.take-button');
        if (take) return takeMedication(Number(take.dataset.id));
        const del = e.target.closest('.delete-button');
        if (del) return deleteItem(Number(del.dataset.id), del.dataset.type);
    });

    // --- 8. Init ---
    loadData();
    initCalendar();
    renderList();
});