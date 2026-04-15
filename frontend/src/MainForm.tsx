import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Users, Plus, Building2, FileText,
  Search, Loader2, AlertCircle,
  X, Check,
  Banknote, Info, Send,
  Receipt, ExternalLink, RefreshCw, AlertTriangle, Edit3, ArrowUp, ArrowDown,
  Trash2, ChevronDown,
} from 'lucide-react';
import {
  invListClients, invCreateClient, invUpdateClient, invDeleteClient,
  invListItems, invCreateItem, invUpdateItem, invDeleteItem,
  invGetNextNumber, invCreateInvoice, invUpdateInvoice, invGetInvoice, invListInvoices, invGetPdfUrl,
  invRegistryLookup,
  invGetCompanySettings, invUpdateCompanySettings,
  invGetSyncSettings, invUpdateSyncSettings,
  invListStubs, invCreateStub, invUpdateStub, invDeleteStub,
  invSyncInvoices, invDeleteInvoice, invCheckEditable,
  invSyncSingle,
  sendInvoiceEmail,
} from './api';

// ── Invoicing types ──
interface InvClient {
  id: string; company_id: string; profile_id: string; name: string; eik?: string;
  vat_number?: string; is_vat_registered?: boolean; is_individual?: boolean;
  mol?: string; city?: string; address?: string; email?: string; phone?: string;
}
interface InvItem {
  id: string; company_id: string; profile_id: string; name: string; unit: string;
  default_price: number; vat_rate: number; description?: string;
}
interface InvStub {
  id: string; company_id: string; profile_id: string; name: string;
  start_number: number; end_number: number; current_number?: number;
}
interface InvLine {
  item_id: string | null; description: string; quantity: string; unit: string;
  unit_price: string; vat_rate: string;
}
interface InvCompanySettings {
  iban?: string; bank_name?: string; bic?: string; default_vat_rate?: number;
}
type InvModal = null | 'clients' | 'items' | 'invoice' | 'settings' | 'stubs' | 'clientForm' | 'itemForm' | 'trLookup' | 'clientPicker' | 'itemPicker';

interface Company {
  id: string; name: string; eik: string; vat_number: string;
  address: string; mol: string;
  managers?: string[]; partners?: string[];
}

interface FolderItem {
  company: Company;
  purchases: { count: number; files: string[]; files_info: Array<{name: string; drive_id: string; drive_url: string; cross_copy_status?: string; cross_copied_from?: string; is_credit_note?: boolean; uploaded_at?: string}> };
  sales: { count: number; files: string[]; files_info: Array<{name: string; drive_id: string; drive_url: string; cross_copy_status?: string; cross_copied_from?: string; is_credit_note?: boolean; uploaded_at?: string}> };
  proformas?: { count: number; files: string[]; files_info: Array<{name: string; drive_id: string; drive_url: string; cross_copy_status?: string; cross_copied_from?: string; is_credit_note?: boolean; uploaded_at?: string}> };
  pending?: { count: number; files: string[]; files_info: Array<{name: string; id: string; invoice_type: string; cross_copied_from: string; date: string; issuer_name: string; recipient_name: string; invoice_number: string; over_limit?: boolean}> };
}

export interface MainFormHandle {
  invOpenClients: (companyId: string, profileId: string) => void;
  invOpenItems: (companyId: string, profileId: string) => void;
  invOpenSettings: (companyId: string, profileId: string) => void;
  invOpenStubs: (companyId: string, profileId: string) => void;
  invOpenInvoice: (companyId: string, profileId: string, companyName: string, editData?: Record<string, unknown>) => void;
  invHandleDelete: (invoiceId: string, invoiceNumber: string) => void;
  invHandleSync: (companyId: string, profileId: string) => void;
  invSyncSingle: (invoiceId: string, profileId: string, companyId: string) => void;
  invToastShow: (msg: string, type?: 'success' | 'error') => void;
  invCheckEditable: (invoiceId: string) => Promise<{ editable: boolean; reason?: string }>;
  invSyncing: Record<string, boolean>;
  invGetPdfUrl: (invoiceId: string) => string;
  invGetInvoice: (invoiceId: string, companyId: string, profileId: string) => Promise<Record<string, unknown>>;
  invListInvoices: (companyId: string, profileId: string) => Promise<Record<string, unknown>[]>;
  sendInvoiceEmail: (profileId: string, data: Record<string, unknown>) => Promise<unknown>;
  showEditProtectModal: () => void;
  invSyncSingleAsync: (invoiceId: string, profileId: string, companyId: string) => Promise<void>;
}

interface MainFormProps {
  companies: Company[];
  activeProfileId: string;
  folderStructure: FolderItem[];
  loadProfileData: (profileId: string) => void;
}

const MainForm = forwardRef<MainFormHandle, MainFormProps>(({ companies, activeProfileId, folderStructure, loadProfileData }, ref) => {
  // ── Invoicing state ──
  const [invModal, setInvModal] = useState<InvModal>(null);
  const [invCompanyId, setInvCompanyId] = useState('');
  const [invProfileId, setInvProfileId] = useState('');
  const [invCompanyName, setInvCompanyName] = useState('');
  const [invClients, setInvClients] = useState<InvClient[]>([]);
  const [invItems, setInvItems] = useState<InvItem[]>([]);
  const [invStubs, setInvStubs] = useState<InvStub[]>([]);
  const [invSettings, setInvSettings] = useState<InvCompanySettings>({});
  const [invClientsSearch, setInvClientsSearch] = useState('');
  const [invItemsSearch, setInvItemsSearch] = useState('');
  const [invEditClient, setInvEditClient] = useState<InvClient | null>(null);
  const [invEditItem, setInvEditItem] = useState<InvItem | null>(null);
  const [invClientForm, setInvClientForm] = useState<Record<string, string>>({});
  const [invItemForm, setInvItemForm] = useState<Record<string, string>>({});
  const [invSettingsForm, setInvSettingsForm] = useState<Record<string, string>>({});
  const [invStubForm, setInvStubForm] = useState({ name: '', start_number: '', end_number: '' });
  const [invSaving, setInvSaving] = useState(false);
  const [invToast, setInvToast] = useState('');
  const [invToastType, setInvToastType] = useState<'success' | 'error'>('success');
  // Invoice form state
  const [invDocType, setInvDocType] = useState('invoice');
  const [invNumber, setInvNumber] = useState('');
  const [invIssueDate, setInvIssueDate] = useState('');
  const [invTaxEventDate, setInvTaxEventDate] = useState('');
  const [invShowDueDate, setInvShowDueDate] = useState(false);
  const [invDueDate, setInvDueDate] = useState('');
  const [invPaymentMethod, setInvPaymentMethod] = useState('');
  const [invNoVat, setInvNoVat] = useState(false);
  const [invNoVatReason, setInvNoVatReason] = useState('');
  const [invNoVatReasonCustom, setInvNoVatReasonCustom] = useState('');
  const [invDiscount, setInvDiscount] = useState('');
  const [invDiscountType, setInvDiscountType] = useState('EUR');
  const [invNotes, setInvNotes] = useState('');
  const [invInternalNotes, setInvInternalNotes] = useState('');
  const [invComposedBy, setInvComposedBy] = useState('');
  const [invSelectedClient, setInvSelectedClient] = useState<InvClient | null>(null);
  const [invSelectedStub, setInvSelectedStub] = useState('');
  const [invLines, setInvLines] = useState<InvLine[]>([{ item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: '20.00' }, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: '20.00' }, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: '20.00' }]);
  const [invPriceWithVat, setInvPriceWithVat] = useState(false);
  const [invEditInvoiceId, setInvEditInvoiceId] = useState<string | null>(null);
  const [invSyncMode, setInvSyncMode] = useState('manual');
  const [invDelayMinutes, setInvDelayMinutes] = useState('30');
  const [invTrEik, setInvTrEik] = useState('');
  const [invTrResult, setInvTrResult] = useState<Record<string, string> | null>(null);
  const [invTrLoading, setInvTrLoading] = useState(false);
  const [invPickerSearch, setInvPickerSearch] = useState('');
  const [invSyncing, setInvSyncing] = useState<Record<string, boolean>>({});
  const [invClientSearch, setInvClientSearch] = useState('');
  const [invVatPerLine, setInvVatPerLine] = useState(true);
  const [invPickerLineIdx, setInvPickerLineIdx] = useState(0);
  const EUR_TO_BGN = 1.95583;

  // ── Invoicing helpers ──
  const invToastShow = (msg: string, type: 'success' | 'error' = 'success') => {
    setInvToast(msg); setInvToastType(type);
    setTimeout(() => setInvToast(''), 3000);
  };

  const invOpenClients = async (companyId: string, profileId: string) => {
    setInvCompanyId(companyId); setInvProfileId(profileId);
    setInvClientsSearch(''); setInvModal('clients');
    try { const c = await invListClients(companyId, profileId); setInvClients(c); } catch { setInvClients([]); }
  };

  const invOpenItems = async (companyId: string, profileId: string) => {
    setInvCompanyId(companyId); setInvProfileId(profileId);
    setInvItemsSearch(''); setInvModal('items');
    try { const it = await invListItems(companyId, profileId); setInvItems(it); } catch { setInvItems([]); }
  };

  const invOpenSettings = async (companyId: string, profileId: string) => {
    setInvCompanyId(companyId); setInvProfileId(profileId);
    setInvModal('settings');
    try {
      const s = await invGetCompanySettings(companyId, profileId);
      setInvSettings(s);
      setInvSettingsForm({ iban: s.iban || '', bank_name: s.bank_name || '', bic: s.bic || '', default_vat_rate: String(Math.round(Number(s.default_vat_rate || 20))) });
    } catch { setInvSettingsForm({ iban: '', bank_name: '', bic: '', default_vat_rate: '20' }); }
  };

  const invOpenStubs = async (companyId: string, profileId: string) => {
    setInvCompanyId(companyId); setInvProfileId(profileId);
    setInvModal('stubs'); setInvStubForm({ name: '', start_number: '', end_number: '' });
    try { const st = await invListStubs(companyId, profileId); setInvStubs(st); } catch { setInvStubs([]); }
  };

  const invOpenInvoice = async (companyId: string, profileId: string, companyName: string, editData?: Record<string, unknown>) => {
    // Edit protection: check if invoice is editable (not synced/approved by counterparty)
    if (editData?.invoice_id) {
      try {
        const check = await invCheckEditable(editData.invoice_id as string);
        if (check && !check.editable) {
          alert(check.reason || 'Тази фактура не може да бъде редактирана — одобрена е от контрагента.');
          return;
        }
      } catch { /* endpoint may not exist yet, proceed */ }
    }
    setInvCompanyId(companyId); setInvProfileId(profileId); setInvCompanyName(companyName);
    setInvModal('invoice'); setInvSaving(false);
    // Reset form
    setInvDocType(editData?.document_type as string || 'invoice');
    setInvSelectedClient(null); setInvSelectedStub('');
    setInvNoVat(false); setInvNoVatReason(''); setInvNoVatReasonCustom('');
    setInvDiscount(''); setInvDiscountType('EUR');
    setInvNotes(''); setInvInternalNotes(''); setInvComposedBy('');
    setInvShowDueDate(false); setInvDueDate(''); setInvPaymentMethod('');
    setInvPriceWithVat(false); setInvSyncMode('manual'); setInvDelayMinutes('30'); setInvClientSearch(''); setInvVatPerLine(true);
    setInvEditInvoiceId(editData?.invoice_id as string || null);
    // Load data
    try {
      const [c, it, st, cs] = await Promise.all([
        invListClients(companyId, profileId),
        invListItems(companyId, profileId),
        invListStubs(companyId, profileId),
        invGetCompanySettings(companyId, profileId),
      ]);
      setInvClients(c); setInvItems(it); setInvStubs(st); setInvSettings(cs);
      const defVat = String(Number(cs.default_vat_rate || 20).toFixed(2));
      // Auto-fill composed_by from company MOL
      if (!editData) {
        const folder = (window as unknown as Record<string, unknown>).__invFolderData as Array<Record<string, Record<string, unknown>>> | undefined;
        let mol = '';
        let managers: Array<Record<string, string>> = [];
        if (folder) {
          const f = folder.find((fd: Record<string, Record<string, unknown>>) => fd.company && fd.company.id === companyId);
          if (f && f.company) {
            mol = (f.company.mol as string) || '';
            if (Array.isArray(f.company.managers)) managers = f.company.managers as Array<Record<string, string>>;
          }
        }
        if (!mol && managers.length > 0) mol = managers[0].name || '';
        // Fallback: fetch company data from API
        if (!mol) {
          try {
            const co = companies.find(cx => cx.id === companyId);
            if (co) mol = (co as unknown as Record<string, unknown>).mol as string || '';
          } catch { /* ignore */ }
        }
        if (mol) setInvComposedBy(mol);
        // Restore last no-vat reason from localStorage
        try {
          const lastReason = localStorage.getItem('inv_last_no_vat_reason');
          if (lastReason) setInvNoVatReason(lastReason);
        } catch { /* ignore */ }
      }
      // Set next number
      const docType = editData?.document_type as string || 'invoice';
      if (!editData) {
        try {
          const nn = await invGetNextNumber(companyId, profileId, docType);
          setInvNumber(nn.next_number ? String(nn.next_number).padStart(10, '0') : '');
        } catch { setInvNumber(''); }
        const today = new Date().toISOString().split('T')[0];
        setInvIssueDate(today); setInvTaxEventDate(today);
        setInvLines([{ item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }]);
      }
      // Sync settings
      try {
        const ss = await invGetSyncSettings(companyId, profileId);
        setInvSyncMode(ss.sync_mode || 'manual');
        setInvDelayMinutes(String(ss.delay_minutes || 30));
      } catch { /* default */ }
      // Edit mode
      if (editData) {
        setInvNumber(editData.invoice_number ? String(editData.invoice_number).padStart(10, '0') : '');
        setInvIssueDate(editData.issue_date ? String(editData.issue_date).split('T')[0] : '');
        setInvTaxEventDate(editData.tax_event_date ? String(editData.tax_event_date).split('T')[0] : '');
        if (editData.due_date) { setInvShowDueDate(true); setInvDueDate(String(editData.due_date).split('T')[0]); }
        setInvPaymentMethod(editData.payment_method as string || '');
        if (editData.no_vat) { setInvNoVat(true); setInvNoVatReason(editData.no_vat_reason as string || ''); }
        setInvDiscount(editData.discount ? String(editData.discount) : '');
        setInvDiscountType(editData.discount_type as string || 'EUR');
        setInvNotes(editData.notes as string || '');
        setInvInternalNotes(editData.internal_notes as string || '');
        setInvComposedBy(editData.composed_by as string || '');
        if (editData.client_id) {
          const cl = c.find((x: InvClient) => x.id === editData.client_id);
          if (cl) setInvSelectedClient(cl);
        }
        if (editData.lines && Array.isArray(editData.lines)) {
          setInvLines((editData.lines as Array<Record<string, unknown>>).map(l => ({
            item_id: l.item_id as string || null,
            description: l.description as string || '',
            quantity: String(l.quantity || 1),
            unit: l.unit as string || 'бр.',
            unit_price: String(l.unit_price || 0),
            vat_rate: String(Number(l.vat_rate || 20).toFixed(2)),
          })));
        }
      }
    } catch (e) { invToastShow('Грешка при зареждане: ' + (e instanceof Error ? e.message : ''), 'error'); }
  };

  const invSaveInvoice = async (status: string) => {
    if (!invSelectedClient) { invToastShow('Моля, изберете клиент', 'error'); return; }
    const filledLines = invLines.filter(l => l.description.trim());
    if (filledLines.length === 0) { invToastShow('Добавете поне един ред', 'error'); return; }
    setInvSaving(true);
    const lineVatRates = filledLines.map(l => parseFloat(l.vat_rate) || 20);
    const dominantVatRate = lineVatRates.length > 0 ? lineVatRates[0] : 20;
    // Save sync settings
    try { await invUpdateSyncSettings(invCompanyId, invProfileId, { sync_mode: invSyncMode, delay_minutes: parseInt(invDelayMinutes) || 30 }); } catch { /* ignore */ }
    const noVatReason = invNoVat ? (invNoVatReason === 'other' ? invNoVatReasonCustom : invNoVatReason) : '';
    // Remember last no-vat reason in localStorage
    if (invNoVat && invNoVatReason) { try { localStorage.setItem('inv_last_no_vat_reason', invNoVatReason); } catch { /* ignore */ } }
    const payload = {
      company_id: invCompanyId, profile_id: invProfileId,
      client_id: invSelectedClient.id, document_type: invDocType,
      invoice_number: invNumber ? parseInt(invNumber) : null,
      issue_date: invIssueDate || null, tax_event_date: invTaxEventDate || null,
      due_date: invShowDueDate ? (invDueDate || null) : null,
      vat_rate: dominantVatRate, no_vat: invNoVat, no_vat_reason: noVatReason || null,
      discount: parseFloat(invDiscount) || 0, discount_type: invDiscountType,
      payment_method: invPaymentMethod || null,
      notes: invNotes || null, internal_notes: invInternalNotes || null,
      currency: 'EUR', status,
      stub_id: invSelectedStub || null, composed_by: invComposedBy || null,
      lines: filledLines.map((l, i) => ({
        item_id: l.item_id, position: i, description: l.description,
        quantity: parseFloat(l.quantity) || 1, unit: l.unit,
        unit_price: parseFloat(l.unit_price) || 0, vat_rate: parseFloat(l.vat_rate) || 20,
      })),
    };
    try {
      if (invEditInvoiceId) {
        const result = await invUpdateInvoice(invEditInvoiceId, payload, invCompanyId, invProfileId);
        invToastShow(`${invDocType === 'proforma' ? 'Проформа' : 'Фактура'} ${result.invoice_number} е обновена`);
      } else {
        const result = await invCreateInvoice(payload);
        invToastShow(`${invDocType === 'proforma' ? 'Проформа' : 'Фактура'} ${result.invoice_number} е ${status === 'issued' ? 'издадена' : 'запазена като чернова'}`);
      }
      setInvModal(null);
      // WebSocket will auto-refresh the file list
      if (activeProfileId) loadProfileData(activeProfileId);
    } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
    finally { setInvSaving(false); }
  };

  const invHandleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете фактура ${invoiceNumber}? Това действие е необратимо.`)) return;
    try {
      await invDeleteInvoice(invoiceId, invCompanyId, invProfileId);
      invToastShow(`Фактура ${invoiceNumber} е изтрита`);
      if (activeProfileId) loadProfileData(activeProfileId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Грешка';
      if (msg.includes('одобрена') || msg.includes('approved') || msg.includes('защитен') || msg.includes('protected') || msg.includes('синхронизиран')) {
        alert('Изтриването е блокирано: ' + msg);
      } else {
        invToastShow('Грешка: ' + msg, 'error');
      }
    }
  };

  const invHandleSync = async (companyId: string, profileId: string) => {
    setInvSyncing(prev => ({ ...prev, [companyId]: true }));
    try {
      const result = await invSyncInvoices(companyId, profileId);
      const syncCount = result?.synced_count || 0;
      if (syncCount > 0) {
        invToastShow(`Синхронизирани фактури: ${syncCount}`);
      } else {
        invToastShow('Всички фактури вече са синхронизирани');
      }
      if (activeProfileId) loadProfileData(activeProfileId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('вече') || msg.includes('already')) {
        invToastShow('Всички фактури вече са синхронизирани');
      } else {
        invToastShow('Грешка при синхронизация: ' + msg, 'error');
      }
    }
    finally { setInvSyncing(prev => ({ ...prev, [companyId]: false })); }
  };

  const invCalcLineTotal = (line: InvLine) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unit_price) || 0;
    return qty * price;
  };

  const invCalcTotals = () => {
    let subtotalRaw = 0;
    invLines.forEach(l => { subtotalRaw += invCalcLineTotal(l); });
    const discountVal = parseFloat(invDiscount) || 0;
    let discountAmount = 0;
    if (discountVal > 0) {
      discountAmount = invDiscountType === '%' ? subtotalRaw * discountVal / 100 : discountVal;
    }
    const taxBase = subtotalRaw - discountAmount;
    let totalVat = 0;
    if (!invNoVat) {
      invLines.forEach(l => {
        const lineTotal = invCalcLineTotal(l);
        const lineShare = subtotalRaw > 0 ? (lineTotal / subtotalRaw) * taxBase : 0;
        const lineVatRate = parseFloat(l.vat_rate) || 0;
        totalVat += lineShare * (lineVatRate / 100);
      });
    }
    const total = taxBase + totalVat;
    return { subtotal: subtotalRaw, totalVat, discountAmount, taxBase, total };
  };

  const invUpdateLine = (idx: number, field: keyof InvLine, value: string) => {
    setInvLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const invAddLine = () => {
    const defVat = String(Number(invSettings.default_vat_rate || 20).toFixed(2));
    setInvLines(prev => [...prev, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }]);
  };

  const invRemoveLine = (idx: number) => {
    setInvLines(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  const invInsertLine = (afterIdx: number) => {
    const defVat = String(Number(invSettings.default_vat_rate || 20).toFixed(2));
    setInvLines(prev => { const n = [...prev]; n.splice(afterIdx + 1, 0, { item_id: null, description: '', quantity: '1.00', unit: 'бр.', unit_price: '0.00', vat_rate: defVat }); return n; });
  };

  const invSelectItem = (item: InvItem, lineIdx: number) => {
    setInvLines(prev => prev.map((l, i) => i === lineIdx ? {
      ...l, item_id: item.id, description: item.name,
      unit: item.unit, unit_price: Number(item.default_price).toFixed(2),
      vat_rate: Number(item.vat_rate).toFixed(2),
    } : l));
    setInvModal('invoice');
  };

  const invOpenItemPicker = (lineIdx: number) => {
    if (invItems.length === 0) { invToastShow('Няма добавени артикули', 'error'); return; }
    setInvPickerLineIdx(lineIdx);
    setInvPickerSearch('');
    setInvModal('itemPicker');
  };

  const showEditProtectModal = () => {
    const existing = document.getElementById('edit-protect-overlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.id = 'edit-protect-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:10000;animation:epFadeIn 0.2s ease-out';
    const md = document.createElement('div');
    md.style.cssText = 'background:#fff;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);max-width:440px;width:90%;overflow:hidden;animation:epSlideIn 0.2s ease-out';
    const hd = document.createElement('div');
    hd.style.cssText = 'padding:24px 24px 0;display:flex;align-items:flex-start;gap:16px';
    const iw = document.createElement('div');
    iw.style.cssText = 'width:48px;height:48px;border-radius:50%;background:#FEF2F2;display:flex;align-items:center;justify-content:center;flex-shrink:0';
    iw.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    const tc = document.createElement('div');
    tc.style.cssText = 'flex:1';
    const ti = document.createElement('h3');
    ti.style.cssText = 'margin:0 0 8px;font-size:18px;font-weight:700;color:#1e293b';
    ti.textContent = 'Защита на фактура';
    const ms = document.createElement('p');
    ms.style.cssText = 'margin:0;font-size:14px;line-height:1.5;color:#475569';
    ms.innerHTML = '<span style="color:#dc2626;font-weight:600">Тази фактура не може да бъде редактирана</span>, защото е синхронизирана с контрагента.<br><br><span style="font-size:13px;color:#64748b">За да я редактирате, контрагентът трябва първо да я изтрие от профила си.</span>';
    tc.appendChild(ti); tc.appendChild(ms);
    hd.appendChild(iw); hd.appendChild(tc);
    const ft = document.createElement('div');
    ft.style.cssText = 'padding:20px 24px;display:flex;justify-content:flex-end';
    const cb = document.createElement('button');
    cb.style.cssText = 'padding:10px 24px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer';
    cb.textContent = 'Разбрах';
    cb.onclick = () => ov.remove();
    ft.appendChild(cb);
    md.appendChild(hd); md.appendChild(ft);
    ov.appendChild(md);
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    invOpenClients,
    invOpenItems,
    invOpenSettings,
    invOpenStubs,
    invOpenInvoice,
    invHandleDelete,
    invHandleSync,
    invSyncSingle: (invoiceId: string, profileId: string, companyId: string) => {
      invSyncSingle(invoiceId, profileId, companyId).then(() => {
        invToastShow('Фактурата е синхронизирана');
        if (activeProfileId) loadProfileData(activeProfileId);
      }).catch((e: unknown) => invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'));
    },
    invToastShow,
    invCheckEditable,
    invSyncing,
    invGetPdfUrl,
    invGetInvoice,
    invListInvoices,
    sendInvoiceEmail,
    showEditProtectModal,
    invSyncSingleAsync: async (invoiceId: string, profileId: string, companyId: string) => {
      await invSyncSingle(invoiceId, profileId, companyId);
      invToastShow('Фактурата е синхронизирана');
      if (activeProfileId) loadProfileData(activeProfileId);
    },
  }));

  return (
    <>
      {/* ── Invoicing Toast ── */}
      {invToast && (
        <div className={'fixed bottom-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow-lg text-white text-sm ' + (invToastType === 'error' ? 'bg-red-600' : 'bg-emerald-600')}>{invToast}</div>
      )}

      {/* ── Clients Modal ── */}
      {invModal === 'clients' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Клиенти</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setInvEditClient(null); setInvClientForm({ name: '', eik: '', vat_number: '', mol: '', city: '', address: '', email: '', phone: '' }); setInvModal('clientForm'); }} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Нов клиент</button>
                <button onClick={() => setInvModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-3 border-b">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Търсене по име или ЕИК..." value={invClientsSearch} onChange={e => { setInvClientsSearch(e.target.value); invListClients(invCompanyId, invProfileId, e.target.value).then(setInvClients).catch(() => {}); }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {invClients.length === 0 ? (
                <p className="text-center text-gray-400 py-8">{invClientsSearch ? 'Няма намерени клиенти' : 'Няма добавени клиенти'}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="pb-2">Име</th><th className="pb-2">ЕИК</th><th className="pb-2">ДДС №</th><th className="pb-2">МОЛ</th><th className="pb-2">Град</th><th className="pb-2 text-right">Действия</th></tr></thead>
                  <tbody>
                    {invClients.map(c => (
                      <tr key={c.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="py-2 text-gray-500 font-mono text-xs">{c.eik || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{c.vat_number || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{c.mol || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{c.city || '—'}</td>
                        <td className="py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => { setInvEditClient(c); setInvClientForm({ name: c.name || '', eik: c.eik || '', vat_number: c.vat_number || '', mol: c.mol || '', city: c.city || '', address: c.address || '', email: c.email || '', phone: c.phone || '', is_vat_registered: c.is_vat_registered ? 'true' : 'false', is_individual: c.is_individual ? 'true' : 'false' }); setInvModal('clientForm'); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Редактирай"><FileText className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (!confirm('Изтриване на клиент ' + c.name + '?')) return; try { await invDeleteClient(c.id, invCompanyId, invProfileId); invToastShow('Клиентът е изтрит'); const list = await invListClients(invCompanyId, invProfileId); setInvClients(list); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); } }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Изтрий"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Client Form Modal ── */}
      {invModal === 'clientForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal('clients')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{invEditClient ? 'Редактирай клиент' : 'Нов клиент'}</h2>
              <button onClick={() => setInvModal('clients')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 mb-1"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={invClientForm.is_individual === 'true'} onChange={e => setInvClientForm(p => ({ ...p, is_individual: e.target.checked ? 'true' : 'false' }))} /> Физическо лице</label></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Наименование *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.name || ''} onChange={e => setInvClientForm(p => ({ ...p, name: e.target.value }))} placeholder="Име на фирмата или лицето" /></div>
              <div className="flex items-center gap-2">
                <div className="flex-1"><label className="block text-xs font-medium text-gray-600 mb-1">ЕИК</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.eik || ''} onChange={e => setInvClientForm(p => ({ ...p, eik: e.target.value }))} placeholder="000000000" /></div>
                <button onClick={async () => { if (!invClientForm.eik) { invToastShow('Въведете ЕИК', 'error'); return; } try { const r = await invRegistryLookup(invClientForm.eik); if (r.name) setInvClientForm(p => ({ ...p, name: r.name || p.name, address: r.address || p.address, city: r.city || p.city, mol: r.mol || p.mol, vat_number: r.vat_number || p.vat_number, is_vat_registered: r.is_vat_registered ? 'true' : 'false' })); invToastShow('Данните са заредени от ТР'); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); } }} className="mt-5 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap"><Search className="w-3.5 h-3.5" /> Търсене в ТР</button>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">ДДС номер</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.vat_number || ''} onChange={e => setInvClientForm(p => ({ ...p, vat_number: e.target.value }))} placeholder="BG000000000" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">МОЛ</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.mol || ''} onChange={e => setInvClientForm(p => ({ ...p, mol: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Град</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.city || ''} onChange={e => setInvClientForm(p => ({ ...p, city: e.target.value }))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Адрес</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.address || ''} onChange={e => setInvClientForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.email || ''} onChange={e => setInvClientForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Телефон</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.phone || ''} onChange={e => setInvClientForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Имейл адреси за уведомления</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invClientForm.notify_emails || ''} onChange={e => setInvClientForm(p => ({ ...p, notify_emails: e.target.value }))} placeholder="email1@example.com, email2@example.com" /><p className="text-xs text-gray-400 mt-0.5">Изпращай уведомления на тези адреси (разделени със запетая)</p></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={invClientForm.is_vat_registered === 'true'} onChange={e => setInvClientForm(p => ({ ...p, is_vat_registered: e.target.checked ? 'true' : 'false' }))} /> Регистриран по ДДС</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setInvModal('clients')} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отказ</button>
                <button onClick={async () => {
                  if (!invClientForm.name) { invToastShow('Въведете име', 'error'); return; }
                  const data = { ...invClientForm, company_id: invCompanyId, profile_id: invProfileId, is_vat_registered: invClientForm.is_vat_registered === 'true', is_individual: invClientForm.is_individual === 'true' };
                  try {
                    if (invEditClient) { await invUpdateClient(invEditClient.id, data, invCompanyId, invProfileId); invToastShow('Клиентът е обновен'); }
                    else { await invCreateClient(data); invToastShow('Клиентът е създаден'); }
                    const list = await invListClients(invCompanyId, invProfileId); setInvClients(list); setInvModal('clients');
                  } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                }} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{invEditClient ? 'Запази' : 'Създай'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Items Modal ── */}
      {invModal === 'items' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-purple-600" /> Артикули</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setInvEditItem(null); setInvItemForm({ name: '', unit: 'бр.', default_price: '0.00', vat_rate: '20.00', description: '' }); setInvModal('itemForm'); }} className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Нов артикул</button>
                <button onClick={() => setInvModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-3 border-b">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Търсене по име..." value={invItemsSearch} onChange={e => { setInvItemsSearch(e.target.value); invListItems(invCompanyId, invProfileId, e.target.value).then(setInvItems).catch(() => {}); }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {invItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8">{invItemsSearch ? 'Няма намерени артикули' : 'Няма добавени артикули'}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="pb-2">Име</th><th className="pb-2">Мярка</th><th className="pb-2 text-right">Цена</th><th className="pb-2 text-right">ДДС %</th><th className="pb-2">Описание</th><th className="pb-2 text-right">Действия</th></tr></thead>
                  <tbody>
                    {invItems.map(it => (
                      <tr key={it.id} className="border-t hover:bg-gray-50">
                        <td className="py-2 font-medium">{it.name}</td>
                        <td className="py-2 text-gray-500">{it.unit}</td>
                        <td className="py-2 text-right font-mono text-xs">{Number(it.default_price).toFixed(2)} EUR</td>
                        <td className="py-2 text-right text-gray-500">{Number(it.vat_rate)}%</td>
                        <td className="py-2 text-gray-400 truncate max-w-[200px]">{it.description || '—'}</td>
                        <td className="py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => { setInvEditItem(it); setInvItemForm({ name: it.name, unit: it.unit, default_price: Number(it.default_price).toFixed(2), vat_rate: Number(it.vat_rate).toFixed(2), description: it.description || '' }); setInvModal('itemForm'); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Редактирай"><FileText className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (!confirm('Изтриване на артикул ' + it.name + '?')) return; try { await invDeleteItem(it.id, invCompanyId, invProfileId); invToastShow('Артикулът е изтрит'); const list = await invListItems(invCompanyId, invProfileId); setInvItems(list); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); } }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Изтрий"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Item Form Modal ── */}
      {invModal === 'itemForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal('items')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{invEditItem ? 'Редактирай артикул' : 'Нов артикул'}</h2>
              <button onClick={() => setInvModal('items')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Име *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={invItemForm.name || ''} onChange={e => setInvItemForm(p => ({ ...p, name: e.target.value }))} placeholder="Консултантска услуга" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Мярка</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={invItemForm.unit || ''} onChange={e => setInvItemForm(p => ({ ...p, unit: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Цена</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" type="number" step="0.01" value={invItemForm.default_price || ''} onChange={e => setInvItemForm(p => ({ ...p, default_price: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">ДДС %</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" type="number" step="0.01" value={invItemForm.vat_rate || ''} onChange={e => setInvItemForm(p => ({ ...p, vat_rate: e.target.value }))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Баркод</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" value={invItemForm.barcode || ''} onChange={e => setInvItemForm(p => ({ ...p, barcode: e.target.value }))} placeholder="Баркод на артикула (незадължително)" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Описание</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" rows={2} value={invItemForm.description || ''} onChange={e => setInvItemForm(p => ({ ...p, description: e.target.value }))} placeholder="Опционално описание" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setInvModal('items')} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отказ</button>
                <button onClick={async () => {
                  if (!invItemForm.name) { invToastShow('Въведете име', 'error'); return; }
                  const vals = { name: invItemForm.name, unit: invItemForm.unit || 'бр.', default_price: parseFloat(invItemForm.default_price) || 0, vat_rate: parseFloat(invItemForm.vat_rate) || 20, description: invItemForm.description || '', company_id: invCompanyId, profile_id: invProfileId };
                  try {
                    if (invEditItem) { await invUpdateItem(invEditItem.id, vals, invCompanyId, invProfileId); invToastShow('Артикулът е обновен'); }
                    else { await invCreateItem(vals); invToastShow('Артикулът е създаден'); }
                    const list = await invListItems(invCompanyId, invProfileId); setInvItems(list); setInvModal('items');
                  } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                }} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{invEditItem ? 'Запази' : 'Създай'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {invModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><RefreshCw className="w-5 h-5 text-gray-600" /> Настройки за фактуриране</h2>
              <span className="text-xs text-gray-400">Настройки за синхронизация</span>
              <button onClick={() => setInvModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Банкови данни</h3>
                <div className="space-y-2">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">ДДС % по подразбиране</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.default_vat_rate || '20'} onChange={e => setInvSettingsForm(p => ({ ...p, default_vat_rate: e.target.value }))}>
                      <option value="20">20%</option><option value="9">9%</option><option value="0">0%</option>
                    </select>
                  </div><div><label className="block text-xs font-medium text-gray-600 mb-1">Режим на цените:</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.price_mode || 'without_vat'} onChange={e => setInvSettingsForm(p => ({ ...p, price_mode: e.target.value }))}>
                      <option value="without_vat">Цена без ДДС</option><option value="with_vat">Цена с ДДС</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">IBAN</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.iban || ''} onChange={e => setInvSettingsForm(p => ({ ...p, iban: e.target.value }))} placeholder="BG00XXXX00000000000000" /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Име на банката</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.bank_name || ''} onChange={e => setInvSettingsForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="Банка ООД" /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">BIC код</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.bic || ''} onChange={e => setInvSettingsForm(p => ({ ...p, bic: e.target.value }))} placeholder="XXXXBGSF" /></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">ДДС по подразбиране</h3>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={invSettingsForm.default_vat_rate || '20'} onChange={e => setInvSettingsForm(p => ({ ...p, default_vat_rate: e.target.value }))}>
                  <option value="20">20%</option><option value="9">9%</option><option value="0">0%</option>
                </select>
              </div>
              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Кочани (серии номера)</h3>
                <p className="text-xs text-gray-500 mb-2">Управлявайте кочаните за фактури с 10-цифрени номера.</p>
                <button onClick={() => invOpenStubs(invCompanyId, invProfileId)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Управление на кочани</button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setInvModal(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Отказ</button>
                <button onClick={async () => {
                  try {
                    await invUpdateCompanySettings(invCompanyId, invProfileId, { iban: invSettingsForm.iban, bank_name: invSettingsForm.bank_name, bic: invSettingsForm.bic, default_vat_rate: parseFloat(invSettingsForm.default_vat_rate) || 20 });
                    invToastShow('Настройките са запазени'); setInvModal(null);
                  } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                }} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Запази</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stubs Modal ── */}
      {invModal === 'stubs' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInvModal('settings')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Управление на кочани</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Редактирай кочан</span>
                <button onClick={() => setInvModal('settings')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-3">Кочаните определят диапазона от номера за фактури. Всеки кочан съдържа 10-цифрени номера.</p>
              {invStubs.length > 0 && (
                <div className="space-y-2 mb-4">
                  {invStubs.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                      <div>
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-gray-500">{String(s.start_number).padStart(10, '0')} — {String(s.end_number).padStart(10, '0')} <span className="text-gray-400">(следващият свободен №)</span></div>
                      </div>
                      <button onClick={async () => { if (!confirm('Изтриване на кочан ' + s.name + '?')) return; try { await invDeleteStub(s.id, invCompanyId, invProfileId); invToastShow('Кочанът е изтрит'); const list = await invListStubs(invCompanyId, invProfileId); setInvStubs(list); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); } }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
                            <div className="rounded-lg p-3 bg-gray-50 shadow-sm">
                              <h3 className="text-sm font-semibold mb-2">Нов кочан</h3>
                <div className="space-y-2">
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Име на кочана" value={invStubForm.name} onChange={e => setInvStubForm(p => ({ ...p, name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="От номер (10 цифри)" value={invStubForm.start_number} onChange={e => setInvStubForm(p => ({ ...p, start_number: e.target.value }))} />
                    <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="До номер (10 цифри)" value={invStubForm.end_number} onChange={e => setInvStubForm(p => ({ ...p, end_number: e.target.value }))} />
                  </div>
                  <button onClick={async () => {
                    if (!invStubForm.name || !invStubForm.start_number || !invStubForm.end_number) { invToastShow('Попълнете всички полета', 'error'); return; }
                    try {
                      await invCreateStub({ company_id: invCompanyId, profile_id: invProfileId, name: invStubForm.name, start_number: parseInt(invStubForm.start_number), end_number: parseInt(invStubForm.end_number) });
                      invToastShow('Кочанът е създаден');
                      setInvStubForm({ name: '', start_number: '', end_number: '' });
                      const list = await invListStubs(invCompanyId, invProfileId); setInvStubs(list);
                    } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                  }} className="w-full px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Създай кочан</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Form Modal ── */}
      {invModal === 'invoice' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,.45)'}} onClick={() => setInvModal(null)}>
          <div style={{background:'#fff',borderRadius:'12px',boxShadow:'0 25px 50px -12px rgba(0,0,0,.25)',maxHeight:'90vh',overflowY:'auto',width:'1100px',maxWidth:'95vw',position:'relative',zIndex:99999}} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #e2e8f0',background:'linear-gradient(to right, #f8fafc, #fff)'}}>
              <h2 style={{margin:0,fontSize:'18px',color:'#1e293b',fontWeight:700,display:'flex',alignItems:'center',gap:'8px'}}>
                <Receipt className="w-5 h-5" style={{color:'#334155'}} />
                {invEditInvoiceId ? 'Редактирай фактура от' : 'Нова фактура от'}
                {' '}
                <select value={invCompanyId} onChange={e => { const co = companies.find(c => c.id === e.target.value); if (co && activeProfileId) { setInvCompanyId(co.id); setInvCompanyName(co.name); } }} style={{fontSize:'16px',fontWeight:700,color:'#2563eb',border:'none',background:'transparent',cursor:'pointer',padding:'0 4px',maxWidth:'300px',fontFamily:'inherit'}}>
                  {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                </select>
              </h2>
              <button onClick={() => setInvModal(null)} style={{width:'28px',height:'28px',border:'none',background:'#f1f5f9',borderRadius:'6px',cursor:'pointer',fontSize:'16px',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center'}}><X className="w-4 h-4" /></button>
            </div>

            {/* Body */}
            <div style={{padding:'16px 20px'}}>

              {/* SEC 1: Document Type */}
              <div style={{display:'flex',alignItems:'center',gap:'4px',marginBottom:'14px'}}>
                <span style={{fontSize:'13px',fontWeight:600,color:'#334155',marginRight:'10px'}}>Тип:</span>
                {[{v:'proforma',l:'Проформа',bold:false},{v:'invoice',l:'Фактура',bold:true},{v:'debit_note',l:'Дебитно известие',bold:false},{v:'credit_note',l:'Кредитно известие',bold:false}].map(dt => (
                  <label key={dt.v} style={{display:'flex',alignItems:'center',gap:'5px',cursor:'pointer',marginRight:'14px',fontSize:'13px'}}>
                    <input type="radio" name="inv_doctype" checked={invDocType===dt.v} onChange={() => { setInvDocType(dt.v); if (!invEditInvoiceId) { invGetNextNumber(invCompanyId, invProfileId, dt.v).then(nn => setInvNumber(nn.next_number ? String(nn.next_number).padStart(10,'0') : '')).catch(() => setInvNumber('')); }}} style={{width:'14px',height:'14px',accentColor:'#2563eb'}} />
                    <span style={dt.bold?{fontWeight:700}:undefined}>{dt.l}</span>
                  </label>
                ))}
              </div>

              {/* SEC 2: Two-column grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 28px',marginBottom:'12px'}}>
                {/* Left column: Client fields */}
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {/* Client search */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'130px',flexShrink:0,textAlign:'right'}}>Клиент:</label>
                    <div style={{flex:1,display:'flex',gap:'3px',position:'relative'}}>
                      <input placeholder="Търсене по име или ЕИК..." value={invClientSearch || (invSelectedClient?.name || '')} onChange={e => { setInvClientSearch(e.target.value); if (!e.target.value) setInvSelectedClient(null); }} style={{flex:1,height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'2px 10px'}} />
                      <button onClick={() => { setInvPickerSearch(''); setInvModal('clientPicker'); }} style={{height:'30px',width:'30px',border:'1px solid #cbd5e1',borderRadius:'6px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}} title="Избери от базата">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                      </button>
                      <button onClick={() => { setInvTrEik(''); setInvTrResult(null); setInvModal('trLookup'); }} style={{height:'30px',padding:'0 8px',border:'1px solid #cbd5e1',borderRadius:'6px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:'3px',cursor:'pointer',flexShrink:0,fontSize:'12px',fontWeight:600,color:'#b45309'}} title="Търсене в Търговски регистър">
                        <span>ТР</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      </button>
                      {/* Inline dropdown */}
                      {invClientSearch && invClientSearch.length > 0 && (() => { const filtered = invClients.filter(c => c.name.toLowerCase().includes(invClientSearch.toLowerCase()) || (c.eik && c.eik.includes(invClientSearch))); return filtered.length > 0 ? (
                        <div style={{position:'absolute',zIndex:10,top:'32px',left:0,width:'100%',background:'#fff',border:'1px solid #cbd5e1',borderRadius:'6px',maxHeight:'160px',overflowY:'auto',boxShadow:'0 4px 6px -1px rgba(0,0,0,.1)'}}>
                          {filtered.map(c => (
                            <button key={c.id} onClick={() => { setInvSelectedClient(c); setInvClientSearch(''); }} style={{display:'block',width:'100%',textAlign:'left',padding:'6px 10px',border:'none',background:'none',cursor:'pointer',fontSize:'12px',borderBottom:'1px solid #f1f5f9'}}>
                              <div style={{fontWeight:500}}>{c.name}</div>
                              <div style={{fontSize:'11px',color:'#94a3b8'}}>{c.eik ? 'ЕИК: '+c.eik : ''}{c.city ? ' \u2022 '+c.city : ''}</div>
                            </button>
                          ))}
                        </div>
                      ) : null; })()}
                    </div>
                  </div>
                  {/* Physical person checkbox */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'130px',flexShrink:0}}></div>
                    <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer',fontSize:'13px'}}><input type="checkbox" checked={invSelectedClient?.is_individual || false} readOnly style={{width:'14px',height:'14px'}} />Клиентът е физическо лице</label>
                  </div>
                  {/* EIK */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'130px',flexShrink:0,textAlign:'right'}}>{invSelectedClient?.is_individual ? 'ЕГН:' : 'ЕИК/Булстат:'}</label>
                    <input readOnly value={invSelectedClient?.eik || ''} style={{flex:1,height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'2px 10px',background:'#f8fafc'}} />
                  </div>
                  {/* VAT registered */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'130px',flexShrink:0}}></div>
                    <label style={{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer',fontSize:'13px'}}><input type="checkbox" checked={invSelectedClient?.is_vat_registered || false} disabled style={{width:'14px',height:'14px'}} />Регистрация по ЗДДС</label>
                  </div>
                  {/* MOL */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'130px',flexShrink:0,textAlign:'right'}}>МОЛ:</label>
                    <input readOnly value={invSelectedClient?.mol || ''} style={{flex:1,height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'2px 10px',background:'#f8fafc'}} />
                  </div>
                  {/* City */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'130px',flexShrink:0,textAlign:'right'}}>Град:</label>
                    <input readOnly value={invSelectedClient?.city || ''} style={{flex:1,height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'2px 10px',background:'#f8fafc'}} />
                  </div>
                  {/* Address */}
                  <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'130px',flexShrink:0,textAlign:'right',paddingTop:'4px'}}>Адрес:<br/><span style={{fontSize:'11px',fontWeight:400,color:'#94a3b8'}}>на регистрация</span></label>
                    <textarea readOnly value={invSelectedClient?.address || ''} rows={2} style={{flex:1,fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'4px 10px',background:'#f8fafc',resize:'none',minHeight:'50px'}} />
                  </div>
                  {/* Recipient */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'130px',flexShrink:0,textAlign:'right'}}>Получател:</label>
                    <input readOnly value={invSelectedClient?.name || ''} style={{flex:1,height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'2px 10px',background:'#f8fafc'}} />
                  </div>
                </div>

                {/* Right column: Stub + Number + Dates */}
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {/* Stub */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'185px',flexShrink:0,textAlign:'right'}}>Кочан:</label>
                    {invStubs.length > 0 ? (
                      <select value={invSelectedStub} onChange={e => setInvSelectedStub(e.target.value)} style={{height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'0 8px',background:'#fff'}}>
                        <option value="">—</option>
                        {invStubs.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_number}-{s.end_number})</option>)}
                      </select>
                    ) : (
                      <button onClick={() => invOpenStubs(invCompanyId, invProfileId)} style={{fontSize:'13px',color:'#2563eb',fontWeight:600,textDecoration:'underline',background:'none',border:'none',cursor:'pointer'}}>+ кочан</button>
                    )}
                  </div>
                  {/* Invoice number */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'185px',flexShrink:0,textAlign:'right'}}>Фактура №:<br/><span style={{fontSize:'11px',fontWeight:400,color:'#94a3b8'}}>следващият свободен №</span></label>
                    <input value={invNumber} onChange={e => setInvNumber(e.target.value)} maxLength={10} style={{height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #93c5fd',background:'#eff6ff',fontFamily:'monospace',fontWeight:600,color:'#1e40af',maxWidth:'160px',padding:'2px 10px'}} />
                  </div>
                  {/* Issue date */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'185px',flexShrink:0,textAlign:'right'}}>Дата на издаване:</label>
                    <input type="date" value={invIssueDate} onChange={e => setInvIssueDate(e.target.value)} style={{height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'2px 10px',width:'160px',background:'transparent'}} />
                  </div>
                  {/* Tax event date */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'185px',flexShrink:0,textAlign:'right'}}>Дата на данъчно<br/>събитие:</label>
                    <input type="date" value={invTaxEventDate} onChange={e => setInvTaxEventDate(e.target.value)} style={{height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'2px 10px',width:'160px',background:'transparent'}} />
                  </div>
                  {/* Due date */}
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'185px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'6px'}}>
                      <input type="checkbox" checked={invShowDueDate} onChange={e => { setInvShowDueDate(e.target.checked); if (e.target.checked && !invDueDate) setInvDueDate(invIssueDate); }} style={{width:'14px',height:'14px'}} />
                      <label style={{fontSize:'13px',fontWeight:600,color:'#334155'}}>Дата на падеж:</label>
                    </div>
                    {invShowDueDate && <input type="date" value={invDueDate} onChange={e => setInvDueDate(e.target.value)} style={{height:'30px',fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'2px 10px',width:'160px',background:'transparent'}} />}
                  </div>
                </div>
              </div>

              {/* SEC 3: Items table */}
              <div style={{border:'1px solid #cbd5e1',borderRadius:'6px',overflow:'hidden',marginBottom:'2px'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:'#f1f5f9',borderBottom:'1px solid #cbd5e1'}}>
                    <th style={{width:'100px',padding:'6px 2px',borderRight:'1px solid #e2e8f0'}}></th>
                    <th style={{textAlign:'center',fontSize:'13px',fontWeight:600,color:'#334155',padding:'6px',borderRight:'1px solid #e2e8f0',minWidth:'220px'}}>Артикул</th>
                    <th style={{textAlign:'center',fontSize:'13px',fontWeight:600,color:'#334155',padding:'6px',width:'130px',borderRight:'1px solid #e2e8f0'}}>Количество</th>
                    <th style={{textAlign:'center',fontSize:'13px',fontWeight:600,color:'#334155',padding:'6px',width:'150px',borderRight:'1px solid #e2e8f0'}}>
                      <select value={invPriceWithVat ? '1' : '0'} onChange={e => setInvPriceWithVat(e.target.value === '1')} style={{fontSize:'13px',fontWeight:600,color:'#334155',border:'none',background:'transparent',cursor:'pointer',textAlign:'center'}}>
                        <option value="0">Цена без ДДС</option>
                        <option value="1">Цена с ДДС</option>
                      </select>
                    </th>
                    <th style={{textAlign:'center',fontSize:'13px',fontWeight:600,color:'#334155',padding:'6px',width:'80px',borderRight:'1px solid #e2e8f0'}}>ДДС %</th>
                    <th style={{textAlign:'center',fontSize:'13px',fontWeight:600,color:'#334155',padding:'6px',width:'100px'}}>Стойност</th>
                  </tr></thead>
                  <tbody>
                    {invLines.map((line, idx) => {
                      const displayPrice = invPriceWithVat ? (parseFloat(line.unit_price) * (1 + (parseFloat(line.vat_rate) || 20) / 100)).toFixed(2) : line.unit_price;
                      return (
                        <tr key={idx} style={{borderBottom:'1px solid #e2e8f0'}}>
                          <td style={{padding:'2px 2px',textAlign:'center',borderRight:'1px solid #e2e8f0'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'1px'}}>
                              <span style={{color:'#94a3b8',cursor:'grab',padding:'2px'}}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                              </span>
                              <button onClick={() => invInsertLine(idx)} style={{color:'#3b82f6',padding:'2px',background:'none',border:'none',cursor:'pointer'}} title="Добави ред">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                              </button>
                              <button onClick={() => invRemoveLine(idx)} style={{color:'#f87171',padding:'2px',background:'none',border:'none',cursor:'pointer'}} title="Премахни ред">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              </button>
                            </div>
                          </td>
                          <td style={{padding:'2px 2px',borderRight:'1px solid #e2e8f0'}}>
                            <div style={{display:'flex',gap:'2px',alignItems:'center'}}>
                              <input value={line.description} onChange={e => invUpdateLine(idx,'description',e.target.value)} placeholder="" style={{flex:1,height:'26px',fontSize:'13px',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'0 8px'}} />
                              <button onClick={() => invOpenItemPicker(idx)} style={{height:'26px',width:'26px',border:'1px solid #cbd5e1',borderRadius:'6px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}} title="Избери от каталога">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                              </button>
                            </div>
                          </td>
                          <td style={{padding:'2px 2px',borderRight:'1px solid #e2e8f0'}}>
                            <div style={{display:'flex',gap:'2px',alignItems:'center'}}>
                              <input type="number" step="0.01" min="0" value={line.quantity} onChange={e => invUpdateLine(idx,'quantity',e.target.value)} style={{height:'26px',fontSize:'13px',textAlign:'center',border:'1px solid #cbd5e1',borderRadius:'6px',width:'70px',padding:'0 4px'}} />
                              <select value={line.unit} onChange={e => invUpdateLine(idx,'unit',e.target.value)} style={{height:'26px',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'0 2px',fontSize:'13px',background:'#fff'}}>
                                <option>бр.</option><option>кг</option><option>м</option><option>л</option><option>м²</option><option>м³</option><option>час</option><option>ден</option><option>мес.</option><option>услуга</option>
                              </select>
                            </div>
                          </td>
                          <td style={{padding:'2px 2px',borderRight:'1px solid #e2e8f0'}}>
                            <div style={{display:'flex',gap:'2px',alignItems:'center'}}>
                              <input type="number" step="0.01" min="0" value={displayPrice} onChange={e => { if (invPriceWithVat) { const vr = parseFloat(line.vat_rate) || 20; invUpdateLine(idx,'unit_price',(parseFloat(e.target.value)/(1+vr/100)).toFixed(2)); } else { invUpdateLine(idx,'unit_price',e.target.value); }}} style={{flex:1,height:'26px',fontSize:'13px',textAlign:'right',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'0 6px'}} />
                              <span style={{fontSize:'11px',color:'#94a3b8',marginLeft:'2px',flexShrink:0}}>EUR</span>
                            </div>
                          </td>
                          <td style={{padding:'2px 2px',borderRight:'1px solid #e2e8f0'}}>
                            <select value={String(Math.round(parseFloat(line.vat_rate) || 20))} onChange={e => invUpdateLine(idx,'vat_rate',e.target.value+'.00')} style={{height:'24px',border:'1px solid #cbd5e1',borderRadius:'4px',fontSize:'12px',padding:'0 2px',background:'#fff',width:'100%'}}>
                              <option value="20">20%</option><option value="9">9%</option><option value="0">0%</option>
                            </select>
                          </td>
                          <td style={{padding:'4px 6px',textAlign:'right',fontSize:'13px',fontWeight:500}}>{invCalcLineTotal(line).toFixed(2)} EUR</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SEC 4: + Добави ред + Subtotal */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 6px',marginBottom:'2px'}}>
                <button onClick={invAddLine} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'13px',color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  <span>Добави ред</span>
                </button>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'13px',color:'#475569'}}>Сума (без отстъпка)</span>
                  <span style={{fontSize:'13px',fontWeight:600,width:'120px',textAlign:'right'}}>{invCalcTotals().subtotal.toFixed(2)} EUR</span>
                </div>
              </div>

              {/* SEC 5: Totals */}
              {(() => { const t = invCalcTotals(); const taxBase = t.taxBase; const totalVat = t.totalVat; const total = t.total; return (
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',marginBottom:'2px'}}>
                  <table style={{borderCollapse:'collapse'}}>
                    <tbody>
                      <tr>
                        <td style={{textAlign:'right',fontSize:'13px',color:'#475569',padding:'2px 12px 2px 0'}}>Отстъпка</td>
                        <td style={{textAlign:'right',padding:'2px 0'}}><div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'3px'}}>
                          <input type="number" step="0.01" min="0" value={invDiscount} onChange={e => setInvDiscount(e.target.value)} style={{height:'24px',fontSize:'13px',textAlign:'right',border:'1px solid #cbd5e1',borderRadius:'6px',width:'70px',padding:'0 6px'}} />
                          <select value={invDiscountType} onChange={e => setInvDiscountType(e.target.value)} style={{height:'24px',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'0 2px',fontSize:'12px',background:'#fff',width:'52px'}}><option value="EUR">EUR</option><option value="%">%</option></select>
                        </div></td>
                      </tr>
                      <tr style={{borderTop:'1px solid #e2e8f0'}}>
                        <td style={{textAlign:'right',fontSize:'13px',color:'#475569',padding:'2px 12px 2px 0'}}>Данъчна основа</td>
                        <td style={{textAlign:'right',fontSize:'13px',fontWeight:600,padding:'2px 0',width:'120px'}}>{taxBase.toFixed(2)} EUR<div style={{fontSize:'11px',color:'#94a3b8',fontWeight:400}}>{(taxBase * EUR_TO_BGN).toFixed(2)} лв.</div></td>
                      </tr>
                      <tr>
                        <td style={{textAlign:'right',fontSize:'13px',color:'#475569',padding:'2px 12px 2px 0'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'6px'}}>
                            <span>ДДС</span>
                          </div>
                        </td>
                        <td style={{textAlign:'right',fontSize:'13px',fontWeight:600,padding:'2px 0'}}>{totalVat.toFixed(2)} EUR<div style={{fontSize:'11px',color:'#94a3b8',fontWeight:400}}>{(totalVat * EUR_TO_BGN).toFixed(2)} лв.</div></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ); })()}

              {/* SEC 6: ДДС настройки */}
              <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap',marginBottom:'2px',borderTop:'1px solid #e2e8f0',borderBottom:'1px solid #e2e8f0',padding:'6px 0'}}>
                <span style={{fontSize:'13px',fontWeight:600,color:'#334155'}}>ДДС настройки:</span>
                <label style={{display:'flex',alignItems:'center',gap:'5px',cursor:'pointer',fontSize:'13px'}}><input type="checkbox" checked={invNoVat} onChange={e => { setInvNoVat(e.target.checked); if (e.target.checked) { setInvLines(prev => prev.map(l => ({...l, vat_rate:'0.00'}))); } else { setInvLines(prev => prev.map(l => ({...l, vat_rate:'20.00'}))); }}} style={{width:'14px',height:'14px',accentColor:'#2563eb'}} />Не начислявай ДДС по тази фактура</label>
              </div>
              {/* VAT reason dropdown */}
              {invNoVat && (
                <div style={{padding:'8px 0'}}>
                  <label style={{fontSize:'12px',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>Основание за неначисляване на ДДС:</label>
                  <select value={invNoVatReason} onChange={e => setInvNoVatReason(e.target.value)} style={{fontSize:'13px',maxWidth:'500px',width:'100%',padding:'6px 10px',border:'1px solid #cbd5e1',borderRadius:'6px',background:'#fff'}}>
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
                  {invNoVatReason === 'other' && <input value={invNoVatReasonCustom} onChange={e => setInvNoVatReasonCustom(e.target.value)} placeholder="Въведете основание..." style={{display:'block',marginTop:'6px',maxWidth:'500px',width:'100%',padding:'6px 10px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'13px'}} />}
                </div>
              )}

              {/* SEC 7: Съставил + Сума за плащане */}
              {(() => { const t = invCalcTotals(); const total = t.total; return (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px',borderBottom:'1px solid #e2e8f0',paddingBottom:'6px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <label style={{fontSize:'13px',color:'#475569'}}>Съставил</label>
                    <input value={invComposedBy} onChange={e => setInvComposedBy(e.target.value)} style={{height:'28px',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'0 8px',fontSize:'13px',background:'#fff',minWidth:'200px'}} />
                  </div>
                  <div style={{textAlign:'right',display:'flex',alignItems:'center',gap:'12px'}}>
                    <span style={{fontSize:'13px',color:'#475569'}}>Сума за плащане</span>
                    <div>
                      <div style={{fontSize:'18px',fontWeight:700,color:'#0f172a'}}>{total.toFixed(2)} EUR</div>
                      <div style={{fontSize:'11px',color:'#94a3b8',fontWeight:600}}>{(total * EUR_TO_BGN).toFixed(2)} лв.</div>
                    </div>
                  </div>
                </div>
              ); })()}

              {/* SEC 8: Забележки */}
              <div style={{paddingTop:'6px',marginBottom:'6px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:'10px',marginBottom:'6px'}}>
                  <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'130px',flexShrink:0,textAlign:'right',paddingTop:'4px'}}>Забележки<br/><span style={{fontSize:'11px',fontWeight:400,color:'#94a3b8'}}>видими за клиента</span></label>
                  <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} rows={2} style={{flex:1,fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'4px 10px',resize:'none'}} />
                </div>
              </div>

              {/* SEC 9: Начин на плащане */}
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px',borderTop:'1px solid #e2e8f0',paddingTop:'6px'}}>
                <label style={{fontSize:'13px',fontWeight:600,color:'#334155',width:'130px',flexShrink:0,textAlign:'right'}}>Начин на плащане</label>
                <select value={invPaymentMethod} onChange={e => setInvPaymentMethod(e.target.value)} style={{height:'30px',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'0 8px',fontSize:'13px',background:'#fff'}}>
                  <option value="">В брой</option><option value="bank_transfer">Банков път</option><option value="cod">Наложен платеж</option><option value="card">С карта</option>
                  <option value="payment_order">Платежно нареждане</option><option value="check">Чек/Ваучер</option><option value="offset">С насрещно прихващане</option>
                  <option value="money_transfer">Паричен превод</option><option value="epay">E-Pay</option><option value="paypal">PayPal</option><option value="stripe">Stripe</option>
                  <option value="easypay">EasyPay</option><option value="postal_transfer">Пощенски паричен превод</option><option value="other">Друг</option>
                </select>
              </div>

              {/* SEC 10: Коментари */}
              <div style={{border:'1px solid #cbd5e1',borderRadius:'6px',marginBottom:'8px',overflow:'hidden'}}>
                <div style={{background:'#f8fafc',padding:'4px 10px',borderBottom:'1px solid #cbd5e1'}}>
                  <span style={{fontSize:'13px',fontWeight:600,color:'#334155'}}>Коментари</span>
                  <span style={{fontSize:'11px',color:'#ef4444',marginLeft:'6px'}}>(не се вижда от клиента)</span>
                </div>
                <div style={{padding:'6px'}}><textarea value={invInternalNotes} onChange={e => setInvInternalNotes(e.target.value)} rows={2} style={{fontSize:'13px',borderRadius:'6px',border:'1px solid #cbd5e1',padding:'4px 10px',resize:'none',width:'100%',boxSizing:'border-box'}} /></div>
              </div>

              {/* SEC 11: Sync settings */}
              <div style={{marginTop:'16px',padding:'12px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
                <h3 style={{fontSize:'13px',fontWeight:600,color:'#475569',margin:'0 0 8px'}}>Настройки за синхронизация</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:'#475569',cursor:'pointer'}}><input type="radio" name="inv_sync" checked={invSyncMode==='manual'} onChange={() => setInvSyncMode('manual')} style={{width:'16px',height:'16px'}} /> Ръчно (фактурата няма да се изпрати автоматично)</label>
                  <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:'#475569',cursor:'pointer'}}><input type="radio" name="inv_sync" checked={invSyncMode==='immediate'} onChange={() => setInvSyncMode('immediate')} style={{width:'16px',height:'16px'}} /> Веднага (фактурата се изпраща незабавно)</label>
                  <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:'#475569',cursor:'pointer'}}><input type="radio" name="inv_sync" checked={invSyncMode==='delayed'} onChange={() => setInvSyncMode('delayed')} style={{width:'16px',height:'16px'}} /> След определено време
                    <input type="number" value={invDelayMinutes} onChange={e => setInvDelayMinutes(e.target.value)} min="1" style={{width:'60px',height:'24px',fontSize:'13px',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'0 6px',marginLeft:'4px'}} /> мин.</label>
                </div>
              </div>

              {/* SEC 12: Buttons */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'16px',padding:'12px 0'}}>
                <button onClick={() => invSaveInvoice('issued')} disabled={invSaving} style={{background:'#28a745',color:'#fff',fontWeight:600,fontSize:'15px',padding:'8px 40px',borderRadius:'8px',border:'none',cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.1)',opacity:invSaving?.5:1}}>{invSaving ? 'Запазване...' : (invEditInvoiceId ? 'Обнови фактурата' : 'Създай фактурата')}</button>
                <button onClick={() => invSaveInvoice('draft')} disabled={invSaving} style={{background:'#fff',color:'#334155',fontWeight:600,fontSize:'15px',padding:'8px 40px',borderRadius:'8px',border:'1px solid #cbd5e1',cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.1)',opacity:invSaving?.5:1}}>{invSaving ? 'Запазване...' : (invEditInvoiceId ? 'Запази чернова' : 'Създай чернова')}</button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Client Picker Modal ── */}
      {invModal === 'clientPicker' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setInvModal('invoice')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-base font-semibold">Избери клиент</h2>
              <button onClick={() => setInvModal('invoice')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 border-b">
              <input className="w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Търсене..." value={invPickerSearch} onChange={e => { setInvPickerSearch(e.target.value); invListClients(invCompanyId, invProfileId, e.target.value).then(setInvClients).catch(() => {}); }} />
            </div>
            <div className="flex-1 overflow-y-auto">
              {invClients.map(c => (
                <button key={c.id} onClick={() => { setInvSelectedClient(c); setInvModal('invoice'); }} className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">ЕИК: {c.eik || '—'} | {c.city || ''}</div>
                </button>
              ))}
              {invClients.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">Няма клиенти</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Item Picker Modal ── */}
      {invModal === 'itemPicker' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setInvModal('invoice')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-base font-semibold">Избери артикул</h2>
              <button onClick={() => setInvModal('invoice')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 border-b">
              <input className="w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Търсене..." value={invPickerSearch} onChange={e => setInvPickerSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
                  <th style={{textAlign:'left',padding:'6px 10px',fontWeight:600,color:'#334155'}}>Артикул</th>
                  <th style={{textAlign:'left',padding:'6px 10px',fontWeight:600,color:'#334155',width:'60px'}}>Мярка</th>
                  <th style={{textAlign:'right',padding:'6px 10px',fontWeight:600,color:'#334155',width:'80px'}}>Цена</th>
                  <th style={{textAlign:'center',padding:'6px 10px',fontWeight:600,color:'#334155',width:'60px'}}>ДДС %</th>
                </tr></thead>
                <tbody>
                  {invItems.filter(it => !invPickerSearch || it.name.toLowerCase().includes(invPickerSearch.toLowerCase())).map(item => (
                    <tr key={item.id} onClick={() => invSelectItem(item, invPickerLineIdx)} style={{borderBottom:'1px solid #f1f5f9',cursor:'pointer'}} onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{padding:'8px 10px',fontWeight:500}}>{item.name}<div style={{fontSize:'11px',color:'#94a3b8'}}>{item.unit}</div></td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontFamily:'monospace'}}>{Number(item.default_price).toFixed(2)} EUR</td>
                      <td style={{padding:'8px 10px',textAlign:'center',color:'#64748b'}}>{Number(item.vat_rate)}%</td>
                    </tr>
                  ))}
                  {invItems.filter(it => !invPickerSearch || it.name.toLowerCase().includes(invPickerSearch.toLowerCase())).length === 0 && (
                    <tr><td colSpan={4} style={{textAlign:'center',padding:'16px',color:'#94a3b8',fontSize:'13px'}}>Няма намерени артикули</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TR Lookup Modal ── */}
      {invModal === 'trLookup' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setInvModal('invoice')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-base font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-indigo-600" /> Търговски регистър</h2>
              <button onClick={() => setInvModal('invoice')} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Въведете ЕИК..." value={invTrEik} onChange={e => setInvTrEik(e.target.value)} onKeyDown={async e => { if (e.key === 'Enter' && invTrEik) { setInvTrLoading(true); setInvTrResult(null); try { const r = await invRegistryLookup(invTrEik); setInvTrResult(r); } catch (err) { invToastShow('Грешка: ' + (err instanceof Error ? err.message : ''), 'error'); } finally { setInvTrLoading(false); } }}} />
                <button onClick={async () => {
                  if (!invTrEik) return;
                  setInvTrLoading(true); setInvTrResult(null);
                  try { const r = await invRegistryLookup(invTrEik); setInvTrResult(r); } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                  finally { setInvTrLoading(false); }
                }} disabled={invTrLoading} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">{invTrLoading ? 'Търсене...' : 'Търси'}</button>
              </div>
              {invTrResult && (
                <div className="rounded-lg p-3 bg-gray-50 shadow-sm text-sm space-y-1">
                  <div><span className="text-gray-500">Име:</span> <strong>{invTrResult.name}</strong></div>
                  <div><span className="text-gray-500">ЕИК:</span> {invTrResult.eik}</div>
                  {invTrResult.vat_number && <div><span className="text-gray-500">ДДС:</span> {invTrResult.vat_number}</div>}
                  {invTrResult.address && <div><span className="text-gray-500">Адрес:</span> {invTrResult.address}</div>}
                  {invTrResult.city && <div><span className="text-gray-500">Град:</span> {invTrResult.city}</div>}
                  {invTrResult.mol && <div><span className="text-gray-500">МОЛ:</span> {invTrResult.mol}</div>}
                  <button onClick={async () => {
                    const data = { name: invTrResult!.name, eik: invTrResult!.eik, vat_number: invTrResult!.vat_number || '', address: invTrResult!.address || '', city: invTrResult!.city || '', mol: invTrResult!.mol || '', is_vat_registered: !!invTrResult!.vat_number, company_id: invCompanyId, profile_id: invProfileId };
                    try {
                      const created = await invCreateClient(data);
                      invToastShow('Клиентът е добавен');
                      setInvSelectedClient(created);
                      setInvModal('invoice');
                      invListClients(invCompanyId, invProfileId).then(setInvClients).catch(() => {});
                    } catch (e) { invToastShow('Грешка: ' + (e instanceof Error ? e.message : ''), 'error'); }
                  }} className="mt-2 w-full px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Добави като клиент</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

MainForm.displayName = 'MainForm';

export default MainForm;
