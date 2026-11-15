/* Quiet Todo — a small, calm task list. Vanilla JS, localStorage only. */
(() => {
  'use strict';
  const STORE = 'quiet-todo-v1';
  const $ = (sel) => document.querySelector(sel);
  const list = $('#list'), empty = $('#empty'), hint = $('#hint');

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const priorityRank = { high: 0, normal: 1, low: 2 };

  let state = load();
  let filter = 'all';
  let query = '';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (raw && Array.isArray(raw.tasks)) return { version: 1, theme: raw.theme === 'dark' ? 'dark' : 'light', tasks: raw.tasks.filter((t) => t && typeof t.title === 'string') };
    } catch { /* corrupted store: start fresh */ }
    return { version: 1, theme: 'light', tasks: [] };
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage full or blocked */ } }

  function announce(message) {
    hint.textContent = message;
    clearTimeout(announce.timer);
    announce.timer = setTimeout(() => { hint.textContent = ''; }, 4000);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    $('#theme-toggle').setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', state.theme === 'dark' ? '#161a18' : '#f4f1ea');
  }

  function formatDue(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const due = new Date(y, m - 1, d), now = new Date();
    const midnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((midnight(due) - midnight(now)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    if (days > 1 && days < 7) return due.toLocaleDateString(undefined, { weekday: 'long' });
    return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: due.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  }

  function visibleTasks() {
    const q = query.trim().toLowerCase();
    const today = todayISO();
    return state.tasks
      .filter((t) => {
        if (filter === 'done' && !t.done) return false;
        if (filter === 'open' && t.done) return false;
        if (filter === 'today') { if (t.done) return false; if (!t.due || t.due > today) return false; }
        if (!q) return true;
        return `${t.title} ${t.note || ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.done !== b.done) return Number(a.done) - Number(b.done);
        if (a.done && b.done) return String(b.completedAt || '').localeCompare(String(a.completedAt || ''));
        const aOverdue = a.due && a.due < todayISO(), bOverdue = b.due && b.due < todayISO();
        if (aOverdue !== bOverdue) return Number(bOverdue) - Number(aOverdue);
        if (a.due !== b.due) { if (!a.due) return 1; if (!b.due) return -1; return a.due.localeCompare(b.due); }
        return priorityRank[a.priority] - priorityRank[b.priority] || String(a.createdAt).localeCompare(String(b.createdAt));
      });
  }

  function taskElement(task) {
    const article = document.createElement('article');
    article.className = `task${task.done ? ' done' : ''}`;
    article.dataset.id = task.id;

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(Boolean(task.done)));
    check.setAttribute('aria-label', `${task.done ? 'Mark open' : 'Mark done'}: ${task.title}`);
    check.textContent = '✓';
    check.addEventListener('click', () => toggle(task.id));
    article.append(check);

    const body = document.createElement('div');
    body.className = 'body';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = task.title;
    body.append(title);

    const meta = document.createElement('div');
    meta.className = 'meta';
    if (task.due) {
      const pill = document.createElement('span');
      const today = todayISO();
      const cls = task.done ? '' : task.due < today ? 'overdue' : task.due === today ? 'today' : '';
      pill.className = `pill ${cls}`.trim();
      pill.textContent = task.done ? formatDue(task.due) : task.due < today ? `Overdue · ${formatDue(task.due)}` : formatDue(task.due);
      meta.append(pill);
    }
    if (task.priority && task.priority !== 'normal') {
      const pill = document.createElement('span');
      pill.className = `pill ${task.priority}`;
      pill.textContent = task.priority === 'high' ? 'High' : 'Low';
      meta.append(pill);
    }
    if (task.done && task.completedAt) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = `Done ${new Date(task.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      meta.append(pill);
    }
    if (meta.childElementCount) body.append(meta);
    if (task.note) {
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = task.note;
      body.append(note);
    }
    article.append(body);

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'icon'; edit.setAttribute('aria-label', `Edit: ${task.title}`); edit.textContent = '✎';
    edit.addEventListener('click', () => startEdit(article, task));
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'icon'; del.setAttribute('aria-label', `Delete: ${task.title}`); del.textContent = '✕';
    del.addEventListener('click', () => remove(task.id));
    actions.append(edit, del);
    article.append(actions);
    return article;
  }

  function startEdit(article, task) {
    article.innerHTML = '';
    const form = document.createElement('form');
    form.className = 'edit-form';
    const title = document.createElement('input');
    title.type = 'text'; title.value = task.title; title.required = true; title.maxLength = 200; title.setAttribute('aria-label', 'Task title');
    const row = document.createElement('div');
    row.className = 'compose-row';
    const dueField = document.createElement('label'); dueField.className = 'field'; dueField.innerHTML = '<span>Due</span>';
    const due = document.createElement('input'); due.type = 'date'; due.value = task.due || ''; due.setAttribute('aria-label', 'Due date'); dueField.append(due);
    const prioField = document.createElement('label'); prioField.className = 'field'; prioField.innerHTML = '<span>Priority</span>';
    const prio = document.createElement('select'); prio.setAttribute('aria-label', 'Priority');
    for (const [value, label] of [['normal', 'Normal'], ['high', 'High'], ['low', 'Low']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; if (task.priority === value) option.selected = true; prio.append(option);
    }
    prioField.append(prio);
    const noteField = document.createElement('label'); noteField.className = 'field grow'; noteField.innerHTML = '<span>Note</span>';
    const note = document.createElement('input'); note.type = 'text'; note.value = task.note || ''; note.maxLength = 300; note.setAttribute('aria-label', 'Note'); noteField.append(note);
    row.append(dueField, prioField, noteField);
    const actions = document.createElement('div');
    actions.className = 'edit-actions';
    const saveBtn = document.createElement('button'); saveBtn.type = 'submit'; saveBtn.className = 'primary'; saveBtn.textContent = 'Save';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'ghost'; cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => render());
    actions.append(saveBtn, cancel);
    form.append(title, row, actions);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = title.value.trim();
      if (!value) { title.focus(); return; }
      task.title = value; task.due = due.value || ''; task.priority = prio.value; task.note = note.value.trim();
      save(); announce('Task updated.'); render();
    });
    form.addEventListener('keydown', (event) => { if (event.key === 'Escape') render(); });
    article.append(form);
    title.focus(); title.select();
  }

  function toggle(id) {
    const task = state.tasks.find((entry) => entry.id === id);
    if (!task) return;
    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : undefined;
    save();
    announce(task.done ? `Done: ${task.title}` : `Reopened: ${task.title}`);
    render();
  }

  function remove(id) {
    const task = state.tasks.find((entry) => entry.id === id);
    if (!task) return;
    state.tasks = state.tasks.filter((entry) => entry.id !== id);
    save(); announce(`Deleted: ${task.title}`); render();
  }

  function add(event) {
    event.preventDefault();
    const title = $('#task-title').value.trim();
    if (!title) return;
    state.tasks.push({ id: uid(), title, due: $('#task-due').value || '', priority: $('#task-priority').value, note: $('#task-note').value.trim(), done: false, createdAt: new Date().toISOString() });
    save();
    $('#add-form').reset();
    $('#task-title').focus();
    announce(`Added: ${title}`);
    render();
  }

  function render() {
    applyTheme();
    const tasks = visibleTasks();
    list.innerHTML = '';
    empty.hidden = tasks.length > 0;
    if (!tasks.length) {
      const messages = {
        all: ['All clear.', 'Add a task above and it will show up here.'],
        open: ['Nothing open.', 'Every task is done. Add the next one when you are ready.'],
        today: ['Nothing due today.', 'Enjoy the quiet, or add something for today.'],
        done: ['Nothing completed yet.', 'Finished tasks will collect here.'],
      };
      const [title, detail] = messages[filter] || messages.all;
      $('#empty-title').textContent = query ? 'No matches.' : title;
      $('#empty-detail').textContent = query ? 'Try a different search.' : detail;
    }
    const groups = new Map();
    const today = todayISO();
    for (const task of tasks) {
      let key;
      if (task.done) key = 'Completed';
      else if (!task.due) key = 'Someday';
      else if (task.due <= today) key = 'Today';
      else key = 'Upcoming';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(task);
    }
    for (const [name, items] of groups) {
      const group = document.createElement('section');
      group.className = 'group';
      group.setAttribute('aria-label', name);
      if (filter === 'all' || filter === 'open') {
        const heading = document.createElement('h2');
        heading.className = 'group-title';
        heading.textContent = name === 'Today' ? 'Today and overdue' : name;
        group.append(heading);
      }
      for (const task of items) group.append(taskElement(task));
      list.append(group);
    }
    updateCounts();
  }

  function updateCounts() {
    const today = todayISO();
    const open = state.tasks.filter((t) => !t.done);
    $('#count-all').textContent = String(state.tasks.length);
    $('#count-open').textContent = String(open.length);
    $('#count-today').textContent = String(open.filter((t) => t.due && t.due <= today).length);
    $('#count-done').textContent = String(state.tasks.filter((t) => t.done).length);
    $('#clear-done').hidden = !state.tasks.some((t) => t.done);
  }

  // Wiring
  $('#add-form').addEventListener('submit', add);
  $('#task-title').addEventListener('keydown', (event) => { if (event.key === 'Escape') { $('#add-form').reset(); } });
  $('#theme-toggle').addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); announce(state.theme === 'dark' ? 'Dark theme.' : 'Light theme.'); });
  $('#clear-done').addEventListener('click', () => { const count = state.tasks.filter((t) => t.done).length; if (!count) return; if (!confirm(`Remove ${count} completed task${count === 1 ? '' : 's'}?`)) return; state.tasks = state.tasks.filter((t) => !t.done); save(); announce(`Cleared ${count} completed task${count === 1 ? '' : 's'}.`); render(); });
  $('#search').addEventListener('input', (event) => { query = event.target.value; render(); });
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((entry) => entry.setAttribute('aria-pressed', String(entry === button)));
    render();
  }));
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement === document.body) { event.preventDefault(); $('#search').focus(); }
    if (event.key === 'n' && event.metaKey && event.shiftKey) { event.preventDefault(); $('#task-title').focus(); }
  });

  $('#today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  applyTheme();
  render();
  $('#task-title').focus();
})();
