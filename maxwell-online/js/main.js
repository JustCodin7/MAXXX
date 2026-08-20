/* MAXWELL ONLINE — main.js
   Handles: CSV product loading, aisle/category rendering,
   product grid rendering + filters, and the WhatsApp cart. */

/* ---------- Icons ---------- */
const ICONS = {
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-3.2 3.2-2-2 3.2-3.2z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8zM12 16v5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 16v-3l2-5h12l2 5v3M4 16h16M4 16v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M17 16v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M7 12h10" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11l8-7 8 7M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8l9-4 9 4-9 4-9-4zm0 0v9l9 4m0-13v13m9-13v9l-9 4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  dumbbell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 9v6M2 10v4M20 9v6M22 10v4M7 12h10M7 8v8M17 8v8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

const waIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.6-1.2-1.4-1.4-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4-.1-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.5-.3z"/></svg>`;

let PRODUCTS = [];
let sbClient = null;

function getSupabaseClient() {
  if (sbClient) return sbClient;
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded — check the script tag in the HTML.');
    return null;
  }
  sbClient = window.supabase.createClient(SITE_CONFIG.supabase.url, SITE_CONFIG.supabase.anonKey);
  return sbClient;
}

/* ---------- Simple CSV parser (handles quoted fields) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && next === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length === headers.length).map(r => {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = r[idx].trim());
    return obj;
  });
}

async function loadProducts() {
  if (PRODUCTS.length) return PRODUCTS;

  if (SITE_CONFIG.dataSource === 'supabase') {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase load error:', error);
      return [];
    }
    PRODUCTS = data.map(p => ({
      ...p,
      price: parseFloat(p.price),
      images: (p.images || '').split('|').map(s => s.trim()).filter(Boolean)
    }));
    return PRODUCTS;
  }

  // CSV fallback
  const res = await fetch(SITE_CONFIG.productsCsvUrl);
  const text = await res.text();
  PRODUCTS = parseCSV(text).map(p => ({
    ...p,
    price: parseFloat(p.price),
    featured: p.featured === 'yes',
    images: (p.images || '').split('|').map(s => s.trim()).filter(Boolean)
  }));
  return PRODUCTS;
}

/* ---------- Rendering ---------- */
function productCard(p) {
  const hasImage = p.images && p.images.length > 0;
  const thumbContent = hasImage
    ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy">`
    : ICONS[p.icon] || ICONS.box;
  const galleryBadge = hasImage && p.images.length > 1
    ? `<span class="gallery-badge">+${p.images.length - 1}</span>` : '';

  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-thumb thumb-${p.category} ${hasImage ? 'has-photo' : ''}" data-open-id="${p.id}">
        <span class="cat-tag">${p.category}</span>
        ${galleryBadge}
        ${thumbContent}
      </div>
      <div class="product-body">
        <span class="product-sub" data-open-id="${p.id}">${p.subcategory}</span>
        <h4 data-open-id="${p.id}">${p.name}</h4>
        <span class="product-stock">${p.stock > 5 ? 'In stock' : p.stock > 0 ? 'Low stock' : 'Out of stock'}</span>
        <div class="product-price">${SITE_CONFIG.currencySymbol}${p.price.toFixed(2)}</div>
        <button class="add-btn" data-id="${p.id}" ${p.stock == 0 ? 'disabled' : ''}>+ Add to cart</button>
      </div>
    </div>`;
}

function renderAisles(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = SITE_CONFIG.categories.map(c => `
    <a class="aisle-card" href="shop.html?category=${encodeURIComponent(c.name)}">
      <div class="aisle-num">AISLE ${c.aisle}</div>
      <div class="aisle-icon">${ICONS[c.icon]}</div>
      <h3>${c.name}</h3>
      <p>${c.blurb}</p>
    </a>`).join('');
}

function renderProducts(list, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = list.length
    ? list.map(productCard).join('')
    : `<p style="grid-column:1/-1;color:var(--steel);font-size:14px;">No products match those filters.</p>`;
  el.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(btn.dataset.id);
      btn.textContent = '✓ Added';
      btn.classList.add('added');
      setTimeout(() => { btn.textContent = '+ Add to cart'; btn.classList.remove('added'); }, 1200);
    });
  });
  el.querySelectorAll('[data-open-id]').forEach(node => {
    node.addEventListener('click', () => openProductModal(node.dataset.openId));
  });
}

/* ---------- Product popup (gallery + description) ---------- */
let modalGalleryIndex = 0;

function openProductModal(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  modalGalleryIndex = 0;
  const modal = document.getElementById('product-modal');
  const hasImages = p.images && p.images.length > 0;

  renderModalContent(p, hasImages);
  modal.classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
}

function renderModalContent(p, hasImages) {
  const stage = document.getElementById('modal-image-stage');
  const thumbs = document.getElementById('modal-thumbs');
  const body = document.getElementById('modal-body');

  stage.innerHTML = hasImages
    ? `<img src="${p.images[modalGalleryIndex]}" alt="${p.name}">`
    : `<div class="modal-icon thumb-${p.category}">${ICONS[p.icon] || ICONS.box}</div>`;

  thumbs.innerHTML = hasImages && p.images.length > 1
    ? p.images.map((img, i) => `<button class="modal-thumb ${i === modalGalleryIndex ? 'active' : ''}" data-idx="${i}"><img src="${img}" alt=""></button>`).join('')
    : '';
  thumbs.querySelectorAll('.modal-thumb').forEach(btn => {
    btn.addEventListener('click', () => { modalGalleryIndex = parseInt(btn.dataset.idx); renderModalContent(p, hasImages); });
  });

  body.innerHTML = `
    <span class="cat-tag" style="position:static; display:inline-block;">${p.category} · ${p.subcategory}</span>
    <h2>${p.name}</h2>
    <p class="modal-desc">${p.description}</p>
    <div class="product-stock">${p.stock > 5 ? 'In stock' : p.stock > 0 ? `Low stock — ${p.stock} left` : 'Out of stock'}</div>
    <div class="product-price" style="font-size:26px;">${SITE_CONFIG.currencySymbol}${p.price.toFixed(2)}</div>
    <button class="add-btn" id="modal-add-btn" ${p.stock == 0 ? 'disabled' : ''}>+ Add to cart</button>
  `;
  document.getElementById('modal-add-btn').addEventListener('click', () => {
    addToCart(p.id);
    const b = document.getElementById('modal-add-btn');
    b.textContent = '✓ Added'; b.classList.add('added');
    setTimeout(() => { b.textContent = '+ Add to cart'; b.classList.remove('added'); }, 1200);
  });
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
}

/* ---------- Filters (shop page) ---------- */
function initFilters() {
  const catSel = document.getElementById('filter-category');
  const sortSel = document.getElementById('filter-sort');
  const searchInput = document.getElementById('shop-search');
  if (!catSel) return;

  SITE_CONFIG.categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name; opt.textContent = c.name;
    catSel.appendChild(opt);
  });

  const params = new URLSearchParams(location.search);
  if (params.get('category')) catSel.value = params.get('category');
  if (params.get('search') && searchInput) searchInput.value = params.get('search');

  function apply() {
    let list = [...PRODUCTS];
    const cat = catSel.value;
    const term = (searchInput?.value || '').toLowerCase().trim();
    if (cat !== 'all') list = list.filter(p => p.category === cat);
    if (term) list = list.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.subcategory.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
    const sort = sortSel.value;
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));

    renderProducts(list, 'shop-grid');
    document.getElementById('results-count').textContent = `${list.length} product${list.length !== 1 ? 's' : ''}`;
  }

  catSel.addEventListener('change', apply);
  sortSel.addEventListener('change', apply);
  searchInput?.addEventListener('input', apply);
  apply();
}

/* ---------- Cart (localStorage-backed) ---------- */
const CART_KEY = 'maxwell_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function addToCart(id) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + 1;
  saveCart(cart);
  renderCart();
}
function setQty(id, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart(cart);
  renderCart();
}
function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
  renderCart();
}

function renderCart() {
  const cart = getCart();
  const ids = Object.keys(cart);
  const countEls = document.querySelectorAll('.cart-count');
  const totalCount = ids.reduce((sum, id) => sum + cart[id], 0);
  countEls.forEach(el => el.textContent = totalCount);

  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!itemsEl) return;

  if (!ids.length) {
    itemsEl.innerHTML = `<div class="cart-empty">Your cart is empty.<br>Browse the shop to add items.</div>`;
    if (totalEl) totalEl.textContent = `${SITE_CONFIG.currencySymbol}0.00`;
    return;
  }

  let total = 0;
  itemsEl.innerHTML = ids.map(id => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return '';
    const lineTotal = p.price * cart[id];
    total += lineTotal;
    return `
      <div class="cart-item" data-id="${id}">
        <div class="cart-item-thumb thumb-${p.category}">${ICONS[p.icon] || ICONS.box}</div>
        <div class="cart-item-info">
          <h5>${p.name}</h5>
          <div class="cart-item-price">${SITE_CONFIG.currencySymbol}${p.price.toFixed(2)} each</div>
          <div class="qty-controls">
            <button class="qty-minus" data-id="${id}">−</button>
            <span>${cart[id]}</span>
            <button class="qty-plus" data-id="${id}">+</button>
          </div>
          <button class="remove-item" data-id="${id}">Remove</button>
        </div>
      </div>`;
  }).join('');
  if (totalEl) totalEl.textContent = `${SITE_CONFIG.currencySymbol}${total.toFixed(2)}`;

  itemsEl.querySelectorAll('.qty-plus').forEach(b => b.addEventListener('click', () => setQty(b.dataset.id, cart[b.dataset.id] + 1)));
  itemsEl.querySelectorAll('.qty-minus').forEach(b => b.addEventListener('click', () => setQty(b.dataset.id, cart[b.dataset.id] - 1)));
  itemsEl.querySelectorAll('.remove-item').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.id)));
}

function buildWhatsAppOrder() {
  const cart = getCart();
  const ids = Object.keys(cart);
  if (!ids.length) return null;
  let msg = `Hi ${SITE_CONFIG.businessName}, I'd like to order:\n\n`;
  let total = 0;
  ids.forEach(id => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    const lineTotal = p.price * cart[id];
    total += lineTotal;
    msg += `• ${p.name} x${cart[id]} — ${SITE_CONFIG.currencySymbol}${lineTotal.toFixed(2)}\n`;
  });
  msg += `\nTotal: ${SITE_CONFIG.currencySymbol}${total.toFixed(2)}\n\nPlease confirm availability and delivery/collection.`;
  return msg;
}

function initCartUI() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  document.querySelectorAll('.cart-btn').forEach(b => b.addEventListener('click', () => {
    drawer?.classList.add('open');
    overlay?.classList.add('open');
  }));
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  overlay?.addEventListener('click', closeCart);

  document.getElementById('checkout-btn')?.addEventListener('click', () => {
    const msg = buildWhatsAppOrder();
    if (!msg) return;
    const url = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  });

  function closeCart() {
    drawer?.classList.remove('open');
    overlay?.classList.remove('open');
  }
  renderCart();
}

function initMobileNav() {
  const toggle = document.getElementById('mobile-nav-toggle');
  const nav = document.getElementById('mobile-nav');
  toggle?.addEventListener('click', () => nav.classList.toggle('open'));
}

function initSearchRedirect() {
  const form = document.getElementById('header-search-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const val = document.getElementById('header-search-input').value.trim();
    window.location.href = `shop.html?search=${encodeURIComponent(val)}`;
  });
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderAisles('aisle-grid');
  renderProducts(PRODUCTS.filter(p => p.featured), 'featured-grid');
  initFilters();
  initCartUI();
  initMobileNav();
  initSearchRedirect();

  document.getElementById('modal-close')?.addEventListener('click', closeProductModal);
  document.getElementById('modal-overlay')?.addEventListener('click', closeProductModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProductModal(); });

  // set WhatsApp float + footer links dynamically
  document.querySelectorAll('.wa-link').forEach(a => a.href = `https://wa.me/${SITE_CONFIG.whatsappNumber}`);
  document.querySelectorAll('.js-phone').forEach(a => a.textContent = SITE_CONFIG.phone);
  document.querySelectorAll('.js-email').forEach(a => { a.textContent = SITE_CONFIG.email; a.href = `mailto:${SITE_CONFIG.email}`; });
});
