// Templates view: manage quotation templates (columns + branding/styling).
const Templates = (() => {
  const { $, esc, toast, openModal, confirmDialog } = UI;
  let cache = [];

  async function load() {
    cache = await API.listTemplates();
    render();
  }

  function render() {
    const body = $('#templates-body');
    $('#templates-empty').style.display = cache.length ? 'none' : 'block';
    body.innerHTML = cache.map((t) => `
      <tr>
        <td><b>${esc(t.name)}</b>${t.description ? `<div class="muted" style="font-weight:400">${esc(t.description)}</div>` : ''}</td>
        <td>${(t.columns || []).map((c) => `<span class="chip">${esc(c.label)}</span>`).join('')}</td>
        <td>${t.is_default ? '<span class="badge default">Default</span>' : ''}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn sm" data-edit="${t.id}">Edit</button>
          <button class="btn sm danger" data-del="${t.id}">Delete</button>
        </td>
      </tr>`).join('');
    body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(Number(b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => remove(Number(b.dataset.del)));
  }

  const SOURCES = ['field', 'attribute', 'index'];
  const ALIGNS = ['left', 'center', 'right'];
  const colRow = (c = {}) => `
    <div class="col-row">
      <input class="c-label" placeholder="Header label" value="${esc(c.label || '')}">
      <input class="c-key" placeholder="key (e.g. width)" value="${esc(c.key || '')}">
      <select class="c-source">${SOURCES.map((s) => `<option ${c.source === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <button class="icon-btn c-del" title="Remove">✕</button>
    </div>`;

  function formHtml(t = {}) {
    const s = t.styling || {};
    const cols = (t.columns && t.columns.length ? t.columns : [
      { label: '#', key: 'sno', source: 'index' },
      { label: 'Item', key: 'name', source: 'field' },
      { label: 'Qty', key: 'quantity', source: 'field' },
      { label: 'Unit Price', key: 'unit_price', source: 'field' },
      { label: 'Total', key: 'line_total', source: 'field' },
    ]);
    return `
      <div class="field-grid">
        <label>Name<input id="tf-name" value="${esc(t.name || '')}"></label>
        <label>Document title<input id="tf-doctitle" value="${esc(s.doc_title || 'Quotation')}"></label>
        <label class="span-2">Description<input id="tf-desc" value="${esc(t.description || '')}"></label>
      </div>
      <div class="subhead">Columns (order shown in grid &amp; PDF)</div>
      <p class="muted" style="margin:-4px 0 10px">source: <b>field</b> = built-in (name, description, quantity, unit_price, line_total, unit) · <b>attribute</b> = product attribute by key · <b>index</b> = row number</p>
      <div id="col-list">${cols.map(colRow).join('')}</div>
      <button class="btn sm" id="col-add">＋ Add column</button>

      <div class="subhead">Branding</div>
      <p class="muted" style="margin:-4px 0 10px">Company details are managed separately and picked per quotation (Companies tab).</p>
      <div class="field-grid">
        <label>Primary color<input id="tf-color" type="color" value="${esc(s.primary_color || '#2563eb')}"></label>
        <label>Currency symbol<input id="tf-currency" value="${esc(s.currency_symbol || '$')}"></label>
        <label class="span-2">Footer note<input id="tf-footer" value="${esc(s.footer_note || '')}"></label>
      </div>
      <label class="block" style="flex-direction:row;align-items:center;gap:8px;margin-top:12px">
        <input type="checkbox" id="tf-default" style="width:auto" ${t.is_default ? 'checked' : ''}> Set as default template
      </label>`;
  }

  function wire(root) {
    const list = root.querySelector('#col-list');
    const wireDel = () => list.querySelectorAll('.c-del').forEach((b) => b.onclick = () => b.closest('.col-row').remove());
    root.querySelector('#col-add').onclick = () => {
      const tmp = document.createElement('div');
      tmp.innerHTML = colRow();
      list.appendChild(tmp.firstElementChild);
      wireDel();
    };
    wireDel();
  }

  function collect(root) {
    const columns = [];
    root.querySelectorAll('.col-row').forEach((row) => {
      const label = row.querySelector('.c-label').value.trim();
      const key = row.querySelector('.c-key').value.trim();
      const source = row.querySelector('.c-source').value;
      if (label && key) columns.push({ label, key, source, align: source === 'index' ? 'center' : 'left' });
    });
    return {
      name: root.querySelector('#tf-name').value.trim(),
      description: root.querySelector('#tf-desc').value.trim() || null,
      columns,
      is_default: root.querySelector('#tf-default').checked,
      styling: {
        doc_title: root.querySelector('#tf-doctitle').value.trim() || 'Quotation',
        primary_color: root.querySelector('#tf-color').value,
        currency_symbol: root.querySelector('#tf-currency').value.trim() || '$',
        footer_note: root.querySelector('#tf-footer').value.trim(),
      },
    };
  }

  function openForm(t) {
    const isEdit = !!t;
    const root = openModal(isEdit ? 'Edit template' : 'New template', formHtml(t || {}), [
      { label: 'Cancel', onClick: (close) => close() },
      { label: 'Save', class: 'primary', onClick: async (close) => {
          const data = collect(root);
          if (!data.name) return toast('Name is required', 'error');
          if (!data.columns.length) return toast('Add at least one column', 'error');
          try {
            if (isEdit) await API.updateTemplate(t.id, data);
            else await API.createTemplate(data);
            close();
            toast('Template saved', 'ok');
            await load();
            document.dispatchEvent(new Event('templates-changed'));
          } catch (err) { toast(err.message, 'error'); }
        } },
    ]);
    wire(root);
  }

  async function edit(id) { openForm(await API.getTemplate(id)); }
  function remove(id) {
    const t = cache.find((x) => x.id === id);
    confirmDialog('Delete template', `Delete "${t?.name}"?`, async () => {
      try { await API.deleteTemplate(id); toast('Deleted', 'ok'); await load();
        document.dispatchEvent(new Event('templates-changed')); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  function init() { $('#t-new-btn').onclick = () => openForm(null); }
  return { init, load, getCache: () => cache };
})();
