/**
 * MegaBanx Invoicing Module — standalone JS injected into megabanx.com
 * Adds "Нова фактура", "Клиенти", "Артикули" buttons next to company names.
 * Opens popup modal forms. Calls /api/invoicing/* endpoints.
 *
 * Deployed to /opt/bginvoices/frontend/assets/invoicing-module.js
 */
(function () {
  "use strict";

  const API = "/api/invoicing";
  let _currentProfile = null;
  let _shareData = null; // company_shares for permission check

  // ── Styles ──────────────────────────────────────────────────────────────
  const STYLES = `
  .inv-btn-group { display: inline-flex; gap: 4px; margin-left: 8px; align-items: center; }
  .inv-btn {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 2px 8px; font-size: 11px; border-radius: 4px;
    border: 1px solid #cbd5e1; background: #f8fafc; color: #475569;
    cursor: pointer; white-space: nowrap; transition: all .15s;
    font-family: inherit;
  }
  .inv-btn:hover { background: #e2e8f0; border-color: #94a3b8; color: #1e293b; }
  .inv-btn-primary { background: #3b82f6; color: #fff; border-color: #2563eb; }
  .inv-btn-primary:hover { background: #2563eb; }
  .inv-btn-emerald { background: #10b981; color: #fff; border-color: #059669; }
  .inv-btn-emerald:hover { background: #059669; }

  /* Overlay + Modal */
  .inv-overlay {
    position: fixed; inset: 0; z-index: 99998;
    background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center;
    animation: invFadeIn .15s ease;
  }
  @keyframes invFadeIn { from { opacity:0 } to { opacity:1 } }
  .inv-modal {
    background: #fff; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,.25);
    max-height: 90vh; overflow-y: auto; position: relative; z-index: 99999;
    animation: invSlideUp .2s ease;
  }
  @keyframes invSlideUp { from { transform:translateY(20px);opacity:0 } to { transform:translateY(0);opacity:1 } }
  .inv-modal-sm { width: 480px; }
  .inv-modal-md { width: 600px; }
  .inv-modal-lg { width: 1100px; max-width: 95vw; }
  .inv-modal-clients { width: 770px; max-width: 95vw; }
  .inv-modal-items { width: 770px; max-width: 95vw; }
  .inv-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(to right, #f8fafc, #fff);
  }
  .inv-modal-header h2 { margin: 0; font-size: 18px; color: #1e293b; font-weight: 700; }
  .inv-modal-close {
    width: 28px; height: 28px; border: none; background: #f1f5f9;
    border-radius: 6px; cursor: pointer; font-size: 16px; color: #64748b;
    display: flex; align-items: center; justify-content: center;
  }
  .inv-modal-close:hover { background: #e2e8f0; color: #1e293b; }
  .inv-modal-body { padding: 20px; }

  /* Form elements */
  .inv-field { margin-bottom: 12px; }
  .inv-field label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px; }
  .inv-input, .inv-select, .inv-textarea {
    width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
    font-size: 13px; color: #1e293b; background: #fff; font-family: inherit;
    box-sizing: border-box;
  }
  .inv-input:focus, .inv-select:focus, .inv-textarea:focus {
    outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.15);
  }
  .inv-textarea { resize: vertical; min-height: 50px; }
  .inv-row { display: flex; gap: 12px; }
  .inv-row > * { flex: 1; }
  .inv-checkbox { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; cursor: pointer; }
  .inv-checkbox input { width: 16px; height: 16px; }
  .inv-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #e2e8f0; margin-top: 16px; }
  .inv-actions .inv-btn { padding: 6px 16px; font-size: 13px; }

  /* Table */
  .inv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .inv-table th { text-align: left; padding: 8px 10px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; font-size: 12px; }
  .inv-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
  .inv-table tr:hover td { background: #f8fafc; }
  .inv-table .inv-td-actions { width: 56px; text-align: right; white-space: nowrap; }
  .inv-table .inv-icon-btn {
    width: 24px; height: 24px; border: none; background: transparent;
    cursor: pointer; border-radius: 4px; display: inline-flex;
    align-items: center; justify-content: center; color: #94a3b8;
    padding: 0; flex-shrink: 0;
  }
  .inv-table .inv-icon-btn:hover { background: #f1f5f9; color: #475569; }
  .inv-table .inv-icon-btn.inv-danger:hover { background: #fef2f2; color: #ef4444; }

  /* Search */
  .inv-search-bar { position: relative; margin-bottom: 12px; }
  .inv-search-bar input { padding-left: 32px; }
  .inv-search-bar svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }

  /* TR lookup button */
  .inv-tr-btn {
    padding: 4px 10px; font-size: 12px; background: #f59e0b; color: #fff;
    border: 1px solid #d97706; border-radius: 4px; cursor: pointer; white-space: nowrap;
  }
  .inv-tr-btn:hover { background: #d97706; }
  .inv-tr-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* Invoice form specific */
  .inv-line-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .inv-line-table th { padding: 6px 4px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #64748b; }
  .inv-line-table td { padding: 4px; }
  .inv-line-table input, .inv-line-table select { font-size: 12px; padding: 4px 6px; }
  .inv-line-table .inv-line-desc { min-width: 200px; }
  .inv-line-table .inv-line-num { width: 70px; text-align: right; }
  .inv-line-table .inv-line-unit { width: 60px; }
  /* Remove number input spinners (Fix 8) */
  .inv-line-table input[type="number"]::-webkit-inner-spin-button,
  .inv-line-table input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .inv-line-table input[type="number"] { -moz-appearance: textbox; }
  .inv-input[type="number"]::-webkit-inner-spin-button,
  .inv-input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .inv-input[type="number"] { -moz-appearance: textbox; }
  .inv-totals { text-align: right; margin-top: 12px; font-size: 13px; }
  .inv-totals .inv-total-row { display: flex; justify-content: flex-end; gap: 16px; padding: 2px 0; }
  .inv-totals .inv-total-label { color: #64748b; min-width: 120px; text-align: right; }
  .inv-totals .inv-total-value { font-weight: 600; min-width: 100px; text-align: right; font-family: monospace; }
  .inv-totals .inv-grand-total { font-size: 16px; color: #1e293b; border-top: 2px solid #e2e8f0; padding-top: 6px; margin-top: 4px; }

  /* Lightning bolt icons */
  .inv-bolt { display: inline-flex; align-items: center; gap: 1px; margin-right: 4px; }
  .inv-bolt svg { width: 14px; height: 14px; }
  .inv-bolt-gray svg { fill: #94a3b8; }
  .inv-bolt-blue svg { fill: #3b82f6; }

  /* Sync settings */
  .inv-sync-section { margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .inv-sync-section h3 { font-size: 13px; font-weight: 600; color: #475569; margin: 0 0 8px; }
  .inv-radio-group { display: flex; flex-direction: column; gap: 6px; }
  .inv-radio { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; cursor: pointer; }
  .inv-radio input { width: 16px; height: 16px; }

  /* Amber button for Клиенти */
  .inv-btn-amber { background: #f59e0b; color: #fff; border-color: #d97706; }
  .inv-btn-amber:hover { background: #d97706; }
  /* Outline/secondary button */
  .inv-btn-outline { background: #fff; color: #475569; border-color: #94a3b8; }
  .inv-btn-outline:hover { background: #f1f5f9; color: #1e293b; }
  /* Item/client picker mini-button inside line items */
  .inv-pick-btn {
    width: 24px; height: 24px; padding: 0; border: 1px solid #cbd5e1; background: #f8fafc;
    border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    color: #64748b; font-size: 11px; flex-shrink: 0;
  }
  .inv-pick-btn:hover { background: #e2e8f0; color: #1e293b; }
  /* Client picker button (same size as TR button) */
  .inv-client-pick-btn {
    padding: 4px 10px; font-size: 12px; background: #3b82f6; color: #fff;
    border: 1px solid #2563eb; border-radius: 4px; cursor: pointer; white-space: nowrap;
  }
  .inv-client-pick-btn:hover { background: #2563eb; }
  /* VAT column in line items */
  .inv-line-vat { width: 60px; text-align: right; }
  /* Price mode toggle */
  .inv-price-toggle { font-size: 10px; cursor: pointer; color: #3b82f6; text-decoration: underline; margin-left: 2px; }

  /* Empty state */
  .inv-empty { text-align: center; padding: 32px; color: #94a3b8; }
  .inv-empty svg { width: 40px; height: 40px; margin-bottom: 8px; opacity: .5; }

  /* Alert/toast */
  .inv-toast {
    position: fixed; bottom: 20px; right: 20px; z-index: 100000;
    padding: 10px 16px; border-radius: 8px; font-size: 13px;
    color: #fff; box-shadow: 0 10px 15px -3px rgba(0,0,0,.1);
    animation: invSlideUp .2s ease;
  }
  .inv-toast-success { background: #10b981; }
  .inv-toast-error { background: #ef4444; }
  `;

  // ── SVG Icons ───────────────────────────────────────────────────────────
  const ICONS = {
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    filetext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  };

  // ── Utility helpers ─────────────────────────────────────────────────────
  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === "className") e.className = v;
      else if (k === "innerHTML") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v);
    });
    children.flat().forEach(c => {
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(API + path, opts);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || "API error");
    }
    return resp.json();
  }

  function toast(msg, type) {
    const t = el("div", { className: `inv-toast inv-toast-${type || "success"}` }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function closeModal(overlay) { if (overlay) overlay.remove(); }
  function vatRate(v) { const p = parseFloat(v); return isNaN(p) ? 20 : p; }

  function createOverlay(modal) {
    const overlay = el("div", { className: "inv-overlay", onClick: (e) => { if (e.target === overlay) closeModal(overlay); } }, modal);
    document.body.appendChild(overlay);
    return overlay;
  }

  // Helper to get profileId for a given companyId from folder data
  function _getProfileForCompany(cid) {
    const folders = window.__invFolderData || [];
    for (const f of folders) {
      if (f.company && f.company.id === cid) return f.company.profile_id || window.__invProfileId;
    }
    return window.__invProfileId;
  }

  // ── Clients Popup ───────────────────────────────────────────────────────
  function openClientsPopup(companyId, profileId) {
    let clients = [];
    let searchTerm = "";
    let overlay = null;
    let filterCompanyId = ""; // "" = all companies

    const modal = el("div", { className: "inv-modal inv-modal-clients" });

    async function loadClients() {
      try {
        const cid = filterCompanyId || companyId;
        const pid = filterCompanyId ? _getProfileForCompany(filterCompanyId) || profileId : profileId;
        if (filterCompanyId === "") {
          // Load from all companies
          const folders = window.__invFolderData || [];
          let all = [];
          for (const f of folders) {
            if (!f.company) continue;
            const p = new URLSearchParams({ company_id: f.company.id, profile_id: f.company.profile_id || profileId });
            if (searchTerm) p.set("search", searchTerm);
            try { const r = await api("GET", `/clients?${p}`); all = all.concat(r); } catch (e) {}
          }
          clients = all;
        } else {
          const params = new URLSearchParams({ company_id: cid, profile_id: pid });
          if (searchTerm) params.set("search", searchTerm);
          clients = await api("GET", `/clients?${params}`);
        }
      } catch (e) { clients = []; }
      renderTable();
    }

    function renderTable() {
      const body = modal.querySelector(".inv-modal-body");
      if (!body) return;
      body.innerHTML = "";

      // Search
      const searchBar = el("div", { className: "inv-search-bar" });
      searchBar.innerHTML = ICONS.search;
      const searchInput = el("input", { className: "inv-input", placeholder: "Търсене по име, ЕИК или имейл...", value: searchTerm });
      let debounce;
      searchInput.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { searchTerm = searchInput.value; loadClients(); }, 300);
      });
      searchBar.appendChild(searchInput);
      body.appendChild(searchBar);

      if (clients.length === 0) {
        body.appendChild(el("div", { className: "inv-empty", innerHTML: ICONS.users + "<p>" + (searchTerm ? "Няма намерени клиенти" : "Няма добавени клиенти") + "</p>" }));
        return;
      }

      const table = el("table", { className: "inv-table" });
      table.innerHTML = `<thead><tr><th>Име</th><th>ЕИК</th><th>Град</th><th>Имейл</th><th>Телефон</th><th class="inv-td-actions">Действия</th></tr></thead>`;
      const tbody = el("tbody");
      clients.forEach(c => {
        const tr = el("tr");
        tr.innerHTML = `<td style="font-weight:500">${esc(c.name)}</td>
          <td style="font-family:monospace;font-size:12px;color:#64748b">${esc(c.eik || "—")}</td>
          <td style="color:#64748b">${esc(c.city || "—")}</td>
          <td>${c.email ? `<a href="mailto:${esc(c.email)}" style="color:#3b82f6;text-decoration:none;font-size:12px">${esc(c.email)}</a>` : '<span style="color:#cbd5e1">—</span>'}</td>
          <td style="color:#64748b">${esc(c.phone || "—")}</td>
          <td class="inv-td-actions"><div style="display:flex;gap:2px;align-items:center;justify-content:flex-end"></div></td>`;
        const actionsDiv = tr.querySelector(".inv-td-actions div");
        actionsDiv.appendChild(el("button", { className: "inv-icon-btn", innerHTML: ICONS.pencil, title: "Редактирай", onClick: () => openClientForm(c) }));
        actionsDiv.appendChild(el("button", { className: "inv-icon-btn inv-danger", innerHTML: ICONS.trash, title: "Изтрий", onClick: () => deleteClient(c.id) }));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      body.appendChild(table);
    }

    async function deleteClient(id) {
      if (!confirm("Сигурни ли сте, че искате да изтриете този клиент?")) return;
      try {
        await api("DELETE", `/clients/${id}`);
        toast("Клиентът е изтрит");
        loadClients();
      } catch (e) { toast("Грешка: " + e.message, "error"); }
    }

    function openClientForm(existing) {
      const form = {
        name: existing?.name || "", eik: existing?.eik || "", vat_number: existing?.vat_number || "",
        is_vat_registered: existing?.is_vat_registered || false,
        is_individual: existing?.is_individual || false,
        mol: existing?.mol || "", city: existing?.city || "",
        address: existing?.address || "", email: existing?.email || "",
        phone: existing?.phone || "",
      };

      const formModal = el("div", { className: "inv-modal inv-modal-md" });
      formModal.innerHTML = `
        <div class="inv-modal-header">
          <h2>${existing ? "Редактиране на клиент" : "Нов клиент"}</h2>
          <button class="inv-modal-close" data-close>${ICONS.x}</button>
        </div>
        <div class="inv-modal-body">
          <div class="inv-field"><label>Име на фирмата / лицето *</label><input class="inv-input" data-f="name" value="${esc(form.name)}" placeholder="Клиент ООД"></div>
          <div class="inv-row" style="margin-bottom:8px">
            <label class="inv-checkbox"><input type="checkbox" data-f="is_individual" ${form.is_individual ? "checked" : ""}> Физическо лице</label>
            <label class="inv-checkbox"><input type="checkbox" data-f="is_vat_registered" ${form.is_vat_registered ? "checked" : ""}> Регистрация по ЗДДС</label>
          </div>
          <div class="inv-row">
            <div class="inv-field"><label>ЕИК</label><div style="display:flex;gap:4px"><input class="inv-input" data-f="eik" value="${esc(form.eik)}" placeholder="123456789" style="flex:1"><button class="inv-tr-btn" data-tr>ТР</button></div></div>
            <div class="inv-field"><label>ДДС номер</label><input class="inv-input" data-f="vat_number" value="${esc(form.vat_number)}" placeholder="BG123456789"></div>
          </div>
          <div class="inv-field"><label>МОЛ</label><input class="inv-input" data-f="mol" value="${esc(form.mol)}" placeholder="Иван Иванов"></div>
          <div class="inv-row">
            <div class="inv-field"><label>Град</label><input class="inv-input" data-f="city" value="${esc(form.city)}" placeholder="София"></div>
            <div class="inv-field"><label>Телефон</label><input class="inv-input" data-f="phone" value="${esc(form.phone)}" placeholder="+359 888 123 456"></div>
          </div>
          <div class="inv-field"><label>Адрес</label><textarea class="inv-textarea" data-f="address" rows="2" placeholder="ул. Примерна 1">${esc(form.address)}</textarea></div>
          <div class="inv-field"><label>Имейл</label><input class="inv-input" data-f="email" value="${esc(form.email)}" placeholder="client@firma.bg"></div>
          <div class="inv-actions">
            <button class="inv-btn" data-cancel>Отказ</button>
            <button class="inv-btn inv-btn-primary" data-save>${existing ? "Запази" : "Създай"}</button>
          </div>
        </div>`;

      const formOverlay = createOverlay(formModal);

      formModal.querySelector("[data-close]").onclick = () => closeModal(formOverlay);
      formModal.querySelector("[data-cancel]").onclick = () => closeModal(formOverlay);

      // TR lookup
      formModal.querySelector("[data-tr]").onclick = async () => {
        const eikInput = formModal.querySelector('[data-f="eik"]');
        const eik = eikInput.value.trim();
        if (!eik || eik.length < 9) { toast("Въведете валиден ЕИК (поне 9 цифри)", "error"); return; }
        const btn = formModal.querySelector("[data-tr]");
        btn.disabled = true; btn.textContent = "...";
        try {
          const data = await api("GET", `/registry/lookup/${eik}`);
          const fields = { name: data.name, eik: data.eik, vat_number: data.vat_number, mol: data.mol, city: data.city, address: data.address, email: data.email, phone: data.phone };
          Object.entries(fields).forEach(([k, v]) => {
            if (v) { const inp = formModal.querySelector(`[data-f="${k}"]`); if (inp) inp.value = v; }
          });
          if (data.is_vat_registered) { const cb = formModal.querySelector('[data-f="is_vat_registered"]'); if (cb) cb.checked = true; }
          toast("Данните са попълнени от ТР");
        } catch (e) { toast("Грешка при ТР: " + e.message, "error"); }
        btn.disabled = false; btn.textContent = "ТР";
      };

      // Save
      formModal.querySelector("[data-save]").onclick = async () => {
        const vals = {};
        formModal.querySelectorAll("[data-f]").forEach(inp => {
          if (inp.type === "checkbox") vals[inp.dataset.f] = inp.checked;
          else vals[inp.dataset.f] = inp.value;
        });
        if (!vals.name) { toast("Въведете име", "error"); return; }
        try {
          if (existing) {
            await api("PUT", `/clients/${existing.id}`, vals);
            toast("Клиентът е обновен");
          } else {
            await api("POST", "/clients", { ...vals, company_id: companyId, profile_id: profileId });
            toast("Клиентът е създаден");
          }
          closeModal(formOverlay);
          loadClients();
        } catch (e) { toast("Грешка: " + e.message, "error"); }
      };
    }

    // Build modal
    modal.innerHTML = `<div class="inv-modal-header"><h2>${ICONS.users} Клиенти</h2><div style="display:flex;align-items:center;gap:8px"><select data-company-filter style="height:28px;font-size:12px;border:1px solid #2563eb;border-radius:6px;padding:0 8px;background:#eff6ff;color:#2563eb;font-weight:600;cursor:pointer"></select></div><button class="inv-modal-close" data-close>${ICONS.x}</button></div><div class="inv-modal-body"></div>`;

    // Add "Нов клиент" button in header
    const header = modal.querySelector(".inv-modal-header");
    const headerBtnGroup = header.querySelector("div");
    headerBtnGroup.appendChild(el("button", { className: "inv-btn inv-btn-primary", innerHTML: ICONS.plus + " Нов клиент", onClick: () => openClientForm(null) }));

    // Company filter dropdown
    const companyFilter = modal.querySelector("[data-company-filter]");
    const allOpt = document.createElement("option"); allOpt.value = ""; allOpt.textContent = "Всички фирми"; companyFilter.appendChild(allOpt);
    const folders = window.__invFolderData || [];
    folders.forEach(f => {
      if (!f.company) return;
      const opt = document.createElement("option"); opt.value = f.company.id; opt.textContent = f.company.name;
      if (f.company.id === companyId) opt.selected = true;
      companyFilter.appendChild(opt);
    });
    // Default to "all"
    companyFilter.value = "";
    companyFilter.addEventListener("change", () => { filterCompanyId = companyFilter.value; loadClients(); });

    overlay = createOverlay(modal);
    modal.querySelector("[data-close]").onclick = () => closeModal(overlay);
    loadClients();
  }

  // ── Items Popup ─────────────────────────────────────────────────────────
  function openItemsPopup(companyId, profileId) {
    let items = [];
    let searchTerm = "";
    let overlay = null;
    let filterCompanyId = ""; // "" = all companies

    const modal = el("div", { className: "inv-modal inv-modal-items" });

    async function loadItems() {
      try {
        if (filterCompanyId === "") {
          const folders = window.__invFolderData || [];
          let all = [];
          for (const f of folders) {
            if (!f.company) continue;
            const p = new URLSearchParams({ company_id: f.company.id, profile_id: f.company.profile_id || profileId });
            if (searchTerm) p.set("search", searchTerm);
            try { const r = await api("GET", `/items?${p}`); all = all.concat(r); } catch (e) {}
          }
          items = all;
        } else {
          const cid = filterCompanyId;
          const pid = _getProfileForCompany(filterCompanyId) || profileId;
          const params = new URLSearchParams({ company_id: cid, profile_id: pid });
          if (searchTerm) params.set("search", searchTerm);
          items = await api("GET", `/items?${params}`);
        }
      } catch (e) { items = []; }
      renderTable();
    }

    function renderTable() {
      const body = modal.querySelector(".inv-modal-body");
      if (!body) return;
      body.innerHTML = "";

      const searchBar = el("div", { className: "inv-search-bar" });
      searchBar.innerHTML = ICONS.search;
      const searchInput = el("input", { className: "inv-input", placeholder: "Търсене по име...", value: searchTerm });
      let debounce;
      searchInput.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { searchTerm = searchInput.value; loadItems(); }, 300);
      });
      searchBar.appendChild(searchInput);
      body.appendChild(searchBar);

      if (items.length === 0) {
        body.appendChild(el("div", { className: "inv-empty", innerHTML: ICONS.package + "<p>" + (searchTerm ? "Няма намерени артикули" : "Няма добавени артикули") + "</p>" }));
        return;
      }

      const table = el("table", { className: "inv-table" });
      table.innerHTML = `<thead><tr><th>Име</th><th>Мярка</th><th style="text-align:right">Цена</th><th style="text-align:right">ДДС %</th><th>Описание</th><th class="inv-td-actions">Действия</th></tr></thead>`;
      const tbody = el("tbody");
      items.forEach(item => {
        const tr = el("tr");
        tr.innerHTML = `<td style="font-weight:500">${esc(item.name)}</td>
          <td style="color:#64748b">${esc(item.unit)}</td>
          <td style="text-align:right;font-family:monospace;font-size:12px">${Number(item.default_price).toFixed(2)} EUR</td>
          <td style="text-align:right;color:#64748b">${Number(item.vat_rate)}%</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;color:#94a3b8">${esc(item.description || "—")}</td>
          <td class="inv-td-actions"><div style="display:flex;gap:2px;align-items:center;justify-content:flex-end"></div></td>`;
        const actionsDiv = tr.querySelector(".inv-td-actions div");
        actionsDiv.appendChild(el("button", { className: "inv-icon-btn", innerHTML: ICONS.pencil, title: "Редактирай", onClick: () => openItemForm(item) }));
        actionsDiv.appendChild(el("button", { className: "inv-icon-btn inv-danger", innerHTML: ICONS.trash, title: "Изтрий", onClick: () => deleteItem(item.id) }));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      body.appendChild(table);
    }

    async function deleteItem(id) {
      if (!confirm("Сигурни ли сте, че искате да изтриете този артикул?")) return;
      try { await api("DELETE", `/items/${id}`); toast("Артикулът е изтрит"); loadItems(); }
      catch (e) { toast("Грешка: " + e.message, "error"); }
    }

    function openItemForm(existing) {
      const formModal = el("div", { className: "inv-modal inv-modal-sm" });
      formModal.innerHTML = `
        <div class="inv-modal-header">
          <h2>${existing ? "Редактиране на артикул" : "Нов артикул"}</h2>
          <button class="inv-modal-close" data-close>${ICONS.x}</button>
        </div>
        <div class="inv-modal-body">
          <div class="inv-field"><label>Име *</label><input class="inv-input" data-f="name" value="${esc(existing?.name || "")}" placeholder="Консултантска услуга"></div>
          <div class="inv-row">
            <div class="inv-field"><label>Мярка</label><input class="inv-input" data-f="unit" value="${esc(existing?.unit || "бр.")}"></div>
            <div class="inv-field"><label>Цена</label><input class="inv-input" data-f="default_price" type="number" step="0.01" value="${existing ? Number(existing.default_price).toFixed(2) : "0.00"}"></div>
            <div class="inv-field"><label>ДДС %</label><input class="inv-input" data-f="vat_rate" type="number" step="0.01" value="${existing ? Number(existing.vat_rate).toFixed(2) : "20.00"}"></div>
          </div>
          <div class="inv-field"><label>Описание</label><textarea class="inv-textarea" data-f="description" rows="2" placeholder="Опционално описание">${esc(existing?.description || "")}</textarea></div>
          <div class="inv-actions">
            <button class="inv-btn" data-cancel>Отказ</button>
            <button class="inv-btn inv-btn-emerald" data-save>${existing ? "Запази" : "Създай"}</button>
          </div>
        </div>`;

      const formOverlay = createOverlay(formModal);
      formModal.querySelector("[data-close]").onclick = () => closeModal(formOverlay);
      formModal.querySelector("[data-cancel]").onclick = () => closeModal(formOverlay);
      formModal.querySelector("[data-save]").onclick = async () => {
        const vals = {};
        formModal.querySelectorAll("[data-f]").forEach(inp => { vals[inp.dataset.f] = inp.type === "number" ? parseFloat(inp.value) : inp.value; });
        if (!vals.name) { toast("Въведете име", "error"); return; }
        try {
          if (existing) { await api("PUT", `/items/${existing.id}`, vals); toast("Артикулът е обновен"); }
          else { await api("POST", "/items", { ...vals, company_id: companyId, profile_id: profileId }); toast("Артикулът е създаден"); }
          closeModal(formOverlay);
          loadItems();
        } catch (e) { toast("Грешка: " + e.message, "error"); }
      };
    }

    modal.innerHTML = `<div class="inv-modal-header"><h2>${ICONS.package} Артикули</h2><div style="display:flex;align-items:center;gap:8px"><select data-company-filter style="height:28px;font-size:12px;border:1px solid #2563eb;border-radius:6px;padding:0 8px;background:#eff6ff;color:#2563eb;font-weight:600;cursor:pointer"></select></div><button class="inv-modal-close" data-close>${ICONS.x}</button></div><div class="inv-modal-body"></div>`;
    const header = modal.querySelector(".inv-modal-header");
    const headerBtnGroup = header.querySelector("div");
    headerBtnGroup.appendChild(el("button", { className: "inv-btn inv-btn-emerald", innerHTML: ICONS.plus + " Нов артикул", onClick: () => openItemForm(null) }));

    // Company filter dropdown
    const companyFilter = modal.querySelector("[data-company-filter]");
    const allOpt = document.createElement("option"); allOpt.value = ""; allOpt.textContent = "Всички фирми"; companyFilter.appendChild(allOpt);
    const folders = window.__invFolderData || [];
    folders.forEach(f => {
      if (!f.company) return;
      const opt = document.createElement("option"); opt.value = f.company.id; opt.textContent = f.company.name;
      if (f.company.id === companyId) opt.selected = true;
      companyFilter.appendChild(opt);
    });
    companyFilter.value = "";
    companyFilter.addEventListener("change", () => { filterCompanyId = companyFilter.value; loadItems(); });

    overlay = createOverlay(modal);
    modal.querySelector("[data-close]").onclick = () => closeModal(overlay);
    loadItems();
  }

  // ── New Invoice Popup ───────────────────────────────────────────────────
  function openNewInvoicePopup(companyId, profileId, companyName) {
    let clients = [];
    let items = [];
    let stubs = [];
    let selectedClient = null;
    let defaultVatRate = "20.00";
    let lines = [emptyLine(), emptyLine(), emptyLine()];
    let docType = "invoice";
    let priceWithVat = false; // toggle: false = price without VAT, true = price with VAT
    let overlay = null;

    function emptyLine() {
      return { item_id: null, description: "", quantity: "1.00", unit: "бр.", unit_price: "0.00", vat_rate: defaultVatRate };
    }

    async function init() {
      try {
        const cParams = new URLSearchParams({ company_id: companyId, profile_id: profileId });
        const [c, it, nn, st, cs] = await Promise.all([
          api("GET", `/clients?${cParams}`),
          api("GET", `/items?${cParams}`),
          api("GET", `/next-number?company_id=${companyId}&profile_id=${profileId}&document_type=${docType}`),
          api("GET", `/stubs?${cParams}`).catch(() => []),
          api("GET", `/company-settings/${companyId}`).catch(() => ({})),
        ]);
        clients = c;
        items = it;
        stubs = st;
        // Load default VAT rate from company settings
        if (cs && cs.default_vat_rate != null) {
          defaultVatRate = String(Number(cs.default_vat_rate).toFixed(2));
          // Update existing lines to use default VAT rate
          lines.forEach(l => { l.vat_rate = defaultVatRate; });
          renderLines();
        }
        const numInput = modal.querySelector('[data-f="invoice_number"]');
        if (numInput) numInput.value = String(nn.next_number).padStart(10, "0");

        // Populate stubs dropdown
        const stubSelect = modal.querySelector('[data-f="stub_id"]');
        if (stubSelect && stubs.length > 0) {
          stubs.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = `${s.name} (${s.start_number}-${s.end_number})`;
            stubSelect.appendChild(opt);
          });
        }

        // Auto-fill composed_by from company MOL
        const composedBySelect = modal.querySelector('[data-f="composed_by"]');
        if (composedBySelect) {
          // Try folder data first
          const folders = window.__invFolderData || [];
          const folder = folders.find(f => f.company && f.company.id === companyId);
          let mol = (folder && folder.company) ? (folder.company.mol || "") : "";
          // Fallback: try managers array
          let managers = [];
          if (folder && folder.company && Array.isArray(folder.company.managers)) {
            managers = folder.company.managers;
          }
          if (!mol && managers.length > 0) {
            mol = managers[0].name || managers[0] || "";
          }
          // Fallback: fetch company data from API
          if (!mol) {
            try {
              const resp = await fetch(`/api/profiles/${profileId}/companies/${companyId}`);
              if (resp.ok) {
                const compData = await resp.json();
                mol = compData.mol || "";
                if (Array.isArray(compData.managers)) managers = compData.managers;
                if (!mol && managers.length > 0) {
                  mol = managers[0].name || managers[0] || "";
                }
              }
            } catch (e) { /* ignore */ }
          }
          // Populate the select with MOL and managers as options
          if (mol) {
            const opt = document.createElement("option");
            opt.value = mol;
            opt.textContent = mol;
            opt.selected = true;
            composedBySelect.appendChild(opt);
          }
          // Add any additional managers as options
          managers.forEach(m => {
            const mName = m.name || m || "";
            if (mName && mName !== mol) {
              const opt = document.createElement("option");
              opt.value = mName;
              opt.textContent = mName;
              composedBySelect.appendChild(opt);
            }
          });
        }
      } catch (e) { console.error("Init error:", e); }
    }

    const modal = el("div", { className: "inv-modal inv-modal-lg" });
    const today = new Date().toISOString().split("T")[0];

    modal.innerHTML = `
      <div class="inv-modal-header">
        <h2>${ICONS.filetext} Нова фактура от <select data-company-switch style="font-size:16px;font-weight:700;color:#2563eb;border:none;background:transparent;cursor:pointer;padding:0 4px;max-width:300px;font-family:inherit"></select></h2>
        <button class="inv-modal-close" data-close>${ICONS.x}</button>
      </div>
      <div class="inv-modal-body" style="padding:16px 20px">

        <!-- SEC 1: Document Type (exact :8005 layout) -->
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:14px">
          <span style="font-size:13px;font-weight:600;color:#334155;margin-right:10px">Тип:</span>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-right:14px;font-size:13px"><input type="radio" name="inv_doctype" value="proforma" style="width:14px;height:14px;accent-color:#2563eb"><span>Проформа</span></label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-right:14px;font-size:13px"><input type="radio" name="inv_doctype" value="invoice" checked style="width:14px;height:14px;accent-color:#2563eb"><span style="font-weight:700">Фактура</span></label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;margin-right:14px;font-size:13px"><input type="radio" name="inv_doctype" value="debit_note" style="width:14px;height:14px;accent-color:#2563eb"><span>Дебитно известие</span></label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="radio" name="inv_doctype" value="credit_note" style="width:14px;height:14px;accent-color:#2563eb"><span>Кредитно известие</span></label>
        </div>

        <!-- SEC 2: Two-column grid (exact :8005 layout) -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 28px;margin-bottom:12px">
          <!-- Left column: Client fields (w-[130px] labels like :8005) -->
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:130px;flex-shrink:0;text-align:right">Клиент:</label>
              <div style="flex:1;display:flex;gap:3px">
                <input class="inv-input" data-client-search placeholder="Търсене по име или ЕИК..." style="flex:1;height:30px;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 10px">
                <button style="height:30px;width:30px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0" data-client-pick title="Избери от базата"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></button>
                <button style="height:30px;padding:0 8px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;gap:3px;cursor:pointer;flex-shrink:0;font-size:12px;font-weight:600;color:#b45309" data-tr-invoice title="Търсене в Търговски регистър"><span>ТР</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>
              </div>
              <div data-client-dropdown style="position:relative"></div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:130px;flex-shrink:0"></div>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" data-f="client_is_individual" style="width:14px;height:14px">Клиентът е физическо лице</label>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:130px;flex-shrink:0;text-align:right" data-eik-label>ЕИК/Булстат:</label>
              <div style="flex:1;display:flex;gap:3px;align-items:center">
                <input class="inv-input" data-f="client_eik" readonly style="flex:1;height:30px;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 10px;background:#f8fafc">
                <button style="height:30px;width:30px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0" data-tr-invoice-eik title="Търсене в ТР"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:130px;flex-shrink:0"></div>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" data-f="client_is_vat" style="width:14px;height:14px" disabled>Регистрация по ЗДДС</label>
              <input class="inv-input" data-f="client_vat" readonly style="height:24px;font-size:12px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 8px;background:#f8fafc;color:#64748b;max-width:160px;display:none" placeholder="ДДС номер">
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:130px;flex-shrink:0;text-align:right">МОЛ:</label>
              <input class="inv-input" data-f="client_mol" readonly style="flex:1;height:30px;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 10px;background:#f8fafc">
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:130px;flex-shrink:0;text-align:right">Град:</label>
              <input class="inv-input" data-f="client_city" readonly style="flex:1;height:30px;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 10px;background:#f8fafc">
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:130px;flex-shrink:0;text-align:right;padding-top:4px">Адрес:<br><span style="font-size:11px;font-weight:400;color:#94a3b8">на регистрация</span></label>
              <textarea class="inv-textarea" data-f="client_address" rows="2" readonly style="flex:1;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:4px 10px;background:#f8fafc;resize:none;min-height:50px"></textarea>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:130px;flex-shrink:0;text-align:right">Получател:</label>
              <div style="flex:1;display:flex;gap:3px">
                <input class="inv-input" data-f="recipient" style="flex:1;height:30px;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 10px;background:#f8fafc" readonly>
                <button style="height:30px;width:30px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0" title="Избери получател"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></button>
              </div>
            </div>
          </div>
          <!-- Right column: Stub + Invoice# + Dates (w-[185px] labels like :8005) -->
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:185px;flex-shrink:0;text-align:right">Кочан:</label>
              <select class="inv-select" data-f="stub_id" style="height:30px;border:1px solid #cbd5e1;border-radius:6px;padding:0 8px;font-size:13px;background:#fff;min-width:180px"><option value="">— няма кочан —</option></select>
              <button style="height:30px;padding:0 8px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;gap:3px;cursor:pointer;flex-shrink:0;font-size:12px;color:#2563eb;font-weight:500" data-stub-link title="Управление на кочани"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg><span>кочан</span></button>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:185px;flex-shrink:0;text-align:right">Фактура №:<br><span style="font-size:11px;font-weight:400;color:#94a3b8">следващият свободен №</span></label>
              <div style="display:flex;gap:3px;align-items:center">
                <input class="inv-input" data-f="invoice_number" value="0000000001" maxlength="10" style="height:30px;font-size:13px;border-radius:6px;border:1px solid #93c5fd;background:#eff6ff;font-family:monospace;font-weight:600;color:#1e40af;max-width:160px;padding:2px 10px">
                <button style="height:30px;width:30px;border:1px solid #93c5fd;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer" title="Редактирай №"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:185px;flex-shrink:0;text-align:right">Дата на издаване:</label>
              <input type="date" data-f="issue_date" value="${today}" style="height:30px;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 10px;width:160px;background:transparent">
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:600;color:#334155;width:185px;flex-shrink:0;text-align:right">Дата на данъчно<br>събитие:</label>
              <input type="date" data-f="tax_event_date" value="${today}" style="height:30px;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 10px;width:160px;background:transparent">
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:185px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;gap:6px">
                <input type="checkbox" data-f="show_due_date" style="width:14px;height:14px">
                <label style="font-size:13px;font-weight:600;color:#334155">Дата на падеж:</label>
              </div>
              <div data-due-date-field style="display:none">
                <input type="date" data-f="due_date" value="" style="height:30px;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:2px 10px;width:160px;background:transparent">
              </div>
            </div>
          </div>
        </div>

        <!-- Price toggle above table -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:0 6px">
          <span style="font-size:12px;color:#64748b">Режим на цените:</span>
          <select data-price-toggle style="height:26px;font-size:12px;border:1px solid #cbd5e1;border-radius:6px;padding:0 8px;background:#fff;color:#2563eb;font-weight:600;cursor:pointer">
            <option value="0">Цена без ДДС</option>
            <option value="1">Цена с ДДС</option>
          </select>
        </div>

        <!-- SEC 3: Items table (exact :8005 layout with borders) -->
        <div style="border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;margin-bottom:2px">
          <table class="inv-line-table" style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1">
              <th style="width:100px;padding:6px 2px;border-right:1px solid #e2e8f0"></th>
              <th style="text-align:center;font-size:13px;font-weight:600;color:#334155;padding:6px;border-right:1px solid #e2e8f0;min-width:220px">Артикул</th>
              <th style="text-align:center;font-size:13px;font-weight:600;color:#334155;padding:6px;width:130px;border-right:1px solid #e2e8f0">Количество</th>
              <th style="text-align:center;font-size:13px;font-weight:600;color:#334155;padding:6px;width:100px;border-right:1px solid #e2e8f0">Ед. Цена</th>
              <th style="text-align:center;font-size:13px;font-weight:600;color:#334155;padding:6px;width:70px;border-right:1px solid #e2e8f0">ДДС %</th>
              <th style="text-align:center;font-size:13px;font-weight:600;color:#334155;padding:6px;width:140px">Стойност</th>
            </tr></thead>
            <tbody data-lines></tbody>
          </table>
        </div>

        <!-- SEC 4: + Добави ред + Сума (без отстъпка) -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;margin-bottom:2px">
          <button style="display:flex;align-items:center;gap:4px;font-size:13px;color:#2563eb;background:none;border:none;cursor:pointer;font-weight:500" data-add-line><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg><span>Добави ред</span></button>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:13px;color:#475569">Сума (без отстъпка)</span>
            <span style="font-size:13px;font-weight:600;width:120px;text-align:right" data-subtotal-raw>0.00 EUR</span>
          </div>
        </div>

        <!-- SEC 5: Totals table (exact :8005 layout — always visible ДДС row) -->
        <div style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:2px" data-totals>
          <table style="border-collapse:collapse">
            <tbody>
              <tr>
                <td style="text-align:right;font-size:13px;color:#475569;padding:2px 12px 2px 0">Отстъпка</td>
                <td style="text-align:right;padding:2px 0"><div style="display:flex;align-items:center;justify-content:flex-end;gap:3px">
                  <input type="number" data-f="discount" step="0.01" min="0" value="0.00" style="height:24px;font-size:13px;text-align:right;border:1px solid #cbd5e1;border-radius:6px;width:70px;padding:0 6px">
                  <select data-f="discount_type" style="height:24px;border:1px solid #cbd5e1;border-radius:6px;padding:0 2px;font-size:12px;background:#fff;width:52px"><option value="EUR">EUR</option><option value="%">%</option></select>
                </div></td>
              </tr>
              <tr style="border-top:1px solid #e2e8f0">
                <td style="text-align:right;font-size:13px;color:#475569;padding:2px 12px 2px 0">Данъчна основа</td>
                <td style="text-align:right;font-size:13px;font-weight:600;padding:2px 0;width:120px" data-tax-base>0.00 EUR<div style="font-size:11px;color:#94a3b8;font-weight:400">0.00 лв.</div></td>
              </tr>
              <tr>
                <td style="text-align:right;font-size:13px;color:#475569;padding:2px 12px 2px 0">ДДС</td>
                <td style="text-align:right;font-size:13px;font-weight:600;padding:2px 0" data-vat-amount>0.00 EUR<div style="font-size:11px;color:#94a3b8;font-weight:400">0.00 лв.</div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- SEC 6: ДДС настройки (exact :8005 layout — simple row with borders) -->
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:2px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:6px 0">
          <span style="font-size:13px;font-weight:600;color:#334155">ДДС настройки:</span>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="checkbox" data-f="no_vat" style="width:14px;height:14px;accent-color:#2563eb">Не начислявай ДДС по тази фактура</label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="checkbox" data-f="client_is_vat_invoice" style="width:14px;height:14px;accent-color:#2563eb" disabled>Регистрация по ЗДДС</label>
        </div>
        <!-- VAT reason dropdown (shown when "Не начислявай ДДС" is checked) -->
        <div data-no-vat-reason style="display:none;padding:8px 0">
          <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px">Основание за неначисляване на ДДС:</label>
          <select class="inv-select" data-f="no_vat_reason" style="font-size:13px;max-width:500px">
            <option value="">— Изберете основание —</option>
            <option value="чл. 21, ал. 2 от ЗДДС">чл. 21, ал. 2 от ЗДДС — Място на изпълнение извън България</option>
            <option value="чл. 28 от ЗДДС">чл. 28 от ЗДДС — Доставка свързана с международен транспорт</option>
            <option value="чл. 41 от ЗДДС">чл. 41 от ЗДДС — Освободена доставка</option>
            <option value="чл. 42 от ЗДДС">чл. 42 от ЗДДС — Безвъзмездна доставка</option>
            <option value="чл. 50, ал. 1 от ЗДДС">чл. 50, ал. 1 от ЗДДС — Освободен внос</option>
            <option value="чл. 113, ал. 9 от ЗДДС">чл. 113, ал. 9 от ЗДДС — Нерегистрирано по ЗДДС лице</option>
            <option value="чл. 7 от ЗДДС">чл. 7 от ЗДДС — ВОД (Вътреобщностна доставка)</option>
            <option value="other">Друго (въведете ръчно)</option>
          </select>
          <input class="inv-input" data-f="no_vat_reason_custom" placeholder="Въведете основание..." style="display:none;margin-top:6px;max-width:500px">
        </div>

        <!-- SEC 7: Съставил + Сума за плащане (exact :8005 layout) -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">
          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:13px;color:#475569">Съставил</label>
            <select class="inv-select" data-f="composed_by" style="height:28px;border:1px solid #cbd5e1;border-radius:6px;padding:0 8px;font-size:13px;background:#fff;min-width:200px">
              <option value="">—</option>
            </select>
          </div>
          <div style="text-align:right;display:flex;align-items:center;gap:12px">
            <span style="font-size:13px;color:#475569">Сума за плащане</span>
            <div>
              <div style="font-size:18px;font-weight:700;color:#0f172a" data-grand-total>0.00 EUR</div>
              <div style="font-size:11px;color:#94a3b8;font-weight:600" data-grand-total-bgn>0.00 лв.</div>
            </div>
          </div>
        </div>

        <!-- SEC 8: Забележки (exact :8005 layout with language tabs) -->
        <div style="padding-top:6px;margin-bottom:6px">
          <div style="display:flex;gap:12px;margin-bottom:6px">
            <button style="font-size:13px;padding-bottom:2px;color:#0f172a;font-weight:600;border:none;border-bottom:2px solid #334155;background:none;cursor:pointer">Български език</button>
            <button style="font-size:13px;padding-bottom:2px;color:#3b82f6;border:none;border-bottom:none;background:none;cursor:pointer">Английски език</button>
          </div>
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:6px">
            <label style="font-size:13px;font-weight:600;color:#334155;width:130px;flex-shrink:0;text-align:right;padding-top:4px">Забележки<br><span style="font-size:11px;font-weight:400;color:#94a3b8">видими за клиента</span></label>
            <textarea class="inv-textarea" data-f="notes" rows="2" style="flex:1;font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:4px 10px;resize:none"></textarea>
          </div>
        </div>

        <!-- SEC 9: Начин на плащане (exact :8005 layout) -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;border-top:1px solid #e2e8f0;padding-top:6px">
          <label style="font-size:13px;font-weight:600;color:#334155;width:130px;flex-shrink:0;text-align:right">Начин на плащане</label>
          <select class="inv-select" data-f="payment_method" style="height:30px;border:1px solid #cbd5e1;border-radius:6px;padding:0 8px;font-size:13px;background:#fff">
            <option>В брой</option><option>Банков път</option><option>Наложен платеж</option><option>С карта</option>
            <option>Платежно нареждане</option><option>Чек/Ваучер</option><option>С насрещно прихващане</option>
            <option>Паричен превод</option><option>E-Pay</option><option>PayPal</option><option>Stripe</option>
            <option>EasyPay</option><option>Пощенски паричен превод</option><option>Друг</option>
          </select>
        </div>

        <!-- SEC 10: Коментари (exact :8005 layout — boxed) -->
        <div style="border:1px solid #cbd5e1;border-radius:6px;margin-bottom:8px;overflow:hidden">
          <div style="background:#f8fafc;padding:4px 10px;border-bottom:1px solid #cbd5e1">
            <span style="font-size:13px;font-weight:600;color:#334155">Коментари</span>
            <span style="font-size:11px;color:#ef4444;margin-left:6px">(не се вижда от клиента)</span>
          </div>
          <div style="padding:6px"><textarea class="inv-textarea" data-f="internal_notes" rows="2" style="font-size:13px;border-radius:6px;border:1px solid #cbd5e1;padding:4px 10px;resize:none;width:100%;box-sizing:border-box"></textarea></div>
        </div>

        <!-- Sync settings -->
        <div class="inv-sync-section">
          <h3>Настройки за синхронизация</h3>
          <div class="inv-radio-group">
            <label class="inv-radio"><input type="radio" name="inv_sync" value="manual" checked> Ръчно (фактурата няма да се изпрати автоматично)</label>
            <label class="inv-radio"><input type="radio" name="inv_sync" value="immediate"> Веднага (фактурата се изпраща незабавно)</label>
            <label class="inv-radio"><input type="radio" name="inv_sync" value="delayed"> След определено време
              <input class="inv-input" data-f="delay_minutes" type="number" value="30" min="1" style="width:60px;margin-left:4px"> мин.</label>
          </div>
        </div>

        <!-- SEC 11: Buttons (exact :8005 layout) -->
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:12px 0">
          <button data-save-issue style="background:#28a745;color:#fff;font-weight:600;font-size:15px;padding:8px 40px;border-radius:8px;border:none;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.1)">Създай фактурата</button>
          <button data-save-draft style="background:#fff;color:#334155;font-weight:600;font-size:15px;padding:8px 40px;border-radius:8px;border:1px solid #cbd5e1;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.1)">Създай чернова</button>
        </div>
      </div>`;

    overlay = createOverlay(modal);
    modal.querySelector("[data-close]").onclick = () => closeModal(overlay);
    const cancelBtn = modal.querySelector("[data-cancel]");
    if (cancelBtn) cancelBtn.onclick = () => closeModal(overlay);

    // Populate company switch dropdown in header
    const companySwitchSelect = modal.querySelector("[data-company-switch]");
    if (companySwitchSelect) {
      const folders = window.__invFolderData || [];
      folders.forEach(f => {
        if (!f.company) return;
        const opt = document.createElement("option");
        opt.value = f.company.id;
        opt.textContent = f.company.name || "";
        opt.dataset.profileId = f.profile_id || profileId;
        if (f.company.id === companyId) opt.selected = true;
        companySwitchSelect.appendChild(opt);
      });
      // If no folders data, at least show current company name
      if (companySwitchSelect.options.length === 0) {
        const opt = document.createElement("option");
        opt.value = companyId;
        opt.textContent = companyName || "";
        opt.selected = true;
        companySwitchSelect.appendChild(opt);
      }
      companySwitchSelect.addEventListener("change", () => {
        const newCompanyId = companySwitchSelect.value;
        const selectedOpt = companySwitchSelect.options[companySwitchSelect.selectedIndex];
        const newProfileId = selectedOpt.dataset.profileId || profileId;
        const newCompanyName = selectedOpt.textContent;
        closeModal(overlay);
        openNewInvoicePopup(newCompanyId, newProfileId, newCompanyName);
      });
    }

    // Fix 8: Prevent mousedown on modal from bubbling and causing form to disappear
    modal.addEventListener("mousedown", (e) => e.stopPropagation());
    modal.addEventListener("selectstart", (e) => e.stopPropagation());

    // Price toggle (with/without VAT) - now a dropdown above the table
    const priceToggleBtn = modal.querySelector("[data-price-toggle]");
    priceToggleBtn.value = priceWithVat ? "1" : "0";
    priceToggleBtn.addEventListener("change", () => {
      priceWithVat = priceToggleBtn.value === "1";
      renderLines();
    });

    // Document type change
    modal.querySelectorAll('[name="inv_doctype"]').forEach(r => {
      r.addEventListener("change", async () => {
        docType = r.value;
        try {
          const nn = await api("GET", `/next-number?company_id=${companyId}&profile_id=${profileId}&document_type=${docType}`);
          const numInput = modal.querySelector('[data-f="invoice_number"]');
          if (numInput) numInput.value = String(nn.next_number).padStart(10, "0");
        } catch (e) { console.warn("Failed to fetch next number:", e); }
      });
    });

    // Client picker button - opens a popup with all clients from DB
    modal.querySelector("[data-client-pick]").onclick = () => {
      let pickerClients = [...clients];
      let pickerFilterCompany = "";
      const pickerModal = el("div", { className: "inv-modal", style: "width:600px;max-height:80vh" });
      pickerModal.innerHTML = `
        <div class="inv-modal-header">
          <h2>${ICONS.users} Избор на клиент</h2>
          <select data-picker-company-filter style="height:28px;font-size:12px;border:1px solid #2563eb;border-radius:6px;padding:0 8px;background:#eff6ff;color:#2563eb;font-weight:600;cursor:pointer"></select>
          <button class="inv-modal-close" data-close>${ICONS.x}</button>
        </div>
        <div class="inv-modal-body" style="max-height:60vh;overflow-y:auto">
          <div class="inv-search-bar" style="margin-bottom:12px">${ICONS.search}<input class="inv-input" data-picker-search placeholder="Търсене по име или ЕИК..." style="flex:1"></div>
          <table class="inv-table" style="width:100%"><thead><tr><th>Име</th><th>ЕИК</th><th>Град</th><th>МОЛ</th></tr></thead><tbody data-picker-body></tbody></table>
        </div>`;
      const pickerOverlay = createOverlay(pickerModal);
      pickerModal.querySelector("[data-close]").onclick = () => closeModal(pickerOverlay);
      // Company filter in picker
      const pFilter = pickerModal.querySelector("[data-picker-company-filter]");
      const pAllOpt = document.createElement("option"); pAllOpt.value = ""; pAllOpt.textContent = "Всички фирми"; pFilter.appendChild(pAllOpt);
      (window.__invFolderData || []).forEach(f => {
        if (!f.company) return;
        const o = document.createElement("option"); o.value = f.company.id; o.textContent = f.company.name; pFilter.appendChild(o);
      });
      pFilter.value = "";
      async function reloadPickerClients() {
        if (pickerFilterCompany === "") {
          const folders = window.__invFolderData || [];
          let all = [];
          for (const f of folders) {
            if (!f.company) continue;
            const p = new URLSearchParams({ company_id: f.company.id, profile_id: f.company.profile_id || profileId });
            try { const r = await api("GET", `/clients?${p}`); all = all.concat(r); } catch (e) {}
          }
          pickerClients = all;
        } else {
          const p = new URLSearchParams({ company_id: pickerFilterCompany, profile_id: _getProfileForCompany(pickerFilterCompany) || profileId });
          pickerClients = await api("GET", `/clients?${p}`).catch(() => []);
        }
        renderPickerClients(pickerClients);
      }
      pFilter.addEventListener("change", () => { pickerFilterCompany = pFilter.value; reloadPickerClients(); });
      const pickerBody = pickerModal.querySelector("[data-picker-body]");
      function renderPickerClients(list) {
        pickerBody.innerHTML = "";
        if (list.length === 0) { pickerBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px">Няма намерени клиенти</td></tr>'; return; }
        list.forEach(c => {
          const tr = el("tr", { style: "cursor:pointer", onClick: () => { selectClient(c); closeModal(pickerOverlay); } });
          tr.innerHTML = `<td style="padding:8px 10px;font-weight:500">${esc(c.name)}</td><td style="padding:8px 10px;color:#64748b">${esc(c.eik || "")}</td><td style="padding:8px 10px;color:#64748b">${esc(c.city || "")}</td><td style="padding:8px 10px;color:#64748b">${esc(c.mol || "")}</td>`;
          tr.onmouseenter = () => tr.style.background = "#f1f5f9";
          tr.onmouseleave = () => tr.style.background = "";
          pickerBody.appendChild(tr);
        });
      }
      reloadPickerClients();
      const searchInp = pickerModal.querySelector("[data-picker-search]");
      searchInp.addEventListener("input", () => {
        const q = searchInp.value.toLowerCase();
        renderPickerClients(q ? pickerClients.filter(c => c.name.toLowerCase().includes(q) || (c.eik && c.eik.includes(q))) : pickerClients);
      });
      searchInp.focus();
    };

    // Client search
    const clientSearchInput = modal.querySelector("[data-client-search]");
    const clientDropdown = modal.querySelector("[data-client-dropdown]");
    let csDebounce;
    clientSearchInput.addEventListener("input", () => {
      clearTimeout(csDebounce);
      csDebounce = setTimeout(() => {
        const q = clientSearchInput.value.toLowerCase();
        clientDropdown.innerHTML = "";
        if (!q) return;
        const filtered = clients.filter(c => c.name.toLowerCase().includes(q) || (c.eik && c.eik.includes(q)));
        if (filtered.length === 0) return;
        const dd = el("div", { style: "position:absolute;z-index:10;width:100%;background:#fff;border:1px solid #cbd5e1;border-radius:6px;max-height:160px;overflow-y:auto;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)" });
        filtered.forEach(c => {
          const opt = el("button", {
            style: "display:block;width:100%;text-align:left;padding:6px 10px;border:none;background:none;cursor:pointer;font-size:12px;border-bottom:1px solid #f1f5f9",
            innerHTML: `<div style="font-weight:500">${esc(c.name)}</div><div style="font-size:11px;color:#94a3b8">${c.eik ? "ЕИК: " + esc(c.eik) : ""}${c.city ? " • " + esc(c.city) : ""}</div>`,
            onClick: () => { selectClient(c); clientDropdown.innerHTML = ""; }
          });
          dd.appendChild(opt);
        });
        clientDropdown.appendChild(dd);
      }, 200);
    });

    function selectClient(c) {
      selectedClient = c;
      clientSearchInput.value = c.name;
      const setField = (sel, val) => { const el = modal.querySelector(sel); if (el) { if (el.type === 'checkbox') el.checked = !!val; else el.value = val || ''; } };
      setField('[data-f="client_eik"]', c.eik);
      setField('[data-f="client_is_vat"]', c.is_vat_registered);
      setField('[data-f="client_is_individual"]', c.is_individual);
      setField('[data-f="client_mol"]', c.mol);
      setField('[data-f="client_city"]', c.city);
      setField('[data-f="client_address"]', c.address);
      // Fix 3: Update EIK/EGN label based on individual status
      const eikLabel = modal.querySelector("[data-eik-label]");
      if (eikLabel) eikLabel.textContent = c.is_individual ? "ЕГН:" : "ЕИК/Булстат:";
      // Show/hide VAT number and update ЗДДС checkboxes
      const vatInput = modal.querySelector('[data-f="client_vat"]');
      const vatCheckbox = modal.querySelector('[data-f="client_is_vat"]');
      const vatCheckboxInvoice = modal.querySelector('[data-f="client_is_vat_invoice"]');
      if (vatInput) {
        vatInput.value = c.vat_number || "";
        vatInput.style.display = c.is_vat_registered ? "block" : "none";
      }
      if (vatCheckbox) vatCheckbox.checked = !!c.is_vat_registered;
      if (vatCheckboxInvoice) vatCheckboxInvoice.checked = !!c.is_vat_registered;
    }

    // TR lookup for invoice — opens a styled popup
    modal.querySelector("[data-tr-invoice]").onclick = () => {
      const trModal = el("div", { className: "inv-modal", style: "width:480px" });
      trModal.innerHTML = `
        <div class="inv-modal-header"><h2>🔍 Търсене в Търговски регистър</h2><button class="inv-modal-close" data-close>${ICONS.x}</button></div>
        <div class="inv-modal-body">
          <p style="color:#475569;font-size:13px;margin-bottom:12px">Въведете ЕИК/Булстат на фирмата за автоматично извличане на данни от Търговския регистър.</p>
          <div class="inv-field" style="margin-bottom:16px">
            <label style="font-weight:600">ЕИК / Булстат:</label>
            <input class="inv-input" data-tr-eik placeholder="напр. 123456789" style="font-size:16px;padding:10px 12px;text-align:center;letter-spacing:2px" autofocus>
          </div>
          <div data-tr-status style="display:none;padding:10px;border-radius:6px;margin-bottom:12px;font-size:13px"></div>
          <div class="inv-actions"><button class="inv-btn" data-close-tr>Отказ</button><button class="inv-btn inv-btn-primary" data-tr-search>🔍 Търси</button></div>
        </div>`;
      const trOverlay = createOverlay(trModal);
      trModal.querySelector("[data-close]").onclick = () => closeModal(trOverlay);
      trModal.querySelector("[data-close-tr]").onclick = () => closeModal(trOverlay);
      const eikInput = trModal.querySelector("[data-tr-eik]");
      const statusDiv = trModal.querySelector("[data-tr-status]");
      const searchBtn = trModal.querySelector("[data-tr-search]");
      eikInput.addEventListener("keydown", (e) => { if (e.key === "Enter") searchBtn.click(); });
      setTimeout(() => eikInput.focus(), 100);
      searchBtn.onclick = async () => {
        const eik = eikInput.value.replace(/\s/g, "");
        if (!eik || eik.length < 9) {
          statusDiv.style.display = "block"; statusDiv.style.background = "#fef2f2"; statusDiv.style.color = "#dc2626";
          statusDiv.textContent = "Моля, въведете валиден ЕИК (9, 10 или 13 цифри).";
          return;
        }
        statusDiv.style.display = "block"; statusDiv.style.background = "#eff6ff"; statusDiv.style.color = "#2563eb";
        statusDiv.textContent = "Търсене в Търговски регистър...";
        searchBtn.disabled = true;
        try {
          const data = await api("GET", `/registry/lookup/${eik}`);
          const existing = clients.find(c => c.eik === eik);
          if (existing) { selectClient(existing); closeModal(trOverlay); toast("Клиентът вече съществува"); return; }
          const result = await api("POST", "/clients", {
            company_id: companyId, profile_id: profileId,
            name: data.name, eik: data.eik, vat_number: data.vat_number,
            is_vat_registered: data.is_vat_registered, mol: data.mol,
            city: data.city, address: data.address, email: data.email, phone: data.phone || "",
          });
          const cParams = new URLSearchParams({ company_id: companyId, profile_id: profileId });
          clients = await api("GET", `/clients?${cParams}`);
          const newClient = clients.find(c => c.id === result.id);
          if (newClient) selectClient(newClient);
          closeModal(trOverlay);
          toast("Клиент добавен от ТР");
        } catch (e) {
          statusDiv.style.display = "block"; statusDiv.style.background = "#fef2f2"; statusDiv.style.color = "#dc2626";
          statusDiv.textContent = "Грешка: " + e.message;
          searchBtn.disabled = false;
        }
      };
    };

    // Item picker helper — opens a popup to pick from existing items
    function showItemPicker(lineIdx) {
      let pickerItems = [...items];
      let pickerFilterCompany = "";
      const pickerModal = el("div", { className: "inv-modal", style: "width:650px;max-height:80vh" });
      pickerModal.innerHTML = `
        <div class="inv-modal-header">
          <h2>${ICONS.package} Избор на артикул</h2>
          <select data-picker-company-filter style="height:28px;font-size:12px;border:1px solid #2563eb;border-radius:6px;padding:0 8px;background:#eff6ff;color:#2563eb;font-weight:600;cursor:pointer"></select>
          <button class="inv-modal-close" data-close>${ICONS.x}</button>
        </div>
        <div class="inv-modal-body" style="max-height:60vh;overflow-y:auto">
          <div class="inv-search-bar" style="margin-bottom:12px">${ICONS.search}<input class="inv-input" data-picker-search placeholder="Търсене по име..." style="flex:1"></div>
          <table class="inv-table" style="width:100%"><thead><tr><th>Артикул</th><th>Мярка</th><th>Цена</th><th>ДДС %</th></tr></thead><tbody data-picker-body></tbody></table>
        </div>`;
      const pickerOverlay = createOverlay(pickerModal);
      pickerModal.querySelector("[data-close]").onclick = () => closeModal(pickerOverlay);
      // Company filter in item picker
      const pFilter = pickerModal.querySelector("[data-picker-company-filter]");
      const pAllOpt = document.createElement("option"); pAllOpt.value = ""; pAllOpt.textContent = "Всички фирми"; pFilter.appendChild(pAllOpt);
      (window.__invFolderData || []).forEach(f => {
        if (!f.company) return;
        const o = document.createElement("option"); o.value = f.company.id; o.textContent = f.company.name; pFilter.appendChild(o);
      });
      pFilter.value = "";
      async function reloadPickerItems() {
        if (pickerFilterCompany === "") {
          const folders = window.__invFolderData || [];
          let all = [];
          for (const f of folders) {
            if (!f.company) continue;
            const p = new URLSearchParams({ company_id: f.company.id, profile_id: f.company.profile_id || profileId });
            try { const r = await api("GET", `/items?${p}`); all = all.concat(r); } catch (e) {}
          }
          pickerItems = all;
        } else {
          const p = new URLSearchParams({ company_id: pickerFilterCompany, profile_id: _getProfileForCompany(pickerFilterCompany) || profileId });
          pickerItems = await api("GET", `/items?${p}`).catch(() => []);
        }
        renderPickerItems(pickerItems);
      }
      pFilter.addEventListener("change", () => { pickerFilterCompany = pFilter.value; reloadPickerItems(); });
      const pickerBody = pickerModal.querySelector("[data-picker-body]");
      function renderPickerItems(list) {
        pickerBody.innerHTML = "";
        if (list.length === 0) { pickerBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px">Няма намерени артикули</td></tr>'; return; }
        list.forEach(item => {
          const tr = el("tr", { style: "cursor:pointer", onClick: () => {
            lines[lineIdx].item_id = item.id;
            lines[lineIdx].description = item.name;
            lines[lineIdx].unit = item.unit;
            lines[lineIdx].unit_price = Number(item.default_price).toFixed(2);
            lines[lineIdx].vat_rate = Number(item.vat_rate).toFixed(2);
            closeModal(pickerOverlay);
            renderLines();
          }});
          tr.innerHTML = `<td style="padding:8px 10px;font-weight:500">${esc(item.name)}</td><td style="padding:8px 10px;color:#64748b">${esc(item.unit)}</td><td style="padding:8px 10px;font-family:monospace">${Number(item.default_price).toFixed(2)} EUR</td><td style="padding:8px 10px;color:#64748b">${Number(item.vat_rate)}%</td>`;
          tr.onmouseenter = () => tr.style.background = "#f1f5f9";
          tr.onmouseleave = () => tr.style.background = "";
          pickerBody.appendChild(tr);
        });
      }
      reloadPickerItems();
      const searchInp = pickerModal.querySelector("[data-picker-search]");
      searchInp.addEventListener("input", () => {
        const q = searchInp.value.toLowerCase();
        renderPickerItems(q ? pickerItems.filter(it => it.name.toLowerCase().includes(q)) : pickerItems);
      });
      searchInp.focus();
    }

    // Line items
    const linesBody = modal.querySelector("[data-lines]");
    const totalsDiv = modal.querySelector("[data-totals]");

    function renderLines() {
      linesBody.innerHTML = "";
      lines.forEach((line, i) => {
        const tr = el("tr");
        tr.style.cssText = "border-bottom:1px solid #e2e8f0";
        tr.onmouseenter = () => tr.style.background = "#f8fafc";
        tr.onmouseleave = () => tr.style.background = "";
        // Calculate display price based on priceWithVat toggle
        let displayPrice = line.unit_price;
        if (priceWithVat) {
          const vr = vatRate(line.vat_rate);
          displayPrice = (parseFloat(line.unit_price) * (1 + vr / 100)).toFixed(2);
        }
        tr.innerHTML = `
          <td style="padding:2px 2px;text-align:center;border-right:1px solid #e2e8f0">
            <div style="display:flex;align-items:center;justify-content:center;gap:1px">
              <button draggable="true" style="color:#94a3b8;cursor:grab;padding:2px;background:none;border:none"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg></button>
              <button style="color:#3b82f6;padding:2px;background:none;border:none;cursor:pointer" data-add-line-at="${i}" title="Добави ред"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg></button>
              <button style="color:#f87171;padding:2px;background:none;border:none;cursor:pointer" data-remove-line="${i}" title="Премахни ред"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
            </div>
          </td>
          <td style="padding:2px 2px;border-right:1px solid #e2e8f0">
            <div style="display:flex;gap:2px;align-items:center">
              <input style="flex:1;height:26px;font-size:13px;border:1px solid #cbd5e1;border-radius:6px;padding:0 8px" data-li="${i}" data-lf="description" value="${esc(line.description)}" placeholder="">
              <button style="height:26px;width:26px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0" data-item-pick="${i}" title="Избери от каталога"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></button>
            </div>
          </td>
          <td style="padding:2px 2px;border-right:1px solid #e2e8f0">
            <div style="display:flex;gap:2px;align-items:center">
              <input type="number" style="height:26px;font-size:13px;text-align:center;border:1px solid #cbd5e1;border-radius:6px;width:70px;padding:0 4px" step="0.01" min="0" data-li="${i}" data-lf="quantity" value="${line.quantity}">
              <select style="height:26px;border:1px solid #cbd5e1;border-radius:6px;padding:0 2px;font-size:13px;background:#fff" data-li="${i}" data-lf="unit">
                <option ${line.unit==='бр.' ? 'selected' : ''}>бр.</option><option ${line.unit==='кг' ? 'selected' : ''}>кг</option>
                <option ${line.unit==='м' ? 'selected' : ''}>м</option><option ${line.unit==='л' ? 'selected' : ''}>л</option>
                <option ${line.unit==='м²' ? 'selected' : ''}>м²</option><option ${line.unit==='м³' ? 'selected' : ''}>м³</option>
                <option ${line.unit==='час' ? 'selected' : ''}>час</option><option ${line.unit==='ден' ? 'selected' : ''}>ден</option>
                <option ${line.unit==='мес.' ? 'selected' : ''}>мес.</option><option ${line.unit==='услуга' ? 'selected' : ''}>услуга</option>
              </select>
            </div>
          </td>
          <td style="padding:2px 2px;border-right:1px solid #e2e8f0">
            <input type="number" style="width:100%;height:26px;font-size:13px;text-align:right;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px" step="0.01" min="0" data-li="${i}" data-lf="unit_price" value="${displayPrice}">
          </td>
          <td style="padding:2px 2px;text-align:center;border-right:1px solid #e2e8f0"><select style="height:24px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;padding:0 2px;background:#fff" data-li="${i}" data-lf="vat_rate"><option value="20.00" ${line.vat_rate==="20.00"||line.vat_rate===20?"selected":""}>20%</option><option value="9.00" ${line.vat_rate==="9.00"||line.vat_rate===9?"selected":""}>9%</option><option value="0.00" ${line.vat_rate==="0.00"||line.vat_rate===0?"selected":""}>0%</option></select></td>
          <td style="padding:4px 6px;text-align:right;font-size:13px;font-weight:500" data-line-total="${i}">${calcLineTotal(line)} EUR</td>`;
        linesBody.appendChild(tr);
      });

      // Bind item picker buttons
      linesBody.querySelectorAll("[data-item-pick]").forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); showItemPicker(parseInt(btn.dataset.itemPick)); };
      });

      // Bind add-line-at buttons (insert line at specific position)
      linesBody.querySelectorAll("[data-add-line-at]").forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); lines.splice(parseInt(btn.dataset.addLineAt) + 1, 0, emptyLine()); renderLines(); };
      });

      // Bind input events (inputs and selects)
      linesBody.querySelectorAll("[data-lf]").forEach(inp => {
        const evtType = inp.tagName === "SELECT" ? "change" : "input";
        inp.addEventListener(evtType, () => {
          const idx = parseInt(inp.dataset.li);
          const field = inp.dataset.lf;
          if (field === "unit_price" && priceWithVat) {
            // Convert from VAT-inclusive price to VAT-exclusive
            const vr = vatRate(lines[idx].vat_rate);
            const priceInc = parseFloat(inp.value) || 0;
            lines[idx].unit_price = (priceInc / (1 + vr / 100)).toFixed(2);
          } else {
            lines[idx][field] = inp.value;
          }
          const totalCell = linesBody.querySelector(`[data-line-total="${idx}"]`);
          if (totalCell) totalCell.textContent = calcLineTotal(lines[idx]) + " EUR";
          renderTotals();
        });
      });

      linesBody.querySelectorAll("[data-remove-line]").forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.removeLine);
          lines.splice(idx, 1);
          if (lines.length === 0) lines.push(emptyLine());
          renderLines();
          renderTotals();
        };
      });

      renderTotals();
    }

    function calcLineTotal(line) {
      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.unit_price) || 0;
      return (qty * price).toFixed(2);
    }

    const EUR_TO_BGN = 1.95583;

    function renderTotals() {
      const noVatChecked = modal.querySelector('[data-f="no_vat"]').checked;
      const discountVal = parseFloat(modal.querySelector('[data-f="discount"]').value) || 0;
      const discountType = modal.querySelector('[data-f="discount_type"]').value;

      let subtotalRaw = 0;
      lines.forEach(l => { subtotalRaw += parseFloat(calcLineTotal(l)); });

      // Update subtotal display next to "Добави ред"
      const subtotalRawEl = modal.querySelector("[data-subtotal-raw]");
      if (subtotalRawEl) subtotalRawEl.textContent = subtotalRaw.toFixed(2) + " EUR";

      // Apply discount
      let discountAmt = 0;
      if (discountType === '%') discountAmt = subtotalRaw * (discountVal / 100);
      else discountAmt = discountVal;
      const taxBase = subtotalRaw - discountAmt;

      // Calculate VAT per line (proportional to line share of taxBase)
      let totalVat = 0;
      if (!noVatChecked) {
        lines.forEach(l => {
          const lineTotal = parseFloat(calcLineTotal(l));
          const lineShare = subtotalRaw > 0 ? (lineTotal / subtotalRaw) * taxBase : 0;
          const lineVatRate = vatRate(l.vat_rate);
          totalVat += lineShare * (lineVatRate / 100);
        });
      }
      const total = taxBase + totalVat;

      // Update inline totals elements (matching :8005 layout)
      const taxBaseEl = modal.querySelector("[data-tax-base]");
      if (taxBaseEl) taxBaseEl.innerHTML = taxBase.toFixed(2) + " EUR" + '<div style="font-size:11px;color:#94a3b8;font-weight:400">' + (taxBase * EUR_TO_BGN).toFixed(2) + " лв.</div>";

      const vatAmountEl = modal.querySelector("[data-vat-amount]");
      if (vatAmountEl) vatAmountEl.innerHTML = totalVat.toFixed(2) + " EUR" + '<div style="font-size:11px;color:#94a3b8;font-weight:400">' + (totalVat * EUR_TO_BGN).toFixed(2) + " лв.</div>";

      const grandTotalEl = modal.querySelector("[data-grand-total]");
      if (grandTotalEl) grandTotalEl.textContent = total.toFixed(2) + " EUR";

      const grandTotalBgnEl = modal.querySelector("[data-grand-total-bgn]");
      if (grandTotalBgnEl) grandTotalBgnEl.textContent = (total * EUR_TO_BGN).toFixed(2) + " лв.";
    }

    modal.querySelector("[data-add-line]").onclick = () => { lines.push(emptyLine()); renderLines(); };

    // Fix 3: Switch ЕИК ↔ ЕГН when физическо лице is checked
    modal.querySelector('[data-f="client_is_individual"]').addEventListener("change", (e) => {
      const eikLabel = modal.querySelector("[data-eik-label]");
      if (eikLabel) eikLabel.textContent = e.target.checked ? "ЕГН:" : "ЕИК/Булстат:";
    });

    // Fix 9: Due date checkbox — show/hide due date field, auto-fill with issue date
    modal.querySelector('[data-f="show_due_date"]').addEventListener("change", (e) => {
      const dueDateField = modal.querySelector("[data-due-date-field]");
      const dueDateInput = modal.querySelector('[data-f="due_date"]');
      if (e.target.checked) {
        dueDateField.style.display = "block";
        if (!dueDateInput.value) dueDateInput.value = modal.querySelector('[data-f="issue_date"]').value;
      } else {
        dueDateField.style.display = "none";
      }
    });

    // Fix 1+6: VAT checkbox — show reason dropdown, set all VAT% to 0, re-render
    const noVatCheckbox = modal.querySelector('[data-f="no_vat"]');
    const noVatReasonDiv = modal.querySelector("[data-no-vat-reason]");
    const noVatReasonSelect = modal.querySelector('[data-f="no_vat_reason"]');
    const noVatReasonCustom = modal.querySelector('[data-f="no_vat_reason_custom"]');
    noVatCheckbox.addEventListener("change", () => {
      const checked = noVatCheckbox.checked;
      noVatReasonDiv.style.display = checked ? "block" : "none";
      if (checked) {
        // Fix 6: Set all line VAT% to 0
        lines.forEach(l => { l.vat_rate = "0.00"; });
        renderLines();
      } else {
        // Restore default VAT (20%)
        lines.forEach(l => { l.vat_rate = "20.00"; });
        renderLines();
      }
      renderTotals();
    });
    // Show/hide custom reason input
    if (noVatReasonSelect) {
      noVatReasonSelect.addEventListener("change", () => {
        noVatReasonCustom.style.display = noVatReasonSelect.value === "other" ? "block" : "none";
      });
    }

    // Stub select — when user selects a stub, update invoice number
    const stubSelect = modal.querySelector('[data-f="stub_id"]');
    if (stubSelect) {
      stubSelect.addEventListener("change", async () => {
        const stubId = stubSelect.value;
        if (!stubId) return;
        const selectedStub = stubs.find(s => s.id === stubId);
        if (selectedStub) {
          const numInput = modal.querySelector('[data-f="invoice_number"]');
          if (numInput) numInput.value = String(selectedStub.next_number).padStart(10, "0");
        }
      });
    }

    // Stub link button — opens stub management popup
    const stubLinkBtn = modal.querySelector("[data-stub-link]");
    if (stubLinkBtn) {
      stubLinkBtn.onclick = () => openStubManagementPopup(companyId, profileId, async () => {
        // After stub management closes, reload stubs and refresh dropdown
        try {
          const freshStubs = await api("GET", `/stubs?company_id=${companyId}&profile_id=${profileId}`);
          stubs.length = 0;
          freshStubs.forEach(s => stubs.push(s));
          stubSelect.innerHTML = '<option value="">— няма кочан —</option>';
          stubs.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = `${s.name} (${String(s.start_number).padStart(10,"0")} — ${String(s.end_number).padStart(10,"0")})`;
            stubSelect.appendChild(opt);
          });
        } catch (e) { console.warn("Failed to reload stubs:", e); }
      });
    }

    // Discount inputs
    modal.querySelector('[data-f="discount"]').addEventListener("input", () => renderTotals());
    modal.querySelector('[data-f="discount_type"]').addEventListener("change", () => renderTotals());

    // Save handlers
    async function saveInvoice(status) {
      if (!selectedClient) { toast("Моля, изберете клиент", "error"); return; }
      const filledLines = lines.filter(l => l.description.trim());
      if (filledLines.length === 0) { toast("Добавете поне един ред", "error"); return; }

      const invNumber = modal.querySelector('[data-f="invoice_number"]').value;
      const issueDate = modal.querySelector('[data-f="issue_date"]').value;
      const taxEventDate = modal.querySelector('[data-f="tax_event_date"]').value;
      const showDueDate = modal.querySelector('[data-f="show_due_date"]').checked;
      const dueDate = showDueDate ? modal.querySelector('[data-f="due_date"]').value : null;
      const paymentMethod = modal.querySelector('[data-f="payment_method"]').value;
      const noVatChecked = modal.querySelector('[data-f="no_vat"]').checked;
      const discountVal = parseFloat(modal.querySelector('[data-f="discount"]').value) || 0;
      const discountType = modal.querySelector('[data-f="discount_type"]').value;
      const notes = modal.querySelector('[data-f="notes"]').value;
      const internalNotes = modal.querySelector('[data-f="internal_notes"]').value;
      // Get no_vat_reason
      let noVatReason = "";
      if (noVatChecked) {
        const reasonSel = modal.querySelector('[data-f="no_vat_reason"]');
        noVatReason = reasonSel.value === "other" ? (modal.querySelector('[data-f="no_vat_reason_custom"]').value || "") : (reasonSel.value || "");
      }

      // Use the dominant VAT rate from lines for the overall invoice vat_rate field
      const lineVatRates = filledLines.map(l => vatRate(l.vat_rate));
      const dominantVatRate = lineVatRates.length > 0 ? lineVatRates[0] : 20;

      // Sync settings
      const syncMode = modal.querySelector('[name="inv_sync"]:checked')?.value || "manual";
      const delayMinutes = parseInt(modal.querySelector('[data-f="delay_minutes"]').value) || 30;

      // Save sync settings
      try {
        await api("PUT", `/sync-settings/${companyId}?profile_id=${profileId}`, { sync_mode: syncMode, delay_minutes: delayMinutes });
      } catch (e) { console.warn("Could not save sync settings:", e); }

      const payload = {
        company_id: companyId,
        profile_id: profileId,
        client_id: selectedClient.id,
        document_type: docType,
        invoice_number: invNumber ? parseInt(invNumber) : null,
        issue_date: issueDate || null,
        tax_event_date: taxEventDate || null,
        due_date: dueDate || null,
        vat_rate: dominantVatRate,
        no_vat: noVatChecked,
        no_vat_reason: noVatReason || null,
        discount: discountVal,
        discount_type: discountType,
        payment_method: paymentMethod || null,
        notes: notes || null,
        internal_notes: internalNotes || null,
        currency: "EUR",
        status: status,
        lines: filledLines.map((l, i) => ({
          item_id: l.item_id,
          position: i,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit: l.unit,
          unit_price: parseFloat(l.unit_price) || 0,
          vat_rate: vatRate(l.vat_rate),
        })),
      };

      try {
        const result = await api("POST", "/invoices", payload);
        toast(`Фактура ${result.invoice_number} е ${status === "issued" ? "издадена" : "запазена"}`);
        closeModal(overlay);
        setTimeout(() => window.location.reload(), 500);
      } catch (e) { toast("Грешка: " + e.message, "error"); }
    }

    modal.querySelector("[data-save-draft]").onclick = () => saveInvoice("draft");
    modal.querySelector("[data-save-issue]").onclick = () => saveInvoice("issued");

    renderLines();
    init();
  }

  // ── Settings Popup (bank account + stubs) ────────────────────────────────
  function openSettingsPopup(companyId, profileId) {
    const modal = el("div", { className: "inv-modal", style: "width:600px" });
    modal.innerHTML = `
      <div class="inv-modal-header">
        <h2>${ICONS.settings} Настройки</h2>
        <button class="inv-modal-close" data-close>${ICONS.x}</button>
      </div>
      <div class="inv-modal-body">
        <h3 style="font-size:14px;font-weight:600;color:#334155;margin-bottom:10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">Банкови данни</h3>
        <div class="inv-field"><label>IBAN (Банкова сметка)</label><input class="inv-input" data-f="iban" placeholder="BG00XXXX00000000000000"></div>
        <div class="inv-field"><label>Име на банката</label><input class="inv-input" data-f="bank_name" placeholder="Банка ООД"></div>
        <div class="inv-field"><label>BIC код</label><input class="inv-input" data-f="bic" placeholder="XXXXBGSF"></div>
        <h3 style="font-size:14px;font-weight:600;color:#334155;margin:16px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">ДДС по подразбиране</h3>
        <div class="inv-field"><label>ДДС ставка по подразбиране (%)</label><select class="inv-input" data-f="default_vat_rate" style="height:34px"><option value="20">20%</option><option value="9">9%</option><option value="0">0%</option></select></div>
        <div style="margin-top:16px;margin-bottom:12px;border-top:1px solid #e2e8f0;padding-top:12px">
          <h3 style="font-size:14px;font-weight:600;color:#334155;margin-bottom:8px">Кочани (серии номера)</h3>
          <p style="font-size:12px;color:#64748b;margin-bottom:8px">Управлявайте кочаните за фактури с 10-цифрени номера.</p>
          <button class="inv-btn inv-btn-primary" data-manage-stubs style="font-size:13px;padding:6px 16px">📋 Управление на кочани</button>
        </div>
        <div class="inv-actions" style="margin-top:12px">
          <button class="inv-btn" data-cancel>Отказ</button>
          <button class="inv-btn inv-btn-primary" data-save>Запази</button>
        </div>
      </div>`;

    const overlay = createOverlay(modal);
    modal.querySelector("[data-close]").onclick = () => closeModal(overlay);
    modal.querySelector("[data-cancel]").onclick = () => closeModal(overlay);

    // Manage stubs button
    modal.querySelector("[data-manage-stubs]").onclick = () => {
      openStubManagementPopup(companyId, profileId);
    };

    // Load current settings
    (async () => {
      try {
        const settings = await api("GET", `/company-settings/${companyId}`);
        if (settings.iban) modal.querySelector('[data-f="iban"]').value = settings.iban;
        if (settings.bank_name) modal.querySelector('[data-f="bank_name"]').value = settings.bank_name;
        if (settings.bic) modal.querySelector('[data-f="bic"]').value = settings.bic;
        if (settings.default_vat_rate != null) modal.querySelector('[data-f="default_vat_rate"]').value = String(Math.round(Number(settings.default_vat_rate)));
      } catch (e) { /* ignore */ }
    })();

    modal.querySelector("[data-save]").onclick = async () => {
      const iban = modal.querySelector('[data-f="iban"]').value;
      const bankName = modal.querySelector('[data-f="bank_name"]').value;
      const bic = modal.querySelector('[data-f="bic"]').value;
      const defaultVatRateVal = parseFloat(modal.querySelector('[data-f="default_vat_rate"]').value) || 20;
      try {
        await api("PUT", `/company-settings/${companyId}?profile_id=${profileId}`, { iban, bank_name: bankName, bic, default_vat_rate: defaultVatRateVal });
        toast("Настройките са запазени");
        closeModal(overlay);
      } catch (e) { toast("Грешка: " + e.message, "error"); }
    };
  }

  // ── Stub Management Popup (кочани) ──────────────────────────────────────
  function openStubManagementPopup(companyId, profileId, onClose) {
    const modal = el("div", { className: "inv-modal", style: "width:650px;max-height:85vh" });
    modal.innerHTML = `
      <div class="inv-modal-header">
        <h2>📋 Управление на кочани</h2>
        <button class="inv-modal-close" data-close>${ICONS.x}</button>
      </div>
      <div class="inv-modal-body" style="max-height:65vh;overflow-y:auto">
        <p style="font-size:13px;color:#475569;margin-bottom:12px">Кочаните определят диапазона от номера за фактури. Всеки кочан съдържа 10-цифрени номера.</p>
        <div data-stubs-list style="margin-bottom:16px"></div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc">
          <h3 style="font-size:14px;font-weight:600;color:#334155;margin-bottom:10px">Нов кочан</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
            <div class="inv-field"><label style="font-size:12px;font-weight:600;color:#475569">Име на кочана</label><input class="inv-input" data-new-stub-name placeholder="напр. Основен кочан" style="height:32px;font-size:13px"></div>
            <div class="inv-field"><label style="font-size:12px;font-weight:600;color:#475569">Начален номер</label><input class="inv-input" data-new-stub-start type="number" min="1" max="9999999999" value="1" style="height:32px;font-size:13px;font-family:monospace"></div>
            <div class="inv-field"><label style="font-size:12px;font-weight:600;color:#475569">Краен номер</label><input class="inv-input" data-new-stub-end type="number" min="1" max="9999999999" value="5000000000" style="height:32px;font-size:13px;font-family:monospace"></div>
          </div>
          <button class="inv-btn inv-btn-primary" data-create-stub style="font-size:13px;padding:6px 20px">+ Създай кочан</button>
        </div>
      </div>`;

    const overlay = createOverlay(modal);
    modal.querySelector("[data-close]").onclick = () => { closeModal(overlay); if (onClose) onClose(); };

    const stubsList = modal.querySelector("[data-stubs-list]");

    async function loadAndRenderStubs() {
      try {
        const stubsData = await api("GET", `/stubs?company_id=${companyId}&profile_id=${profileId}`);
        stubsList.innerHTML = "";
        if (stubsData.length === 0) {
          stubsList.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:13px">Няма създадени кочани</div>';
          return;
        }
        stubsData.forEach(s => {
          const row = el("div", { style: "display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:6px;background:#fff" });
          row.innerHTML = `
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px;color:#334155">${esc(s.name)}</div>
              <div style="font-size:12px;color:#64748b;font-family:monospace">${String(s.start_number).padStart(10,"0")} — ${String(s.end_number).padStart(10,"0")}</div>
              <div style="font-size:11px;color:#94a3b8">Следващ №: <span style="font-weight:600;color:#2563eb">${String(s.next_number).padStart(10,"0")}</span></div>
            </div>
            <button class="inv-btn" style="color:#ef4444;border-color:#fecaca;font-size:12px;padding:4px 10px" data-delete-stub="${s.id}">Изтрий</button>`;
          stubsList.appendChild(row);
        });
        // Bind delete buttons
        stubsList.querySelectorAll("[data-delete-stub]").forEach(btn => {
          btn.onclick = async () => {
            if (!confirm("Сигурни ли сте, че искате да изтриете този кочан?")) return;
            try {
              await api("DELETE", `/stubs/${btn.dataset.deleteStub}`);
              toast("Кочанът е изтрит");
              loadAndRenderStubs();
            } catch (e) { toast("Грешка: " + e.message, "error"); }
          };
        });
      } catch (e) {
        stubsList.innerHTML = '<div style="color:#ef4444;padding:10px;font-size:13px">Грешка при зареждане на кочаните</div>';
      }
    }

    loadAndRenderStubs();

    // Create new stub
    modal.querySelector("[data-create-stub]").onclick = async () => {
      const name = modal.querySelector("[data-new-stub-name]").value.trim();
      const startNum = parseInt(modal.querySelector("[data-new-stub-start]").value) || 1;
      const endNum = parseInt(modal.querySelector("[data-new-stub-end]").value) || 5000000000;
      if (!name) { toast("Въведете име на кочана", "error"); return; }
      if (startNum >= endNum) { toast("Началният номер трябва да е по-малък от крайния", "error"); return; }
      if (String(startNum).length > 10 || String(endNum).length > 10) { toast("Номерата трябва да са точно 10 цифри", "error"); return; }
      if (startNum < 1 || endNum > 9999999999) { toast("Номерата трябва да са между 0000000001 и 9999999999", "error"); return; }
      try {
        await api("POST", "/stubs", { company_id: companyId, profile_id: profileId, name, start_number: startNum, end_number: endNum });
        toast("Кочанът е създаден");
        modal.querySelector("[data-new-stub-name]").value = "";
        modal.querySelector("[data-new-stub-start]").value = "1";
        modal.querySelector("[data-new-stub-end]").value = "5000000000";
        loadAndRenderStubs();
      } catch (e) { toast("Грешка: " + e.message, "error"); }
    };
  }

  // ── Sync Invoices ─────────────────────────────────────────────────────
  async function syncInvoices(companyId, profileId) {
    try {
      const invoices = await api("GET", `/invoices?company_id=${companyId}&profile_id=${profileId}`);
      const unsynced = invoices.filter(inv => inv.sync_status !== "synced" && inv.sync_status !== "accepted" && inv.invoice_status === "processed");
      if (unsynced.length === 0) {
        toast("Няма неизпратени фактури");
        return;
      }
      toast(`Синхронизиране на ${unsynced.length} фактури...`);
      // For now, mark them as synced (actual sync logic would send to counterparty)
      // This is a placeholder - real implementation would use the sync settings
      toast(`${unsynced.length} фактури са маркирани за синхронизация`);
    } catch (e) {
      toast("Грешка при синхронизация: " + e.message, "error");
    }
  }

  // ── Lightning bolt icons ────────────────────────────────────────────────
  function createBoltIcon(count, color) {
    const boltSvg = '<svg viewBox="0 0 24 24"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>';
    const wrapper = el("span", { className: `inv-bolt inv-bolt-${color}` });
    for (let i = 0; i < count; i++) {
      const s = el("span", { innerHTML: boltSvg });
      wrapper.appendChild(s);
    }
    return wrapper;
  }

  // ── Escape HTML ─────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ── Permission check ───────────────────────────────────────────────────
  function canAccessInvoicing(companyId, profileId) {
    // Owner always has access
    if (_currentProfile === profileId) return true;
    // Check if shared with can_upload permission
    if (_shareData) {
      return _shareData.some(s =>
        s.company_id === companyId && s.can_upload === true
      );
    }
    return false;
  }

  // ── Main: inject buttons into company rows ─────────────────────────────
  let _injected = false;
  let _observer = null;

  function injectButtons() {
    // Find company name elements in the folder structure
    // The megabanx frontend renders companies with their names in specific DOM elements
    // We look for the company header rows and add buttons after the company name

    const companyHeaders = document.querySelectorAll('[data-company-id]');
    if (companyHeaders.length > 0) {
      companyHeaders.forEach(header => {
        if (header.querySelector(".inv-btn-group")) return; // already injected
        const companyId = header.dataset.companyId;
        const profileId = header.dataset.profileId || _currentProfile;
        const companyName = header.dataset.companyName || header.textContent.trim();

        if (!canAccessInvoicing(companyId, profileId)) return;

        const group = el("div", { className: "inv-btn-group" });
        group.appendChild(el("button", {
          className: "inv-btn inv-btn-primary",
          innerHTML: ICONS.filetext + " Нова фактура",
          onClick: (e) => { e.stopPropagation(); openNewInvoicePopup(companyId, profileId, companyName); }
        }));
        group.appendChild(el("button", {
          className: "inv-btn inv-btn-amber",
          innerHTML: ICONS.users + " Клиенти",
          onClick: (e) => { e.stopPropagation(); openClientsPopup(companyId, profileId); }
        }));
        group.appendChild(el("button", {
          className: "inv-btn inv-btn-emerald",
          innerHTML: ICONS.package + " Артикули",
          onClick: (e) => { e.stopPropagation(); openItemsPopup(companyId, profileId); }
        }));
        group.appendChild(el("button", {
          className: "inv-btn inv-btn-outline",
          innerHTML: ICONS.sync + " Синхронизирай",
          onClick: (e) => { e.stopPropagation(); syncInvoices(companyId, profileId); }
        }));
        group.appendChild(el("button", {
          className: "inv-btn inv-btn-outline",
          innerHTML: ICONS.settings + " Настройки",
          onClick: (e) => { e.stopPropagation(); openSettingsPopup(companyId, profileId); }
        }));
        header.appendChild(group);
      });
      _injected = true;
      return;
    }

    // Fallback: look for company rows by structure (div with company name text)
    // The frontend uses a folder-structure view where each company has a collapsible section
    // We need to find these sections and add buttons to them
    // This approach looks for elements that contain company names based on the folder-structure API response

    // Try to find company sections by class patterns used in the minified React bundle
    const allDivs = document.querySelectorAll("div");
    allDivs.forEach(div => {
      // Skip if already processed
      if (div.dataset.invProcessed) return;

      // Look for the company name pattern: a div that has exactly one text child
      // followed by folder sections for "Фактури покупки" and "Фактури продажби"
      const text = div.textContent?.trim();
      if (!text) return;

      // Check if this div's next siblings contain "Фактури покупки" or "Фактури продажби"
      const parent = div.parentElement;
      if (!parent) return;

      const parentText = parent.textContent || "";
      if (!parentText.includes("Фактури покупки") && !parentText.includes("Фактури продажби")) return;

      // Check if this specific div is the company name header
      // It should be a direct child and its text should match a company name
      // and it should not contain "Фактури" in its own text
      if (text.includes("Фактури") || text.includes("ДАТА") || text.includes("СТАТУС")) return;
      if (div.querySelector(".inv-btn-group")) return;

      // This looks like a company header - try to extract company info
      // We'll need to find the company ID from the global state
      div.dataset.invProcessed = "1";
    });
  }

  // ── Lightning bolt injection for software invoices ─────────────────────
  function injectLightningBolts() {
    // Find invoice rows that have source="software"
    // These are identified by having a specific data attribute or class
    // Since we can't easily detect this from the DOM, we'll use a different approach:
    // After loading the page, we'll check the invoices API for software-issued invoices
    // and add the bolt icon to matching rows

    // This will be done via a MutationObserver watching for new invoice rows
  }

  // ── Discover profile_id from existing network requests ─────────────────
  function discoverProfileId() {
    // Try to find profile_id from Performance API entries (already-completed fetches)
    try {
      const entries = performance.getEntriesByType("resource");
      for (const entry of entries) {
        const m = entry.name.match(/\/api\/profiles\/([0-9a-f-]{36})\//i);
        if (m) return m[1];
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // ── Directly fetch folder structure + companies data ────────────────────
  async function loadCompaniesData(profileId) {
    try {
      const resp = await fetch(`/api/profiles/${profileId}/folder-structure`);
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.folders || data;
    } catch (e) {
      console.warn("[INV] Failed to load folder-structure:", e);
      return null;
    }
  }

  async function loadSharesForCompany(profileId, companyId) {
    try {
      const resp = await fetch(`/api/profiles/${profileId}/companies/${companyId}/shares`);
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  // ── Patch fetch for future SPA navigations ──────────────────────────────
  function patchFolderStructure() {
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
      const resp = await origFetch.apply(this, args);
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      if (url.includes("/api/profiles/") && url.includes("/folder-structure")) {
        try {
          const clone = resp.clone();
          const data = await clone.json();
          if (data.folders) {
            window.__invFolderData = data.folders;
            const match = url.match(/\/api\/profiles\/([^/]+)\//);
            if (match) {
              _currentProfile = match[1];
              window.__invProfileId = match[1];
            }
            // Re-inject buttons on SPA navigation
            setTimeout(() => tryInjectButtons(), 500);
          }
        } catch (e) { /* ignore */ }
      }

      if (url.includes("/api/") && url.includes("/shares")) {
        try {
          const clone = resp.clone();
          const shares = await clone.json();
          if (Array.isArray(shares)) {
            if (!_shareData) _shareData = [];
            shares.forEach(s => {
              if (!_shareData.find(x => x.id === s.id)) _shareData.push(s);
            });
          }
        } catch (e) { /* ignore */ }
      }

      return resp;
    };
  }

  // ── Button injection into company rows ──────────────────────────────────
  function tryInjectButtons() {
    const folders = window.__invFolderData;
    const profileId = window.__invProfileId;
    if (!folders || !profileId) return;

    folders.forEach(folder => {
      const company = folder.company;
      if (!company) return;

      const companyName = company.name;
      const companyId = company.id;

      // Search for text nodes matching the company name
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const txt = node.textContent.trim();
        // Match exact company name or name with quotes (as displayed in UI)
        if (txt !== companyName && txt !== `"${companyName}"` && !txt.startsWith(companyName)) continue;
        // Avoid matching inside our own UI
        if (node.parentElement?.closest(".inv-overlay, .inv-modal, .inv-btn-group")) continue;

        const parentEl = node.parentElement;
        if (!parentEl || parentEl.querySelector(".inv-btn-group")) continue;
        if (parentEl.dataset.invDone) continue;

        // Verify this is in the invoices/folder-structure section
        // Walk up to find a container that has invoice content nearby
        let container = parentEl;
        for (let i = 0; i < 5; i++) {
          if (!container.parentElement) break;
          container = container.parentElement;
          const ct = container.textContent || "";
          if (ct.includes("покупки") || ct.includes("продажби") || ct.includes("Структура на фактурите")) {
            // Found the invoices section - inject buttons
            parentEl.dataset.invDone = "1";
            parentEl.style.display = "inline-flex";
            parentEl.style.alignItems = "center";
            parentEl.style.gap = "8px";
            parentEl.style.flexWrap = "wrap";

            const group = el("div", { className: "inv-btn-group" });
            group.appendChild(el("button", {
              className: "inv-btn inv-btn-primary",
              innerHTML: ICONS.filetext + " Нова фактура",
              onClick: (e) => { e.stopPropagation(); openNewInvoicePopup(companyId, profileId, companyName); }
            }));
            group.appendChild(el("button", {
              className: "inv-btn inv-btn-amber",
              innerHTML: ICONS.users + " Клиенти",
              onClick: (e) => { e.stopPropagation(); openClientsPopup(companyId, profileId); }
            }));
            group.appendChild(el("button", {
              className: "inv-btn inv-btn-emerald",
              innerHTML: ICONS.package + " Артикули",
              onClick: (e) => { e.stopPropagation(); openItemsPopup(companyId, profileId); }
            }));
            group.appendChild(el("button", {
              className: "inv-btn inv-btn-outline",
              innerHTML: ICONS.sync + " Синхронизирай",
              onClick: (e) => { e.stopPropagation(); syncInvoices(companyId, profileId); }
            }));
            group.appendChild(el("button", {
              className: "inv-btn inv-btn-outline",
              innerHTML: ICONS.settings + " Настройки",
              onClick: (e) => { e.stopPropagation(); openSettingsPopup(companyId, profileId); }
            }));
            parentEl.appendChild(group);
            console.log(`[INV] Buttons injected for: ${companyName}`);

            // Inject lightning bolts for software invoices
            injectBoltsForCompany(companyId, profileId, container);
            break;
          }
        }
        break;
      }
    });
  }

  async function injectBoltsForCompany(companyId, profileId, containerEl) {
    try {
      const invoices = await api("GET", `/invoices?company_id=${companyId}&profile_id=${profileId}`).catch(() => []);
      if (!invoices || invoices.length === 0) return;

      for (const inv of invoices) {
        // Find the invoice row in the DOM by matching the filename from the joined invoices table
        const fname = inv.new_filename || inv.original_filename || "";
        if (!fname) continue;

        // Look for the filename text in the container
        const allText = containerEl.querySelectorAll("span, div, p");
        for (const textEl of allText) {
          const trimmed = textEl.textContent.trim();
          if (trimmed === fname || trimmed.includes(fname.replace(".pdf", ""))) {
            if (textEl.querySelector(".inv-bolt")) continue;
            // Determine bolt state:
            // 1 gray bolt = counterparty not in megabanx system
            // 2 gray bolts = counterparty exists in megabanx
            // 2 blue bolts = invoice accepted by counterparty
            let boltCount = 1;
            let boltColor = "gray";
            if (inv.client_eik) {
              try {
                const check = await api("GET", `/check-counterparty/${inv.client_eik}`).catch(() => null);
                if (check && check.exists) {
                  boltCount = 2;
                  // Check sync_status for acceptance
                  boltColor = (inv.sync_status === "accepted") ? "blue" : "gray";
                }
              } catch (e) { /* ignore */ }
            }
            const bolt = createBoltIcon(boltCount, boltColor);
            textEl.prepend(bolt);
            break;
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  // ── DOM Observer for SPA changes ───────────────────────────────────────
  function startDOMObserver() {
    let debounceTimer = null;
    _observer = new MutationObserver(() => {
      if (!window.__invFolderData || !window.__invProfileId) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => tryInjectButtons(), 300);
    });
    _observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Init ────────────────────────────────────────────────────────────────
  async function init() {
    // Inject styles
    const style = el("style", { innerHTML: STYLES });
    document.head.appendChild(style);

    // Patch fetch for future SPA navigations
    patchFolderStructure();

    // Start observing DOM for changes
    startDOMObserver();

    console.log("[INV] Invoicing module loaded");

    // Directly discover profile and load data (don't rely on fetch interception)
    const tryBootstrap = async () => {
      const profileId = discoverProfileId();
      if (!profileId) {
        console.log("[INV] Profile not found yet, retrying...");
        return false;
      }
      _currentProfile = profileId;
      window.__invProfileId = profileId;
      console.log(`[INV] Discovered profile: ${profileId}`);

      const folders = await loadCompaniesData(profileId);
      if (!folders || folders.length === 0) {
        console.log("[INV] No folders found");
        return false;
      }
      window.__invFolderData = folders;
      console.log(`[INV] Loaded ${folders.length} company folders`);

      // Load shares for each company
      for (const folder of folders) {
        if (folder.company) {
          const shares = await loadSharesForCompany(profileId, folder.company.id);
          if (shares && shares.length > 0) {
            if (!_shareData) _shareData = [];
            _shareData = _shareData.concat(shares);
          }
        }
      }

      // Inject buttons
      tryInjectButtons();
      return true;
    };

    // Try immediately, then retry a few times with delay
    if (!(await tryBootstrap())) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        if (await tryBootstrap()) break;
      }
    }
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
