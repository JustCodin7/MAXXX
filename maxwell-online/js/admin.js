/* MAXWELL ONLINE — admin.js
   Handles: login, product list, add/edit/delete, and image upload to Supabase Storage. */

let client = null;
let editingId = null;

function initClient() {
  client = window.supabase.createClient(SITE_CONFIG.supabase.url, SITE_CONFIG.supabase.anonKey);
}

/* ---------- Auth ---------- */
async function checkSession() {
  const { data: { session } } = await client.auth.getSession();
  if (session) showDashboard(); else showLogin();
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = error.message;
    return;
  }
  showDashboard();
}

async function logout() {
  await client.auth.signOut();
  showLogin();
}

function showLogin() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('dashboard-view').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
  loadProductList();
}

/* ---------- Product list ---------- */
async function loadProductList() {
  const tbody = document.getElementById('admin-product-list');
  tbody.innerHTML = `<tr><td colspan="6" class="admin-loading">Loading products…</td></tr>`;

  const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-error">Error loading products: ${error.message}</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-loading">No products yet. Add your first one above.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => {
    const firstImg = (p.images || '').split('|')[0];
    return `
      <tr>
        <td class="admin-thumb-cell">${firstImg ? `<img src="${firstImg}" alt="">` : '—'}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>R${parseFloat(p.price).toFixed(2)}</td>
        <td>${p.stock}</td>
        <td class="admin-actions">
          <button class="admin-edit-btn" data-id="${p.id}">Edit</button>
          <button class="admin-delete-btn" data-id="${p.id}">Delete</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.admin-edit-btn').forEach(b => b.addEventListener('click', () => editProduct(b.dataset.id, data)));
  tbody.querySelectorAll('.admin-delete-btn').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.id)));
}

/* ---------- Add / Edit ---------- */
function editProduct(id, list) {
  const p = list.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('form-title').textContent = `Editing: ${p.name}`;
  document.getElementById('f-name').value = p.name;
  document.getElementById('f-category').value = p.category;
  document.getElementById('f-subcategory').value = p.subcategory || '';
  document.getElementById('f-price').value = p.price;
  document.getElementById('f-stock').value = p.stock;
  document.getElementById('f-description').value = p.description || '';
  document.getElementById('f-featured').checked = !!p.featured;
  document.getElementById('f-icon').value = p.icon || 'box';
  document.getElementById('existing-images').value = p.images || '';
  document.getElementById('cancel-edit-btn').style.display = 'inline-flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  editingId = null;
  document.getElementById('product-form').reset();
  document.getElementById('form-title').textContent = 'Add a product';
  document.getElementById('existing-images').value = '';
  document.getElementById('cancel-edit-btn').style.display = 'none';
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) { alert('Error deleting: ' + error.message); return; }
  loadProductList();
}

async function uploadImages(files) {
  const urls = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await client.storage.from('product-images').upload(path, file);
    if (error) { alert('Image upload failed: ' + error.message); continue; }
    const { data } = client.storage.from('product-images').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

async function saveProduct(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const fileInput = document.getElementById('f-images');
    const newUrls = fileInput.files.length ? await uploadImages(fileInput.files) : [];
    const existing = document.getElementById('existing-images').value;
    const allImages = [existing, newUrls.join('|')].filter(Boolean).join('|');

    const payload = {
      name: document.getElementById('f-name').value.trim(),
      category: document.getElementById('f-category').value,
      subcategory: document.getElementById('f-subcategory').value.trim(),
      price: parseFloat(document.getElementById('f-price').value),
      stock: parseInt(document.getElementById('f-stock').value, 10),
      description: document.getElementById('f-description').value.trim(),
      featured: document.getElementById('f-featured').checked,
      icon: document.getElementById('f-icon').value,
      images: allImages
    };

    let error;
    if (editingId) {
      ({ error } = await client.from('products').update(payload).eq('id', editingId));
    } else {
      ({ error } = await client.from('products').insert(payload));
    }

    if (error) { alert('Error saving: ' + error.message); return; }

    cancelEdit();
    fileInput.value = '';
    loadProductList();
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save product';
  }
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initClient();
  checkSession();
  document.getElementById('login-form').addEventListener('submit', login);
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('product-form').addEventListener('submit', saveProduct);
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
});
