/**
 * ============================================================================
 * SmartNotes AI - Main Application Script
 * ============================================================================
 * Technology: Vanilla JavaScript (ES6+), HTML5, CSS3, Browser LocalStorage
 * Purpose: Complete Notes Management Application for College Examination
 *
 * Core Functional Modules:
 *  1. State Management & Initialization
 *  2. LocalStorage Persistence Layer (Safe Load, Save & Sample Data)
 *  3. CRUD Operations (Create, Read, Update, Delete)
 *  4. Pinning & Sorting Logic
 *  5. Live Search & Folder Filtering
 *  6. UI Rendering & DOM Updates
 *  7. Modal & Confirmation Dialog Management
 *  8. Toast Notification System
 *  9. AI Writing Assistant & Offline Fallbacks
 * ============================================================================
 */

// Strict mode for cleaner and more secure JavaScript execution
'use strict';

/* ==========================================================================
   1. State Management & Constants
   ========================================================================== */

const STORAGE_KEY = 'smartnotes_app_data_v1';
const AI_CONFIG_KEY = 'smartnotes_ai_config_v1';

// Application State
const appState = {
  notes: [],                  // Array of note objects
  activeFolder: 'all',        // Current folder filter: 'all' | 'Personal' | 'Work' | 'Study' | 'Others'
  searchQuery: '',            // Current search query string
  currentSort: 'updated-desc',// Sort order: 'updated-desc' | 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc'
  editingNoteId: null,        // Note ID currently being edited in modal (or null for new note)
  pendingDeleteId: null,      // Note ID waiting for deletion confirmation
  aiHistory: null,            // Undo stack for AI assistant transformations
  aiConfig: {                 // AI Assistant configuration
    provider: 'offline',      // 'offline' | 'gemini' | 'openai'
    apiKey: ''
  }
};

/* ==========================================================================
   2. LocalStorage Persistence Layer
   ========================================================================== */

/**
 * Safely loads notes from browser LocalStorage.
 * Prevents application crash if data is corrupted or invalid.
 * @returns {Array} Array of notes
 */
function loadNotesFromStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      // First visit: initialize sample notes
      return getSampleNotes();
    }
    const parsedData = JSON.parse(rawData);
    if (Array.isArray(parsedData)) {
      return parsedData;
    } else {
      console.warn('LocalStorage data was not an array. Resetting to sample notes.');
      return getSampleNotes();
    }
  } catch (error) {
    console.error('Error loading notes from LocalStorage:', error);
    showToast('Failed to read local data. Using safe default notes.', 'danger');
    return getSampleNotes();
  }
}

/**
 * Persists the current notes array to browser LocalStorage.
 * @param {Array} notes - The notes array to save
 * @returns {boolean} True if successfully saved, false otherwise
 */
function saveNotesToStorage(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch (error) {
    console.error('Error writing to LocalStorage:', error);
    showToast('Storage quota exceeded or storage disabled.', 'danger');
    return false;
  }
}

/**
 * Loads AI configuration from LocalStorage.
 */
function loadAiConfigFromStorage() {
  try {
    const rawConfig = localStorage.getItem(AI_CONFIG_KEY);
    if (rawConfig) {
      const parsed = JSON.parse(rawConfig);
      appState.aiConfig = {
        provider: parsed.provider || 'offline',
        apiKey: parsed.apiKey || ''
      };
    }
  } catch (e) {
    console.warn('Could not parse AI config, using offline default.');
  }
}

/**
 * Persists AI configuration to LocalStorage.
 */
function saveAiConfigToStorage() {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(appState.aiConfig));
  } catch (e) {
    console.error('Error saving AI config to LocalStorage:', e);
  }
}

/**
 * Generates initial sample notes for demonstration on first-time launch.
 * Only loaded when storage is empty.
 * @returns {Array} Array of sample note objects
 */
function getSampleNotes() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60);
  const yesterday = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const twoDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 48);

  const initialNotes = [
    {
      id: 'sample-1',
      title: '📌 Welcome to SmartNotes AI!',
      content: 'SmartNotes is a modern, responsive notes management web app designed for effortless organization.\n\nKey Highlights:\n- 📝 Create, Edit & Delete notes with real-time saving\n- 🔍 Instant live search across titles and note contents\n- 📂 Categorize notes into Personal, Work, Study, or Others\n- 📌 Pin important notes so they always stay on top\n- ✨ Built-in Smart AI Assistant for summarization, bullet lists, and grammar formatting (works 100% offline!)',
      folder: 'Personal',
      isPinned: true,
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: 'sample-2',
      title: 'Sprint 42 Project Deliverables',
      content: 'Key deliverables for Friday release:\n1. Complete user dashboard UI responsiveness\n2. Integrate LocalStorage with fallback error recovery\n3. Implement live search debouncing for fast indexing\n4. Prepare automated test suite and documentation\n\nNext team standup scheduled for tomorrow at 10:00 AM.',
      folder: 'Work',
      isPinned: false,
      createdAt: yesterday.toISOString(),
      updatedAt: yesterday.toISOString()
    },
    {
      id: 'sample-3',
      title: 'Data Structures: Tree Traversals',
      content: 'Quick revision on Binary Tree Traversals:\n- Inorder (Left, Root, Right): Yields sorted sequence in Binary Search Trees\n- Preorder (Root, Left, Right): Useful for copying trees & prefix expressions\n- Postorder (Left, Right, Root): Useful for tree deletion and postfix notation\n- Level-Order (BFS): Uses a FIFO Queue for level-by-level evaluation.',
      folder: 'Study',
      isPinned: false,
      createdAt: oneHourAgo.toISOString(),
      updatedAt: oneHourAgo.toISOString()
    },
    {
      id: 'sample-4',
      title: 'Book Recommendations & Podcasts',
      content: 'To read & listen this semester:\n- "Atomic Habits" by James Clear\n- "Clean Code" by Robert C. Martin\n- "Designing Data-Intensive Applications" by Martin Kleppmann\n- Podcast: The Changelog & Syntax.fm for web development trends.',
      folder: 'Others',
      isPinned: false,
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: twoDaysAgo.toISOString()
    }
  ];

  // Save the samples immediately so subsequent calls use saved data
  saveNotesToStorage(initialNotes);
  return initialNotes;
}

/* ==========================================================================
   3. CRUD Operations (Create, Read, Update, Delete)
   ========================================================================== */

/**
 * Creates a new note and updates LocalStorage.
 * @param {string} title - Note title
 * @param {string} content - Note body content
 * @param {string} folder - Assigned folder
 * @param {boolean} isPinned - Whether note is pinned
 * @returns {Object} Newly created note object
 */
function createNote(title, content, folder, isPinned = false) {
  const timestamp = new Date().toISOString();
  const newNote = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    title: title.trim(),
    content: content.trim(),
    folder: folder || 'Personal',
    isPinned: Boolean(isPinned),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  // Add to beginning of array
  appState.notes.unshift(newNote);
  saveNotesToStorage(appState.notes);
  
  showToast('Note created successfully!', 'success');
  renderApp();
  return newNote;
}

/**
 * Updates an existing note and refreshes LocalStorage.
 * @param {string} id - ID of note to update
 * @param {string} title - Updated title
 * @param {string} content - Updated body
 * @param {string} folder - Updated folder
 * @param {boolean} isPinned - Updated pinned state
 * @returns {boolean} True if updated, false if not found
 */
function updateNote(id, title, content, folder, isPinned) {
  const noteIndex = appState.notes.findIndex(n => n.id === id);
  if (noteIndex === -1) {
    showToast('Note not found.', 'danger');
    return false;
  }

  const existing = appState.notes[noteIndex];
  appState.notes[noteIndex] = {
    ...existing,
    title: title.trim(),
    content: content.trim(),
    folder: folder || existing.folder,
    isPinned: isPinned !== undefined ? Boolean(isPinned) : existing.isPinned,
    updatedAt: new Date().toISOString()
  };

  saveNotesToStorage(appState.notes);
  showToast('Note updated successfully!', 'success');
  renderApp();
  return true;
}

/**
 * Deletes a note permanently from storage after user confirmation.
 * @param {string} id - ID of note to delete
 * @returns {boolean} True if deleted, false if not found
 */
function deleteNote(id) {
  const noteIndex = appState.notes.findIndex(n => n.id === id);
  if (noteIndex === -1) {
    showToast('Note not found.', 'danger');
    return false;
  }

  const deletedNote = appState.notes[noteIndex];
  appState.notes.splice(noteIndex, 1);
  saveNotesToStorage(appState.notes);

  showToast(`"${truncateString(deletedNote.title, 25)}" deleted.`, 'info');
  renderApp();
  return true;
}

/**
 * Toggles the pinned status of a note.
 * @param {string} id - Note ID
 */
function togglePin(id) {
  const note = appState.notes.find(n => n.id === id);
  if (!note) return;

  note.isPinned = !note.isPinned;
  note.updatedAt = new Date().toISOString();
  saveNotesToStorage(appState.notes);

  if (note.isPinned) {
    showToast('Note pinned to the top 📌', 'info');
  } else {
    showToast('Note unpinned', 'info');
  }

  renderApp();
}

/* ==========================================================================
   4. Filtering, Searching & Sorting Logic
   ========================================================================== */

/**
 * Filters and sorts notes according to current folder, search query, and sort setting.
 * @returns {Object} { pinnedNotes: Array, otherNotes: Array, totalMatches: number }
 */
function getFilteredAndSortedNotes() {
  let filtered = [...appState.notes];

  // 1. Filter by Folder
  if (appState.activeFolder !== 'all') {
    filtered = filtered.filter(note => note.folder === appState.activeFolder);
  }

  // 2. Filter by Live Search Query (matches title OR content, case-insensitive)
  if (appState.searchQuery.trim() !== '') {
    const q = appState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(note => 
      (note.title && note.title.toLowerCase().includes(q)) ||
      (note.content && note.content.toLowerCase().includes(q))
    );
  }

  // 3. Sort logic helper
  const sortComparator = (a, b) => {
    switch (appState.currentSort) {
      case 'updated-desc':
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      case 'created-desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'created-asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'title-asc':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case 'title-desc':
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      default:
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  };

  // 4. Split into Pinned and Other notes (Pinned always stays on top!)
  const pinnedNotes = filtered.filter(n => n.isPinned).sort(sortComparator);
  const otherNotes = filtered.filter(n => !n.isPinned).sort(sortComparator);

  return {
    pinnedNotes,
    otherNotes,
    totalMatches: filtered.length
  };
}

/**
 * Updates the search query and re-renders notes list.
 * @param {string} query - Live search query string
 */
function handleSearch(query) {
  appState.searchQuery = query;
  
  const clearBtn = document.getElementById('clearSearchBtn');
  const searchBanner = document.getElementById('searchBanner');
  const searchBannerText = document.getElementById('searchBannerText');

  if (query.trim() !== '') {
    clearBtn.style.display = 'flex';
    searchBanner.classList.remove('hidden');
    searchBannerText.innerHTML = `Search results for "<strong>${escapeHtml(query)}</strong>"`;
  } else {
    clearBtn.style.display = 'none';
    searchBanner.classList.remove('hidden');
    searchBanner.classList.add('hidden');
  }

  renderNotes();
}

/**
 * Sets active folder filter and updates view.
 * @param {string} folder - 'all' | 'Personal' | 'Work' | 'Study' | 'Others'
 */
function handleFolderFilter(folder) {
  appState.activeFolder = folder;
  
  // Update sidebar active classes
  document.querySelectorAll('.folder-btn').forEach(btn => {
    if (btn.getAttribute('data-folder') === folder) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update view header title and subtitle
  const titleEl = document.getElementById('activeViewTitle');
  const subtitleEl = document.getElementById('activeViewSubtitle');
  
  if (folder === 'all') {
    titleEl.textContent = 'All Notes';
    subtitleEl.textContent = 'Showing all your stored notes across folders';
  } else {
    titleEl.textContent = `${folder} Notes`;
    subtitleEl.textContent = `Filtered notes in the "${folder}" folder`;
  }

  // Close mobile sidebar if open
  closeMobileSidebar();

  renderNotes();
}

/* ==========================================================================
   5. UI Rendering & DOM Updates
   ========================================================================== */

/**
 * Re-renders the entire application state (sidebar badges, views, note cards).
 */
function renderApp() {
  updateSidebarCounts();
  updateAiStatusCard();
  renderNotes();
}

/**
 * Updates folder count badges in the sidebar.
 */
function updateSidebarCounts() {
  const counts = {
    all: appState.notes.length,
    Personal: 0,
    Work: 0,
    Study: 0,
    Others: 0
  };

  appState.notes.forEach(note => {
    if (counts[note.folder] !== undefined) {
      counts[note.folder]++;
    } else {
      counts.Others++;
    }
  });

  document.getElementById('count-all').textContent = counts.all;
  document.getElementById('count-Personal').textContent = counts.Personal;
  document.getElementById('count-Work').textContent = counts.Work;
  document.getElementById('count-Study').textContent = counts.Study;
  document.getElementById('count-Others').textContent = counts.Others;
}

/**
 * Updates the AI status widget in the sidebar and modal.
 */
function updateAiStatusCard() {
  const dot = document.getElementById('aiStatusDot');
  const title = document.getElementById('aiStatusTitle');
  const desc = document.getElementById('aiStatusDesc');
  const helperIndicator = document.getElementById('aiHelperIndicator');

  if (appState.aiConfig.provider === 'gemini' && appState.aiConfig.apiKey) {
    dot.className = 'ai-pulse-dot live';
    title.textContent = 'Google Gemini Connected';
    desc.textContent = 'Live cloud AI assistant enabled for writing & summaries.';
    helperIndicator.className = 'ai-helper-indicator live';
    helperIndicator.textContent = 'Gemini Live AI';
  } else if (appState.aiConfig.provider === 'openai' && appState.aiConfig.apiKey) {
    dot.className = 'ai-pulse-dot live';
    title.textContent = 'OpenAI Connected';
    desc.textContent = 'Live OpenAI model enabled for writing & summaries.';
    helperIndicator.className = 'ai-helper-indicator live';
    helperIndicator.textContent = 'OpenAI Live';
  } else {
    dot.className = 'ai-pulse-dot';
    title.textContent = 'Smart Assistant (Offline)';
    desc.textContent = 'Offline rule-based helper active (No API key required).';
    helperIndicator.className = 'ai-helper-indicator';
    helperIndicator.textContent = 'Built-in (Offline)';
  }
}

/**
 * Renders the notes cards into their respective pinned and normal sections.
 */
function renderNotes() {
  const { pinnedNotes, otherNotes, totalMatches } = getFilteredAndSortedNotes();

  const pinnedSection = document.getElementById('pinnedSection');
  const pinnedGrid = document.getElementById('pinnedGrid');
  const pinnedCountBadge = document.getElementById('pinnedSectionCount');

  const otherSection = document.getElementById('otherSection');
  const otherGrid = document.getElementById('otherGrid');
  const otherCountBadge = document.getElementById('otherSectionCount');
  const otherSectionHeading = document.getElementById('otherSectionHeading');

  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyDesc = document.getElementById('emptyDescription');
  const emptyActionBtn = document.getElementById('emptyActionBtn');
  const statsPill = document.getElementById('notesStatsPill');

  // Update header stats badge
  statsPill.textContent = `${totalMatches} ${totalMatches === 1 ? 'note' : 'notes'}`;

  // Check if no notes match
  if (totalMatches === 0) {
    pinnedSection.classList.add('hidden');
    pinnedGrid.innerHTML = '';
    otherSection.classList.add('hidden');
    otherGrid.innerHTML = '';
    emptyState.classList.remove('hidden');

    if (appState.searchQuery.trim() !== '') {
      emptyTitle.textContent = 'No matching notes found';
      emptyDesc.textContent = `No notes match "${escapeHtml(appState.searchQuery)}". Try searching for different keywords or clear the search.`;
      emptyActionBtn.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Clear Search</span>
      `;
      emptyActionBtn.onclick = () => {
        document.getElementById('searchInput').value = '';
        handleSearch('');
      };
    } else if (appState.activeFolder !== 'all') {
      emptyTitle.textContent = `No notes in "${appState.activeFolder}"`;
      emptyDesc.textContent = `You haven't added any notes to the ${appState.activeFolder} folder yet.`;
      emptyActionBtn.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Create ${appState.activeFolder} Note</span>
      `;
      emptyActionBtn.onclick = () => openNoteModal(null, appState.activeFolder);
    } else {
      emptyTitle.textContent = 'Your notebook is empty';
      emptyDesc.textContent = 'Get started by creating your very first note! You can organize them into folders, pin favorites, and use the smart assistant.';
      emptyActionBtn.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Create First Note</span>
      `;
      emptyActionBtn.onclick = () => openNoteModal();
    }
    return;
  }

  // Hide empty state
  emptyState.classList.add('hidden');

  // 1. Render Pinned Section
  if (pinnedNotes.length > 0) {
    pinnedSection.classList.remove('hidden');
    pinnedCountBadge.textContent = pinnedNotes.length;
    pinnedGrid.innerHTML = pinnedNotes.map(note => createNoteCardHtml(note)).join('');
  } else {
    pinnedSection.classList.add('hidden');
    pinnedGrid.innerHTML = '';
  }

  // 2. Render Other Notes Section
  if (otherNotes.length > 0) {
    otherSection.classList.remove('hidden');
    otherCountBadge.textContent = otherNotes.length;
    
    // Change section header based on whether pinned section exists
    if (pinnedNotes.length > 0) {
      otherSectionHeading.innerHTML = `<span class="section-icon">📝</span> Other Notes <span class="count-badge" id="otherSectionCount">${otherNotes.length}</span>`;
    } else {
      otherSectionHeading.innerHTML = `<span class="section-icon">📝</span> Notes <span class="count-badge" id="otherSectionCount">${otherNotes.length}</span>`;
    }

    otherGrid.innerHTML = otherNotes.map(note => createNoteCardHtml(note)).join('');
  } else {
    otherSection.classList.add('hidden');
    otherGrid.innerHTML = '';
  }

  // Attach event delegation for note card buttons
  attachNoteCardListeners();
}

/**
 * Generates semantic HTML string for a single Note Card.
 * @param {Object} note - The note data
 * @returns {string} HTML markup
 */
function createNoteCardHtml(note) {
  const folderClass = `tag-${note.folder.toLowerCase()}`;
  const isPinnedClass = note.isPinned ? 'is-pinned' : '';
  const pinButtonActiveClass = note.isPinned ? 'active' : '';
  const pinTitle = note.isPinned ? 'Unpin note' : 'Pin note to top';

  const formattedDate = formatDateTime(note.updatedAt || note.createdAt);

  return `
    <article class="note-card ${isPinnedClass}" data-id="${note.id}">
      <div class="note-card-header">
        <h3 class="note-card-title">${escapeHtml(note.title)}</h3>
        <div class="note-card-actions-top">
          <button class="pin-btn ${pinButtonActiveClass}" data-action="pin" title="${pinTitle}" aria-label="${pinTitle}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="${note.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 17v5M5 17h14l-2-6V4H7v7l-2 6zM9 4V2h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="note-card-body">
        <p class="note-card-content">${escapeHtml(note.content)}</p>
      </div>

      <div class="note-card-footer">
        <span class="note-tag ${folderClass}">
          ${getFolderIconSvg(note.folder)}
          <span>${escapeHtml(note.folder)}</span>
        </span>

        <div class="note-meta">
          <span class="note-timestamp" title="Last modified: ${formattedDate}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>${formattedDate}</span>
          </span>

          <div class="note-card-actions">
            <button class="card-action-btn edit-btn" data-action="edit" title="Edit note" aria-label="Edit note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="card-action-btn delete-btn" data-action="delete" title="Delete note" aria-label="Delete note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Returns inline SVG icon corresponding to each folder.
 * @param {string} folder - Folder name
 * @returns {string} SVG snippet
 */
function getFolderIconSvg(folder) {
  switch (folder) {
    case 'Personal':
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    case 'Work':
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    case 'Study':
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
    default:
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`;
  }
}

/**
 * Attaches event listeners to dynamically rendered note cards.
 */
function attachNoteCardListeners() {
  document.querySelectorAll('.note-card').forEach(card => {
    const noteId = card.getAttribute('data-id');

    // Pin button click
    const pinBtn = card.querySelector('[data-action="pin"]');
    if (pinBtn) {
      pinBtn.onclick = (e) => {
        e.stopPropagation();
        togglePin(noteId);
      };
    }

    // Edit button click
    const editBtn = card.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.onclick = (e) => {
        e.stopPropagation();
        openNoteModal(noteId);
      };
    }

    // Delete button click
    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        openDeleteModal(noteId);
      };
    }

    // Clicking card directly opens editor for convenient editing
    card.onclick = () => {
      openNoteModal(noteId);
    };
  });
}

/* ==========================================================================
   6. Modal & Dialog Handling
   ========================================================================== */

/**
 * Opens the Note Create/Edit Modal dialog.
 * @param {string|null} noteId - ID of note to edit, or null to create new
 * @param {string} [defaultFolder] - Optional folder to pre-select
 */
function openNoteModal(noteId = null, defaultFolder = null) {
  const modal = document.getElementById('noteModal');
  const titleInput = document.getElementById('noteTitleInput');
  const contentInput = document.getElementById('noteContentInput');
  const folderSelect = document.getElementById('noteFolderSelect');
  const pinCheckbox = document.getElementById('notePinCheckbox');
  const editIdInput = document.getElementById('editNoteId');
  const modalTitle = document.getElementById('noteModalTitle');
  const modalSubtitle = document.getElementById('noteModalSubtitle');
  const timestampsDisplay = document.getElementById('modalTimestamps');
  const aiNotice = document.getElementById('aiNotice');

  // Reset validation feedback & AI notices
  clearValidationFeedback();
  aiNotice.classList.add('hidden');
  appState.aiHistory = null;

  if (noteId) {
    // Edit existing note
    const note = appState.notes.find(n => n.id === noteId);
    if (!note) return;

    appState.editingNoteId = noteId;
    editIdInput.value = note.id;
    titleInput.value = note.title;
    contentInput.value = note.content;
    folderSelect.value = note.folder;
    pinCheckbox.checked = note.isPinned;

    modalTitle.textContent = 'Edit Note';
    modalSubtitle.textContent = 'Update your note content and organize';

    const createdFormatted = formatDateTime(note.createdAt);
    const updatedFormatted = formatDateTime(note.updatedAt);
    timestampsDisplay.innerHTML = `Created: <strong>${createdFormatted}</strong> | Last Modified: <strong>${updatedFormatted}</strong>`;
  } else {
    // Create new note
    appState.editingNoteId = null;
    editIdInput.value = '';
    titleInput.value = '';
    contentInput.value = '';
    folderSelect.value = defaultFolder || (appState.activeFolder !== 'all' ? appState.activeFolder : 'Personal');
    pinCheckbox.checked = false;

    modalTitle.textContent = 'Create New Note';
    modalSubtitle.textContent = 'Write your thoughts, lecture notes, or project tasks';
    timestampsDisplay.textContent = 'Timestamps will be automatically recorded upon saving.';
  }

  updateContentCounter();
  modal.classList.remove('hidden');

  // Focus title field
  setTimeout(() => titleInput.focus(), 80);
}

/**
 * Closes the Note Create/Edit Modal.
 */
function closeNoteModal() {
  const modal = document.getElementById('noteModal');
  modal.classList.add('hidden');
  appState.editingNoteId = null;
  clearValidationFeedback();
}

/**
 * Opens the Delete Confirmation Modal for safety.
 * @param {string} noteId - ID of note to delete
 */
function openDeleteModal(noteId) {
  const note = appState.notes.find(n => n.id === noteId);
  if (!note) return;

  appState.pendingDeleteId = noteId;
  const deleteModal = document.getElementById('deleteModal');
  const titleText = document.getElementById('deleteNoteTitleText');

  titleText.textContent = `"${note.title}"`;
  deleteModal.classList.remove('hidden');
}

/**
 * Closes the Delete Confirmation Modal.
 */
function closeDeleteModal() {
  const deleteModal = document.getElementById('deleteModal');
  deleteModal.classList.add('hidden');
  appState.pendingDeleteId = null;
}

/**
 * Confirms and executes pending note deletion.
 */
function confirmPendingDelete() {
  if (appState.pendingDeleteId) {
    deleteNote(appState.pendingDeleteId);
    closeDeleteModal();
  }
}

/**
 * Opens the AI Configuration Modal.
 */
function openAiConfigModal() {
  const modal = document.getElementById('aiConfigModal');
  const providerSelect = document.getElementById('aiProviderSelect');
  const apiKeyInput = document.getElementById('aiApiKeyInput');
  const apiKeyGroup = document.getElementById('apiKeyGroup');

  providerSelect.value = appState.aiConfig.provider;
  apiKeyInput.value = appState.aiConfig.apiKey || '';

  if (appState.aiConfig.provider !== 'offline') {
    apiKeyGroup.classList.remove('hidden');
  } else {
    apiKeyGroup.classList.add('hidden');
  }

  modal.classList.remove('hidden');
}

/**
 * Closes the AI Configuration Modal.
 */
function closeAiConfigModal() {
  const modal = document.getElementById('aiConfigModal');
  modal.classList.add('hidden');
}

/**
 * Form submission handler for saving new or edited note.
 */
function handleNoteFormSubmit(e) {
  e.preventDefault();

  const titleInput = document.getElementById('noteTitleInput');
  const contentInput = document.getElementById('noteContentInput');
  const folderSelect = document.getElementById('noteFolderSelect');
  const pinCheckbox = document.getElementById('notePinCheckbox');

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const folder = folderSelect.value;
  const isPinned = pinCheckbox.checked;

  // Validation
  let isValid = true;
  clearValidationFeedback();

  if (!title) {
    showFieldError('titleFeedback', 'Title is mandatory. Please provide a title.');
    titleInput.classList.add('is-invalid');
    isValid = false;
  }

  if (!content) {
    showFieldError('contentFeedback', 'Note content cannot be empty.');
    contentInput.classList.add('is-invalid');
    isValid = false;
  }

  if (!isValid) return;

  if (appState.editingNoteId) {
    // Update
    updateNote(appState.editingNoteId, title, content, folder, isPinned);
  } else {
    // Create
    createNote(title, content, folder, isPinned);
  }

  closeNoteModal();
}

/**
 * Clears form input validation error indicators.
 */
function clearValidationFeedback() {
  document.getElementById('titleFeedback').textContent = '';
  document.getElementById('contentFeedback').textContent = '';
  document.getElementById('noteTitleInput').classList.remove('is-invalid');
  document.getElementById('noteContentInput').classList.remove('is-invalid');
}

/**
 * Displays validation error message under a form field.
 */
function showFieldError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = message;
}

/**
 * Updates word/character counter inside note editor modal.
 */
function updateContentCounter() {
  const content = document.getElementById('noteContentInput').value;
  const counter = document.getElementById('contentCounter');
  const trimmed = content.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = content.length;
  counter.textContent = `${words} ${words === 1 ? 'word' : 'words'} · ${chars} chars`;
}

/* ==========================================================================
   7. AI Writing Assistant (Offline Fallback & Optional Cloud AI)
   ========================================================================== */

/**
 * Applies a text transformation to the modal textarea, preserving an undo state.
 * @param {string} newText - Transformed text
 * @param {string} actionMessage - Feedback notification
 */
function applyAiTextTransformation(newText, actionMessage) {
  const contentInput = document.getElementById('noteContentInput');
  const aiNotice = document.getElementById('aiNotice');
  const aiNoticeText = document.getElementById('aiNoticeText');

  // Save previous state for Undo
  appState.aiHistory = contentInput.value;

  contentInput.value = newText;
  updateContentCounter();

  aiNoticeText.textContent = actionMessage;
  aiNotice.classList.remove('hidden');
}

/**
 * Reverts the last AI transformation.
 */
function handleAiUndo() {
  if (appState.aiHistory !== null) {
    const contentInput = document.getElementById('noteContentInput');
    contentInput.value = appState.aiHistory;
    appState.aiHistory = null;
    updateContentCounter();

    const aiNotice = document.getElementById('aiNotice');
    aiNotice.classList.add('hidden');
    showToast('Reverted AI changes.', 'info');
  }
}

/**
 * AI Action 1: Summarize Note Content.
 * Uses live cloud API if configured, otherwise uses intelligent offline extractive summary.
 */
async function handleAiSummarize() {
  const contentInput = document.getElementById('noteContentInput');
  const text = contentInput.value.trim();

  if (!text) {
    showToast('Please type some note content first to summarize.', 'warning');
    return;
  }

  // If live AI configured, attempt API call
  if (appState.aiConfig.provider !== 'offline' && appState.aiConfig.apiKey) {
    showToast('Summarizing with Live AI...', 'info');
    const cloudSummary = await callCloudAiApi(
      'Summarize the following note into a concise 2-3 sentence overview followed by key bullet takeaways:\n\n' + text
    );
    if (cloudSummary) {
      applyAiTextTransformation(
        `${text}\n\n--- 🤖 Live AI Summary ---\n${cloudSummary}`,
        'Live AI summary generated!'
      );
      return;
    }
    // If API failed, notify and gracefully proceed with offline fallback
    showToast('Cloud AI unavailable. Using smart offline summarizer.', 'warning');
  }

  // Robust Offline Summarizer:
  const summary = offlineExtractiveSummarize(text);
  applyAiTextTransformation(
    `${text}\n\n--- 📝 Smart Summary (Offline) ---\n${summary}`,
    'Offline smart summary generated!'
  );
}

/**
 * AI Action 2: Polish & Format Writing.
 * Cleans grammar, capitalization, double spaces, and markdown headers.
 */
async function handleAiPolish() {
  const contentInput = document.getElementById('noteContentInput');
  const text = contentInput.value;

  if (!text.trim()) {
    showToast('Note content is empty.', 'warning');
    return;
  }

  if (appState.aiConfig.provider !== 'offline' && appState.aiConfig.apiKey) {
    showToast('Polishing with Live AI...', 'info');
    const cloudResult = await callCloudAiApi(
      'Polish and improve the following note for clarity, grammar, and clean structure while keeping the core meaning:\n\n' + text
    );
    if (cloudResult) {
      applyAiTextTransformation(cloudResult, 'Polished with Live AI!');
      return;
    }
  }

  // Offline Smart Polisher
  const polished = offlinePolishText(text);
  applyAiTextTransformation(polished, 'Polished & formatted using built-in smart helper.');
}

/**
 * AI Action 3: Convert to Actionable Bullet List.
 */
async function handleAiBullets() {
  const contentInput = document.getElementById('noteContentInput');
  const text = contentInput.value.trim();

  if (!text) {
    showToast('Please add text first.', 'warning');
    return;
  }

  // Offline Bullet points generator
  const bulletized = offlineConvertToBullets(text);
  applyAiTextTransformation(bulletized, 'Converted into clean bullet points.');
}

/**
 * AI Action 4: Suggest Folder based on keywords in title and content.
 */
function handleAiFolderSuggest() {
  const title = document.getElementById('noteTitleInput').value.toLowerCase();
  const content = document.getElementById('noteContentInput').value.toLowerCase();
  const combined = title + ' ' + content;

  if (!combined.trim()) {
    showToast('Please type a title or content first to suggest a folder.', 'warning');
    return;
  }

  const detectedFolder = offlineDetectFolder(combined);
  const folderSelect = document.getElementById('noteFolderSelect');
  folderSelect.value = detectedFolder;

  showToast(`✨ Suggested folder: "${detectedFolder}"`, 'success');
}

/**
 * AI Action 5: Insert Structured Template.
 * @param {string} templateType - 'study' | 'meeting' | 'todo' | 'project'
 */
function insertTemplate(templateType) {
  const contentInput = document.getElementById('noteContentInput');
  const titleInput = document.getElementById('noteTitleInput');
  
  let templateTitle = '';
  let templateContent = '';

  switch (templateType) {
    case 'study':
      templateTitle = titleInput.value.trim() || 'Study Notes: [Topic Name]';
      templateContent = `## 🎯 Objective / Topic Overview
What are the fundamental concepts covered in this topic?

## 📝 Key Concepts & Definitions
- Concept 1: Description
- Concept 2: Description
- Formula / Theorem: Key takeaway

## 💡 Practical Examples
- Example 1: Problem statement and step-by-step resolution.

## 📌 Summary & Exam Review Questions
1. How does X relate to Y?
2. What are the primary trade-offs?`;
      document.getElementById('noteFolderSelect').value = 'Study';
      break;

    case 'meeting':
      templateTitle = titleInput.value.trim() || 'Meeting Minutes: [Project / Team Name]';
      templateContent = `📅 Date: ${new Date().toLocaleDateString()}
👥 Attendees: [Names]

## 🎯 Meeting Agenda
1. Review sprint deliverables
2. Address blockers

## 💬 Discussion Notes
- Discussion item 1
- Discussion item 2

## ✅ Action Items & Owners
- [ ] Task 1 - Assigned to: [Person] (Due: Friday)
- [ ] Task 2 - Assigned to: [Person] (Due: Next sprint)`;
      document.getElementById('noteFolderSelect').value = 'Work';
      break;

    case 'todo':
      templateTitle = titleInput.value.trim() || 'Daily Task & To-Do List';
      templateContent = `## 🚀 High Priority (Must Do Today)
- [ ] Complete practical examination setup
- [ ] Verify test cases for notes app

## 📋 Secondary Tasks
- [ ] Review documentation
- [ ] Clean up temporary files

## 💡 Notes & Reminders
- Remember to push code to repository.`;
      document.getElementById('noteFolderSelect').value = 'Personal';
      break;

    case 'project':
      templateTitle = titleInput.value.trim() || 'Project Architecture & Spec';
      templateContent = `## 📌 Project Overview
Brief description of the application and target users.

## 🛠 Tech Stack
- Frontend: HTML5, CSS3, Vanilla JS
- Storage: Browser LocalStorage (No backend required)

## 🎯 Key Functional Modules
1. CRUD Note Operations
2. Live Search & Folder Filters
3. Pinning System
4. Offline AI Writing Assistant

## ⏱ Milestones & Deliverables
- Milestone 1: Core UI & LocalStorage [Done]
- Milestone 2: AI Assistance & Testing [Done]`;
      document.getElementById('noteFolderSelect').value = 'Work';
      break;
  }

  titleInput.value = templateTitle;
  // If content is already present, append; otherwise replace
  if (contentInput.value.trim()) {
    applyAiTextTransformation(`${contentInput.value}\n\n${templateContent}`, 'Template inserted!');
  } else {
    contentInput.value = templateContent;
    updateContentCounter();
    showToast('Template applied!', 'success');
  }

  // Close template menu
  document.getElementById('templatesMenu').classList.add('hidden');
}

/* ==========================================================================
   8. Offline Smart Rule-Based Natural Language Helpers
   ========================================================================== */

/**
 * Intelligent Offline Extractive Summarizer.
 * Tokenizes text into sentences, scores each sentence by keyword density
 * and position, and selects the top 2-3 most representative sentences.
 * @param {string} text - Raw content
 * @returns {string} Clean summary
 */
function offlineExtractiveSummarize(text) {
  // Split into sentences using punctuation boundaries
  const sentences = text
    .split(/(?<=[.!?\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !s.startsWith('#') && !s.startsWith('-'));

  if (sentences.length <= 2) {
    return text.substring(0, 250) + (text.length > 250 ? '...' : '');
  }

  // Common stop words to exclude from frequency calculation
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of',
    'with', 'as', 'by', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were',
    'or', 'you', 'your', 'i', 'we', 'they', 'their', 'has', 'have', 'had', 'not'
  ]);

  // Compute word frequency table
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freqTable = {};
  words.forEach(w => {
    if (!stopWords.has(w)) {
      freqTable[w] = (freqTable[w] || 0) + 1;
    }
  });

  // Score sentences based on word frequencies
  const scoredSentences = sentences.map((sentence, index) => {
    const sWords = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    let score = 0;
    sWords.forEach(w => {
      if (freqTable[w]) score += freqTable[w];
    });
    // Boost introductory and conclusion sentences slightly
    if (index === 0) score *= 1.3;
    return { sentence, score: score / (sWords.length || 1), index };
  });

  // Sort by score and pick top 2
  scoredSentences.sort((a, b) => b.score - a.score);
  const topSentences = scoredSentences.slice(0, 2);

  // Restore chronological order
  topSentences.sort((a, b) => a.index - b.index);

  return topSentences.map(item => `• ${item.sentence}`).join('\n');
}

/**
 * Offline Text Polisher:
 * - Fixes capitalization at the beginning of sentences
 * - Normalizes multiple spaces and erratic line breaks
 * - Fixes list markers and punctuation spacing
 * @param {string} text - Raw text
 * @returns {string} Polished text
 */
function offlinePolishText(text) {
  let polished = text;

  // 1. Normalize line endings and duplicate blank lines
  polished = polished.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  // 2. Normalize multiple spaces
  polished = polished.replace(/[ \t]{2,}/g, ' ');

  // 3. Fix spaces before punctuation (. , ! ? :)
  polished = polished.replace(/\s+([.,!?:;])/g, '$1');

  // 4. Ensure space after punctuation if followed by letter
  polished = polished.replace(/([.,!?:;])([A-Za-z])/g, '$1 $2');

  // 5. Capitalize first letter of every line or sentence
  polished = polished.replace(/(^|[.!?\n]\s*)([a-z])/g, (match, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  // 6. Clean up bullet points (e.g. "* " to "- ")
  polished = polished.replace(/^\s*\*\s+/gm, '- ');

  return polished.trim();
}

/**
 * Converts lines or paragraphs into formatted checklist bullet points.
 * @param {string} text - Raw text
 * @returns {string} Bullet list
 */
function offlineConvertToBullets(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  const bulletLines = lines.map(line => {
    const trimmed = line.trim();
    // If already a bullet or heading, preserve it
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
      return trimmed;
    }
    return `• ${trimmed}`;
  });

  return bulletLines.join('\n');
}

/**
 * Detects most probable folder by keyword matching.
 * @param {string} text - Combined title and content
 * @returns {string} Folder name
 */
function offlineDetectFolder(text) {
  const studyKeywords = ['exam', 'test', 'study', 'lecture', 'syllabus', 'college', 'semester', 'course', 'chapter', 'homework', 'algorithm', 'physics', 'math', 'theory', 'notes'];
  const workKeywords = ['project', 'client', 'meeting', 'sprint', 'roadmap', 'deadline', 'task', 'standup', 'spec', 'deliverable', 'agenda', 'bug', 'feature', 'pr', 'release'];
  const personalKeywords = ['personal', 'habit', 'grocery', 'shopping', 'diet', 'workout', 'gym', 'health', 'finance', 'budget', 'family', 'travel', 'vacation', 'diary'];

  let studyScore = 0;
  let workScore = 0;
  let personalScore = 0;

  studyKeywords.forEach(k => { if (text.includes(k)) studyScore++; });
  workKeywords.forEach(k => { if (text.includes(k)) workScore++; });
  personalKeywords.forEach(k => { if (text.includes(k)) personalScore++; });

  if (studyScore > workScore && studyScore > personalScore) return 'Study';
  if (workScore > studyScore && workScore > personalScore) return 'Work';
  if (personalScore > 0) return 'Personal';
  
  return 'Personal';
}

/**
 * Calls live cloud AI API (Google Gemini or OpenAI) if configured by user.
 * @param {string} prompt - Prompt to send
 * @returns {Promise<string|null>} Generated text response or null on failure
 */
async function callCloudAiApi(prompt) {
  const { provider, apiKey } = appState.aiConfig;
  if (!apiKey) return null;

  try {
    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } 
    
    if (provider === 'openai') {
      const endpoint = 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (error) {
    console.error('Error invoking Cloud AI API:', error);
    showToast(`AI API failed: ${error.message}`, 'danger');
    return null;
  }

  return null;
}

/* ==========================================================================
   9. Toast Notification System
   ========================================================================== */

/**
 * Displays a non-intrusive floating toast notification.
 * @param {string} message - Message text
 * @param {string} type - 'success' | 'info' | 'warning' | 'danger'
 * @param {number} [duration=3000] - Duration in ms before auto-dismiss
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  switch (type) {
    case 'success':
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      break;
    case 'danger':
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
      break;
    case 'warning':
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      break;
    default:
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-content">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  // Auto remove after duration
  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 200);
  }, duration);
}

/* ==========================================================================
   10. Utility Functions
   ========================================================================== */

/**
 * Formats ISO timestamp into a readable date and time.
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted string
 */
function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  // Relative formatting for recent edits
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Standard date formatting
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Truncates string with ellipsis.
 */
function truncateString(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

/**
 * Escapes HTML characters to prevent XSS.
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Opens mobile sidebar off-canvas drawer.
 */
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
}

/**
 * Closes mobile sidebar off-canvas drawer.
 */
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

/* ==========================================================================
   11. Event Listeners & Application Setup
   ========================================================================== */

function setupEventListeners() {
  // 1. Sidebar "New Note" Button
  document.getElementById('sidebarNewNoteBtn').addEventListener('click', () => {
    openNoteModal();
    closeMobileSidebar();
  });

  // 2. Topbar "New Note" Button
  document.getElementById('topbarNewNoteBtn').addEventListener('click', () => {
    openNoteModal();
  });

  // 3. Folder Navigation Filter Buttons
  document.querySelectorAll('.folder-btn').forEach(button => {
    button.addEventListener('click', () => {
      const folder = button.getAttribute('data-folder');
      handleFolderFilter(folder);
    });
  });

  // 4. Live Search Input
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });

  // Clear Search Button
  document.getElementById('clearSearchBtn').addEventListener('click', () => {
    searchInput.value = '';
    handleSearch('');
    searchInput.focus();
  });

  // Reset Search from Banner
  document.getElementById('resetSearchBannerBtn').addEventListener('click', () => {
    searchInput.value = '';
    handleSearch('');
  });

  // 5. Sort Selector
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    appState.currentSort = e.target.value;
    renderNotes();
  });

  // 6. Note Modal Controls
  document.getElementById('closeNoteModalBtn').addEventListener('click', closeNoteModal);
  document.getElementById('cancelNoteModalBtn').addEventListener('click', closeNoteModal);
  document.getElementById('noteForm').addEventListener('submit', handleNoteFormSubmit);
  document.getElementById('noteModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('noteModal')) closeNoteModal();
  });
  
  // Real-time counter on textarea
  document.getElementById('noteContentInput').addEventListener('input', updateContentCounter);

  // 7. Delete Confirmation Modal Controls
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmPendingDelete);
  document.getElementById('deleteModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('deleteModal')) closeDeleteModal();
  });

  // 8. AI Configuration Modal Controls
  document.getElementById('openAiConfigBtn').addEventListener('click', openAiConfigModal);
  document.getElementById('closeAiConfigBtn').addEventListener('click', closeAiConfigModal);
  document.getElementById('cancelAiConfigBtn').addEventListener('click', closeAiConfigModal);
  document.getElementById('aiConfigModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('aiConfigModal')) closeAiConfigModal();
  });

  document.getElementById('aiProviderSelect').addEventListener('change', (e) => {
    const isCloud = e.target.value !== 'offline';
    document.getElementById('apiKeyGroup').classList.toggle('hidden', !isCloud);
  });

  document.getElementById('toggleApiKeyVisibility').addEventListener('click', () => {
    const input = document.getElementById('aiApiKeyInput');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('aiConfigForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const provider = document.getElementById('aiProviderSelect').value;
    const apiKey = document.getElementById('aiApiKeyInput').value.trim();

    if (provider !== 'offline' && !apiKey) {
      showToast('Please enter an API key or switch to Offline Assistant.', 'warning');
      return;
    }

    appState.aiConfig = { provider, apiKey };
    saveAiConfigToStorage();
    updateAiStatusCard();
    closeAiConfigModal();
    showToast(`AI settings updated: ${provider === 'offline' ? 'Offline Helper' : 'Live Cloud AI'}`, 'success');
  });

  // 9. AI Writing Assistant Toolbar Buttons
  document.getElementById('aiSummarizeBtn').addEventListener('click', handleAiSummarize);
  document.getElementById('aiPolishBtn').addEventListener('click', handleAiPolish);
  document.getElementById('aiBulletsBtn').addEventListener('click', handleAiBullets);
  document.getElementById('aiFolderSuggestBtn').addEventListener('click', handleAiFolderSuggest);
  document.getElementById('undoAiBtn').addEventListener('click', handleAiUndo);

  // Templates Dropdown
  const templatesDropdownBtn = document.getElementById('templatesDropdownBtn');
  const templatesMenu = document.getElementById('templatesMenu');
  
  templatesDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    templatesMenu.classList.toggle('hidden');
  });

  document.querySelectorAll('[data-template]').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-template');
      insertTemplate(type);
    });
  });

  // Close template menu on outside click
  document.addEventListener('click', () => {
    templatesMenu.classList.add('hidden');
  });

  // 10. Mobile Menu Sidebar Drawer Toggles
  document.getElementById('openSidebarBtn').addEventListener('click', openMobileSidebar);
  document.getElementById('closeSidebarBtn').addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);

  // 11. Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape key closes open modals
    if (e.key === 'Escape') {
      const noteModal = document.getElementById('noteModal');
      const deleteModal = document.getElementById('deleteModal');
      const aiConfigModal = document.getElementById('aiConfigModal');

      if (!noteModal.classList.contains('hidden')) closeNoteModal();
      if (!deleteModal.classList.contains('hidden')) closeDeleteModal();
      if (!aiConfigModal.classList.contains('hidden')) closeAiConfigModal();
    }

    // Slash key '/' focuses search bar if not typing in form
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    }

    // Ctrl + N or Cmd + N creates new note
    if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      openNoteModal();
    }
  });
}

/**
 * Application Entrypoint: Runs on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load AI configuration
  loadAiConfigFromStorage();

  // Load notes from storage (or initialize sample data)
  appState.notes = loadNotesFromStorage();

  // Set up event listeners
  setupEventListeners();

  // Render initial interface
  renderApp();
});
