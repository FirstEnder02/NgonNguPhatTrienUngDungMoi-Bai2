const API_BASE = 'http://127.0.0.1:3000/posts';
const API_ORIGIN = (new URL(API_BASE)).origin;
const COMMENTS_API = `${API_ORIGIN}/comments`;
const PROFILE_API = `${API_ORIGIN}/profile`;

let maxID = 0;
let currentEditingId = '';

console.log('main.js loaded');

function showMessage(text) {
  const el = document.getElementById('msg');
  if (el) el.textContent = text;
}
function clearMessage() {
  const el = document.getElementById('msg');
  if (el) el.textContent = '';
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
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
    currentEditingId = '';
    hideIdControls();

    clearMessage();
    console.log('table updated, maxID=', maxID);
    loadHeaderCounts();
  } catch (err) {
    console.error('GetData error', err);
    showMessage('Network error while loading posts.');
  }
}
function showIdControls(idValue) {
  const idLabel = document.getElementById('id_label');
  const idDisplay = document.getElementById('id_display');
  const idReadonly = document.getElementById('id_readonly');
  const idEdit = document.getElementById('id_edit');
  if (idLabel) idLabel.style.display = '';
  if (idDisplay) idDisplay.style.display = '';
  if (idReadonly) idReadonly.value = idValue ?? '';
  if (idEdit) { idEdit.style.display = 'none'; idEdit.value = ''; }
  const editBtn = document.getElementById('editIdBtn');
  if (editBtn) editBtn.textContent = 'Change ID';
}

function hideIdControls() {
  const idLabel = document.getElementById('id_label');
  const idDisplay = document.getElementById('id_display');
  const idEdit = document.getElementById('id_edit');
  if (idLabel) idLabel.style.display = 'none';
  if (idDisplay) idDisplay.style.display = 'none';
  if (idEdit) { idEdit.style.display = 'none'; idEdit.value = ''; }
  currentEditingId = '';
}
function populateForm(id) {
  clearMessage();
  fetch(`${API_BASE}/${encodeURIComponent(id)}`)
    .then(r => { if (!r.ok) throw new Error(`Not found ${r.status}`); return r.json(); })
    .then(post => {
      currentEditingId = String(post.id);
      showIdControls(currentEditingId);

      document.getElementById('title_txt').value = post.title ?? '';
      document.getElementById('views_txt').value = post.views ?? 0;
      document.getElementById('title_txt').focus();
    })
    .catch(err => { console.error(err); showMessage('Could not load post for editing.'); });
}
async function Save() {
  clearMessage();
  const titleEl = document.getElementById('title_txt');
  const viewsEl = document.getElementById('views_txt');
  const idEditEl = document.getElementById('id_edit');
  if (!titleEl || !viewsEl) { showMessage('Form elements missing.'); return false; }

  const title = titleEl.value.trim();
  const viewsRaw = viewsEl.value;
  const views = viewsRaw === '' ? 0 : Number(viewsRaw);
  if (!title) { showMessage('Title is required.'); return false; }
  if (!Number.isFinite(views) || views < 0) { showMessage('Views must be a non-negative number.'); return false; }

  try {
    let targetId = '';
    let idChanged = false;

    if (currentEditingId) {
      if (idEditEl && idEditEl.style.display !== 'none' && idEditEl.value.trim() !== '') {
        targetId = idEditEl.value.trim();
        if (targetId === '') { showMessage('ID cannot be empty.'); return false; }
        if (targetId !== currentEditingId) idChanged = true;
      } else {
        targetId = currentEditingId;
      }
    } else {
      targetId = String(maxID + 1);
    }
    if (!currentEditingId || idChanged) {
      const allRes = await fetch(API_BASE);
      if (!allRes.ok) { showMessage(`Failed to fetch posts for ID check: ${allRes.status}`); return false; }
      const allPosts = await allRes.json();
      const exists = allPosts.some(p => String(p.id) === String(targetId));
      if (exists) {
        showMessage(`ID "${targetId}" already exists. Choose a different ID.`);
        return false;
      }
    }
    if (currentEditingId && idChanged) {
      const createRes = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId, title, views })
      });
      if (!createRes.ok) { showMessage(`Create with new ID failed: ${createRes.status}`); return false; }
      const delRes = await fetch(`${API_BASE}/${encodeURIComponent(currentEditingId)}`, { method: "DELETE" });
      if (!delRes.ok) { showMessage(`Warning: created new post but failed to delete old ID: ${delRes.status}`); }
      const numeric = Number(targetId);
      if (Number.isFinite(numeric) && numeric > maxID) maxID = numeric;
    } else if (currentEditingId && !idChanged) {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(targetId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId, title, views })
      });
      if (!res.ok) showMessage(`Update failed: ${res.status}`);
    } else {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId, title, views })
      });
      if (!res.ok) { showMessage(`Create failed: ${res.status}`); return false; }
      const numeric = Number(targetId);
      if (Number.isFinite(numeric) && numeric > maxID) maxID = numeric;
    }
  } catch (error) {
    console.error('Save error', error);
    showMessage('Network error while saving.');
  }

  await GetData();
  return false;
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
  if (clearBtn) clearBtn.addEventListener('click', () => {
    const form = document.getElementById('post-form');
    if (form) form.reset();
    hideIdControls();
    clearMessage();
  });
  const editIdBtn = document.getElementById('editIdBtn');
  const idEditEl = document.getElementById('id_edit');
  if (editIdBtn && idEditEl) {
    editIdBtn.addEventListener('click', () => {
      if (idEditEl.style.display === 'none' || idEditEl.style.display === '') {
        idEditEl.style.display = '';
        const idReadonly = document.getElementById('id_readonly');
        idEditEl.value = idReadonly ? idReadonly.value : '';
        editIdBtn.textContent = 'Cancel';
      } else {
        idEditEl.style.display = 'none';
        idEditEl.value = '';
        editIdBtn.textContent = 'Change ID';
      }
    });
  }
  const bodyTable = document.getElementById('body-table');
  if (bodyTable) {
    bodyTable.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      if (action === 'edit') populateForm(id);
      if (action === 'delete') Delete(id);
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
      <td>${post.id}</td>
      <td>${escapeHtml(post.title)}</td>
      <td>${post.views}</td>
      <td class="actions">
        <button data-action="edit" data-id="${post.id}">Edit</button>
        <button data-action="delete" data-id="${post.id}">Delete</button>
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