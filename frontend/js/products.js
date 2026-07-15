// Products view: list, search, create/edit (with flexible attributes + image), delete.
const Products = (() => {
  const { $, esc, money, toast, openModal, closeModal, confirmDialog } = UI;
  let cache = [];

  async function load(search = '') {
    cache = await API.listProducts(search);
    render();
  }

  function render() {
    const body = $('#products-body');
    $('#products-empty').style.display = cache.length ? 'none' : 'block';
    body.innerHTML = cache.map((p) => `
      <tr>
        <td><b>${esc(p.name)}</b>${p.description ? `<div class="muted" style="font-weight:400">${esc(p.description)}</div>` : ''}</td>
        <td>${esc(p.sku || '—')}</td>
        <td>${esc(p.unit)}</td>
        <td>${money(p.price)}</td>
        <td>${Object.entries(p.attributes || {}).map(([k, v]) => `<span class="chip">${esc(k)}: ${esc(v)}</span>`).join('') || '<span class="muted">—</span>'}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn sm" data-edit="${p.id}">Edit</button>
          <button class="btn sm danger" data-del="${p.id}">Delete</button>
        </td>
      </tr>`).join('');
    body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(Number(b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => remove(Number(b.dataset.del)));
  }

  function attrRowsHtml(attributes) {
    const entries = Object.entries(attributes || {});
    if (!entries.length) entries.push(['', '']);
    return entries.map(([k, v]) => attrRow(k, v)).join('');
  }
  const attrRow = (k = '', v = '') => `
    <div class="kv-row">
      <input class="attr-key" placeholder="Attribute (e.g. width)" value="${esc(k)}">
      <input class="attr-val" placeholder="Value (e.g. 1200)" value="${esc(v)}">
      <button class="icon-btn attr-del" title="Remove">✕</button>
    </div>`;

  function formHtml(p = {}) {
    return `
      <div class="field-grid">
        <label class="span-2">Name<input id="f-name" value="${esc(p.name || '')}" placeholder="Product name"></label>
        <label>SKU<input id="f-sku" value="${esc(p.sku || '')}"></label>
        <label>Unit<input id="f-unit" value="${esc(p.unit || 'pcs')}"></label>
        <label>Price<input id="f-price" type="number" step="0.01" value="${p.price ?? 0}"></label>
        <label>Image<input id="f-image" type="file" accept="image/*"></label>
        <label class="span-2">Description<textarea id="f-desc" rows="2">${esc(p.description || '')}</textarea></label>
      </div>
      <div id="f-image-preview">${p.image_path ? `<img src="${esc(p.image_path)}" style="max-height:80px;border-radius:8px;margin-top:8px">` : ''}</div>
      <div class="subhead">Attributes</div>
      <div id="attr-list">${attrRowsHtml(p.attributes)}</div>
      <button class="btn sm" id="attr-add">＋ Add attribute</button>`;
  }

  function wireForm(root, state) {
    const list = root.querySelector('#attr-list');
    root.querySelector('#attr-add').onclick = () => {
      const tmp = document.createElement('div');
      tmp.innerHTML = attrRow();
      list.appendChild(tmp.firstElementChild);
      wireAttrDeletes(list);
    };
    wireAttrDeletes(list);
    root.querySelector('#f-image').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        state.image_path = await API.uploadImage(file);
        root.querySelector('#f-image-preview').innerHTML =
          `<img src="${state.image_path}" style="max-height:80px;border-radius:8px;margin-top:8px">`;
        toast('Image uploaded', 'ok');
      } catch (err) { toast(err.message, 'error'); }
    };
  }
  function wireAttrDeletes(list) {
    list.querySelectorAll('.attr-del').forEach((b) => b.onclick = () => {
      b.closest('.kv-row').remove();
    });
  }

  function collect(root, state) {
    const attributes = {};
    root.querySelectorAll('.kv-row').forEach((row) => {
      const k = row.querySelector('.attr-key').value.trim();
      const v = row.querySelector('.attr-val').value.trim();
      if (k) attributes[k] = v;
    });
    return {
      name: root.querySelector('#f-name').value.trim(),
      sku: root.querySelector('#f-sku').value.trim() || null,
      unit: root.querySelector('#f-unit').value.trim() || 'pcs',
      price: parseFloat(root.querySelector('#f-price').value) || 0,
      description: root.querySelector('#f-desc').value.trim() || null,
      image_path: state.image_path || null,
      attributes,
    };
  }

  function openForm(product) {
    const state = { image_path: product?.image_path || null };
    const isEdit = !!product;
    const root = openModal(isEdit ? 'Edit product' : 'New product', formHtml(product || {}), [
      { label: 'Cancel', onClick: (close) => close() },
      { label: 'Save', class: 'primary', onClick: async (close) => {
          const data = collect(root, state);
          if (!data.name) return toast('Name is required', 'error');
          try {
            if (isEdit) await API.updateProduct(product.id, data);
            else await API.createProduct(data);
            close();
            toast('Product saved', 'ok');
            await load($('#p-search').value);
            document.dispatchEvent(new Event('products-changed'));
          } catch (err) { toast(err.message, 'error'); }
        } },
    ]);
    wireForm(root, state);
  }

  async function edit(id) { openForm(await API.getProduct(id)); }
  function remove(id) {
    const p = cache.find((x) => x.id === id);
    confirmDialog('Delete product', `Delete "${p?.name}"? This cannot be undone.`, async () => {
      try { await API.deleteProduct(id); toast('Deleted', 'ok'); await load($('#p-search').value);
        document.dispatchEvent(new Event('products-changed')); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  function init() {
    $('#p-new-btn').onclick = () => openForm(null);
    let t;
    $('#p-search').oninput = (e) => { clearTimeout(t); t = setTimeout(() => load(e.target.value), 250); };
  }

  return { init, load, getCache: () => cache };
})();
