// Shared UI helpers: toast, modal, DOM shortcuts, formatting.
const UI = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  let currency = '₹';
  const setCurrency = (sym) => { currency = sym; };
  // en-IN gives Indian digit grouping (e.g. ₹1,00,000.00).
  const money = (n) => `${currency}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Display dates as DD-MM-YYYY (stored internally as ISO YYYY-MM-DD).
  const fmtDate = (iso) => {
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : String(iso);
  };

  // Escape untrusted text for safe innerHTML interpolation.
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer;
  function toast(msg, kind = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
  }

  // Modal with dynamic body + footer buttons.
  function openModal(title, bodyHtml, buttons) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = bodyHtml;
    const foot = $('#modal-foot');
    foot.innerHTML = '';
    (buttons || []).forEach((b) => {
      const btn = document.createElement('button');
      btn.className = `btn ${b.class || ''}`;
      btn.textContent = b.label;
      btn.onclick = () => b.onClick(closeModal);
      foot.appendChild(btn);
    });
    $('#modal').classList.add('open');
    return $('#modal-body');
  }
  const closeModal = () => $('#modal').classList.remove('open');

  function confirmDialog(title, message, onConfirm) {
    openModal(title, `<p style="margin:0;color:var(--muted)">${esc(message)}</p>`, [
      { label: 'Cancel', onClick: (close) => close() },
      { label: 'Delete', class: 'danger', onClick: (close) => { close(); onConfirm(); } },
    ]);
  }

  return { $, $$, money, esc, fmtDate, toast, openModal, closeModal, confirmDialog, setCurrency };
})();
