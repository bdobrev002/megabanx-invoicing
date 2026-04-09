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
  .inv-modal-lg { width: 900px; max-width: 95vw; }
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
  .inv-table .inv-td-actions { width: 70px; text-align: right; }
  .inv-table .inv-icon-btn {
    width: 28px; height: 28px; border: none; background: transparent;
    cursor: pointer; border-radius: 4px; display: inline-flex;
    align-items: center; justify-content: center; color: #94a3b8;
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

  function createOverlay(modal) {
    const overlay = el("div", { className: "inv-overlay", onClick: (e) => { if (e.target === overlay) closeModal(overlay); } }, modal);
    document.body.appendChild(overlay);
    return overlay;
  }

  // ── Clients Popup ───────────────────────────────────────────────────────
  function openClientsPopup(companyId, profileId) {
    let clients = [];
    let searchTerm = "";
    let overlay = null;

    const modal = el("div", { className: "inv-modal inv-modal-lg" });

    async function loadClients() {
      try {
        const params = new URLSearchParams({ company_id: companyId, profile_id: profileId });
        if (searchTerm) params.set("search", searchTerm);
        clients = await api("GET", `/clients?${params}`);
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
          <td class="inv-td-actions"></td>`;
        const actions = tr.querySelector(".inv-td-actions");
        const editBtn = el("button", { className: "inv-icon-btn", innerHTML: ICONS.pencil, title: "Редактирай", onClick: () => openClientForm(c) });
        const delBtn = el("button", { className: "inv-icon-btn inv-danger", innerHTML: ICONS.trash, title: "Изтрий", onClick: () => deleteClient(c.id) });
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
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
    modal.innerHTML = `<div class="inv-modal-header"><h2>${ICONS.users} Клиенти</h2><button class="inv-modal-close" data-close>${ICONS.x}</button></div><div class="inv-modal-body"></div>`;

    // Add "Нов клиент" button in header
    const header = modal.querySelector(".inv-modal-header");
    const newBtn = el("button", { className: "inv-btn inv-btn-primary", innerHTML: ICONS.plus + " Нов клиент", onClick: () => openClientForm(null) });
    header.insertBefore(newBtn, header.querySelector("[data-close]"));

    overlay = createOverlay(modal);
    modal.querySelector("[data-close]").onclick = () => closeModal(overlay);
    loadClients();
  }

  // ── Items Popup ─────────────────────────────────────────────────────────
  function openItemsPopup(companyId, profileId) {
    let items = [];
    let searchTerm = "";
    let overlay = null;

    const modal = el("div", { className: "inv-modal inv-modal-lg" });

    async function loadItems() {
      try {
        const params = new URLSearchParams({ company_id: companyId, profile_id: profileId });
        if (searchTerm) params.set("search", searchTerm);
        items = await api("GET", `/items?${params}`);
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
          <td class="inv-td-actions"></td>`;
        const actions = tr.querySelector(".inv-td-actions");
        actions.appendChild(el("button", { className: "inv-icon-btn", innerHTML: ICONS.pencil, title: "Редактирай", onClick: () => openItemForm(item) }));
        actions.appendChild(el("button", { className: "inv-icon-btn inv-danger", innerHTML: ICONS.trash, title: "Изтрий", onClick: () => deleteItem(item.id) }));
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

    modal.innerHTML = `<div class="inv-modal-header"><h2>${ICONS.package} Артикули</h2><button class="inv-modal-close" data-close>${ICONS.x}</button></div><div class="inv-modal-body"></div>`;
    const header = modal.querySelector(".inv-modal-header");
    header.insertBefore(el("button", { className: "inv-btn inv-btn-emerald", innerHTML: ICONS.plus + " Нов артикул", onClick: () => openItemForm(null) }), header.querySelector("[data-close]"));

    overlay = createOverlay(modal);
    modal.querySelector("[data-close]").onclick = () => closeModal(overlay);
    loadItems();
  }

  // ── New Invoice Popup ───────────────────────────────────────────────────
  function openNewInvoicePopup(companyId, profileId, companyName) {
    let clients = [];
    let items = [];
    let selectedClient = null;
    let lines = [emptyLine(), emptyLine(), emptyLine()];
    let docType = "invoice";
    let vatRate = 20;
    let noVat = false;
    let overlay = null;

    function emptyLine() {
      return { item_id: null, description: "", quantity: "1.00", unit: "бр.", unit_price: "0.00", vat_rate: "20.00" };
    }

    async function init() {
      try {
        const cParams = new URLSearchParams({ company_id: companyId, profile_id: profileId });
        const [c, it, nn] = await Promise.all([
          api("GET", `/clients?${cParams}`),
          api("GET", `/items?${cParams}`),
          api("GET", `/next-number?company_id=${companyId}&profile_id=${profileId}&document_type=${docType}`),
        ]);
        clients = c;
        items = it;
        const numInput = modal.querySelector('[data-f="invoice_number"]');
        if (numInput) numInput.value = String(nn.next_number).padStart(10, "0");
      } catch (e) { console.error("Init error:", e); }
    }

    const modal = el("div", { className: "inv-modal inv-modal-lg" });
    const today = new Date().toISOString().split("T")[0];

    modal.innerHTML = `
      <div class="inv-modal-header">
        <h2>${ICONS.filetext} Нова фактура</h2>
        <button class="inv-modal-close" data-close>${ICONS.x}</button>
      </div>
      <div class="inv-modal-body">
        <!-- Document Type -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="font-size:13px;font-weight:600;color:#475569">Тип:</span>
          <label class="inv-radio" style="flex-direction:row"><input type="radio" name="inv_doctype" value="invoice" checked> Фактура</label>
          <label class="inv-radio" style="flex-direction:row"><input type="radio" name="inv_doctype" value="proforma"> Проформа</label>
          <label class="inv-radio" style="flex-direction:row"><input type="radio" name="inv_doctype" value="debit_note"> Дебитно известие</label>
          <label class="inv-radio" style="flex-direction:row"><input type="radio" name="inv_doctype" value="credit_note"> Кредитно известие</label>
        </div>

        <!-- Two columns: Client + Details -->
        <div class="inv-row" style="gap:24px;margin-bottom:16px">
          <!-- Client -->
          <div style="flex:1">
            <div class="inv-field">
              <label>Клиент</label>
              <div style="display:flex;gap:4px">
                <input class="inv-input" data-client-search placeholder="Търсене по име или ЕИК..." style="flex:1">
                <button class="inv-tr-btn" data-tr-invoice title="Търсене в ТР">ТР</button>
              </div>
              <div data-client-dropdown style="position:relative"></div>
            </div>
            <div data-client-info style="font-size:12px;color:#64748b;padding:4px 0"></div>
          </div>
          <!-- Details -->
          <div style="flex:1">
            <div class="inv-row">
              <div class="inv-field"><label>Номер</label><input class="inv-input" data-f="invoice_number" value="0000000001" style="font-family:monospace"></div>
              <div class="inv-field"><label>Дата на издаване</label><input class="inv-input" data-f="issue_date" type="date" value="${today}"></div>
            </div>
            <div class="inv-row">
              <div class="inv-field"><label>Дата на данъчно събитие</label><input class="inv-input" data-f="tax_event_date" type="date" value="${today}"></div>
              <div class="inv-field"><label>Крайна дата за плащане</label><input class="inv-input" data-f="due_date" type="date" value=""></div>
            </div>
            <div class="inv-field"><label>Начин на плащане</label><input class="inv-input" data-f="payment_method" value="В брой" placeholder="В брой / По банков път"></div>
          </div>
        </div>

        <!-- VAT options -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <label class="inv-checkbox"><input type="checkbox" data-f="no_vat"> Без ДДС</label>
          <div class="inv-field" style="margin-bottom:0;width:80px"><label>ДДС %</label><input class="inv-input" data-f="vat_rate" type="number" value="20" style="text-align:right"></div>
        </div>

        <!-- Line items table (narrower for popup) -->
        <table class="inv-line-table">
          <thead><tr>
            <th style="width:30px">#</th>
            <th class="inv-line-desc">Описание</th>
            <th class="inv-line-num">Кол.</th>
            <th class="inv-line-unit">Мярка</th>
            <th class="inv-line-num">Ед. цена</th>
            <th class="inv-line-num">ДДС %</th>
            <th class="inv-line-num">Сума</th>
            <th style="width:30px"></th>
          </tr></thead>
          <tbody data-lines></tbody>
        </table>
        <button class="inv-btn" data-add-line style="margin-top:6px">${ICONS.plus} Добави ред</button>

        <!-- Totals -->
        <div class="inv-totals" data-totals></div>

        <!-- Notes -->
        <div class="inv-row" style="margin-top:12px">
          <div class="inv-field"><label>Бележки (видими на фактурата)</label><textarea class="inv-textarea" data-f="notes" rows="2" placeholder="Бележки..."></textarea></div>
          <div class="inv-field"><label>Вътрешни бележки</label><textarea class="inv-textarea" data-f="internal_notes" rows="2" placeholder="Вътрешни бележки..."></textarea></div>
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

        <div class="inv-actions">
          <button class="inv-btn" data-cancel>Отказ</button>
          <button class="inv-btn inv-btn-primary" data-save-draft>Запази като чернова</button>
          <button class="inv-btn inv-btn-primary" data-save-issue style="background:#10b981;border-color:#059669">Издай фактура</button>
        </div>
      </div>`;

    overlay = createOverlay(modal);
    modal.querySelector("[data-close]").onclick = () => closeModal(overlay);
    modal.querySelector("[data-cancel]").onclick = () => closeModal(overlay);

    // Document type change
    modal.querySelectorAll('[name="inv_doctype"]').forEach(r => {
      r.addEventListener("change", () => { docType = r.value; });
    });

    // Client search
    const clientSearchInput = modal.querySelector("[data-client-search]");
    const clientDropdown = modal.querySelector("[data-client-dropdown]");
    const clientInfo = modal.querySelector("[data-client-info]");
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
      clientInfo.innerHTML = `<span style="color:#475569">${esc(c.name)}</span>${c.eik ? ` • ЕИК: ${esc(c.eik)}` : ""}${c.city ? ` • ${esc(c.city)}` : ""}`;
    }

    // TR lookup for invoice
    modal.querySelector("[data-tr-invoice]").onclick = async () => {
      const eik = prompt("Въведете ЕИК за търсене в Търговски регистър:");
      if (!eik || eik.length < 9) return;
      try {
        const data = await api("GET", `/registry/lookup/${eik}`);
        // Check if client already exists
        const existing = clients.find(c => c.eik === eik);
        if (existing) { selectClient(existing); toast("Клиентът вече съществува"); return; }
        // Create new client from TR data
        const result = await api("POST", "/clients", {
          company_id: companyId, profile_id: profileId,
          name: data.name, eik: data.eik, vat_number: data.vat_number,
          is_vat_registered: data.is_vat_registered, mol: data.mol,
          city: data.city, address: data.address, email: data.email, phone: data.phone || "",
        });
        // Reload clients and select
        const cParams = new URLSearchParams({ company_id: companyId, profile_id: profileId });
        clients = await api("GET", `/clients?${cParams}`);
        const newClient = clients.find(c => c.id === result.id);
        if (newClient) selectClient(newClient);
        toast("Клиент добавен от ТР");
      } catch (e) { toast("Грешка: " + e.message, "error"); }
    };

    // Line items
    const linesBody = modal.querySelector("[data-lines]");
    const totalsDiv = modal.querySelector("[data-totals]");

    function renderLines() {
      linesBody.innerHTML = "";
      lines.forEach((line, i) => {
        const tr = el("tr");
        tr.innerHTML = `
          <td style="color:#94a3b8;text-align:center;font-size:11px">${i + 1}</td>
          <td><input class="inv-input inv-line-desc" data-li="${i}" data-lf="description" value="${esc(line.description)}" placeholder="Описание на стоката/услугата"></td>
          <td><input class="inv-input inv-line-num" data-li="${i}" data-lf="quantity" type="number" step="0.01" value="${line.quantity}" style="text-align:right"></td>
          <td><input class="inv-input inv-line-unit" data-li="${i}" data-lf="unit" value="${esc(line.unit)}"></td>
          <td><input class="inv-input inv-line-num" data-li="${i}" data-lf="unit_price" type="number" step="0.01" value="${line.unit_price}" style="text-align:right"></td>
          <td><input class="inv-input inv-line-num" data-li="${i}" data-lf="vat_rate" type="number" step="0.01" value="${line.vat_rate}" style="text-align:right"></td>
          <td style="text-align:right;font-family:monospace;font-size:12px;padding:4px 6px" data-line-total="${i}">${calcLineTotal(line)}</td>
          <td><button class="inv-icon-btn inv-danger" data-remove-line="${i}">${ICONS.x}</button></td>`;
        linesBody.appendChild(tr);
      });

      // Bind events
      linesBody.querySelectorAll("[data-lf]").forEach(inp => {
        inp.addEventListener("input", () => {
          const idx = parseInt(inp.dataset.li);
          lines[idx][inp.dataset.lf] = inp.value;
          // Update line total
          const totalCell = linesBody.querySelector(`[data-line-total="${idx}"]`);
          if (totalCell) totalCell.textContent = calcLineTotal(lines[idx]);
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

    function renderTotals() {
      const noVatChecked = modal.querySelector('[data-f="no_vat"]').checked;
      const vr = parseFloat(modal.querySelector('[data-f="vat_rate"]').value) || 20;

      let subtotal = 0;
      lines.forEach(l => { subtotal += parseFloat(calcLineTotal(l)); });
      const vatAmt = noVatChecked ? 0 : subtotal * (vr / 100);
      const total = subtotal + vatAmt;

      totalsDiv.innerHTML = `
        <div class="inv-total-row"><span class="inv-total-label">Данъчна основа:</span><span class="inv-total-value">${subtotal.toFixed(2)} EUR</span></div>
        ${!noVatChecked ? `<div class="inv-total-row"><span class="inv-total-label">ДДС (${vr}%):</span><span class="inv-total-value">${vatAmt.toFixed(2)} EUR</span></div>` : '<div class="inv-total-row"><span class="inv-total-label" style="color:#ef4444">Без ДДС</span><span class="inv-total-value">0.00 EUR</span></div>'}
        <div class="inv-total-row inv-grand-total"><span class="inv-total-label">Общо:</span><span class="inv-total-value">${total.toFixed(2)} EUR</span></div>`;
    }

    modal.querySelector("[data-add-line]").onclick = () => { lines.push(emptyLine()); renderLines(); };

    // VAT checkbox
    modal.querySelector('[data-f="no_vat"]').addEventListener("change", () => renderTotals());
    modal.querySelector('[data-f="vat_rate"]').addEventListener("input", () => renderTotals());

    // Save handlers
    async function saveInvoice(status) {
      if (!selectedClient) { toast("Моля, изберете клиент", "error"); return; }
      const filledLines = lines.filter(l => l.description.trim());
      if (filledLines.length === 0) { toast("Добавете поне един ред", "error"); return; }

      const invNumber = modal.querySelector('[data-f="invoice_number"]').value;
      const issueDate = modal.querySelector('[data-f="issue_date"]').value;
      const taxEventDate = modal.querySelector('[data-f="tax_event_date"]').value;
      const dueDate = modal.querySelector('[data-f="due_date"]').value;
      const paymentMethod = modal.querySelector('[data-f="payment_method"]').value;
      const noVatChecked = modal.querySelector('[data-f="no_vat"]').checked;
      const vr = parseFloat(modal.querySelector('[data-f="vat_rate"]').value) || 20;
      const notes = modal.querySelector('[data-f="notes"]').value;
      const internalNotes = modal.querySelector('[data-f="internal_notes"]').value;

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
        vat_rate: vr,
        no_vat: noVatChecked,
        payment_method: paymentMethod || null,
        notes: notes || null,
        internal_notes: internalNotes || null,
        currency: "EUR",
        lines: filledLines.map((l, i) => ({
          item_id: l.item_id,
          position: i,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit: l.unit,
          unit_price: parseFloat(l.unit_price) || 0,
          vat_rate: parseFloat(l.vat_rate) || 20,
        })),
      };

      try {
        const result = await api("POST", "/invoices", payload);
        toast(`Фактура ${result.invoice_number} е ${status === "issued" ? "издадена" : "запазена"}`);
        closeModal(overlay);
        // Refresh the page to show the new invoice in the list
        setTimeout(() => window.location.reload(), 500);
      } catch (e) { toast("Грешка: " + e.message, "error"); }
    }

    modal.querySelector("[data-save-draft]").onclick = () => saveInvoice("draft");
    modal.querySelector("[data-save-issue]").onclick = () => saveInvoice("issued");

    renderLines();
    init();
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
          className: "inv-btn",
          innerHTML: ICONS.users + " Клиенти",
          onClick: (e) => { e.stopPropagation(); openClientsPopup(companyId, profileId); }
        }));
        group.appendChild(el("button", {
          className: "inv-btn inv-btn-emerald",
          innerHTML: ICONS.package + " Артикули",
          onClick: (e) => { e.stopPropagation(); openItemsPopup(companyId, profileId); }
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
      return resp.json();
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
              className: "inv-btn",
              innerHTML: ICONS.users + " Клиенти",
              onClick: (e) => { e.stopPropagation(); openClientsPopup(companyId, profileId); }
            }));
            group.appendChild(el("button", {
              className: "inv-btn inv-btn-emerald",
              innerHTML: ICONS.package + " Артикули",
              onClick: (e) => { e.stopPropagation(); openItemsPopup(companyId, profileId); }
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
        // Find the invoice row in the DOM by matching the filename
        const fname = inv.new_filename || inv.original_filename || "";
        if (!fname) continue;

        // Look for the filename text in the container
        const allText = containerEl.querySelectorAll("span, div, p");
        for (const el of allText) {
          if (el.textContent.trim() === fname || el.textContent.trim().includes(fname.replace(".pdf", ""))) {
            if (el.querySelector(".inv-bolt")) continue;
            // Determine bolt state
            let boltCount = 1;
            let boltColor = "gray";
            if (inv.client_eik) {
              try {
                const check = await api("GET", `/check-counterparty/${inv.client_eik}`).catch(() => null);
                if (check && check.exists) {
                  boltCount = 2;
                  boltColor = check.accepted ? "blue" : "gray";
                }
              } catch (e) { /* ignore */ }
            }
            const bolt = createBoltIcon(boltCount, boltColor);
            el.prepend(bolt);
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
