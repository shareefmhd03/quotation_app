// App shell: view routing, saved-quotations list, bootstrap.
const App = (() => {
  const { $, $$, esc, money, toast, confirmDialog } = UI;

  function setDrawer(open) {
    $('#sidebar').classList.toggle('open', open);
    $('#drawer-overlay').classList.toggle('open', open);
    const toggle = $('#menu-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }

  function show(view) {
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
    setDrawer(false); // close the mobile drawer after navigating
    window.scrollTo(0, 0);
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

  function updateExportButton() {
    const n = savedSelected.size;
    const btn = $('#saved-export-btn');
    btn.textContent = `⬇ Export selected (${n})`;
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
        <td>${esc(q.title || '—')}</td>
        <td>${esc(q.customer_name || '—')}</td>
        <td>${money(q.total)}</td>
        <td><span class="badge ${esc(q.status)}">${esc(q.status)}</span></td>
        <td>${esc(q.quote_date || '')}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn sm" data-open="${q.id}">Open</button>
          <a class="btn sm" href="${API.pdfUrl(q.id)}" target="_blank">PDF</a>
          <button class="btn sm danger" data-del="${q.id}">Delete</button>
        </td>
      </tr>`).join('');
    body.querySelectorAll('.row-select').forEach((cb) => cb.onchange = () => {
      const id = Number(cb.dataset.id);
      cb.checked ? savedSelected.add(id) : savedSelected.delete(id);
      updateExportButton();
    });
    body.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => Quotation.openById(Number(b.dataset.open)));
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
      confirmDialog('Delete quotation', 'Delete this quotation permanently?', async () => {
        try { await API.deleteQuotation(Number(b.dataset.del)); savedSelected.delete(Number(b.dataset.del)); toast('Deleted', 'ok'); loadSaved(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
    updateExportButton();
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

    show('quotation');
  }

  return { init, show };
})();

document.addEventListener('DOMContentLoaded', App.init);
