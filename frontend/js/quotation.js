// Main quotation generator: template-driven grid, snapshot line items, totals, save/preview/PDF.
const Quotation = (() => {
  const { $, esc, money, toast, confirmDialog } = UI;

  let templates = [];
  let companies = [];      // sender companies for the "From" dropdown
  let products = [];       // full catalogue for search/autofill
  let items = [];          // line-item snapshots (editable, decoupled from products)
  let currentId = null;    // id of the loaded/saved quotation (null = new draft)
  let appliedTerms = '';   // the company default-terms last auto-filled (to know when it's safe to replace)

  // ---- reference data ----
  async function refreshTemplates() {
    templates = await API.listTemplates();
    const sel = $('#q-template');
    const prev = sel.value;
    sel.innerHTML = templates.map((t) =>
      `<option value="${t.id}" ${t.is_default ? 'data-default="1"' : ''}>${esc(t.name)}${t.is_default ? ' (default)' : ''}</option>`).join('');
    const def = templates.find((t) => t.is_default);
    sel.value = prev && templates.some((t) => String(t.id) === prev) ? prev : (def ? def.id : (templates[0]?.id || ''));
    renderGrid();
  }
  async function refreshProducts() {
    products = await API.listProducts();
    $('#product-list').innerHTML = products.map((p) => `<option value="${esc(p.name)}">`).join('');
  }
  async function refreshCompanies() {
    companies = await API.listCompanies();
    const sel = $('#q-company');
    const prev = sel.value;
    const def = companies.find((c) => c.is_default);
    sel.innerHTML = '<option value="">— none —</option>' +
      companies.map((c) => `<option value="${c.id}">${esc(c.name)}${c.is_default ? ' (default)' : ''}</option>`).join('');
    sel.value = prev && companies.some((c) => String(c.id) === prev) ? prev : (def ? def.id : '');
    // Pre-fill terms for a fresh draft once companies are available (skip when
    // editing a saved quotation so its stored terms are preserved).
    if (currentId === null) applyCompanyTerms();
  }

  const selectedCompany = () => companies.find((c) => String(c.id) === $('#q-company').value);

  // Fill the terms box from the selected company's default, but only when it's
  // safe — i.e. the box is empty or still holds the previously auto-filled text
  // (never clobber terms the user has customised).
  function applyCompanyTerms() {
    const co = selectedCompany();
    const next = (co && co.default_terms) ? co.default_terms : '';
    const field = $('#q-terms');
    if (field.value.trim() === '' || field.value === appliedTerms) {
      field.value = next;
      appliedTerms = next;
    }
  }

  const activeTemplate = () => templates.find((t) => String(t.id) === $('#q-template').value);
  function columns() {
    const t = activeTemplate();
    if (t && t.columns && t.columns.length) return t.columns;
    return [
      { label: '#', key: 'sno', source: 'index', align: 'center' },
      { label: 'Item', key: 'name', source: 'field' },
      { label: 'Description', key: 'description', source: 'field' },
      { label: 'Qty', key: 'quantity', source: 'field', align: 'center' },
      { label: 'Unit Price', key: 'unit_price', source: 'field', align: 'right' },
      { label: 'Total', key: 'line_total', source: 'field', align: 'right' },
    ];
  }

  // ---- grid ----
  function renderGrid() { renderHead(); renderBody(); }

  function renderHead() {
    const cols = columns();
    $('#items-head').innerHTML =
      cols.map((c) => `<th style="text-align:${c.align || 'left'}">${esc(c.label)}</th>`).join('') + '<th></th>';
  }

  function renderBody() {
    const cols = columns();
    const body = $('#items-body');
    $('#items-empty').style.display = items.length ? 'none' : 'block';
    body.innerHTML = '';
    items.forEach((item, i) => body.appendChild(renderRow(item, i, cols)));
    recompute();
  }

  function renderRow(item, i, cols) {
    const tr = document.createElement('tr');
    tr.dataset.i = i;
    cols.forEach((c) => {
      const td = document.createElement('td');
      td.style.textAlign = c.align || 'left';
      const align = c.align || 'left';
      if (c.source === 'index') {
        td.textContent = i + 1;
      } else if (c.source === 'field' && c.key === 'line_total') {
        td.className = 'line-total';
        td.dataset.total = '1';
        td.textContent = money(item.quantity * item.unit_price);
      } else if (c.source === 'field' && (c.key === 'quantity' || c.key === 'unit_price')) {
        td.className = 'num';
        td.innerHTML = `<input type="number" step="0.01" style="text-align:${align}" value="${item[c.key] ?? 0}">`;
        td.querySelector('input').oninput = (e) => {
          item[c.key] = parseFloat(e.target.value) || 0;
          tr.querySelector('[data-total]').textContent = money(item.quantity * item.unit_price);
          recompute();
        };
      } else if (c.source === 'field') {
        // name / description / unit
        const val = item[c.key] ?? '';
        td.innerHTML = `<input type="text" style="text-align:${align}" value="${esc(val)}">`;
        td.querySelector('input').oninput = (e) => { item[c.key] = e.target.value; };
      } else {
        // attribute source — snapshot copy, never written back to product
        const val = (item.attributes || {})[c.key] ?? '';
        td.innerHTML = `<input type="text" style="text-align:${align}" value="${esc(val)}">`;
        td.querySelector('input').oninput = (e) => { item.attributes[c.key] = e.target.value; };
      }
      tr.appendChild(td);
    });
    const act = document.createElement('td');
    act.style.textAlign = 'right';
    act.style.whiteSpace = 'nowrap';
    // Only custom (non-catalogue) lines get the "save to catalogue" toggle.
    const toggle = item.product_id == null
      ? `<label title="Also save this line as a product for reuse" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--muted);font-weight:600;margin-right:6px">
           <input type="checkbox" class="save-cat" style="width:auto" ${item.save_to_catalogue ? 'checked' : ''}>catalogue</label>`
      : '';
    act.innerHTML = `${toggle}<button class="icon-btn" title="Remove">✕</button>`;
    const cb = act.querySelector('.save-cat');
    if (cb) cb.onchange = (e) => { item.save_to_catalogue = e.target.checked; };
    act.querySelector('.icon-btn').onclick = () => { items.splice(i, 1); renderBody(); };
    tr.appendChild(act);
    return tr;
  }

  // ---- add item ----
  function addItem() {
    const name = $('#item-search').value.trim();
    if (!name) return;
    const match = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (match) {
      // snapshot the product's current data into the line item
      items.push({
        product_id: match.id, name: match.name, description: match.description || '',
        unit: match.unit || 'pcs', attributes: { ...(match.attributes || {}) },
        quantity: 1, unit_price: match.price || 0, save_to_catalogue: true,
      });
    } else {
      // typed new product — created in catalogue on save (unless toggled off)
      items.push({ product_id: null, name, description: '', unit: 'pcs', attributes: {}, quantity: 1, unit_price: 0, save_to_catalogue: true });
      toast(`"${name}" added as a custom line (uncheck "catalogue" to keep it one-off)`, 'ok');
    }
    $('#item-search').value = '';
    renderBody();
  }

  // Add a blank custom line to fill in manually (name editable inline).
  function addCustomLine() {
    items.push({ product_id: null, name: '', description: '', unit: 'pcs', attributes: {}, quantity: 1, unit_price: 0, save_to_catalogue: true });
    renderBody();
    // focus the new row's first editable input for immediate typing
    const rows = $('#items-body').querySelectorAll('tr');
    const last = rows[rows.length - 1];
    const firstInput = last && last.querySelector('input[type="text"]');
    if (firstInput) firstInput.focus();
  }

  // ---- totals ----
  function recompute() {
    const subtotal = items.reduce((s, it) => s + (it.quantity * it.unit_price), 0);
    const discount = parseFloat($('#q-discount').value) || 0;
    const tax = parseFloat($('#q-tax').value) || 0;
    const total = subtotal * (1 - discount / 100) * (1 + tax / 100);
    $('#t-subtotal').textContent = money(subtotal);
    $('#t-total').textContent = money(total);
  }

  // ---- persistence ----
  function collect() {
    return {
      title: $('#q-title').value.trim() || null,
      customer_name: $('#c-name').value.trim() || null,
      customer_company: $('#c-company').value.trim() || null,
      customer_email: $('#c-email').value.trim() || null,
      customer_phone: $('#c-phone').value.trim() || null,
      customer_address: $('#c-address').value.trim() || null,
      template_id: activeTemplate() ? activeTemplate().id : null,
      company_id: $('#q-company').value ? Number($('#q-company').value) : null,
      quote_date: $('#q-date').value || null,
      valid_until: $('#q-valid').value || null,
      notes: $('#q-notes').value.trim() || null,
      terms: $('#q-terms').value.trim() || null,
      discount: parseFloat($('#q-discount').value) || 0,
      tax_rate: parseFloat($('#q-tax').value) || 0,
      items: items.map((it, idx) => ({
        product_id: it.product_id, name: it.name, description: it.description || null,
        unit: it.unit || 'pcs', attributes: it.attributes || {},
        quantity: it.quantity || 0, unit_price: it.unit_price || 0, sort_order: idx,
        save_to_catalogue: it.save_to_catalogue !== false,
      })),
    };
  }

  async function save() {
    const data = collect();
    if (!data.items.length) return toast('Add at least one line item', 'error');
    try {
      const saved = currentId ? await API.updateQuotation(currentId, data) : await API.createQuotation(data);
      loadInto(saved);
      toast(`Saved ${saved.number}`, 'ok');
      await refreshProducts(); // newly-typed items now in the catalogue
      document.dispatchEvent(new Event('quotations-changed'));
    } catch (err) { toast(err.message, 'error'); }
  }

  function setSavedState(saved) {
    currentId = saved ? saved.id : null;
    $('#q-heading').textContent = saved ? `Quotation ${saved.number}` : 'New Quotation';
    $('#q-number-label').textContent = saved ? `Saved · ${saved.status}` : 'Unsaved draft';
    $('#q-preview-btn').disabled = !saved;
    $('#q-pdf-btn').disabled = !saved;
  }

  function loadInto(q) {
    setSavedState(q);
    $('#q-title').value = q.title || '';
    $('#c-name').value = q.customer_name || '';
    $('#c-company').value = q.customer_company || '';
    $('#c-email').value = q.customer_email || '';
    $('#c-phone').value = q.customer_phone || '';
    $('#c-address').value = q.customer_address || '';
    $('#q-date').value = q.quote_date || '';
    $('#q-valid').value = q.valid_until || '';
    $('#q-notes').value = q.notes || '';
    $('#q-terms').value = q.terms || '';
    // Preserve the saved quotation's terms; don't auto-replace on later company changes.
    appliedTerms = '';
    $('#q-discount').value = q.discount || 0;
    $('#q-tax').value = q.tax_rate || 0;
    if (q.template_id) $('#q-template').value = q.template_id;
    $('#q-company').value = q.company_id || '';
    items = (q.items || []).map((it) => ({
      product_id: it.product_id, name: it.name, description: it.description || '',
      unit: it.unit || 'pcs', attributes: { ...(it.attributes || {}) },
      quantity: it.quantity, unit_price: it.unit_price,
      // already-saved ad-hoc lines default to one-off (won't re-create on next save)
      save_to_catalogue: it.product_id == null ? false : true,
    }));
    renderGrid();
  }

  function reset() {
    items = [];
    ['q-title', 'c-name', 'c-company', 'c-email', 'c-phone', 'c-address', 'q-valid', 'q-notes', 'q-terms'].forEach((id) => $('#' + id).value = '');
    $('#q-discount').value = 0; $('#q-tax').value = 0;
    $('#q-date').value = new Date().toISOString().slice(0, 10);
    const def = templates.find((t) => t.is_default) || templates[0];
    if (def) $('#q-template').value = def.id;
    const defCo = companies.find((c) => c.is_default);
    $('#q-company').value = defCo ? defCo.id : '';
    appliedTerms = '';
    applyCompanyTerms();
    setSavedState(null);
    renderGrid();
  }

  async function openById(id) {
    const q = await API.getQuotation(id);
    loadInto(q);
    App.show('quotation');
  }

  function init() {
    $('#item-add-btn').onclick = addItem;
    $('#item-custom-btn').onclick = addCustomLine;
    $('#item-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
    $('#q-template').onchange = renderGrid;
    $('#q-company').onchange = applyCompanyTerms;
    $('#q-company-manage').onclick = () => App.show('companies');
    $('#q-discount').oninput = recompute;
    $('#q-tax').oninput = recompute;
    $('#q-save-btn').onclick = save;
    $('#q-new-btn').onclick = () => confirmDialog('New quotation', 'Discard current draft and start a new one?', reset);
    $('#q-preview-btn').onclick = () => { if (currentId) window.open(API.previewUrl(currentId), '_blank'); };
    $('#q-pdf-btn').onclick = () => { if (currentId) window.open(API.pdfUrl(currentId), '_blank'); };
    document.addEventListener('products-changed', refreshProducts);
    document.addEventListener('templates-changed', refreshTemplates);
    document.addEventListener('companies-changed', refreshCompanies);
    $('#q-date').value = new Date().toISOString().slice(0, 10);
    // Initial terms pre-fill happens in refreshCompanies() once companies load.
  }

  return { init, refreshTemplates, refreshProducts, refreshCompanies, reset, openById };
})();
