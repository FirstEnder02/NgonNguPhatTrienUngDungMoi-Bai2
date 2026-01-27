const API_BASE = 'http://127.0.0.1:3000/posts';
const API_ORIGIN = (new URL(API_BASE)).origin;
const COMMENTS_API = `${API_ORIGIN}/comments`;
const PROFILE_API = `${API_ORIGIN}/profile`;

let maxID = 0;
// currentEditingId is used for inline editing only
let currentEditingId = '';
let editingRowEl = null;
let editingRowOriginalHTML = '';

console.log('main.js loaded');

function showMessage(text) {
  const el = document.getElementById('msg');
  if (el) el.textContent = text;
}
function clearMessage() {
  const el = document.getElementById('msg');
  if (el) el.textContent = '';
}
function showEditMessage(text) {
  const el = document.getElementById('edit-msg');
  if (el) el.textContent = text;
}
function clearEditMessage() {
  const el = document.getElementById('edit-msg');
  if (el) el.textContent = '';
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}

function setClearBtnLabel(label) {
  const btn = document.getElementById('clearBtn');
  if (btn) btn.textContent = label;
}
function isEditingInline() {
  return Boolean(editingRowEl);
}
function beginInlineEdit(rowEl, post) {
  if (isEditingInline()) cancelInlineEdit();

  editingRowEl = rowEl;
  editingRowOriginalHTML = rowEl.innerHTML;
  currentEditingId = String(post.id);

  rowEl.innerHTML = `
  <td class="id">${escapeHtml(currentEditingId)}</td>
  <td class="title"><input type="text" id="inline_title" value="${escapeHtml(post.title ?? '')}" style="width:95%; min-width:80px; max-width:95%; box-sizing:border-box;"></td>
  <td class="views"><input type="number" id="inline_views" min="0" value="${escapeHtml(String(post.views ?? 0))}" style="width:90%"></td>
  <td class="actions">
    <button data-action="inline-save" data-id="${escapeHtml(currentEditingId)}">Save</button>
    <button data-action="inline-cancel" data-id="${escapeHtml(currentEditingId)}">Cancel</button>
  </td>
`;
  setClearBtnLabel('Exit');
  const t = rowEl.querySelector('#inline_title');
  if (t) t.focus();
}

function cancelInlineEdit() {
  if (!isEditingInline()) return;
  editingRowEl.innerHTML = editingRowOriginalHTML;
  editingRowEl = null;
  editingRowOriginalHTML = '';
  currentEditingId = '';
  setClearBtnLabel('Clear');
}

async function saveInlineEdit(id) {
  if (!isEditingInline() || String(id) !== currentEditingId) return;
  clearEditMessage();

  const titleEl = editingRowEl.querySelector('#inline_title');
  const viewsEl = editingRowEl.querySelector('#inline_views');
  if (!titleEl || !viewsEl) { showEditMessage('Edit form elements missing.'); return; }

  const title = titleEl.value.trim();
  const viewsRaw = viewsEl.value;
  const views = viewsRaw === '' ? 0 : Number(viewsRaw);
  if (!title) { showEditMessage('Title is required.'); return; }
  if (!Number.isFinite(views) || views < 0) { showEditMessage('Views must be a non-negative number.'); return; }

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title, views })
    });
    if (!res.ok) {
      showEditMessage(`Update failed: ${res.status}`);
      return;
    }
  } catch (err) {
    console.error('saveInlineEdit error', err);
    showEditMessage('Network error while saving edit.');
    return;
  }
  await GetData();
  setClearBtnLabel('Clear');
} 
async function GetData() {
  console.log('GetData start');
  try {
    const res = await fetch(API_BASE);
    console.log('fetch status', res.status);
    if (!res.ok) { showMessage(`Failed to load posts: ${res.status}`); return; }
    const posts = await res.json();
    maxID = 0;
    for (const p of posts) {
      const n = Number(p.id);
      if (Number.isFinite(n) && n > maxID) maxID = n;
    }

    const bodyTable = document.getElementById('body-table');
    if (!bodyTable) { console.error('body-table not found'); return; }
    bodyTable.innerHTML = '';
    for (const post of posts) bodyTable.innerHTML += convertObjToHTML(post);
    if (isEditingInline()) {
      editingRowEl = null;
      editingRowOriginalHTML = '';
      currentEditingId = '';
    }
    const idDisplay = document.getElementById('id_display');
    if (idDisplay) idDisplay.textContent = '';
    setClearBtnLabel('Clear');

    clearMessage();
    console.log('table updated, maxID=', maxID);
    loadHeaderCounts();
  } catch (err) {
    console.error('GetData error', err);
    showMessage('Network error while loading posts.');
  }
}
function populateForm(id) {
  clearMessage();
  const editBtn = document.querySelector(`button[data-action="edit"][data-id="${CSS.escape(String(id))}"]`);
  const row = editBtn ? editBtn.closest('tr') : null;
  if (!row) {
    fetch(`${API_BASE}/${encodeURIComponent(id)}`)
      .then(r => { if (!r.ok) throw new Error(`Not found ${r.status}`); return r.json(); })
      .then(post => {
        const btn = document.querySelector(`button[data-action="edit"][data-id="${CSS.escape(String(id))}"]`);
        const r2 = btn ? btn.closest('tr') : null;
        if (r2) beginInlineEdit(r2, post);
      })
      .catch(err => { console.error(err); showMessage('Could not load post for editing.'); });
    return;
  }

  fetch(`${API_BASE}/${encodeURIComponent(id)}`)
    .then(r => { if (!r.ok) throw new Error(`Not found ${r.status}`); return r.json(); })
    .then(post => beginInlineEdit(row, post))
    .catch(err => { console.error(err); showMessage('Could not load post for editing.'); });
}
async function Save() {
  clearMessage();
  const titleEl = document.getElementById('title_txt');
  const viewsEl = document.getElementById('views_txt');
  if (!titleEl || !viewsEl) { showMessage('Form elements missing.'); return false; }

  const title = titleEl.value.trim();
  const viewsRaw = viewsEl.value;
  const views = viewsRaw === '' ? 0 : Number(viewsRaw);
  if (!title) { showMessage('Title is required.'); return false; }
  if (!Number.isFinite(views) || views < 0) { showMessage('Views must be a non-negative number.'); return false; }

  try {
    const targetId = String(maxID + 1);
    const allRes = await fetch(API_BASE);
    if (!allRes.ok) { showMessage(`Failed to fetch posts for ID check: ${allRes.status}`); return false; }
    const allPosts = await allRes.json();
    const exists = allPosts.some(p => String(p.id) === targetId);
    if (exists) {
      showMessage(`ID "${targetId}" already exists. Choose a different ID.`);
      return false;
    }

    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: targetId, title, views })
    });
    if (!res.ok) { showMessage(`Create failed: ${res.status}`); return false; }
    const numeric = Number(targetId);
    if (Number.isFinite(numeric) && numeric > maxID) maxID = numeric;
    const form = document.getElementById('post-form');
    if (form) form.reset();
    setClearBtnLabel('Clear');
  } catch (error) {
    console.error('Save error', error);
    showMessage('Network error while saving.');
  }

  await GetData();
  return false;
}
async function SaveEdit() {
  return;
}
async function Delete(id) {
  clearMessage();
  if (!confirm(`Delete post with ID ${id}?`)) return false;
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) showMessage(`Delete failed: ${res.status}`);
    else await GetData();
  } catch (error) {
    console.error('Delete error', error);
    showMessage('Network error while deleting.');
  }
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (isEditingInline()) {
        cancelInlineEdit();
        clearEditMessage();
      } else {
        const form = document.getElementById('post-form');
        if (form) form.reset();
        const idDisplay = document.getElementById('id_display');
        if (idDisplay) idDisplay.textContent = '';
        clearMessage();
      }
    });
  }
  const editSaveBtn = document.getElementById('editSaveBtn');
  if (editSaveBtn) editSaveBtn.addEventListener('click', SaveEdit);
  const editCancelBtn = document.getElementById('editCancelBtn');
  if (editCancelBtn) editCancelBtn.addEventListener('click', () => {
    // hide panel fallback
    const panel = document.getElementById('edit-panel');
    if (panel) { panel.style.display = 'none'; panel.setAttribute('aria-hidden', 'true'); }
  });

  const bodyTable = document.getElementById('body-table');
  if (bodyTable) {
    bodyTable.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');

      if (action === 'edit') populateForm(id);
      else if (action === 'delete') Delete(id);
      else if (action === 'inline-save') saveInlineEdit(id);
      else if (action === 'inline-cancel') cancelInlineEdit();
    });
  }
  if (document.getElementById('body-table')) {
    GetData();
  } else if (document.getElementById('comments-table')) {
    loadComments();
  } else if (document.getElementById('profile-name')) {
    loadProfile();
  }
  loadHeaderCounts();
});

function convertObjToHTML(post) {
  return `
    <tr>
      <td class="id">${escapeHtml(String(post.id))}</td>
      <td class="title">${escapeHtml(post.title)}</td>
      <td class="views">${escapeHtml(String(post.views))}</td>
      <td class="actions">
        <button data-action="edit" data-id="${escapeHtml(String(post.id))}">Edit</button>
        <button data-action="delete" data-id="${escapeHtml(String(post.id))}">Delete</button>
      </td>
    </tr>
  `;
}
async function loadHeaderCounts() {
  try {
    const postsRes = await fetch(API_BASE);
  } catch (err) {
    console.error('loadHeaderCounts error', err);
  }
}