// posts-common.js
const API_BASE = '/';
const POSTS_ENDPOINT = `${API_BASE}posts`;

export async function fetchPosts() {
  const res = await fetch(POSTS_ENDPOINT);
  if (!res.ok) throw new Error('Fetch posts failed: ' + res.status);
  return await res.json();
}

export async function createPost(post) {
  const res = await fetch(POSTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post)
  });
  if (!res.ok) throw new Error('Create failed: ' + res.status);
  return await res.json();
}

export async function patchPost(id, patchObj) {
  const res = await fetch(`${POSTS_ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patchObj)
  });
  if (!res.ok) throw new Error('Patch failed: ' + res.status);
  return await res.json();
}

/**
 * Render posts into a tbody element. Uses event delegation for actions.
 * handlers: { onEdit(id, post), onDelete(id), onRestore(id) }
 */
export function renderPosts(tbodyEl, posts, handlers = {}) {
  if (!tbodyEl) throw new Error('Missing tbody element');
  tbodyEl.innerHTML = '';

  posts
    .sort((a, b) => parseInt(a.id || '0', 10) - parseInt(b.id || '0', 10))
    .forEach(post => {
      const tr = document.createElement('tr');
      if (post.isDeleted) tr.classList.add('deleted');

      tr.innerHTML = `
        <td class="id">${escapeText(post.id)}</td>
        <td class="title">${escapeText(post.title)}</td>
        <td class="views">${escapeText(post.views)}</td>
        <td class="actions">
          <button data-action="edit" data-id="${post.id}" ${post.isDeleted ? 'disabled' : ''}>Edit</button>
          <button data-action="${post.isDeleted ? 'restore' : 'delete'}" data-id="${post.id}">
            ${post.isDeleted ? 'Restore' : 'Delete'}
          </button>
        </td>`.trim();

      tbodyEl.appendChild(tr);
    });

  // single delegated listener (idempotent)
  if (!tbodyEl._hasDelegatedListener) {
    tbodyEl.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'edit') handlers.onEdit?.(id);
      if (action === 'delete') handlers.onDelete?.(id);
      if (action === 'restore') handlers.onRestore?.(id);
    });
    tbodyEl._hasDelegatedListener = true;
  }
}

function escapeText(v) {
  return String(v == null ? '' : v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Utility: refresh posts and render */
export async function refreshAndRender(tbodyEl, handlers) {
  const posts = await fetchPosts();
  renderPosts(tbodyEl, posts, handlers);
}
