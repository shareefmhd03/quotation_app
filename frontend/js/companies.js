// Companies view: CRUD for the sender company reused across quotations.
const Companies = (() => {
  const { $, esc, toast, openModal, confirmDialog } = UI;
  let cache = [];

  async function load() {
    cache = await API.listCompanies();
    render();
  }

  function render() {
    const body = $('#companies-body');
    $('#companies-empty').style.display = cache.length ? 'none' : 'block';
    body.innerHTML = cache.map((c) => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${c.logo_path ? `<img src="${esc(c.logo_path)}" style="height:32px;max-width:90px;object-fit:contain">` : ''}
            <div><b>${esc(c.name)}</b>${c.address ? `<div class="muted" style="font-weight:400;white-space:pre-line">${esc(c.address)}</div>` : ''}</div>
          </div>
        </td>
        <td>${esc(c.email || '—')}</td>
        <td>${esc(c.phone || '—')}</td>
        <td>${c.is_default ? '<span class="badge default">Default</span>' : ''}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn sm" data-edit="${c.id}">Edit</button>
          <button class="btn sm danger" data-del="${c.id}">Delete</button>
        </td>
      </tr>`).join('');
    body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(Number(b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => remove(Number(b.dataset.del)));
  }

  const logoImg = (path) => path
    ? `<img src="${esc(path)}" style="max-height:56px;max-width:180px;border-radius:6px;border:1px solid var(--border);padding:4px;background:#fff">`
    : '<span class="muted">No logo</span>';

  function formHtml(c = {}) {
    return `
      <div class="field-grid">
        <label class="span-2">Company name<input id="cf-name" value="${esc(c.name || '')}" placeholder="Company name"></label>
        <label>Email<input id="cf-email" value="${esc(c.email || '')}"></label>
        <label>Phone<input id="cf-phone" value="${esc(c.phone || '')}"></label>
        <label>Website<input id="cf-web" value="${esc(c.website || '')}"></label>
        <label>GST number<input id="cf-tax" value="${esc(c.tax_number || '')}" placeholder="e.g. 29ABCDE1234F1Z5"></label>
        <label class="span-2">Address<textarea id="cf-addr" rows="2">${esc(c.address || '')}</textarea></label>
      </div>
      <div class="subhead">Default terms &amp; conditions</div>
      <p class="muted" style="margin:-4px 0 8px">Pre-filled into new quotations for this company. Still editable per quotation.</p>
      <textarea id="cf-terms" rows="4" placeholder="e.g. Validity, payment terms, delivery…">${esc(c.default_terms || '')}</textarea>
      <div class="subhead">Logo</div>
      <p class="muted" style="margin:-4px 0 8px">Shown in the quotation PDF header. PNG, JPG or SVG (max 5 MB).</p>
      <div id="cf-logo-preview" style="margin-bottom:8px">${logoImg(c.logo_path)}</div>
      <input type="file" id="cf-logo" accept="image/*">
      <button class="btn sm" id="cf-logo-clear" type="button" style="margin-left:8px">Remove logo</button>
      <label class="block" style="flex-direction:row;align-items:center;gap:8px;margin-top:12px">
        <input type="checkbox" id="cf-default" style="width:auto" ${c.is_default ? 'checked' : ''}> Set as default company
      </label>`;
  }

  function wireForm(root, state) {
    root.querySelector('#cf-logo').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        state.logo_path = await API.uploadCompanyLogo(file);
        root.querySelector('#cf-logo-preview').innerHTML = logoImg(state.logo_path);
        toast('Logo uploaded', 'ok');
      } catch (err) { toast(err.message, 'error'); }
    };
    root.querySelector('#cf-logo-clear').onclick = () => {
      state.logo_path = null;
      root.querySelector('#cf-logo-preview').innerHTML = logoImg(null);
      root.querySelector('#cf-logo').value = '';
    };
  }

  function collect(root, state) {
    return {
      name: root.querySelector('#cf-name').value.trim(),
      email: root.querySelector('#cf-email').value.trim() || null,
      phone: root.querySelector('#cf-phone').value.trim() || null,
      website: root.querySelector('#cf-web').value.trim() || null,
      tax_number: root.querySelector('#cf-tax').value.trim() || null,
      address: root.querySelector('#cf-addr').value.trim() || null,
      default_terms: root.querySelector('#cf-terms').value.trim() || null,
      logo_path: state.logo_path || null,
      is_default: root.querySelector('#cf-default').checked,
    };
  }

  function openForm(c) {
    const isEdit = !!c;
    const state = { logo_path: c?.logo_path || null };
    const root = openModal(isEdit ? 'Edit company' : 'New company', formHtml(c || {}), [
      { label: 'Cancel', onClick: (close) => close() },
      { label: 'Save', class: 'primary', onClick: async (close) => {
          const data = collect(root, state);
          if (!data.name) return toast('Name is required', 'error');
          try {
            if (isEdit) await API.updateCompany(c.id, data);
            else await API.createCompany(data);
            close();
            toast('Company saved', 'ok');
            await load();
            document.dispatchEvent(new Event('companies-changed'));
          } catch (err) { toast(err.message, 'error'); }
        } },
    ]);
    wireForm(root, state);
    return root;
  }

  async function edit(id) { openForm(await API.getCompany(id)); }
  function remove(id) {
    const c = cache.find((x) => x.id === id);
    confirmDialog('Delete company', `Delete "${c?.name}"?`, async () => {
      try { await API.deleteCompany(id); toast('Deleted', 'ok'); await load();
        document.dispatchEvent(new Event('companies-changed')); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  function init() { $('#co-new-btn').onclick = () => openForm(null); }
  return { init, load, openForm, getCache: () => cache };
})();
