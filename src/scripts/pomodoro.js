const storageKey = "ventana-pomodoro:v1";
      const { gsap } = await import("gsap");

      const quotes = [
        "Acabas de regalarte un bloque de calma.",
        "Bien. Lo importante tambien se construye en silencio.",
        "Un paso real. Respira antes del siguiente.",
        "Tu atencion volvio a ti por 25 minutos.",
      ];
      const focusMessages = {
        idle: "Abre la ventana. Entra en ritmo.",
        running: "La lluvia se queda afuera. Tu atencion aqui.",
        paused: "Pausa suave. Puedes volver cuando quieras.",
      };
      const breakMessages = {
        idle: "Respira. Estirate. Toma agua.",
        running: "Suelta los hombros. Vuelve ligero.",
        paused: "Descanso pausado. Sin prisa.",
      };
      const sceneIds = ["cat-rain-window", "cat-sunset-room", "cat-tea-room", "cat-snow-window"];

      const defaults = {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        alarm: "bell",
        ambientVolume: 45,
        ostVolume: 35,
        ostTrackId: "",
        completedToday: 0,
        lastActiveDate: "",
        streakDays: {},
        layoutMode: "full",
        sceneId: "cat-rain-window",
        extensions: {
          notebook: false,
        },
        notebook: {
          activeNoteId: "",
          draftTitle: "",
          draftBody: "",
          notes: [],
        },
      };

      const elements = {
        shell: document.querySelector(".app-shell"),
        timer: document.querySelector("[data-timer]"),
        modeLabel: document.querySelector("[data-mode-label]"),
        message: document.querySelector("[data-message]"),
        todayCount: document.querySelector("[data-today-count]"),
        activeNote: document.querySelector("[data-active-note]"),
        activeNoteOpen: document.querySelector("[data-active-note-open]"),
        activeNoteMore: document.querySelector("[data-active-note-more]"),
        activeNoteDots: document.querySelector("[data-active-note-dots]"),
        ringProgress: document.querySelector("[data-ring-progress]"),
        ringHead: document.querySelector("[data-ring-head]"),
        noteFloat: document.querySelector("[data-note-float]"),
        noteSwitcher: document.querySelector("[data-note-switcher]"),
        noteSwitcherList: document.querySelector("[data-note-switcher-list]"),
        noteClear: document.querySelector("[data-note-clear]"),
        focusCard: document.querySelector(".focus-card"),
        activeNoteTitle: document.querySelector("[data-active-note-title]"),
        toggle: document.querySelector('[data-action="toggle"]'),
        toggleLabel: document.querySelector("[data-toggle-label]"),
        reset: document.querySelector('[data-action="reset"]'),
        skip: document.querySelector('[data-action="skip"]'),
        completeTest: document.querySelector('[data-action="complete-test"]'),
        completionToast: document.querySelector("[data-completion-toast]"),
        completionKicker: document.querySelector("[data-completion-kicker]"),
        completionText: document.querySelector("[data-completion-text]"),
        devTools: document.querySelector("[data-dev-tools]"),
        floatingToggle: document.querySelector("[data-floating-toggle]"),
        installButton: document.querySelector("[data-install-button]"),
        ambientAudio: document.querySelector("[data-ambient-audio]"),
        ostToggle: document.querySelector("[data-ost-toggle]"),
        ostPanel: document.querySelector("[data-ost-panel]"),
        ostClose: document.querySelector("[data-ost-close]"),
        ostAudio: document.querySelector("[data-ost-audio]"),
        ostPlay: document.querySelector("[data-ost-play]"),
        ostPill: document.querySelector("[data-ost-pill]"),
        ostPillName: document.querySelector("[data-ost-pill-name]"),
        ostPillPlay: document.querySelector("[data-ost-pill-play]"),
        ostPillVolume: document.querySelector("[data-ost-pill-volume]"),
        ostVolume: document.querySelector("[data-ost-volume]"),
        ostUpload: document.querySelector("[data-ost-upload]"),
        ostList: document.querySelector("[data-ost-track-list]"),
        ostCount: document.querySelector("[data-ost-count]"),
        ostCurrent: document.querySelector("[data-ost-current]"),
        ostStatus: document.querySelector("[data-ost-status]"),
        extensionsToggle: document.querySelector("[data-extensions-toggle]"),
        extensionsClose: document.querySelector("[data-extensions-close]"),
        extensionsPanel: document.querySelector("[data-extensions-panel]"),
        extensionToggles: document.querySelectorAll("[data-extension-toggle]"),
        notebookToggle: document.querySelector("[data-notebook-toggle]"),
        notebookClose: document.querySelector("[data-notebook-close]"),
        notebookPanel: document.querySelector("[data-notebook-panel]"),
        notebookForm: document.querySelector("[data-notebook-form]"),
        notebookDrafts: document.querySelectorAll("[data-notebook-draft]"),
        notesList: document.querySelector("[data-notes-list]"),
        windowsToggle: document.querySelector("[data-windows-toggle]"),
        windowsClose: document.querySelector("[data-windows-close]"),
        windowsPanel: document.querySelector("[data-windows-panel]"),
        sceneOptions: document.querySelectorAll("[data-scene-option]"),
        settingsToggle: document.querySelector("[data-settings-toggle]"),
        settingsClose: document.querySelector("[data-settings-close]"),
        settingsPanel: document.querySelector("[data-settings-panel]"),
        streakGrid: document.querySelector("[data-streak-grid]"),
        streakCount: document.querySelector("[data-streak-count]"),
        streakToday: document.querySelector("[data-streak-today]"),
        streakBest: document.querySelector("[data-streak-best]"),
        streakTotal: document.querySelector("[data-streak-total]"),
        settings: document.querySelectorAll("[data-setting]"),
      };

      let state = loadState();
      let mode = "focus";
      let cycleFocusCount = 0;
      let secondsLeft = state.focusMinutes * 60;
      let roundTotalSeconds = secondsLeft;
      let running = false;
      let intervalId = null;
      let audioContext = null;
      let statusMessage = focusMessages.idle;
      let roundChangeTimeout = null;
      let completionTimeout = null;
      let installPromptEvent = null;
      let floatingWindow = null;
      let floatingLayout = "clock";
      let lastActiveNoteId = "";
      let ostDatabasePromise = null;
      let ostTracks = [];
      const ostTrackUrls = new Map();
      const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reducedMotion = reducedMotionQuery.matches;

      reducedMotionQuery.addEventListener?.("change", (event) => {
        reducedMotion = event.matches;
      });

      function canAnimate() {
        return !reducedMotion;
      }

      function todayKey() {
        return new Date().toISOString().slice(0, 10);
      }

      function loadState() {
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
          const merged = { ...defaults, ...saved };
          if (merged.lastActiveDate !== todayKey()) {
            merged.completedToday = 0;
            merged.lastActiveDate = todayKey();
          }
          if (typeof merged.layoutMode === "boolean") {
            merged.layoutMode = merged.layoutMode ? "companion" : "full";
          }
          if (!["full", "companion", "mini"].includes(merged.layoutMode)) {
            merged.layoutMode = "full";
          }
          if (!sceneIds.includes(merged.sceneId)) {
            merged.sceneId = defaults.sceneId;
          }
          merged.ostVolume = clampNumber(merged.ostVolume, 0, 100, defaults.ostVolume);
          if (typeof merged.ostTrackId !== "string") merged.ostTrackId = "";
          merged.extensions = { ...defaults.extensions, ...(merged.extensions || {}) };
          merged.notebook = normalizeNotebook(merged.notebook);
          return merged;
        } catch {
          return { ...defaults, lastActiveDate: todayKey() };
        }
      }

      function saveState() {
        localStorage.setItem(storageKey, JSON.stringify(state));
      }

      function openOstDatabase() {
        if (ostDatabasePromise) return ostDatabasePromise;
        ostDatabasePromise = new Promise((resolve, reject) => {
          const request = indexedDB.open("ventana-pomodoro-audio", 1);
          request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains("tracks")) database.createObjectStore("tracks", { keyPath: "id" });
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return ostDatabasePromise;
      }

      async function readOstTracks() {
        const database = await openOstDatabase();
        return new Promise((resolve, reject) => {
          const request = database.transaction("tracks", "readonly").objectStore("tracks").getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function writeOstTrack(track) {
        const database = await openOstDatabase();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction("tracks", "readwrite");
          transaction.objectStore("tracks").put(track);
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
        });
      }

      async function removeOstTrack(id) {
        const database = await openOstDatabase();
        return new Promise((resolve, reject) => {
          const transaction = database.transaction("tracks", "readwrite");
          transaction.objectStore("tracks").delete(id);
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
        });
      }

      function ostUrlFor(track) {
        if (!ostTrackUrls.has(track.id)) ostTrackUrls.set(track.id, URL.createObjectURL(track.file));
        return ostTrackUrls.get(track.id);
      }

      function renderOstTracks() {
        elements.ostList.innerHTML = "";
        elements.ostCount.textContent = ostTracks.length.toString();
        const currentTrack = ostTracks.find((track) => track.id === state.ostTrackId);
        elements.ostCurrent.textContent = currentTrack?.name || "Ninguna seleccionada";
        elements.ostPillName.textContent = currentTrack?.name || "Elegir música";
        if (!ostTracks.length) {
          const empty = document.createElement("p");
          empty.className = "ost-empty";
          empty.textContent = "Añade una OST o música de tu dispositivo para empezar.";
          elements.ostList.append(empty);
          elements.ostStatus.textContent = "Tu espacio de música está listo";
          return;
        }

        elements.ostStatus.textContent = elements.ostAudio.paused ? "Lista para acompañarte" : "Sonando ahora";
        ostTracks.forEach((track) => {
          const row = document.createElement("div");
          row.className = "ost-track-row";
          row.dataset.active = track.id === state.ostTrackId ? "true" : "false";

          const choose = document.createElement("button");
          choose.type = "button";
          choose.className = "ost-track-select";
          choose.dataset.ostAction = "play-track";
          choose.dataset.ostId = track.id;
          const trackName = document.createElement("strong");
          trackName.textContent = track.name;
          const trackType = document.createElement("small");
          trackType.textContent = track.id === state.ostTrackId && !elements.ostAudio.paused ? "Sonando" : "Reproducir";
          choose.append(trackName, trackType);

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "ost-track-remove";
          remove.dataset.ostAction = "remove-track";
          remove.dataset.ostId = track.id;
          remove.setAttribute("aria-label", `Quitar ${track.name}`);
          remove.textContent = "×";
          row.append(choose, remove);
          elements.ostList.append(row);
        });
      }

      async function loadOstLibrary() {
        try {
          ostTracks = await readOstTracks();
          const selected = ostTracks.find((track) => track.id === state.ostTrackId);
          if (selected) elements.ostAudio.src = ostUrlFor(selected);
          renderOstTracks();
        } catch {
          elements.ostStatus.textContent = "No se pudo abrir la biblioteca de música";
          elements.ostList.textContent = "Este navegador no permite guardar pistas localmente.";
        }
      }

      function normalizeNotebook(notebook) {
        const merged = { ...defaults.notebook, ...(notebook || {}) };
        if (!Array.isArray(merged.notes)) {
          const title = String(merged.intention || "").trim();
          const body = String(merged.notes || "").trim();
          merged.notes =
            title || body
              ? [
                  {
                    id: `note-${Date.now()}`,
                    title: title || "Nota de hoy",
                    body,
                    createdAt: Date.now(),
                  },
                ]
              : [];
          merged.activeNoteId = merged.notes[0]?.id || "";
          merged.draftTitle = "";
          merged.draftBody = "";
        }
        merged.notes = merged.notes.map((note) => ({
          ...note,
          completed: Boolean(note.completed),
          pomodoros: Math.max(0, Number(note.pomodoros) || 0),
        }));
        if (!merged.notes.some((note) => note.id === merged.activeNoteId && !note.completed)) {
          merged.activeNoteId = merged.notes.find((note) => !note.completed)?.id || "";
        }
        return merged;
      }

      function clampNumber(value, min, max, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, Math.round(number)));
      }

      function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
        const seconds = (totalSeconds % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
      }

      function startRound(seconds) {
        secondsLeft = seconds;
        roundTotalSeconds = seconds;
      }

      function currentTotalSeconds() {
        return roundTotalSeconds;
      }

      let lastRingProgress = 0;

      function renderRing() {
        const totalSeconds = currentTotalSeconds();
        const progress = totalSeconds > 0 ? Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100)) : 0;
        // Un reinicio retrocede el anillo: se salta la transicion para que no "rebobine" despacio.
        elements.ringProgress.classList.toggle("is-snapping", progress < lastRingProgress);
        elements.ringProgress.style.strokeDashoffset = (100 - progress).toFixed(2);
        elements.ringHead.setAttribute("transform", `rotate(${(progress * 3.6).toFixed(2)} 200 200)`);
        lastRingProgress = progress;
      }

      function renderActiveNoteChip(activeNote) {
        const pending = state.notebook.notes.filter((note) => !note.completed).length;
        elements.activeNote.dataset.state = activeNote ? "active" : "done";
        elements.noteFloat.hidden = !activeNote;
        if (!activeNote) {
          elements.activeNoteTitle.textContent = "Todo listo por ahora";
          elements.activeNoteOpen.title = "";
          elements.activeNoteOpen.setAttribute("aria-label", "Todo listo. Ver tareas");
          elements.activeNoteMore.hidden = true;
          elements.activeNoteDots.replaceChildren();
          return;
        }
        elements.activeNoteTitle.textContent = activeNote.title;
        elements.activeNoteOpen.title = activeNote.body || "";
        elements.activeNoteOpen.setAttribute(
          "aria-label",
          pending > 1 ? `Tarea actual: ${activeNote.title}. ${pending} pendientes` : `Tarea actual: ${activeNote.title}`,
        );
        elements.activeNoteMore.hidden = pending <= 1;
        elements.activeNoteMore.textContent = `+${pending - 1}`;
        const done = Math.min(8, activeNote.pomodoros || 0);
        const total = Math.min(8, Math.max(3, done + 1));
        elements.activeNoteDots.replaceChildren(
          ...Array.from({ length: total }, (_, index) => {
            const dot = document.createElement("i");
            if (index < done) dot.dataset.done = "true";
            return dot;
          }),
        );
      }

      function render() {
        updateAmbientVolume();
        elements.timer.textContent = formatTime(secondsLeft);
        renderRing();
        elements.todayCount.textContent = state.completedToday.toString();
        elements.modeLabel.textContent = mode === "focus" ? "Ventana abierta" : "Descanso";
        elements.shell.dataset.mode = mode;
        elements.shell.dataset.layout = state.layoutMode;
        elements.shell.dataset.scene = state.sceneId;
        elements.shell.dataset.running = running ? "true" : "false";
        elements.toggleLabel.textContent = running ? "Pausa" : "Play";
        elements.toggle.dataset.state = running ? "pause" : "play";
        elements.message.textContent = statusMessage;
        elements.notebookToggle.hidden = !state.extensions.notebook;
        elements.shell.dataset.notebook = state.extensions.notebook ? "enabled" : "disabled";
        const activeNote = getActiveNote();
        const shouldShowActiveNote = Boolean(state.extensions.notebook && state.notebook.notes.length);
        const activeNoteWasHidden = elements.activeNote.hidden;
        elements.activeNote.hidden = !shouldShowActiveNote;
        if (shouldShowActiveNote) renderActiveNoteChip(activeNote);
        if (!shouldShowActiveNote) hideNoteSwitcher();
        if (shouldShowActiveNote && (activeNoteWasHidden || lastActiveNoteId !== (activeNote?.id || ""))) {
          animateActiveNote();
        }
        lastActiveNoteId = activeNote?.id || "";
        updateFloatingTimer();
        renderNoteSwitcher();

        elements.sceneOptions.forEach((option) => {
          const isActive = option.dataset.sceneOption === state.sceneId;
          option.dataset.active = isActive ? "true" : "false";
          option.setAttribute("aria-pressed", isActive.toString());
        });

        elements.settings.forEach((input) => {
          const key = input.dataset.setting;
          if (key && document.activeElement !== input) {
            input.value = state[key];
          }
        });

        elements.extensionToggles.forEach((input) => {
          const key = input.dataset.extensionToggle;
          input.checked = Boolean(state.extensions[key]);
        });

        elements.notebookDrafts.forEach((input) => {
          const key = input.dataset.notebookDraft;
          if (key && document.activeElement !== input) {
            input.value = state.notebook[key === "title" ? "draftTitle" : "draftBody"] || "";
          }
        });

        renderNotes();
        renderStreak();
      }

      function getActiveNote() {
        return state.notebook.notes.find((note) => note.id === state.notebook.activeNoteId && !note.completed) || null;
      }

      let noteSwitcherSignature = "";

      function renderNoteSwitcher() {
        const { notes, activeNoteId } = state.notebook;
        const doneNotes = notes.filter((note) => note.completed);
        const pendingNotes = notes.filter((note) => !note.completed);
        // render() corre cada segundo: solo se reconstruye la lista cuando cambia algo,
        // para no perder el hover ni los clics a medias.
        const signature = JSON.stringify(notes.map((note) => [note.id, note.title, note.completed, note.pomodoros])) + activeNoteId;
        if (signature === noteSwitcherSignature) return;
        noteSwitcherSignature = signature;

        const before = new Map();
        elements.noteSwitcherList.querySelectorAll("[data-note-id]").forEach((row) => {
          before.set(row.dataset.noteId, row.getBoundingClientRect().top);
        });

        elements.noteSwitcherList.replaceChildren();
        const addRow = (note) => {
          const row = document.createElement("div");
          row.className = "note-switcher-row";
          row.dataset.noteId = note.id;
          row.dataset.active = note.id === activeNoteId && !note.completed ? "true" : "false";
          row.dataset.done = note.completed ? "true" : "false";

          const check = document.createElement("button");
          check.type = "button";
          check.className = "note-switcher-check";
          check.dataset.noteSwitchAction = "toggle";
          check.setAttribute("aria-pressed", note.completed.toString());
          check.setAttribute("aria-label", note.completed ? `Reabrir ${note.title}` : `Terminar ${note.title}`);
          check.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>';

          const choose = document.createElement("button");
          choose.type = "button";
          choose.className = "note-switcher-main";
          choose.dataset.noteSwitchAction = note.completed ? "toggle" : "activate";
          const title = document.createElement("strong");
          title.textContent = note.title;
          choose.append(title);
          if (note.pomodoros) {
            const count = document.createElement("small");
            count.textContent = `${note.pomodoros} ${note.pomodoros === 1 ? "bloque" : "bloques"}`;
            choose.append(count);
          }

          row.append(check, choose);
          if (!note.completed) {
            const floatButton = document.createElement("button");
            floatButton.type = "button";
            floatButton.dataset.noteSwitchAction = "float";
            floatButton.className = "note-switcher-float";
            floatButton.setAttribute("aria-label", `Abrir ${note.title} como nota flotante`);
            floatButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9" /></svg>';
            row.append(floatButton);
          }
          elements.noteSwitcherList.append(row);
        };

        // Las hechas se quedan arriba, apagadas, hasta que las limpies.
        doneNotes.forEach(addRow);
        if (doneNotes.length && pendingNotes.length) {
          const divider = document.createElement("div");
          divider.className = "note-switcher-divider";
          elements.noteSwitcherList.append(divider);
        }
        pendingNotes.forEach(addRow);

        elements.noteClear.hidden = !doneNotes.length;
        elements.noteClear.textContent = `Limpiar hechas · ${doneNotes.length}`;

        updateNoteSwitcherSize();

        // FLIP: las filas se deslizan a su nuevo lugar en vez de saltar.
        if (canAnimate() && before.size) {
          elements.noteSwitcherList.querySelectorAll("[data-note-id]").forEach((row) => {
            const previousTop = before.get(row.dataset.noteId);
            if (previousTop === undefined) return;
            const delta = previousTop - row.getBoundingClientRect().top;
            if (Math.abs(delta) < 1) return;
            gsap.fromTo(row, { y: delta }, { y: 0, duration: 0.38, ease: "power3.out", clearProps: "transform" });
          });
        }
      }

      function toggleTaskCompleted(noteId) {
        const task = state.notebook.notes.find((note) => note.id === noteId);
        if (!task) return;
        task.completed = !task.completed;
        if (task.completed && state.notebook.activeNoteId === noteId) {
          state.notebook.activeNoteId = state.notebook.notes.find((note) => !note.completed)?.id || "";
        } else if (!task.completed && !state.notebook.activeNoteId) {
          state.notebook.activeNoteId = noteId;
        }
        saveState();
        render();
      }

      function renderNotes() {
        elements.notesList.innerHTML = "";
        const pendingNotes = state.notebook.notes.filter((note) => !note.completed);
        const completedNotes = state.notebook.notes.filter((note) => note.completed);
        const summary = document.querySelector("[data-task-summary]");
        if (summary) summary.textContent = `${pendingNotes.length} pendientes`;
        if (!state.notebook.notes.length) {
          const empty = document.createElement("p");
          empty.className = "notes-empty";
          empty.textContent = "Tu lista empieza con un paso pequeño.";
          elements.notesList.append(empty);
          return;
        }

        const renderTask = (note) => {
          const card = document.createElement("article");
          card.className = "note-card";
          card.dataset.noteId = note.id;
          card.dataset.active = note.id === state.notebook.activeNoteId ? "true" : "false";
          card.dataset.completed = note.completed ? "true" : "false";

          const checkButton = document.createElement("button");
          checkButton.type = "button";
          checkButton.className = "task-check";
          checkButton.dataset.noteAction = "complete";
          checkButton.setAttribute("aria-label", note.completed ? `Reabrir ${note.title}` : `Completar ${note.title}`);
          checkButton.setAttribute("aria-pressed", note.completed.toString());
          checkButton.innerHTML = note.completed ? "<span aria-hidden=\"true\">✓</span>" : "";

          const content = document.createElement("div");
          content.className = "task-content";

          const meta = document.createElement("span");
          meta.className = "note-meta";
          meta.textContent = note.completed ? "Terminada" : note.id === state.notebook.activeNoteId ? "Ahora" : "Pendiente";

          const title = document.createElement("strong");
          title.textContent = note.title;

          const body = document.createElement("p");
          body.textContent = note.body || "";

          const count = document.createElement("span");
          count.className = "task-pomodoros";
          count.textContent = `${note.pomodoros} ${note.pomodoros === 1 ? "bloque" : "bloques"}`;
          content.append(meta, title, body, count);

          const actions = document.createElement("div");
          actions.className = "note-actions";

          const useButton = document.createElement("button");
          useButton.type = "button";
          useButton.dataset.noteAction = note.completed ? "reopen" : "activate";
          useButton.textContent = note.completed ? "Reabrir" : note.id === state.notebook.activeNoteId ? "En curso" : "Empezar";

          const floatButton = document.createElement("button");
          floatButton.type = "button";
          floatButton.dataset.noteAction = "float";
          floatButton.textContent = "Flotar";

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.dataset.noteAction = "delete";
          deleteButton.textContent = "Eliminar";

          floatButton.hidden = note.completed;
          actions.append(useButton, floatButton, deleteButton);
          card.append(checkButton, content, actions);
          return card;
        };

        pendingNotes.forEach((note) => elements.notesList.append(renderTask(note)));
        if (completedNotes.length) {
          const completedHead = document.createElement("div");
          completedHead.className = "completed-tasks-heading";
          completedHead.textContent = `Hechas · ${completedNotes.length}`;
          elements.notesList.append(completedHead);
          completedNotes.forEach((note) => elements.notesList.append(renderTask(note)));
        }
      }

      function getPanelMap() {
        return {
          extensions: elements.extensionsPanel,
          notebook: elements.notebookPanel,
          ost: elements.ostPanel,
          settings: elements.settingsPanel,
          windows: elements.windowsPanel,
        };
      }

      function showPanel(panel) {
        if (!panel || !panel.hidden) return;
        panel.hidden = false;
        if (!canAnimate()) return;
        gsap.killTweensOf(panel);
        gsap.fromTo(
          panel,
          { opacity: 0, filter: "blur(8px)" },
          {
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.22,
            ease: "power2.out",
            clearProps: "opacity,filter",
          },
        );
      }

      function hidePanel(panel) {
        if (!panel || panel.hidden) return;
        if (!canAnimate()) {
          panel.hidden = true;
          return;
        }
        gsap.killTweensOf(panel);
        gsap.to(panel, {
          autoAlpha: 0,
          filter: "blur(6px)",
          duration: 0.09,
          ease: "power2.inOut",
            onComplete: () => {
            panel.hidden = true;
            gsap.set(panel, { clearProps: "opacity,visibility,filter" });
          },
        });
      }

      function getPanelToggleMap() {
        return {
          extensions: elements.extensionsToggle,
          notebook: elements.notebookToggle,
          ost: elements.ostToggle,
          settings: elements.settingsToggle,
          windows: elements.windowsToggle,
        };
      }

      function syncPanelToggles() {
        const toggles = getPanelToggleMap();
        Object.entries(getPanelMap()).forEach(([key, panel]) => {
          const toggle = toggles[key];
          if (!toggle) return;
          toggle.dataset.active = panel.hidden ? "false" : "true";
          toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
        });
      }

      const panelObserver = new MutationObserver(syncPanelToggles);
      Object.values(getPanelMap()).forEach((panel) => {
        if (panel) panelObserver.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
      });

      function togglePanel(key) {
        const panel = getPanelMap()[key];
        if (!panel) return;
        const shouldOpen = panel.hidden;
        closePanels(shouldOpen ? key : "");
        if (shouldOpen) {
          showPanel(panel);
        } else {
          hidePanel(panel);
        }
      }

      function closePanels(except) {
        const panels = getPanelMap();
        Object.entries(panels).forEach(([key, panel]) => {
          if (key !== except) hidePanel(panel);
        });
      }

      function animateActiveNote() {
        if (!canAnimate() || elements.activeNote.hidden) return;
        gsap.killTweensOf(elements.activeNoteOpen);
        gsap.fromTo(
          elements.activeNoteOpen,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.32, ease: "power2.out", clearProps: "opacity,transform" },
        );
      }

      function animateNoteCard(noteId) {
        if (!canAnimate()) return;
        const card = elements.notesList.querySelector(`[data-note-id="${noteId}"]`);
        if (!card) return;
        gsap.fromTo(
          card,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.12,
            ease: "power2.out",
            clearProps: "opacity",
          },
        );
      }

      // La tarjeta se estira hacia abajo; si no cabe, el bloque del reloj sube con la misma
      // curva en vez de que la lista se corte contra el borde de la pantalla.
      function updateNoteSwitcherSize() {
        const open = elements.noteSwitcher.dataset.open === "true";
        const contentHeight = elements.noteSwitcher.scrollHeight;
        elements.noteSwitcher.style.setProperty("--sw-h", `${contentHeight}px`);
        let lift = 0;
        if (open) {
          const currentLift = parseFloat(elements.focusCard.style.getPropertyValue("--lift")) || 0;
          const slotBottom = elements.activeNote.getBoundingClientRect().bottom + currentLift;
          lift = Math.max(0, Math.round(slotBottom + contentHeight + 16 - window.innerHeight));
        }
        elements.focusCard.style.setProperty("--lift", `${lift}px`);
      }

      function setNoteSwitcherOpen(open) {
        elements.noteSwitcher.dataset.open = open ? "true" : "false";
        elements.activeNote.dataset.open = open ? "true" : "false";
        elements.activeNoteOpen.setAttribute("aria-expanded", open ? "true" : "false");
        updateNoteSwitcherSize();
      }

      window.addEventListener("resize", updateNoteSwitcherSize);

      function showNoteSwitcher() {
        setNoteSwitcherOpen(true);
      }

      function hideNoteSwitcher() {
        if (elements.noteSwitcher.dataset.open !== "true") return;
        setNoteSwitcherOpen(false);
      }

      function toggleNoteSwitcher() {
        if (elements.noteSwitcher.dataset.open === "true") {
          hideNoteSwitcher();
        } else {
          showNoteSwitcher();
        }
      }

      function animateCompletionToast() {
        if (!canAnimate()) return;
        gsap.killTweensOf(elements.completionToast);
        gsap.fromTo(
          elements.completionToast,
          { autoAlpha: 0, y: -12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.32,
            ease: "power2.out",
          },
        );
      }

      function hideCompletionToast() {
        if (!canAnimate()) {
          elements.completionToast.dataset.visible = "false";
          return;
        }
        gsap.to(elements.completionToast, {
          autoAlpha: 0,
          y: -10,
          duration: 0.22,
          ease: "power2.inOut",
          onComplete: () => {
            elements.completionToast.dataset.visible = "false";
            gsap.set(elements.completionToast, { clearProps: "opacity,visibility,transform" });
          },
        });
      }

      function renderStreak() {
        elements.streakGrid.innerHTML = "";
        const dates = Array.from({ length: 14 }, (_, index) => {
          const date = new Date();
          date.setDate(date.getDate() - (13 - index));
          return date.toISOString().slice(0, 10);
        });

        dates.forEach((date) => {
          const day = document.createElement("span");
          const count = state.streakDays[date] || 0;
          day.className = "streak-day";
          day.dataset.level = count >= 4 ? "3" : count >= 2 ? "2" : count >= 1 ? "1" : "0";
          day.dataset.today = date === todayKey() ? "true" : "false";
          day.title = `${date}: ${count} ${count === 1 ? "ventana" : "ventanas"}`;
          const label = document.createElement("span");
          label.textContent = new Date(`${date}T00:00:00`).getDate().toString();
          day.append(label);
          elements.streakGrid.append(day);
        });

        const streak = countCurrentStreak();
        elements.streakCount.textContent = `${streak} ${streak === 1 ? "dia" : "dias"}`;
        const counts = Object.values(state.streakDays);
        elements.streakToday.textContent = state.completedToday.toString();
        elements.streakBest.textContent = Math.max(0, ...counts).toString();
        elements.streakTotal.textContent = counts.reduce((total, count) => total + count, 0).toString();
      }

      function countCurrentStreak() {
        let streak = 0;
        const cursor = new Date();
        while (true) {
          const key = cursor.toISOString().slice(0, 10);
          if (!state.streakDays[key]) return streak;
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
      }

      function startTimer() {
        running = true;
        statusMessage = mode === "focus" ? focusMessages.running : breakMessages.running;
        startAmbient();
        if (!intervalId) {
          intervalId = window.setInterval(tick, 1000);
        }
        render();
      }

      function pauseTimer() {
        running = false;
        statusMessage = mode === "focus" ? focusMessages.paused : breakMessages.paused;
        stopAmbient();
        render();
      }

      function tick() {
        if (!running) return;
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          finishRound();
        }
        render();
      }

      function finishRound() {
        playAlarm();
        if (mode === "focus") {
          cycleFocusCount += 1;
          state.completedToday += 1;
          const activeTask = getActiveNote();
          if (activeTask) activeTask.pomodoros = (activeTask.pomodoros || 0) + 1;
          const key = todayKey();
          state.streakDays[key] = (state.streakDays[key] || 0) + 1;
          mode = "break";
          startRound((cycleFocusCount % 4 === 0 ? state.longBreakMinutes : state.shortBreakMinutes) * 60);
          statusMessage = `${quotes[(state.completedToday - 1) % quotes.length]} Respira. Estirate. Toma agua.`;
          showCompletionMoment();
        } else {
          mode = "focus";
          startRound(state.focusMinutes * 60);
          statusMessage = focusMessages.running;
        }
        pulseRoundChange();
        saveState();
      }

      function skipRound() {
        playAlarm();
        if (mode === "focus") {
          mode = "break";
          startRound(state.shortBreakMinutes * 60);
          statusMessage = breakMessages.idle;
        } else {
          mode = "focus";
          startRound(state.focusMinutes * 60);
          statusMessage = focusMessages.idle;
        }
        running = false;
        stopAmbient();
        pulseRoundChange();
        render();
      }

      function resetCurrentMode() {
        startRound((mode === "focus" ? state.focusMinutes : state.shortBreakMinutes) * 60);
        running = false;
        statusMessage = mode === "focus" ? focusMessages.idle : breakMessages.idle;
        stopAmbient();
        render();
      }

      function pulseRoundChange() {
        elements.shell.dataset.roundChange = "true";
        if (canAnimate()) {
          gsap.fromTo(
            elements.timer,
            { scale: 0.985 },
            { scale: 1, duration: 0.42, ease: "power2.out", clearProps: "transform" },
          );
        }
        window.clearTimeout(roundChangeTimeout);
        roundChangeTimeout = window.setTimeout(() => {
          elements.shell.dataset.roundChange = "false";
        }, 900);
      }

      function showCompletionMoment() {
        const completed = state.completedToday;
        const plural = completed === 1 ? "ventana completada" : "ventanas completadas";
        elements.completionKicker.textContent = "Ventana guardada";
        elements.completionText.textContent = `${completed} ${plural} hoy. Ahora respira un poco.`;
        elements.completionToast.dataset.visible = "true";
        animateCompletionToast();
        window.clearTimeout(completionTimeout);
        completionTimeout = window.setTimeout(() => {
          hideCompletionToast();
        }, 4600);
      }

      function ensureAudioContext() {
        audioContext ||= new AudioContext();
        return audioContext;
      }

      function startAmbient() {
        updateAmbientVolume();
        elements.ambientAudio.play().catch(() => {
          statusMessage = "Toca Play otra vez para activar el audio del navegador.";
          render();
        });
      }

      function stopAmbient() {
        elements.ambientAudio.pause();
      }

      function updateAmbientVolume() {
        elements.ambientAudio.volume = state.ambientVolume / 100;
      }

      function getSceneUrl() {
        return `${window.location.origin}/scenes/${state.sceneId}/background.webp`;
      }

      async function openFloatingTimer(preferredLayout = "clock") {
        if (!("documentPictureInPicture" in window)) {
          statusMessage = "Tu navegador aun no soporta ventana flotante. Usa Companion o Mini.";
          render();
          return;
        }

        floatingLayout = preferredLayout;

        if (floatingWindow && !floatingWindow.closed) {
          try {
            floatingWindow.resizeTo(
              floatingLayout === "note" ? 340 : floatingLayout === "clock" ? 224 : 320,
              floatingLayout === "note" ? 260 : floatingLayout === "clock" ? 104 : 244,
            );
          } catch {}
          updateFloatingTimer();
          floatingWindow.focus();
          return;
        }

        try {
          floatingWindow = await window.documentPictureInPicture.requestWindow({
            width: floatingLayout === "note" ? 340 : 224,
            height: floatingLayout === "note" ? 260 : 104,
          });
        } catch {
          statusMessage = "No pude abrir el flotante. Prueba desde Chrome o la PWA instalada.";
          render();
          return;
        }

        floatingWindow.document.body.innerHTML = `
          <main class="float-shell" data-float-layout="clock">
            <div class="float-topline">
              <span class="float-dot" data-float-dot></span>
              <p class="float-mode" data-float-mode></p>
              <button class="float-layout-toggle" type="button" data-float-layout-toggle>Vista</button>
            </div>
            <button class="float-timer-button" type="button" aria-label="Play o pausa" data-float-timer-button>
              <strong class="float-timer" data-float-timer></strong>
            </button>
            <div class="float-progress" aria-hidden="true">
              <span data-float-progress></span>
            </div>
            <p class="float-message" data-float-message></p>
            <p class="float-today" data-float-today></p>
            <section class="float-note" data-float-note>
              <div class="float-note-head">
                <span>Nota activa</span>
                <em data-float-note-time></em>
              </div>
              <strong data-float-note-title></strong>
              <p data-float-note-body></p>
            </section>
            <div class="float-controls">
              <button class="float-primary" type="button" data-float-toggle></button>
              <button type="button" data-float-skip>Saltar</button>
            </div>
          </main>
        `;

        const style = floatingWindow.document.createElement("style");
        style.textContent = `
          :root {
            color-scheme: dark;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            --cream: #fff7e8;
            --quiet: rgba(255, 247, 232, 0.68);
            --ember: #f4b267;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            color: var(--cream);
            background: transparent;
          }

          .float-shell {
            position: relative;
            display: grid;
            width: 100%;
            height: 100%;
            place-items: center;
            align-content: center;
            gap: 9px;
            padding: 18px 20px;
            text-align: center;
            background:
              radial-gradient(circle at 18% 78%, rgba(244, 178, 103, 0.22), transparent 42%),
              radial-gradient(circle at 82% 10%, rgba(8, 12, 12, 0.18), transparent 38%),
              linear-gradient(180deg, rgba(5, 5, 4, 0.42), rgba(5, 5, 4, 0.7)),
              var(--float-scene),
              linear-gradient(145deg, #1a130e, #0b100f 58%, #080a09);
            background-position: center;
            background-size: cover;
          }

          .float-topline {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 28px;
            padding: 0 4px 0 12px;
            border: 1px solid rgba(255, 247, 232, 0.14);
            border-radius: 999px;
            background: rgba(255, 247, 232, 0.06);
          }

          .float-dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: var(--ember);
            box-shadow: 0 0 18px rgba(244, 178, 103, 0.86);
          }

          .float-mode {
            margin: 0;
            color: var(--quiet);
            font-size: 0.82rem;
          }

          .float-layout-toggle {
            min-width: 48px;
            min-height: 24px;
            padding: 0 9px;
            border-color: rgba(255, 226, 172, 0.2);
            background: rgba(255, 226, 172, 0.1);
            color: rgba(255, 247, 232, 0.82);
            font-size: 0.7rem;
          }

          .float-timer-button {
            min-width: 0;
            min-height: 0;
            padding: 0;
            border: 0;
            background: transparent;
            color: inherit;
          }

          .float-timer {
            font-family: "Times New Roman", ui-serif, Georgia, Cambria, serif;
            font-size: 4.85rem;
            font-weight: 400;
            line-height: 0.9;
            text-shadow: 0 8px 34px rgba(0, 0, 0, 0.52);
          }

          .float-progress {
            width: min(210px, 80vw);
            height: 5px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(255, 247, 232, 0.12);
          }

          .float-progress span {
            display: block;
            width: 0%;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, var(--ember), #ffe2ac);
            transition: width 300ms ease;
          }

          .float-message,
          .float-today {
            margin: 0;
            color: var(--quiet);
            font-size: 0.78rem;
          }

          .float-message {
            max-width: 250px;
            min-height: 17px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .float-controls {
            display: flex;
            gap: 8px;
          }

          .float-note {
            display: none;
          }

          button {
            min-width: 82px;
            min-height: 38px;
            border: 1px solid rgba(255, 247, 232, 0.2);
            border-radius: 999px;
            background: rgba(255, 247, 232, 0.07);
            color: var(--cream);
            font: inherit;
            cursor: pointer;
          }

          .float-primary {
            min-width: 94px;
            background: rgba(255, 226, 172, 0.16);
            border-color: rgba(255, 226, 172, 0.32);
          }

          .float-topline .float-layout-toggle {
            min-width: 48px;
            min-height: 24px;
            padding: 0 9px;
          }

          .float-shell[data-float-layout="clock"] {
            gap: 0;
            padding: 0;
            background:
              linear-gradient(180deg, rgba(6, 5, 4, 0.24), rgba(6, 5, 4, 0.42)),
              var(--float-scene),
              linear-gradient(145deg, #1a130e, #0b100f 58%, #080a09);
            background-position: center;
            background-size: cover;
          }

          .float-shell[data-float-layout="clock"] .float-timer {
            font-size: 4rem;
            line-height: 1;
            text-shadow:
              0 2px 12px rgba(0, 0, 0, 0.78),
              0 0 28px rgba(0, 0, 0, 0.62);
          }

          .float-shell[data-float-layout="clock"] .float-topline {
            position: absolute;
            top: 6px;
            right: 6px;
            min-height: 24px;
            padding: 0;
            border: 0;
            background: transparent;
            opacity: 0;
            transition: opacity 160ms ease;
          }

          .float-shell[data-float-layout="clock"]:hover .float-topline,
          .float-shell[data-float-layout="clock"]:focus-within .float-topline {
            opacity: 1;
          }

          .float-shell[data-float-layout="clock"] .float-dot,
          .float-shell[data-float-layout="clock"] .float-mode,
          .float-shell[data-float-layout="clock"] .float-progress,
          .float-shell[data-float-layout="clock"] .float-message,
          .float-shell[data-float-layout="clock"] .float-today,
          .float-shell[data-float-layout="clock"] .float-controls {
            display: none;
          }

          .float-shell[data-float-layout="note"] {
            padding: 10px;
            background:
              linear-gradient(180deg, rgba(6, 5, 4, 0.24), rgba(6, 5, 4, 0.52)),
              var(--float-scene),
              linear-gradient(145deg, #1a130e, #0b100f 58%, #080a09);
            background-position: center;
            background-size: cover;
          }

          .float-shell[data-float-layout="note"] .float-topline,
          .float-shell[data-float-layout="note"] .float-timer-button,
          .float-shell[data-float-layout="note"] .float-progress,
          .float-shell[data-float-layout="note"] .float-message,
          .float-shell[data-float-layout="note"] .float-today,
          .float-shell[data-float-layout="note"] .float-controls {
            display: none;
          }

          .float-shell[data-float-layout="note"] .float-note {
            display: grid;
            width: 100%;
            height: 100%;
            align-content: start;
            gap: 9px;
            padding: 14px;
            border: 1px solid rgba(255, 226, 172, 0.24);
            border-radius: 8px;
            background:
              radial-gradient(circle at 18% 8%, rgba(255, 226, 172, 0.18), transparent 42%),
              linear-gradient(180deg, rgba(22, 18, 14, 0.64), rgba(10, 9, 8, 0.78));
            box-shadow:
              inset 0 1px 0 rgba(255, 247, 232, 0.08),
              0 20px 46px rgba(0, 0, 0, 0.32);
            backdrop-filter: blur(10px);
            text-align: left;
          }

          .float-note-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }

          .float-note-head span,
          .float-note-head em {
            color: rgba(255, 226, 172, 0.74);
            font-size: 0.7rem;
            font-style: normal;
            font-weight: 700;
          }

          .float-note strong {
            color: var(--cream);
            font-size: 1.16rem;
            line-height: 1.16;
          }

          .float-note p {
            display: -webkit-box;
            margin: 0;
            overflow: hidden;
            color: var(--quiet);
            font-size: 0.84rem;
            line-height: 1.42;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 5;
            white-space: pre-line;
          }

        `;
        floatingWindow.document.head.append(style);

        floatingWindow.document.querySelector("[data-float-timer-button]").addEventListener("click", () => {
          if (running) {
            pauseTimer();
          } else {
            startTimer();
          }
        });
        floatingWindow.document.querySelector("[data-float-toggle]").addEventListener("click", () => {
          if (running) {
            pauseTimer();
          } else {
            startTimer();
          }
        });
        floatingWindow.document.querySelector("[data-float-skip]").addEventListener("click", skipRound);
        floatingWindow.document.querySelector("[data-float-layout-toggle]").addEventListener("click", () => {
          floatingLayout = floatingLayout === "clock" ? "companion" : "clock";
          try {
            floatingWindow.resizeTo(floatingLayout === "clock" ? 224 : 320, floatingLayout === "clock" ? 104 : 244);
          } catch {}
          updateFloatingTimer();
        });
        floatingWindow.addEventListener("pagehide", () => {
          floatingWindow = null;
        });

        updateFloatingTimer();
      }

      function updateFloatingTimer() {
        if (!floatingWindow || floatingWindow.closed) return;
        const totalSeconds = currentTotalSeconds();
        const elapsed = Math.max(0, totalSeconds - secondsLeft);
        const progress = totalSeconds > 0 ? Math.min(100, Math.round((elapsed / totalSeconds) * 100)) : 0;
        floatingWindow.document.body.style.setProperty("--float-scene", `url("${getSceneUrl()}")`);
        if (floatingLayout === "note" && !getActiveNote()) {
          floatingLayout = "clock";
        }
        floatingWindow.document.querySelector(".float-shell").dataset.floatLayout = floatingLayout;
        floatingWindow.document.querySelector("[data-float-layout-toggle]").textContent =
          floatingLayout === "clock" ? "Vista" : "Reloj";
        const activeNote = getActiveNote();
        floatingWindow.document.querySelector("[data-float-note-title]").textContent = activeNote?.title || "Sin nota activa";
        floatingWindow.document.querySelector("[data-float-note-body]").textContent = activeNote?.body || "Elige una nota activa desde el Cuaderno.";
        floatingWindow.document.querySelector("[data-float-note-time]").textContent = formatTime(secondsLeft);
        floatingWindow.document.querySelector("[data-float-mode]").textContent =
          mode === "focus" ? "Ventana abierta" : "Descanso";
        floatingWindow.document.querySelector("[data-float-timer]").textContent = formatTime(secondsLeft);
        floatingWindow.document.querySelector("[data-float-progress]").style.width = `${progress}%`;
        floatingWindow.document.querySelector("[data-float-message]").textContent = running
          ? mode === "focus"
            ? "Ventana abierta. Sigue aqui."
            : "Respira. Vuelve ligero."
          : mode === "focus"
            ? "Listo para empezar."
            : "Descanso listo.";
        floatingWindow.document.querySelector("[data-float-today]").textContent =
          `${state.completedToday} ${state.completedToday === 1 ? "ventana" : "ventanas"} hoy`;
        floatingWindow.document.querySelector("[data-float-toggle]").textContent = running ? "Pausa" : "Play";
      }

      function playAlarm() {
        if (state.alarm === "none") return;
        const context = ensureAudioContext();
        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const frequencies = {
          bell: 660,
          gong: 220,
          birds: 920,
        };

        oscillator.type = state.alarm === "gong" ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequencies[state.alarm] || 660, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 1.25);
      }

      elements.toggle.addEventListener("click", () => {
        if (running) {
          pauseTimer();
        } else {
          startTimer();
        }
      });

      elements.reset.addEventListener("click", resetCurrentMode);
      elements.skip.addEventListener("click", skipRound);
      elements.floatingToggle.addEventListener("click", () => openFloatingTimer("clock"));
      elements.completeTest.addEventListener("click", () => {
        if (mode !== "focus") {
          mode = "focus";
        }
        finishRound();
        render();
      });

      if (new URLSearchParams(window.location.search).has("dev")) {
        elements.devTools.hidden = false;
      }

      const shouldEnableServiceWorker = elements.shell.dataset.enableServiceWorker === "true";

      if ("serviceWorker" in navigator && shouldEnableServiceWorker) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("/sw.js").catch(() => {});
        });
      } else if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
        if ("caches" in window) {
          caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
        }
      }

      window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        installPromptEvent = event;
        elements.installButton.hidden = false;
      });

      elements.installButton.addEventListener("click", async () => {
        if (!installPromptEvent) return;
        elements.installButton.hidden = true;
        installPromptEvent.prompt();
        await installPromptEvent.userChoice;
        installPromptEvent = null;
      });

      window.addEventListener("appinstalled", () => {
        elements.installButton.hidden = true;
        installPromptEvent = null;
      });

      elements.settingsToggle.addEventListener("click", () => {
        togglePanel("settings");
      });

      elements.settingsClose.addEventListener("click", () => {
        hidePanel(elements.settingsPanel);
      });

      elements.windowsToggle.addEventListener("click", () => {
        togglePanel("windows");
      });

      elements.windowsClose.addEventListener("click", () => {
        hidePanel(elements.windowsPanel);
      });

      elements.extensionsToggle.addEventListener("click", () => {
        togglePanel("extensions");
      });

      elements.extensionsClose.addEventListener("click", () => {
        hidePanel(elements.extensionsPanel);
      });

      elements.ostToggle.addEventListener("click", () => togglePanel("ost"));
      elements.ostClose.addEventListener("click", () => hidePanel(elements.ostPanel));
      elements.ostVolume.value = state.ostVolume;
      elements.ostPillVolume.value = state.ostVolume;
      elements.ostAudio.volume = state.ostVolume / 100;
      [elements.ostVolume, elements.ostPillVolume].forEach((slider) => {
        slider.addEventListener("input", () => {
          state.ostVolume = clampNumber(slider.value, 0, 100, defaults.ostVolume);
          elements.ostVolume.value = state.ostVolume;
          elements.ostPillVolume.value = state.ostVolume;
          elements.ostAudio.volume = state.ostVolume / 100;
          saveState();
        });
      });
      async function toggleOstPlayback() {
        if (elements.ostAudio.paused) {
          if (!elements.ostAudio.src) {
            elements.ostStatus.textContent = "Añade una pista para escucharla";
            // Sin pista elegida, la píldora lleva a la biblioteca en vez de quedarse muda.
            if (elements.ostPanel.hidden) togglePanel("ost");
            return;
          }
          try {
            await elements.ostAudio.play();
          } catch {
            elements.ostStatus.textContent = "No se pudo reproducir esta pista";
          }
        } else {
          elements.ostAudio.pause();
        }
      }
      elements.ostPlay.addEventListener("click", toggleOstPlayback);
      elements.ostPillPlay.addEventListener("click", toggleOstPlayback);
      function syncOstPlaybackUi() {
        const playing = !elements.ostAudio.paused;
        elements.ostPlay.textContent = playing ? "Ⅱ" : "▶";
        elements.ostPlay.setAttribute("aria-label", playing ? "Pausar música" : "Reproducir música");
        elements.ostPillPlay.setAttribute("aria-label", playing ? "Pausar música" : "Reproducir música");
        elements.ostPill.dataset.playing = playing ? "true" : "false";
        renderOstTracks();
      }
      elements.ostAudio.addEventListener("play", syncOstPlaybackUi);
      elements.ostAudio.addEventListener("pause", syncOstPlaybackUi);
      elements.ostUpload.addEventListener("change", async () => {
        const files = Array.from(elements.ostUpload.files || []).filter((file) => file.type.startsWith("audio/") || /\.(mp3|ogg|wav|m4a|flac)$/i.test(file.name));
        if (!files.length) return;
        try {
          for (const file of files) {
            const id = `ost-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
            await writeOstTrack({ id, name: file.name.replace(/\.[^.]+$/, ""), file });
          }
          ostTracks = await readOstTracks();
          renderOstTracks();
        } catch {
          elements.ostStatus.textContent = "No se pudieron guardar esas pistas";
        }
        elements.ostUpload.value = "";
      });
      elements.ostList.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-ost-action]");
        if (!button) return;
        const track = ostTracks.find((item) => item.id === button.dataset.ostId);
        if (!track) return;
        if (button.dataset.ostAction === "play-track") {
          if (state.ostTrackId !== track.id) {
            elements.ostAudio.pause();
            state.ostTrackId = track.id;
            elements.ostAudio.src = ostUrlFor(track);
            saveState();
          }
          try {
            await elements.ostAudio.play();
          } catch {
            elements.ostStatus.textContent = "No se pudo reproducir esta pista";
          }
        } else if (button.dataset.ostAction === "remove-track") {
          if (state.ostTrackId === track.id) {
            elements.ostAudio.pause();
            elements.ostAudio.removeAttribute("src");
            state.ostTrackId = "";
          }
          const url = ostTrackUrls.get(track.id);
          if (url) URL.revokeObjectURL(url);
          ostTrackUrls.delete(track.id);
          try {
            await removeOstTrack(track.id);
            ostTracks = ostTracks.filter((item) => item.id !== track.id);
            saveState();
            renderOstTracks();
          } catch {
            elements.ostStatus.textContent = "No se pudo quitar esta pista";
          }
        }
      });
      loadOstLibrary();

      elements.notebookToggle.addEventListener("click", () => {
        togglePanel("notebook");
      });

      elements.activeNoteOpen.addEventListener("click", () => {
        if (!state.extensions.notebook) return;
        toggleNoteSwitcher();
      });

      elements.noteFloat.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!getActiveNote()) return;
        hideNoteSwitcher();
        openFloatingTimer("note");
      });

      elements.notebookClose.addEventListener("click", () => {
        hidePanel(elements.notebookPanel);
      });

      elements.extensionToggles.forEach((input) => {
        input.addEventListener("change", () => {
          const key = input.dataset.extensionToggle;
          if (!key) return;
          state.extensions[key] = input.checked;
          if (key === "notebook" && !input.checked) {
            hidePanel(elements.notebookPanel);
          }
          saveState();
          render();
        });
      });

      elements.notebookDrafts.forEach((input) => {
        input.addEventListener("input", () => {
          const key = input.dataset.notebookDraft;
          if (!key) return;
          state.notebook[key === "title" ? "draftTitle" : "draftBody"] = input.value;
          saveState();
        });
      });

      elements.notebookForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const title = state.notebook.draftTitle.trim();
        const body = state.notebook.draftBody.trim();
        if (!title && !body) return;
        const firstLine = body.split("\n").find(Boolean) || "";
        const note = {
          id: `note-${Date.now()}`,
          title: title || firstLine.slice(0, 72) || "Nota de ventana",
          body,
          createdAt: Date.now(),
          completed: false,
          pomodoros: 0,
        };
        state.notebook.notes.unshift(note);
        state.notebook.activeNoteId = note.id;
        state.notebook.draftTitle = "";
        state.notebook.draftBody = "";
        saveState();
        render();
        animateNoteCard(note.id);
      });

      elements.notesList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-note-action]");
        const card = event.target.closest("[data-note-id]");
        if (!button || !card) return;
        const noteId = card.dataset.noteId;
        const task = state.notebook.notes.find((note) => note.id === noteId);
        if (!task) return;
        if (button.dataset.noteAction === "complete") {
          toggleTaskCompleted(noteId);
          return;
        }
        if (button.dataset.noteAction === "reopen") {
          task.completed = false;
          state.notebook.activeNoteId = noteId;
          saveState();
          render();
          return;
        }
        if (button.dataset.noteAction === "activate") {
          state.notebook.activeNoteId = noteId;
          saveState();
          render();
          animateNoteCard(noteId);
          return;
        }
        if (button.dataset.noteAction === "float") {
          state.notebook.activeNoteId = noteId;
          saveState();
          render();
          animateNoteCard(noteId);
          openFloatingTimer("note");
          return;
        }
        if (button.dataset.noteAction === "delete") {
          state.notebook.notes = state.notebook.notes.filter((note) => note.id !== noteId);
          if (state.notebook.activeNoteId === noteId) {
            state.notebook.activeNoteId = state.notebook.notes.find((note) => !note.completed)?.id || "";
          }
        }
        saveState();
        render();
      });

      elements.noteSwitcher.addEventListener("click", (event) => {
        const button = event.target.closest("[data-note-switch-action]");
        if (!button) return;
        const action = button.dataset.noteSwitchAction;
        if (action === "new") {
          hideNoteSwitcher();
          closePanels("notebook");
          showPanel(elements.notebookPanel);
          elements.notebookPanel.querySelector("[data-notebook-draft='title']")?.focus();
          return;
        }
        if (action === "clear") {
          state.notebook.notes = state.notebook.notes.filter((note) => !note.completed);
          saveState();
          render();
          return;
        }
        const row = event.target.closest("[data-note-id]");
        if (!row) return;
        const noteId = row.dataset.noteId;
        if (action === "toggle") {
          toggleTaskCompleted(noteId);
          return;
        }
        state.notebook.activeNoteId = noteId;
        saveState();
        render();
        animateNoteCard(noteId);
        hideNoteSwitcher();
        if (action === "float") openFloatingTimer("note");
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hideNoteSwitcher();
      });

      document.addEventListener("pointerdown", (event) => {
        const clickedInsidePanel = event.target.closest(
          "[data-settings-panel], [data-windows-panel], [data-extensions-panel], [data-notebook-panel], [data-ost-panel]",
        );
        const clickedToggle = event.target.closest(
          "[data-settings-toggle], [data-windows-toggle], [data-extensions-toggle], [data-notebook-toggle], [data-ost-toggle], [data-active-note], [data-note-float]",
        );
        if (!clickedInsidePanel && !clickedToggle) {
          closePanels("");
          hideNoteSwitcher();
        }
      });

      elements.sceneOptions.forEach((option) => {
        option.addEventListener("click", () => {
          const sceneId = option.dataset.sceneOption;
          if (!sceneIds.includes(sceneId)) return;
          state.sceneId = sceneId;
          saveState();
          render();
        });
      });

      elements.settings.forEach((input) => {
        input.addEventListener("input", () => {
          const key = input.dataset.setting;
          if (!key) return;
          if (input.type === "number") {
            const limits = {
              focusMinutes: [1, 90, defaults.focusMinutes],
              shortBreakMinutes: [1, 45, defaults.shortBreakMinutes],
              longBreakMinutes: [1, 60, defaults.longBreakMinutes],
            };
            const [min, max, fallback] = limits[key];
            state[key] = clampNumber(input.value, min, max, fallback);
            if (!running) resetCurrentMode();
          } else if (input.type === "range") {
            state[key] = clampNumber(input.value, 0, 100, defaults[key]);
            if (key === "ambientVolume") {
              updateAmbientVolume();
            }
          } else {
            state[key] = input.value;
          }
          saveState();
          render();
        });
      });

      saveState();
      render();
