const API_BASE = 'http://localhost:3000';
const POSTS_ENDPOINT = `${API_BASE}/posts`;
const COMMENTS_ENDPOINT = `${API_BASE}/comments`;

console.log('main.js loaded — starting initialization');

window.addEventListener('error', (e) => {
  console.error('Global error caught:', e.message, e.filename + ':' + e.lineno);
});

window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled promise rejection:', ev.reason);
});

function formatCellText(text) {
  return String(text == null ? '' : text);
}

async function safeJsonFetch(url, opts) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error('safeJsonFetch error', err);
    throw err;
  }
}
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

  return await safeJsonFetch(POSTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newPost)
  });
}

async function patchPost(id, patchObj) {
  return await safeJsonFetch(`${POSTS_ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patchObj)
  });
}

async function softDeletePost(id) {
  try {
    await patchPost(id, { isDeleted: true });
    await refreshAndRenderPosts();
  } catch (err) {
    console.error('softDeletePost', err);
  }
}

async function restorePost(id) {
  try {
    await patchPost(id, { isDeleted: false });
    await refreshAndRenderPosts();
  } catch (err) {
    console.error('restorePost', err);
  }
}

function renderPosts(posts) {
  const tbody = document.getElementById('body-table');
  if (!tbody) {
    console.error('Missing #body-table element');
    return;
  }
  tbody.innerHTML = '';

  posts
    .sort((a, b) => {
      const aDel = !!a.isDeleted;
      const bDel = !!b.isDeleted;
      if (aDel !== bDel) return aDel ? 1 : -1;
      return parseInt(a.id || '0', 10) - parseInt(b.id || '0', 10);
    })
    .forEach(post => {
      const tr = document.createElement('tr');
      if (post.isDeleted) tr.classList.add('deleted');

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

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.disabled = !!post.isDeleted;
      if (!post.isDeleted) editBtn.addEventListener('click', () => openPostEditPanel(post));
      tdActions.appendChild(editBtn);

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      if (post.isDeleted) {
        toggleBtn.textContent = 'Restore';
        toggleBtn.addEventListener('click', () => restorePost(post.id));
      } else {
        toggleBtn.textContent = 'Delete';
        toggleBtn.addEventListener('click', () => softDeletePost(post.id));
      }
      tdActions.appendChild(toggleBtn);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
}

function openPostEditPanel(post) {
  const panel = document.getElementById('edit-panel');
  if (!panel) return;
  document.getElementById('edit_id_display').textContent = post.id;
  document.getElementById('edit_title').value = post.title || '';
  document.getElementById('edit_views').value = post.views != null ? post.views : 0;
  panel.style.display = 'block';
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('edit-msg').textContent = '';
}

function closePostEditPanel() {
  const panel = document.getElementById('edit-panel');
  if (!panel) return;
  panel.style.display = 'none';
  panel.setAttribute('aria-hidden', 'true');
  const msg = document.getElementById('edit-msg');
  if (msg) msg.textContent = '';
}

async function refreshAndRenderPosts() {
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
    await refreshAndRenderPosts();
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
    closePostEditPanel();
    await refreshAndRenderPosts();
  } catch (err) {
    console.error('saveEdit error', err);
    if (editMsg) editMsg.textContent = 'Save failed';
  }
}
window.Save = Save;
async function fetchComments() {
  try {
    const res = await fetch(COMMENTS_ENDPOINT);
    if (!res.ok) throw new Error('Fetch comments failed: ' + res.status);
    const comments = await res.json();
    return Array.isArray(comments) ? comments : [];
  } catch (err) {
    console.error('fetchComments error', err);
    return [];
  }
}

async function createComment(formData) {
  const comments = await fetchComments();
  const maxId = comments.reduce((max, c) => {
    const n = parseInt(c.id || '0', 10);
    return n > max ? n : max;
  }, 0);

  const newId = (!formData.id || String(formData.id).trim() === '') ? String(maxId + 1) : String(formData.id);

  const newComment = {
    id: newId,
    text: formData.text || '',
    postId: String(formData.postId || ''),
    isDeleted: false
  };

  return await safeJsonFetch(COMMENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newComment)
  });
}

async function patchComment(id, patchObj) {
  return await safeJsonFetch(`${COMMENTS_ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patchObj)
  });
}

async function softDeleteComment(id) {
  try {
    await patchComment(id, { isDeleted: true });
    await refreshAndRenderComments();
  } catch (err) {
    console.error('softDeleteComment', err);
  }
}

async function restoreComment(id) {
  try {
    await patchComment(id, { isDeleted: false });
    await refreshAndRenderComments();
  } catch (err) {
    console.error('restoreComment', err);
  }
}

function renderComments(comments) {
  const tbody = document.getElementById('comments-table');
  if (!tbody) {
    console.error('Missing #comments-table element');
    return;
  }
  tbody.innerHTML = '';

  comments
    .sort((a, b) => {
      const aDel = !!a.isDeleted;
      const bDel = !!b.isDeleted;
      if (aDel !== bDel) return aDel ? 1 : -1;
      return parseInt(a.id || '0', 10) - parseInt(b.id || '0', 10);
    })
    .forEach(comment => {
      const tr = document.createElement('tr');
      if (comment.isDeleted) tr.classList.add('deleted');

      const tdId = document.createElement('td');
      tdId.className = 'id';
      tdId.textContent = formatCellText(comment.id);
      tr.appendChild(tdId);

      const tdText = document.createElement('td');
      tdText.className = 'title';
      tdText.textContent = formatCellText(comment.text);
      tr.appendChild(tdText);

      const tdPostId = document.createElement('td');
      tdPostId.className = 'views';
      tdPostId.textContent = formatCellText(comment.postId);
      tr.appendChild(tdPostId);

      const tdActions = document.createElement('td');
      tdActions.className = 'actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.disabled = !!comment.isDeleted;
      if (!comment.isDeleted) editBtn.addEventListener('click', () => openCommentEditPanel(comment));
      tdActions.appendChild(editBtn);

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      if (comment.isDeleted) {
        toggleBtn.textContent = 'Restore';
        toggleBtn.addEventListener('click', () => restoreComment(comment.id));
      } else {
        toggleBtn.textContent = 'Delete';
        toggleBtn.addEventListener('click', () => softDeleteComment(comment.id));
      }
      tdActions.appendChild(toggleBtn);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
}

function openCommentEditPanel(comment) {
  const panel = document.getElementById('comment-edit-panel');
  if (!panel) return;
  document.getElementById('edit_comment_id_display').textContent = comment.id;
  document.getElementById('edit_comment_text').value = comment.text || '';
  document.getElementById('edit_comment_postid').value = comment.postId || '';
  const editPostId = document.getElementById('edit_comment_postid');
  if (editPostId) editPostId.readOnly = true;

  panel.style.display = 'block';
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('edit-comment-msg').textContent = '';
  showCommentIdDisplay(true, comment.id);
}

function closeCommentEditPanel() {
  const panel = document.getElementById('comment-edit-panel');
  if (!panel) return;
  panel.style.display = 'none';
  panel.setAttribute('aria-hidden', 'true');
  document.getElementById('edit-comment-msg').textContent = '';
  showCommentIdDisplay(false);
  const editPostId = document.getElementById('edit_comment_postid');
  if (editPostId) editPostId.readOnly = false;
}

async function refreshAndRenderComments() {
  try {
    const comments = await fetchComments();
    renderComments(comments);
  } catch (err) {
    console.error('refreshAndRenderComments error', err);
  }
}

async function saveComment() {
  const msgEl = document.getElementById('comment-msg');
  if (msgEl) msgEl.textContent = '';

  const textEl = document.getElementById('comment_text_edit');
  const postIdEl = document.getElementById('comment_postid_edit');

  const textVal = textEl ? textEl.value.trim() : '';
  const postIdVal = postIdEl ? postIdEl.value.trim() : '';

  if (!textVal) {
    if (msgEl) msgEl.textContent = 'Text is required';
    return false;
  }
  if (!postIdVal) {
    if (msgEl) msgEl.textContent = 'Post ID is required';
    return false;
  }

  try {
    await createComment({ id: '', text: textVal, postId: postIdVal });
    if (textEl) textEl.value = '';
    if (postIdEl) postIdEl.value = '';
    showCommentIdDisplay(false);
    await refreshAndRenderComments();
  } catch (err) {
    console.error('saveComment error', err);
    if (msgEl) msgEl.textContent = 'Failed to save comment';
  }

  return false;
}

function clearCommentForm() {
  const textEl = document.getElementById('comment_text_edit');
  const postIdEl = document.getElementById('comment_postid_edit');
  if (textEl) textEl.value = '';
  if (postIdEl) postIdEl.value = '';
  const msgEl = document.getElementById('comment-msg');
  if (msgEl) msgEl.textContent = '';
  showCommentIdDisplay(false);
}

async function saveCommentEdit() {
  const editId = document.getElementById('edit_comment_id_display').textContent;
  const editText = document.getElementById('edit_comment_text').value.trim();
  const editPostId = document.getElementById('edit_comment_postid').value.trim();
  const editMsg = document.getElementById('edit-comment-msg');

  if (!editText) {
    if (editMsg) editMsg.textContent = 'Text required';
    return;
  }

  try {
    await patchComment(editId, { text: editText, postId: editPostId });
    closeCommentEditPanel();
    await refreshAndRenderComments();
  } catch (err) {
    console.error('saveCommentEdit error', err);
    if (editMsg) editMsg.textContent = 'Save failed';
  }
}

window.saveComment = saveComment;
window.clearCommentForm = clearCommentForm;
window.saveCommentEdit = saveCommentEdit;
window.closeCommentEditPanel = closeCommentEditPanel;

function showCommentIdDisplay(show, idValue = '') {
  const displayWrap = document.getElementById('comment_id_display');
  const label = document.getElementById('comment_id_label');
  const readonly = document.getElementById('comment_id_readonly');
  const postIdInput = document.getElementById('comment_postid_edit');

  if (!displayWrap || !readonly || !postIdInput) return;

  if (show) {
    label.style.display = '';
    displayWrap.style.display = '';
    readonly.value = idValue;
    postIdInput.readOnly = true;
  } else {
    label.style.display = 'none';
    displayWrap.style.display = 'none';
    readonly.value = '';
    postIdInput.readOnly = false;
  }
}

async function fetchProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`);
    if (!res.ok) throw new Error('Profile fetch failed: ' + res.status);
    return await res.json();
  } catch (err) {
    console.error('fetchProfile error', err);
    return null;
  }
}

async function refreshProfileCard() {
  const el = document.getElementById('profile-name');
  if (!el) return;
  el.textContent = 'Loading…';
  const profile = await fetchProfile();
  if (!profile) {
    el.textContent = '—';
    return;
  }
  el.textContent = profile.name || '—';
}

document.addEventListener('DOMContentLoaded', () => {
  const postsTbody = document.getElementById('body-table');
  const postForm = document.getElementById('post-form');
  if (postsTbody || postForm) {
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearForm);

    const editSaveBtn = document.getElementById('editSaveBtn');
    const editCancelBtn = document.getElementById('editCancelBtn');
    if (editSaveBtn) editSaveBtn.addEventListener('click', saveEdit);
    if (editCancelBtn) editCancelBtn.addEventListener('click', closePostEditPanel);

    if (postsTbody) refreshAndRenderPosts();
  }

  const commentsTbody = document.getElementById('comments-table');
  const commentForm = document.getElementById('comment-form');
  if (commentsTbody || commentForm) {
    const clearCommentBtn = document.getElementById('clearCommentBtn');
    if (clearCommentBtn) clearCommentBtn.addEventListener('click', clearCommentForm);

    const editCommentSaveBtn = document.getElementById('editCommentSaveBtn');
    const editCommentCancelBtn = document.getElementById('editCommentCancelBtn');
    if (editCommentSaveBtn) editCommentSaveBtn.addEventListener('click', saveCommentEdit);
    if (editCommentCancelBtn) editCommentCancelBtn.addEventListener('click', closeCommentEditPanel);

    if (commentsTbody) refreshAndRenderComments();
  }

  const profileCard = document.getElementById('profile-card');
  if (profileCard) refreshProfileCard();
});