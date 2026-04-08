import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/lib/company-context";
import { clientsApi, itemsApi, invoicesApi, numberSetsApi } from "@/lib/api";
import type { NumberSet } from "@/lib/api";
import type { Client, Item } from "@/types";
import { Plus, X, GripVertical, List, CloudCog, Pencil, ChevronDown } from "lucide-react";
import { registryApi } from "@/lib/api";

const NO_VAT_REASONS = [
  "чл.113 ал.9 от ЗДДС - лицето не е регистрирано по ЗДДС",
  "чл.86, ал.3 и чл.21 от ЗДДС",
  "чл.82, ал. 2 от ЗДДС - обратно начисляване",
  "чл.21 от ЗДДС - услугата е извън територията на България",
  "чл.21 ал.2 от ЗДДС",
];

interface LineItem {
  item_id: string | null;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  vat_rate: string;
}

const emptyLine: LineItem = {
  item_id: null,
  description: "",
  quantity: "1.00",
  unit: "\u0431\u0440.",
  unit_price: "0.00",
  vat_rate: "20.00",
};

export default function NewInvoice() {
  const navigate = useNavigate();
  const { company } = useCompany();

  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [documentType, setDocumentType] = useState<"invoice" | "proforma" | "debit_note" | "credit_note">("invoice");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isPhysicalPerson, setIsPhysicalPerson] = useState(false);
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [taxEventDate, setTaxEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("В брой");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [noVat, setNoVat] = useState(false);
  const [noVatReason, setNoVatReason] = useState("");
  const [showNoVatReasonDropdown, setShowNoVatReasonDropdown] = useState(false);
  const [vatPerLine, setVatPerLine] = useState(false);
  const noVatReasonRef = useRef<HTMLDivElement>(null);
  const [notesLang, setNotesLang] = useState<"bg" | "en">("bg");
  const [discount, setDiscount] = useState("0.00");
  const [discountType, setDiscountType] = useState<"EUR" | "%">("EUR");
  const [vatRate, setVatRate] = useState("20");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [priceMode, setPriceMode] = useState<"without_vat" | "with_vat">("without_vat");
  const [showPriceModeDropdown, setShowPriceModeDropdown] = useState(false);
  const [numberSets, setNumberSets] = useState<NumberSet[]>([]);
  const [selectedNumberSet, setSelectedNumberSet] = useState<string>("");
  const [taxEventDateManuallyChanged, setTaxEventDateManuallyChanged] = useState(false);
  const [showCreateKochan, setShowCreateKochan] = useState(false);
  const [newKochanFrom, setNewKochanFrom] = useState("");
  const [newKochanTo, setNewKochanTo] = useState("");
  const [newKochanName, setNewKochanName] = useState("");
  const [creatingKochan, setCreatingKochan] = useState(false);
  const kochanRef = useRef<HTMLDivElement>(null);

  const [lines, setLines] = useState<LineItem[]>([
    { ...emptyLine },
    { ...emptyLine },
    { ...emptyLine },
  ]);
  const [saving, setSaving] = useState(false);
  const [showClientList, setShowClientList] = useState(false);
  const [trEik, setTrEik] = useState("");
  const [trLoading, setTrLoading] = useState(false);
  const [showTrDialog, setShowTrDialog] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const itemPickerRef = useRef<HTMLDivElement>(null);
  const trDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
      if (itemPickerRef.current && !itemPickerRef.current.contains(e.target as Node)) {
        setShowItemPicker(null);
      }
      if (trDialogRef.current && !trDialogRef.current.contains(e.target as Node)) {
        setShowTrDialog(false);
      }
      if (noVatReasonRef.current && !noVatReasonRef.current.contains(e.target as Node)) {
        setShowNoVatReasonDropdown(false);
      }
      if (kochanRef.current && !kochanRef.current.contains(e.target as Node)) {
        setShowCreateKochan(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!company) return;
    clientsApi.list({ company_id: company.id }).then(setClients).catch(() => {});
    itemsApi.list({ company_id: company.id }).then(setItems).catch(() => {});
    numberSetsApi.list(company.id).then(setNumberSets).catch(() => {});
    invoicesApi
      .getNextNumber(company.id, documentType)
      .then((data) => setInvoiceNumber(String(data.next_number).padStart(10, "0")))
      .catch(() => {});
  }, [company, documentType]);

  const handleCreateKochan = async () => {
    if (!company || !newKochanFrom || !newKochanTo) return;
    setCreatingKochan(true);
    try {
      await numberSetsApi.create({
        company_id: company.id,
        range_from: parseInt(newKochanFrom.replace(/^0+/, "") || "0"),
        range_to: parseInt(newKochanTo.replace(/^0+/, "") || "0"),
        name: newKochanName || undefined,
      });
      const updated = await numberSetsApi.list(company.id);
      setNumberSets(updated);
      setShowCreateKochan(false);
      setNewKochanFrom("");
      setNewKochanTo("");
      setNewKochanName("");
    } catch {
      alert("Грешка при създаване на кочан");
    } finally {
      setCreatingKochan(false);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      (company?.eik ? c.eik !== company.eik : true) &&
      (c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (isPhysicalPerson ? (c.egn && c.egn.includes(clientSearch)) : (c.eik && c.eik.includes(clientSearch))))
  );

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClientDropdown(false);
    setShowClientList(false);
    if (client.is_vat_registered) setIsVatRegistered(true);
  };

  const handleTrLookup = async () => {
    if (!trEik || trEik.length < 9 || !company) return;
    setTrLoading(true);
    try {
      const data = await registryApi.lookupEik(trEik);
      // Create or find client from TR data
      const existingClient = clients.find((c) => c.eik === data.eik);
      if (existingClient) {
        selectClient(existingClient);
      } else {
        const newClient = await clientsApi.create({
          company_id: company.id,
          name: data.name,
          eik: data.eik,
          vat_number: data.vat_number || null,
          is_vat_registered: data.is_vat_registered,
          mol: data.mol || null,
          city: data.city || null,
          address: data.address || null,
        } as Partial<Client>);
        setClients((prev) => [...prev, newClient]);
        selectClient(newClient);
      }
      setShowTrDialog(false);
      setTrEik("");
    } catch {
      alert("\u0413\u0440\u0435\u0448\u043a\u0430 \u043f\u0440\u0438 \u0442\u044a\u0440\u0441\u0435\u043d\u0435 \u0432 \u0422\u044a\u0440\u0433\u043e\u0432\u0441\u043a\u0438 \u0440\u0435\u0433\u0438\u0441\u0442\u044a\u0440");
    } finally {
      setTrLoading(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  const updateLine = (index: number, field: keyof LineItem, value: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);

  const addLineAt = (index: number) => {
    setLines((prev) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, { ...emptyLine });
      return updated;
    });
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setLines((prev) => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, dragged);
      return updated;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const selectItem = (index: number, item: Item) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        item_id: item.id,
        description: item.name,
        unit: item.unit,
        unit_price: String(item.default_price),
        vat_rate: String(item.vat_rate),
      };
      return updated;
    });
  };

  const getBasePrice = (line: LineItem) => {
    const price = parseFloat(line.unit_price) || 0;
    if (priceMode === "with_vat") {
      const rate = vatPerLine ? (parseFloat(line.vat_rate) || 20) : (parseFloat(vatRate) || 20);
      return price / (1 + rate / 100);
    }
    return price;
  };

  const calcLineTotal = (line: LineItem) => {
    const qty = parseFloat(line.quantity) || 0;
    return qty * getBasePrice(line);
  };

  const subtotal = lines.reduce((sum, line) => sum + calcLineTotal(line), 0);
  const discountRaw = parseFloat(discount) || 0;
  const discountAmount = discountType === "%" ? subtotal * (discountRaw / 100) : discountRaw;
  const taxBase = Math.max(0, subtotal - discountAmount);
  const vatAmount = noVat ? 0 : vatPerLine
    ? (() => {
        const lineVatSum = lines.reduce((sum, line) => {
          const base = calcLineTotal(line);
          const rate = parseFloat(line.vat_rate);
          return sum + base * ((isNaN(rate) ? 20 : rate) / 100);
        }, 0);
        return subtotal > 0 ? lineVatSum * (taxBase / subtotal) : 0;
      })()
    : taxBase * (parseFloat(vatRate) / 100);
  const total = taxBase + vatAmount;

  const handleSave = async (saveStatus: "issued" | "draft") => {
    if (!company || !selectedClient) return;
    setSaving(true);
    try {
      const payload = {
        company_id: company.id,
        client_id: selectedClient.id,
        document_type: documentType,
        invoice_number: parseInt(invoiceNumber) || undefined,
        issue_date: issueDate,
        tax_event_date: taxEventDate,
        due_date: dueDate || undefined,
        status: saveStatus,
        vat_rate: (() => { const r = parseFloat(vatRate); return isNaN(r) ? 20 : r; })(),
        discount: discountAmount,
        no_vat: noVat,
        no_vat_reason: noVat ? noVatReason || undefined : undefined,
        payment_method: paymentMethod || undefined,
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        currency: "EUR",
        lines: lines
          .filter((line) => line.description.trim() !== "")
          .map((line, i) => ({
            item_id: line.item_id || undefined,
            position: i,
            description: line.description,
            quantity: parseFloat(line.quantity) || 1,
            unit: line.unit,
            unit_price: getBasePrice(line),
            vat_rate: (() => { const r = parseFloat(line.vat_rate); return isNaN(r) ? 20 : r; })(),
          })),
      };
      const invoice = await invoicesApi.create(payload);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert("\u0413\u0440\u0435\u0448\u043a\u0430 \u043f\u0440\u0438 \u0441\u044a\u0437\u0434\u0430\u0432\u0430\u043d\u0435 \u043d\u0430 \u0444\u0430\u043a\u0442\u0443\u0440\u0430\u0442\u0430");
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return (
      <div className="text-center py-12 text-slate-500">
        {"\u041c\u043e\u043b\u044f, \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u0442\u0435 \u0444\u0438\u0440\u043c\u0430\u0442\u0430 \u0432 \u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438."}
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Title */}
      <h1 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-slate-300 pb-2">
        Нова фактура
      </h1>

      {/* Document Type */}
      <div className="flex items-center gap-1 mb-5">
        <span className="text-sm font-semibold text-slate-700 mr-3">Тип:</span>
        {([
          { value: "proforma" as const, label: "Проформа" },
          { value: "invoice" as const, label: "Фактура" },
          { value: "debit_note" as const, label: "Дебитно известие" },
          { value: "credit_note" as const, label: "Кредитно известие" },
        ]).map((dt) => (
          <label key={dt.value} className="flex items-center gap-1.5 cursor-pointer mr-4">
            <input type="radio" name="docType" checked={documentType === dt.value} onChange={() => setDocumentType(dt.value)} className="w-3.5 h-3.5 accent-blue-600" />
            <span className={`text-sm ${documentType === dt.value ? "font-bold" : ""}`}>{dt.label}</span>
          </label>
        ))}
      </div>

      {/* Two-column: Client (left) + Invoice Details (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 mb-4">
        {/* LEFT: Client data */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3" ref={clientDropdownRef}>
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u041a\u043b\u0438\u0435\u043d\u0442:"}</label>
            <div className="flex-1 relative">
                <div className="flex gap-1">
                  <Input placeholder={isPhysicalPerson ? "Търсене по име или ЕГН..." : "Търсене по име или ЕИК..."} value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); if (!e.target.value) setSelectedClient(null); }} onFocus={() => setShowClientDropdown(true)} className="h-[30px] text-sm flex-1 rounded-md border-slate-300 bg-amber-50 focus:bg-white" />
                  <button onClick={() => setShowClientList(!showClientList)} className="h-[30px] w-[30px] border border-slate-300 rounded-md bg-white flex items-center justify-center hover:bg-blue-50 transition-colors" title="Избери от списъка"><List className="h-3.5 w-3.5 text-blue-600" /></button>
                  {!isPhysicalPerson && <button onClick={() => setShowTrDialog(!showTrDialog)} className="h-[30px] w-[30px] border border-slate-300 rounded-md bg-white flex items-center justify-center hover:bg-amber-50 transition-colors" title="Търсене в Търговски регистър"><CloudCog className="h-3.5 w-3.5 text-amber-600" /></button>}
                </div>
              {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-20 w-full mt-0.5 bg-white border border-slate-300 shadow-lg max-h-48 overflow-auto rounded-md">
                  {filteredClients.map((client) => (
                    <button key={client.id} onClick={() => selectClient(client)} className="w-full text-left px-3 py-1.5 hover:bg-blue-100 text-sm border-b border-slate-100 last:border-0">
                      <div className="font-medium text-sm">{client.name}</div>
                      <div className="text-xs text-slate-500">{isPhysicalPerson ? (client.egn && `ЕГН: ${client.egn}`) : (client.eik && `ЕИК: ${client.eik}`)}{client.city && ` \u2022 ${client.city}`}</div>
                    </button>
                  ))}
                </div>
              )}
              {/* Client list picker (from DB) */}
              {showClientList && (
                <div className="absolute z-30 w-full mt-0.5 bg-white border border-blue-300 shadow-lg max-h-64 overflow-auto rounded-md">
                  <div className="sticky top-0 bg-blue-50 px-3 py-1.5 border-b border-blue-200 text-xs font-semibold text-blue-700">{"\u0418\u0437\u0431\u0435\u0440\u0435\u0442\u0435 \u043a\u043b\u0438\u0435\u043d\u0442 \u043e\u0442 \u0431\u0430\u0437\u0430\u0442\u0430"}</div>
                  {clients.filter((c) => company?.eik ? c.eik !== company.eik : true).length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">{"\u041d\u044f\u043c\u0430 \u0434\u043e\u0431\u0430\u0432\u0435\u043d\u0438 \u043a\u043b\u0438\u0435\u043d\u0442\u0438"}</div>
                  ) : (
                    clients.filter((c) => company?.eik ? c.eik !== company.eik : true).map((client) => (
                      <button key={client.id} onClick={() => selectClient(client)} className="w-full text-left px-3 py-1.5 hover:bg-blue-100 text-sm border-b border-slate-100 last:border-0">
                        <div className="font-medium">{client.name}</div>
                        <div className="text-xs text-slate-500">{isPhysicalPerson ? (client.egn && `ЕГН: ${client.egn}`) : (client.eik && `ЕИК: ${client.eik}`)}{client.city && ` \u2022 ${client.city}`}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {/* TR Dialog (search by EIK in Trade Registry) */}
              {showTrDialog && (
                <div ref={trDialogRef} className="absolute z-30 w-full mt-0.5 bg-white border border-amber-300 shadow-lg rounded-md p-3">
                  <div className="text-xs font-semibold text-amber-700 mb-2">Търсене по ЕИК в Търговски регистър</div>
                  <div className="flex gap-1">
                    <Input placeholder="Въведете ЕИК..." value={trEik} onChange={(e) => setTrEik(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleTrLookup(); }} className="h-[30px] text-sm flex-1 rounded-md border-amber-300 bg-amber-50" />
                    <button onClick={handleTrLookup} disabled={trLoading || trEik.length < 9} className="h-[30px] px-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {trLoading ? "\u0422\u044a\u0440\u0441\u0438..." : "\u0422\u0420"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-[130px] shrink-0" />
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={isPhysicalPerson} onChange={(e) => setIsPhysicalPerson(e.target.checked)} className="w-3.5 h-3.5" />
              {"\u041a\u043b\u0438\u0435\u043d\u0442\u044a\u0442 \u0435 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u043e \u043b\u0438\u0446\u0435"}
            </label>
          </div>

          {isPhysicalPerson ? (
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">ЕГН:</label>
              <Input value={selectedClient?.egn || ""} readOnly className="h-[30px] text-sm flex-1 rounded-md border-slate-300 bg-slate-50" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u0415\u0418\u041a/\u0411\u0443\u043b\u0441\u0442\u0430\u0442:"}</label>
                <div className="flex-1 flex gap-1">
                  <Input value={selectedClient?.eik || ""} readOnly className="h-[30px] text-sm flex-1 rounded-md border-slate-300 bg-slate-50" />
                  <button onClick={() => setShowTrDialog(!showTrDialog)} className="h-[30px] w-[30px] border border-slate-300 rounded-md bg-white flex items-center justify-center hover:bg-amber-50 transition-colors" title="Търсене в ТР"><CloudCog className="h-3.5 w-3.5 text-amber-600" /></button>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <div className="w-[130px] shrink-0" />
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={isVatRegistered || (selectedClient?.is_vat_registered ?? false)} onChange={(e) => setIsVatRegistered(e.target.checked)} className="w-3.5 h-3.5" />
              {"\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u043f\u043e \u0417\u0414\u0414\u0421"}
            </label>
          </div>

          {!isPhysicalPerson && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u041c\u041e\u041b:"}</label>
              <Input value={selectedClient?.mol || ""} readOnly className="h-[30px] text-sm flex-1 rounded-md border-slate-300 bg-slate-50" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">Град:</label>
            <Input value={selectedClient?.city || ""} readOnly className="h-[30px] text-sm flex-1 rounded-md border-slate-300 bg-slate-50" />
          </div>

          <div className="flex items-start gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right pt-1">Адрес:<br /><span className="text-xs font-normal text-slate-500">на регистрация</span></label>
            <Textarea value={selectedClient?.address || ""} readOnly rows={2} className="text-sm flex-1 rounded-md border-slate-300 bg-slate-50 resize-none" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u041f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b:"}</label>
            <div className="flex-1 flex gap-1">
              <Input value={selectedClient?.mol || ""} readOnly className="h-[30px] text-sm flex-1 rounded-md border-slate-300 bg-slate-50" />
              <button className="h-[30px] w-[30px] border border-slate-300 rounded-md bg-white flex items-center justify-center hover:bg-blue-50 transition-colors" title="Избери получател"><List className="h-3.5 w-3.5 text-blue-600" /></button>
            </div>
          </div>
        </div>

        {/* RIGHT: Invoice details */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 relative" ref={kochanRef}>
            <label className="text-sm font-semibold text-slate-700 w-[185px] shrink-0 text-right">Кочан:</label>
            {numberSets.length > 0 ? (
              <select value={selectedNumberSet} onChange={(e) => setSelectedNumberSet(e.target.value)} className="h-[30px] border border-slate-300 rounded-md px-2 text-sm bg-white">
                <option value="">Без кочан</option>
                {numberSets.map((ns) => (
                  <option key={ns.id} value={ns.id}>
                    {String(ns.range_from).padStart(10, "0")} - {String(ns.range_to).padStart(10, "0")}{ns.name ? ` (${ns.name})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <button onClick={() => setShowCreateKochan(!showCreateKochan)} className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline">кочан</button>
            )}
            {showCreateKochan && (
              <div className="absolute z-30 mt-1 bg-white border border-blue-300 shadow-lg rounded-md p-3 w-[340px]" style={{ top: "100%", right: 0 }}>
                <p className="text-xs text-slate-500 mb-2">Тук може да създадете и изберете кочани с диапазон на номерата за издаване на фактури</p>
                <div className="flex gap-1 mb-1.5">
                  <Input placeholder="От №" value={newKochanFrom} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setNewKochanFrom(v); }} onBlur={() => { if (newKochanFrom) setNewKochanFrom(newKochanFrom.padStart(10, "0")); }} className="h-[28px] text-sm rounded-md border-slate-300 flex-1 font-mono" maxLength={10} />
                  <Input placeholder="До №" value={newKochanTo} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setNewKochanTo(v); }} onBlur={() => { if (newKochanTo) setNewKochanTo(newKochanTo.padStart(10, "0")); }} className="h-[28px] text-sm rounded-md border-slate-300 flex-1 font-mono" maxLength={10} />
                </div>
                <Input placeholder="Име (по избор)" value={newKochanName} onChange={(e) => setNewKochanName(e.target.value)} className="h-[28px] text-sm rounded-md border-slate-300 mb-2 w-full" />
                <button onClick={handleCreateKochan} disabled={creatingKochan || !newKochanFrom || !newKochanTo} className="w-full h-[28px] bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {creatingKochan ? "Създаване..." : "Създай кочан"}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[185px] shrink-0 text-right">{{invoice: "Фактура", proforma: "Проформа", debit_note: "Дебитно изв.", credit_note: "Кредитно изв."}[documentType]} №:<br /><span className="text-xs font-normal text-slate-500">следващият свободен №</span></label>
            <div className="flex gap-1 items-center">
              <Input value={invoiceNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setInvoiceNumber(v); }} onBlur={() => { if (invoiceNumber) setInvoiceNumber(invoiceNumber.padStart(10, "0")); }} className="h-[30px] text-sm rounded-md border-blue-300 bg-blue-50 font-mono font-semibold text-blue-800 max-w-[160px]" maxLength={10} />
              <button className="h-[30px] w-[30px] border border-blue-300 rounded-md bg-white flex items-center justify-center hover:bg-blue-50 transition-colors" title="Редактирай №"><Pencil className="h-3.5 w-3.5 text-blue-500" /></button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[185px] shrink-0 text-right">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u0438\u0437\u0434\u0430\u0432\u0430\u043d\u0435:"}</label>
            <Input type="date" value={issueDate} onChange={(e) => { setIssueDate(e.target.value); if (!taxEventDateManuallyChanged) setTaxEventDate(e.target.value); }} className="h-[30px] text-sm rounded-md border-slate-300 w-[160px]" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[185px] shrink-0 text-right">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u0434\u0430\u043d\u044a\u0447\u043d\u043e \u0441\u044a\u0431\u0438\u0442\u0438\u0435:"}</label>
            <Input type="date" value={taxEventDate} onChange={(e) => { setTaxEventDate(e.target.value); setTaxEventDateManuallyChanged(true); }} className="h-[30px] text-sm rounded-md border-slate-300 w-[160px]" />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-[185px] shrink-0 flex items-center justify-end gap-2">
              <input type="checkbox" checked={showDueDate} onChange={(e) => { setShowDueDate(e.target.checked); if (e.target.checked && !dueDate) setDueDate(issueDate); }} className="w-3.5 h-3.5" />
              <label className="text-sm font-semibold text-slate-700">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u043f\u0430\u0434\u0435\u0436:"}</label>
            </div>
            {showDueDate && <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-[30px] text-sm rounded-md border-slate-300 w-[160px]" />}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="border border-slate-300 rounded-md mb-1 bg-white overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="w-[100px] px-1 py-2 border-r border-slate-200" />
              <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 border-r border-slate-200" style={{ minWidth: 220 }}>{"\u0410\u0440\u0442\u0438\u043a\u0443\u043b"}</th>
              <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 w-[130px] border-r border-slate-200">{"\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e"}</th>
              <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 w-[150px] border-r border-slate-200 relative">
                <button onClick={() => setShowPriceModeDropdown(!showPriceModeDropdown)} className="inline-flex items-center gap-0.5 hover:text-blue-600">
                  {priceMode === "without_vat" ? "Цена без ДДС" : "Цена с ДДС"}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showPriceModeDropdown && (
                  <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-300 shadow-lg rounded-md mt-0.5">
                    <button onClick={() => { setPriceMode("without_vat"); setShowPriceModeDropdown(false); }} className={`w-full text-left px-2 py-1 text-sm hover:bg-blue-50 ${priceMode === "without_vat" ? "bg-blue-100 font-semibold" : ""}`}>Цена без ДДС</button>
                    <button onClick={() => { setPriceMode("with_vat"); setShowPriceModeDropdown(false); }} className={`w-full text-left px-2 py-1 text-sm hover:bg-blue-50 ${priceMode === "with_vat" ? "bg-blue-100 font-semibold" : ""}`}>Цена с ДДС</button>
                  </div>
                )}
              </th>
              {vatPerLine && <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 w-[80px] border-r border-slate-200">ДДС %</th>}
              <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 w-[100px]">Стойност</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                className={`border-b border-slate-200 hover:bg-slate-50 group transition-colors ${dragIndex === i ? "opacity-40 bg-blue-50" : ""} ${dragOverIndex === i && dragIndex !== i ? "border-t-2 border-t-blue-500" : ""}`}
              >
                <td className="px-1 py-1 text-center border-r border-slate-200">
                  <div className="flex items-center justify-center gap-0.5">
                    <button draggable onDragStart={() => handleDragStart(i)} className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-0.5"><GripVertical className="h-4 w-4" /></button>
                    <button onClick={() => addLineAt(i)} className="text-blue-500 hover:text-blue-700 p-0.5"><Plus className="h-4 w-4" /></button>
                    <button onClick={() => removeLine(i)} disabled={lines.length <= 1} className="text-red-400 hover:text-red-600 disabled:text-slate-200 disabled:cursor-not-allowed p-0.5"><X className="h-4 w-4" /></button>
                  </div>
                </td>
                <td className="px-1 py-1 border-r border-slate-200 relative">
                  <div className="flex gap-0.5 items-center">
                    <Input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="h-[26px] text-sm border-slate-300 rounded-md flex-1" />
                    <button onClick={() => { setShowItemPicker(showItemPicker === i ? null : i); setItemSearch(""); }} className="h-[26px] w-[26px] border border-slate-300 rounded-md bg-white flex items-center justify-center hover:bg-blue-50 transition-colors shrink-0" title="Избери от каталога"><List className="h-3 w-3 text-blue-600" /></button>
                  </div>
                  {line.description && !line.item_id && items.some((item) => item.name.toLowerCase().startsWith(line.description.toLowerCase())) && (
                    <div className="absolute z-20 left-1 right-1 mt-0.5 bg-white border border-slate-300 shadow-lg max-h-32 overflow-auto rounded-md">
                      {items.filter((item) => item.name.toLowerCase().startsWith(line.description.toLowerCase())).slice(0, 5).map((item) => (
                        <button key={item.id} onClick={() => selectItem(i, item)} className="w-full text-left px-2 py-1 hover:bg-blue-100 text-sm">{item.name} {"\u2014"} {Number(item.default_price).toFixed(2)} EUR</button>
                      ))}
                    </div>
                  )}
                  {/* Item picker from catalog */}
                  {showItemPicker === i && (
                    <div ref={itemPickerRef} className="absolute z-30 left-1 right-1 mt-0.5 bg-white border border-blue-300 shadow-lg max-h-52 overflow-auto rounded-md">
                      <div className="sticky top-0 bg-blue-50 px-2 py-1 border-b border-blue-200">
                        <Input placeholder="Търсене в каталога..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="h-[24px] text-xs border-blue-200 rounded-md" autoFocus />
                      </div>
                      {filteredItems.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-slate-500">{"\u041d\u044f\u043c\u0430 \u0430\u0440\u0442\u0438\u043a\u0443\u043b\u0438"}</div>
                      ) : (
                        filteredItems.slice(0, 10).map((item) => (
                          <button key={item.id} onClick={() => { selectItem(i, item); setShowItemPicker(null); }} className="w-full text-left px-2 py-1 hover:bg-blue-100 text-sm border-b border-slate-100 last:border-0">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-slate-500 ml-2">{Number(item.default_price).toFixed(2)} EUR</span>
                            <span className="text-slate-400 ml-1 text-xs">/ {item.unit}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </td>
                <td className="px-1 py-1 border-r border-slate-200">
                  <div className="flex gap-0.5 items-center">
                    <Input type="number" step="0.01" min="0" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} className="h-[26px] text-sm text-center border-slate-300 rounded-md w-[70px]" />
                    <select value={line.unit} onChange={(e) => updateLine(i, "unit", e.target.value)} className="h-[26px] border border-slate-300 rounded-md px-1 text-sm bg-white">
                      <option>{"\u0431\u0440."}</option><option>{"\u043a\u0433"}</option><option>{"\u043c"}</option><option>{"\u043b"}</option><option>{"\u043c\u00b2"}</option><option>{"\u043c\u00b3"}</option><option>{"\u0447\u0430\u0441"}</option><option>{"\u0434\u0435\u043d"}</option><option>{"\u043c\u0435\u0441."}</option><option>{"\u0443\u0441\u043b\u0443\u0433\u0430"}</option>
                    </select>
                  </div>
                </td>
                <td className="px-1 py-1 border-r border-slate-200">
                  <div className="flex gap-0.5 items-center">
                    <button onClick={() => updateLine(i, "unit_price", "")} className="text-slate-300 hover:text-red-400 p-0.5"><X className="h-3 w-3" /></button>
                    <Input type="number" step="0.01" min="0" value={line.unit_price} onChange={(e) => updateLine(i, "unit_price", e.target.value)} className="h-[26px] text-sm text-right border-slate-300 rounded-md flex-1" />
                    <span className="text-xs text-slate-500 ml-1 shrink-0">EUR</span>
                  </div>
                </td>
                {vatPerLine && (
                  <td className="px-1 py-1 border-r border-slate-200">
                    <select value={line.vat_rate} onChange={(e) => updateLine(i, "vat_rate", e.target.value)} className="h-[26px] border border-slate-300 rounded-md px-1 text-sm bg-white w-full">
                      <option value="20">20%</option><option value="9">9%</option><option value="0">0%</option>
                    </select>
                  </td>
                )}
                <td className="px-2 py-1 text-right text-sm font-medium">{calcLineTotal(line).toFixed(2)} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row + Subtotal - outside table border */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <button onClick={addLine} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"><Plus className="h-3.5 w-3.5" /><span>{"Добави ред"}</span></button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{"Сума (без отстъпка)"}</span>
          <span className="text-sm font-semibold w-[120px] text-right">{subtotal.toFixed(2)} EUR</span>
        </div>
      </div>

      {/* Totals + VAT + Total - compact section */}
      <div className="flex flex-col items-end mb-1">
        <table className="border-collapse">
          <tbody>
            <tr>
              <td className="text-right text-sm text-slate-600 pr-4 py-0.5">{"Отстъпка"}</td>
              <td className="text-right py-0.5">
                <div className="flex items-center justify-end gap-1">
                  <Input type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-[24px] text-sm text-right border-slate-300 rounded-md w-[70px]" />
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "EUR" | "%")} className="h-[24px] border border-slate-300 rounded-md px-1 text-xs bg-white w-[52px]">
                    <option value="EUR">EUR</option>
                    <option value="%">%</option>
                  </select>
                </div>
              </td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="text-right text-sm text-slate-600 pr-4 py-0.5">{"Данъчна основа"}</td>
              <td className="text-right text-sm font-semibold py-0.5 w-[120px]">
                {taxBase.toFixed(2)} EUR
                <div className="text-xs text-slate-500 font-normal">{(taxBase * 1.95583).toFixed(2)} {"лв."}</div>
              </td>
            </tr>
            <tr>
              <td className="text-right text-sm text-slate-600 pr-4 py-0.5">
                <div className="flex items-center justify-end gap-2">
                  <span>{"ДДС"}</span>
                  <select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="h-[22px] border border-slate-300 rounded-md px-1 text-sm bg-white" disabled={noVat || vatPerLine}>
                    <option value="20">20%</option><option value="9">9%</option><option value="0">0%</option>
                  </select>
                </div>
              </td>
              <td className="text-right text-sm font-semibold py-0.5">
                {vatAmount.toFixed(2)} EUR
                <div className="text-xs text-slate-500 font-normal">{(vatAmount * 1.95583).toFixed(2)} {"лв."}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* VAT settings row - compact */}
      <div className="flex items-start mb-1 border-t border-b border-slate-200 py-1.5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-slate-700">{"ДДС настройки:"}</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input type="checkbox" checked={noVat} onChange={(e) => setNoVat(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
            Не начислявай ДДС по тази фактура
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input type="checkbox" checked={vatPerLine} onChange={(e) => setVatPerLine(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
            ДДС на всеки ред
          </label>
          {noVat && (
            <div className="w-full mt-1">
              <div className="text-sm text-slate-600 mb-0.5">Основание за неначисляване на ДДС:</div>
            <div className="relative" ref={noVatReasonRef}>
              <div className="flex items-center">
                      <Input
                        value={noVatReason}
                        onChange={(e) => setNoVatReason(e.target.value)}
                        onFocus={() => setShowNoVatReasonDropdown(true)}
                        placeholder="Основание за неначисляване..."
                        className="h-[26px] text-sm rounded-md border-slate-300 bg-white pr-14 min-w-[280px]"
                      />
                      {noVatReason && (
                        <button
                          onClick={() => setNoVatReason("")}
                          className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowNoVatReasonDropdown(!showNoVatReasonDropdown)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
              </div>
              {showNoVatReasonDropdown && (
                <div className="absolute z-30 w-full mt-0.5 bg-white border border-slate-300 shadow-lg rounded-md max-h-48 overflow-auto">
                  {NO_VAT_REASONS.filter((r) => !noVatReason || r.toLowerCase().includes(noVatReason.toLowerCase())).map((reason) => (
                    <button
                      key={reason}
                      onClick={() => { setNoVatReason(reason); setShowNoVatReasonDropdown(false); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-0"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Total + Composer - compact */}
      <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">{"\u0421\u044a\u0441\u0442\u0430\u0432\u0438\u043b"}</label>
          <select className="h-[28px] border border-slate-300 rounded-md px-2 text-sm bg-white min-w-[200px]">
            <option>{company.mol || company.name}</option>
          </select>
        </div>
        <div className="text-right flex items-center gap-4">
          <span className="text-sm text-slate-600">{"\u0421\u0443\u043c\u0430 \u0437\u0430 \u043f\u043b\u0430\u0449\u0430\u043d\u0435"}</span>
          <div>
            <div className="text-lg font-bold text-slate-900">{total.toFixed(2)} EUR</div>
            <div className="text-xs text-slate-500 font-semibold">{(total * 1.95583).toFixed(2)} {"\u043b\u0432."}</div>
          </div>
        </div>
      </div>

      {/* Language tabs + Notes - compact */}
      <div className="pt-2 mb-2">
        <div className="flex gap-4 mb-2">
          <button onClick={() => setNotesLang("bg")} className={`text-sm pb-1 ${notesLang === "bg" ? "text-slate-900 font-semibold border-b-2 border-slate-700" : "text-blue-500 hover:text-blue-700"}`}>Български език</button>
          <button onClick={() => setNotesLang("en")} className={`text-sm pb-1 ${notesLang === "en" ? "text-slate-900 font-semibold border-b-2 border-slate-700" : "text-blue-500 hover:text-blue-700"}`}>Английски език</button>
        </div>
        <div className="flex items-start gap-3 mb-2">
          <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right pt-1">{"\u0417\u0430\u0431\u0435\u043b\u0435\u0436\u043a\u0438"}<br /><span className="text-xs font-normal text-slate-500">{"\u0432\u0438\u0434\u0438\u043c\u0438 \u0437\u0430 \u043a\u043b\u0438\u0435\u043d\u0442\u0430"}</span></label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm flex-1 rounded-md border-slate-300 resize-none" />
        </div>
      </div>

      {/* Payment - compact */}
      <div className="flex items-center gap-3 mb-2 border-t border-slate-200 pt-2">
        <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u041d\u0430\u0447\u0438\u043d \u043d\u0430 \u043f\u043b\u0430\u0449\u0430\u043d\u0435"}</label>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-[30px] border border-slate-300 rounded-md px-2 text-sm bg-white">
          <option>В брой</option>
          <option>Банков път</option>
          <option>Наложен платеж</option>
          <option>С карта</option>
          <option>Платежно нареждане</option>
          <option>Чек/Ваучер</option>
          <option>С насрещно прихващане</option>
          <option>Паричен превод</option>
          <option>E-Pay</option>
          <option>PayPal</option>
          <option>Stripe</option>
          <option>EasyPay</option>
          <option>Пощенски паричен превод</option>
          <option>Друг</option>
        </select>
        {paymentMethod === "\u0411\u0430\u043d\u043a\u043e\u0432 \u043f\u044a\u0442" && company.iban && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">{"\u041f\u043e \u0441\u043c\u0435\u0442\u043a\u0430:"}</span>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="w-3.5 h-3.5" />{company.bank_name || "\u0411\u0430\u043d\u043a\u0430"} (EUR)</label>
          </div>
        )}
      </div>

      {/* Internal comments - compact */}
      <div className="border border-slate-300 rounded-md mb-3">
        <div className="bg-slate-50 px-3 py-1 border-b border-slate-300">
          <span className="text-sm font-semibold text-slate-700">{"\u041a\u043e\u043c\u0435\u043d\u0442\u0430\u0440\u0438"}</span>
          <span className="text-xs text-red-500 ml-2">(не се вижда от клиента)</span>
        </div>
        <div className="p-2">
          <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className="text-sm rounded-md border-slate-300 resize-none" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-6 pb-6">
        <button onClick={() => handleSave("issued")} disabled={saving || !selectedClient} className="bg-[#28a745] hover:bg-[#218838] text-white font-semibold text-base px-12 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors">
          {saving ? "\u0421\u044a\u0437\u0434\u0430\u0432\u0430\u043d\u0435..." : "\u0421\u044a\u0437\u0434\u0430\u0439 \u0444\u0430\u043a\u0442\u0443\u0440\u0430\u0442\u0430"}
        </button>
        <button onClick={() => handleSave("draft")} disabled={saving || !selectedClient} className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base px-12 py-2.5 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors">
          {"\u0421\u044a\u0437\u0434\u0430\u0439 \u0447\u0435\u0440\u043d\u043e\u0432\u0430"}
        </button>
      </div>
    </div>
  );
}
