// App shell: view routing, saved-quotations list, bootstrap.
const App = (() => {
  const { $, $$, esc, money, toast, confirmDialog } = UI;

  function setDrawer(open) {
    $('#sidebar').classList.toggle('open', open);
    $('#drawer-overlay').classList.toggle('open', open);
    const toggle = $('#menu-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }

  const VIEWS = ['quotation', 'saved', 'products', 'companies', 'templates'];

  function show(view) {
    if (!VIEWS.includes(view)) view = 'quotation';
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
    setDrawer(false); // close the mobile drawer after navigating
    window.scrollTo(0, 0);
    // Keep the URL in sync so a refresh reopens the same page.
    if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
    if (view === 'products') Products.load($('#p-search').value);
    if (view === 'companies') Companies.load();
    if (view === 'templates') Templates.load();
    if (view === 'saved') loadSaved();
  }

  const savedSelected = new Set();  // quotation ids ticked for export (persists across filtering)
  let savedVisible = [];            // ids currently shown after filtering
  let savedReqSeq = 0;              // guards against out-of-order filter responses

  const savedFilters = () => ({
    search: $('#f-q-search').value.trim(),
    date_from: $('#f-q-from').value,
    date_to: $('#f-q-to').value,
    status: $('#f-q-status').value,
  });

  const DL_ICON = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>';

  function updateExportButton() {
    const n = savedSelected.size;
    const btn = $('#saved-export-btn');
    btn.innerHTML = `${DL_ICON}Export selected (${n})`;
    btn.disabled = n === 0;
    // "select all" reflects whether every visible row is selected
    const all = $('#saved-select-all');
    all.checked = savedVisible.length > 0 && savedVisible.every((id) => savedSelected.has(id));
  }

  async function loadSaved() {
    const seq = ++savedReqSeq;
    const list = await API.listQuotations(savedFilters());
    if (seq !== savedReqSeq) return; // a newer filter request superseded this one
    savedVisible = list.map((q) => q.id);
    const body = $('#saved-body');
    $('#saved-empty').style.display = list.length ? 'none' : 'block';
    body.innerHTML = list.map((q) => `
      <tr>
        <td><input type="checkbox" class="row-select" data-id="${q.id}" ${savedSelected.has(q.id) ? 'checked' : ''}></td>
        <td><b>${esc(q.number)}</b></td>
        <td>${esc(q.customer_name || '—')}</td>
        <td>${money(q.total)}</td>
        <td>
          <select class="status-select ${esc(q.status)}" data-status-id="${q.id}" title="Change status">
            ${['draft', 'sent', 'accepted', 'rejected'].map((s) =>
              `<option value="${s}" ${q.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
          </select>
        </td>
        <td>${esc(UI.fmtDate(q.quote_date))}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn sm" data-open="${q.id}">Open</button>
          <a class="btn sm" href="${API.pdfUrl(q.id)}" target="_blank">PDF</a>
          <button class="btn sm" data-dup="${q.id}" title="Copy this quotation into a new one">Duplicate</button>
          <button class="btn sm danger" data-del="${q.id}">Delete</button>
        </td>
      </tr>`).join('');
    body.querySelectorAll('.row-select').forEach((cb) => cb.onchange = () => {
      const id = Number(cb.dataset.id);
      cb.checked ? savedSelected.add(id) : savedSelected.delete(id);
      updateExportButton();
    });
    body.querySelectorAll('[data-status-id]').forEach((sel) => sel.onchange = async () => {
      const id = Number(sel.dataset.statusId);
      try {
        await API.updateQuotation(id, { status: sel.value });
        sel.className = `status-select ${sel.value}`;
        toast(`Status updated to ${sel.value}`, 'ok');
      } catch (err) {
        toast(err.message, 'error');
        loadSaved(); // revert the select to the stored value
      }
    });
    body.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => Quotation.openById(Number(b.dataset.open)));
    body.querySelectorAll('[data-dup]').forEach((b) => b.onclick = () => duplicateQuotation(Number(b.dataset.dup), b));
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
      confirmDialog('Delete quotation', 'Delete this quotation permanently?', async () => {
        try { await API.deleteQuotation(Number(b.dataset.del)); savedSelected.delete(Number(b.dataset.del)); toast('Deleted', 'ok'); loadSaved(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
    updateExportButton();
  }

  // Copy an existing quotation into a brand-new one (new number, draft status,
  // today's date). The original is never modified.
  async function duplicateQuotation(id, btn) {
    if (btn) btn.disabled = true;
    try {
      const q = await API.getQuotation(id);
      const copy = await API.createQuotation({
        title: q.title,
        customer_name: q.customer_name,
        customer_company: q.customer_company,
        customer_email: q.customer_email,
        customer_phone: q.customer_phone,
        customer_address: q.customer_address,
        template_id: q.template_id,
        company_id: q.company_id,
        quote_date: null,            // backend stamps today
        valid_until: q.valid_until,
        notes: q.notes,
        terms: q.terms,
        discount: q.discount,
        tax_rate: q.tax_rate,
        status: 'draft',
        items: (q.items || []).map((it, idx) => ({
          product_id: it.product_id, name: it.name, description: it.description,
          unit: it.unit, attributes: it.attributes || {},
          quantity: it.quantity, unit_price: it.unit_price, sort_order: idx,
          save_to_catalogue: false,  // copying must not touch the product catalogue
        })),
      });
      toast(`Duplicated as ${copy.number}`, 'ok');
      // Open the copy in the editor with a banner naming the original.
      await Quotation.openById(copy.id);
      Quotation.showDuplicateNotice(q.number, copy.number);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function exportSelected() {
    if (!savedSelected.size) return toast('Select at least one quotation', 'error');
    const a = document.createElement('a');
    a.href = API.exportUrl([...savedSelected]);
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast(`Exporting ${savedSelected.size} quotation(s)…`, 'ok');
  }

  async function init() {
    try {
      const cfg = await API.config();
      UI.setCurrency(cfg.currency_symbol);
    } catch { /* non-fatal */ }

    $$('.nav-item').forEach((b) => b.onclick = () => show(b.dataset.view));
    $('#menu-toggle').onclick = () => setDrawer(!$('#sidebar').classList.contains('open'));
    $('#drawer-overlay').onclick = () => setDrawer(false);
    $('#modal-close').onclick = UI.closeModal;
    $('#modal').onclick = (e) => { if (e.target.id === 'modal') UI.closeModal(); };

    // Saved-quotations filters + export wiring
    let searchTimer;
    $('#f-q-search').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadSaved, 250); };
    ['#f-q-from', '#f-q-to', '#f-q-status'].forEach((sel) => $(sel).onchange = loadSaved);
    $('#saved-clear-btn').onclick = () => {
      ['#f-q-search', '#f-q-from', '#f-q-to'].forEach((s) => $(s).value = '');
      $('#f-q-status').value = '';
      loadSaved();
    };
    $('#saved-select-all').onchange = (e) => {
      savedVisible.forEach((id) => e.target.checked ? savedSelected.add(id) : savedSelected.delete(id));
      $$('#saved-body .row-select').forEach((cb) => { cb.checked = e.target.checked; });
      updateExportButton();
    };
    $('#saved-export-btn').onclick = exportSelected;

    Products.init();
    Companies.init();
    Templates.init();
    Quotation.init();

    await Quotation.refreshTemplates();
    await Quotation.refreshProducts();
    await Quotation.refreshCompanies();
    document.addEventListener('quotations-changed', () => {
      if ($('#view-saved').classList.contains('active')) loadSaved();
    });

    // Restore the view from the URL hash (refresh/bookmark), default to the editor.
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));
    show(location.hash.slice(1) || 'quotation');
  }

  return { init, show };
})();

document.addEventListener('DOMContentLoaded', App.init);
