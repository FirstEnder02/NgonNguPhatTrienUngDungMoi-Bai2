const API_BASE = 'http://127.0.0.1:3000/posts';
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

function convertObjToHTML(post) {
  const id = escapeHtml(String(post.id));
  const title = escapeHtml(String(post.title ?? ''));
  const views = escapeHtml(String(post.views ?? ''));
  return `<tr>
    <td>${id}</td>
    <td>${title}</td>
    <td>${views}</td>
    <td class="actions">
      <button type="button" onclick="populateForm('${id}')">Edit</button>
      <button type="button" onclick="Delete('${id}')">Delete</button>
    </td>
  </tr>`;
}

async function GetData() {
  console.log('GetData start');
  try {
    const res = await fetch(API_BASE);
    console.log('fetch status', res.status);
    if (!res.ok) { showMessage(`Failed to load posts: ${res.status}`); return; }
    const posts = await res.json();
    const bodyTable = document.getElementById('body-table');
    if (!bodyTable) { console.error('body-table not found'); return; }
    bodyTable.innerHTML = '';
    for (const post of posts) bodyTable.innerHTML += convertObjToHTML(post);
    clearMessage();
    console.log('table updated');
  } catch (err) {
    console.error('GetData error', err);
    showMessage('Network error while loading posts.');
  }
}

async function Save() {
  clearMessage();
  const idEl = document.getElementById('id_txt');
  const titleEl = document.getElementById('title_txt');
  const viewsEl = document.getElementById('views_txt');
  if (!titleEl || !viewsEl || !idEl) { showMessage('Form elements missing.'); return false; }

  let id = idEl.value.trim();
  const title = titleEl.value.trim();
  const viewsRaw = viewsEl.value;
  const views = viewsRaw === '' ? 0 : Number(viewsRaw);

  if (!title) { showMessage('Title is required.'); return false; }
  if (!Number.isFinite(views) || views < 0) { showMessage('Views must be a non-negative number.'); return false; }

  try {
    // If no ID provided, compute maxId + 1
    if (!id) {
      const allRes = await fetch(API_BASE);
      if (!allRes.ok) {
        showMessage(`Failed to fetch posts for ID generation: ${allRes.status}`);
        return false;
      }
      const allPosts = await allRes.json();
      // compute numeric max; handle string ids and non-numeric gracefully
      let max = 0;
      for (const p of allPosts) {
        const n = Number(p.id);
        if (Number.isFinite(n) && n > max) max = n;
      }
      id = String(max + 1);
    }

    // Check if item exists
    const getItem = await fetch(`${API_BASE}/${encodeURIComponent(id)}`);
    if (getItem.ok) {
      // update existing
      const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, views })
      });
      if (!res.ok) showMessage(`Update failed: ${res.status}`);
    } else {
      // create new
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, views })
      });
      if (!res.ok) showMessage(`Create failed: ${res.status}`);
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

function populateForm(id) {
  clearMessage();
  fetch(`${API_BASE}/${encodeURIComponent(id)}`)
    .then(r => { if (!r.ok) throw new Error(`Not found ${r.status}`); return r.json(); })
    .then(post => {
      document.getElementById('id_txt').value = post.id;
      document.getElementById('title_txt').value = post.title ?? '';
      document.getElementById('views_txt').value = post.views ?? 0;
      document.getElementById('title_txt').focus();
    })
    .catch(err => { console.error(err); showMessage('Could not load post for editing.'); });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready');
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => { document.getElementById('post-form').reset(); clearMessage(); });
  GetData();
});
