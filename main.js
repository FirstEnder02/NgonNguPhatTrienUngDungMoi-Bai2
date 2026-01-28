const API_BASE = 'http://localhost:3000';
const POSTS_ENDPOINT = `${API_BASE}/posts`;

async function fetchPosts() {
  try {
    const res = await fetch(POSTS_ENDPOINT);
    if (!res.ok) throw new Error('Fetch posts failed: ' + res.status);
    const posts = await res.json();
    return Array.isArray(posts) ? posts : [];
  } catch (err) {
    console.error('fetchPosts error', err);
    return [];
  }
}

async function createPost(formData) {
  const posts = await fetchPosts();
  const maxId = posts.reduce((max, p) => {
    const n = parseInt(p.id || '0', 10);
    return n > max ? n : max;
  }, 0);

  const newId = (!formData.id || String(formData.id).trim() === '') ? String(maxId + 1) : String(formData.id);

  const newPost = {
    id: newId,
    title: formData.title || '',
    views: Number(formData.views || 0),
    isDeleted: false
  };

  try {
    const res = await fetch(POSTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost)
    });
    if (!res.ok) throw new Error('Create post failed: ' + res.status);
    return await res.json();
  } catch (err) {
    console.error('createPost error', err);
    throw err;
  }
}

async function patchPost(id, patchObj) {
  try {
    const res = await fetch(`${POSTS_ENDPOINT}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchObj)
    });
    if (!res.ok) throw new Error('Patch failed: ' + res.status);
    return await res.json();
  } catch (err) {
    console.error('patchPost error', err);
    throw err;
  }
}

async function softDeletePost(id) {
  try {
    await patchPost(id, { isDeleted: true });
    await refreshAndRender();
  } catch (err) {
    console.error('softDeletePost', err);
  }
}

async function restorePost(id) {
  try {
    await patchPost(id, { isDeleted: false });
    await refreshAndRender();
  } catch (err) {
    console.error('restorePost', err);
  }
}
function formatCellText(text) {
  return String(text == null ? '' : text);
}

function renderPosts(posts) {
  const tbody = document.getElementById('body-table');
  if (!tbody) {
    console.error('Missing #body-table element');
    return;
  }
  tbody.innerHTML = '';

  posts
    .sort((a, b) => parseInt(a.id || '0', 10) - parseInt(b.id || '0', 10))
    .forEach(post => {
      const tr = document.createElement('tr');

      if (post.isDeleted) {
        tr.classList.add('deleted');
      }

      const tdId = document.createElement('td');
      tdId.className = 'id';
      tdId.textContent = formatCellText(post.id);
      tr.appendChild(tdId);

      const tdTitle = document.createElement('td');
      tdTitle.className = 'title';
      tdTitle.textContent = formatCellText(post.title);
      tr.appendChild(tdTitle);

      const tdViews = document.createElement('td');
      tdViews.className = 'views';
      tdViews.textContent = formatCellText(post.views);
      tr.appendChild(tdViews);

      const tdActions = document.createElement('td');
      tdActions.className = 'actions';

      // Edit button (disabled when deleted)
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.disabled = !!post.isDeleted;
      if (!post.isDeleted) {
        editBtn.addEventListener('click', () => openEditPanel(post));
      }
      tdActions.appendChild(editBtn);

      // Single Delete / Restore button: shows "Delete" when not deleted, "Restore" when deleted
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      if (post.isDeleted) {
        toggleBtn.textContent = 'Restore';
        toggleBtn.disabled = false;
        toggleBtn.addEventListener('click', () => restorePost(post.id));
      } else {
        toggleBtn.textContent = 'Delete';
        toggleBtn.disabled = false;
        toggleBtn.addEventListener('click', () => softDeletePost(post.id));
      }
      tdActions.appendChild(toggleBtn);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
}


function openEditPanel(post) {
  const panel = document.getElementById('edit-panel');
  if (!panel) return;
  document.getElementById('edit_id_display').textContent = post.id;
  document.getElementById('edit_title').value = post.title || '';
  document.getElementById('edit_views').value = post.views != null ? post.views : 0;
  panel.style.display = 'block';
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('edit-msg').textContent = '';
}

function closeEditPanel() {
  const panel = document.getElementById('edit-panel');
  if (!panel) return;
  panel.style.display = 'none';
  panel.setAttribute('aria-hidden', 'true');
  document.getElementById('edit-msg').textContent = '';
}

async function refreshAndRender() {
  const posts = await fetchPosts();
  renderPosts(posts);
}

async function Save() {
  const msgEl = document.getElementById('msg');
  if (msgEl) msgEl.textContent = '';

  const idInputEl = document.getElementById('id_edit') || document.getElementById('id_readonly');
  const titleEl = document.getElementById('title_txt');
  const viewsEl = document.getElementById('views_txt');

  const idVal = idInputEl ? idInputEl.value : '';
  const titleVal = titleEl ? titleEl.value.trim() : '';
  const viewsVal = viewsEl ? Number(viewsEl.value || 0) : 0;

  if (!titleVal) {
    if (msgEl) msgEl.textContent = 'Title is required';
    return false;
  }

  try {
    await createPost({ id: idVal, title: titleVal, views: viewsVal });
    if (idInputEl) idInputEl.value = '';
    if (titleEl) titleEl.value = '';
    if (viewsEl) viewsEl.value = '';
    await refreshAndRender();
  } catch (err) {
    console.error('Save error', err);
    if (msgEl) msgEl.textContent = 'Failed to save post';
  }

  return false;
}

function clearForm() {
  const idInputEl = document.getElementById('id_edit') || document.getElementById('id_readonly');
  const titleEl = document.getElementById('title_txt');
  const viewsEl = document.getElementById('views_txt');
  if (idInputEl) idInputEl.value = '';
  if (titleEl) titleEl.value = '';
  if (viewsEl) viewsEl.value = '';
  const msgEl = document.getElementById('msg');
  if (msgEl) msgEl.textContent = '';
}

async function saveEdit() {
  const editId = document.getElementById('edit_id_display').textContent;
  const editTitle = document.getElementById('edit_title').value.trim();
  const editViews = Number(document.getElementById('edit_views').value || 0);
  const editMsg = document.getElementById('edit-msg');
  if (!editTitle) {
    if (editMsg) editMsg.textContent = 'Title required';
    return;
  }
  try {
    await patchPost(editId, { title: editTitle, views: editViews });
    closeEditPanel();
    await refreshAndRender();
  } catch (err) {
    console.error('saveEdit error', err);
    if (editMsg) editMsg.textContent = 'Save failed';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('body-table');
  const form = document.getElementById('post-form');

  if (!tbody && !form) {
    console.warn('No #body-table and no #post-form on this page — skipping initialization.');
    return;
  }

  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearForm);

  const editSaveBtn = document.getElementById('editSaveBtn');
  const editCancelBtn = document.getElementById('editCancelBtn');
  if (editSaveBtn) editSaveBtn.addEventListener('click', saveEdit);
  if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditPanel);

  if (tbody) refreshAndRender();
});
window.Save = Save;