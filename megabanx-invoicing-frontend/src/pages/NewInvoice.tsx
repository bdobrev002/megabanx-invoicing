import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/lib/company-context";
import { clientsApi, itemsApi, invoicesApi } from "@/lib/api";
import type { Client, Item } from "@/types";
import { Plus, X, GripVertical, Search } from "lucide-react";

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

  const [documentType, setDocumentType] = useState<"invoice" | "proforma">("invoice");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isPhysicalPerson, setIsPhysicalPerson] = useState(false);
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [taxEventDate, setTaxEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("\u0411\u0430\u043d\u043a\u043e\u0432 \u043f\u044a\u0442");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [noVat, setNoVat] = useState(false);
  const [noVatReason, setNoVatReason] = useState("");
  const [notesLang, setNotesLang] = useState<"bg" | "en">("bg");
  const [discount, setDiscount] = useState("0.00");
  const [vatRate, setVatRate] = useState("20");

  const [lines, setLines] = useState<LineItem[]>([
    { ...emptyLine },
    { ...emptyLine },
    { ...emptyLine },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!company) return;
    clientsApi.list({ company_id: company.id }).then(setClients).catch(() => {});
    itemsApi.list({ company_id: company.id }).then(setItems).catch(() => {});
    invoicesApi
      .getNextNumber(company.id, documentType)
      .then((data) => setInvoiceNumber(String(data.next_number).padStart(10, "0")))
      .catch(() => {});
  }, [company, documentType]);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.eik && c.eik.includes(clientSearch))
  );

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClientDropdown(false);
    if (client.is_vat_registered) setIsVatRegistered(true);
  };

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

  const calcLineTotal = (line: LineItem) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unit_price) || 0;
    return qty * price;
  };

  const subtotal = lines.reduce((sum, line) => sum + calcLineTotal(line), 0);
  const discountAmount = parseFloat(discount) || 0;
  const taxBase = subtotal - discountAmount;
  const vatAmount = noVat ? 0 : taxBase * (parseFloat(vatRate) / 100);
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
        vat_rate: parseFloat(vatRate) || 20,
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
            unit_price: parseFloat(line.unit_price) || 0,
            vat_rate: parseFloat(line.vat_rate) || 20,
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
        {"\u041d\u043e\u0432\u0430 \u0444\u0430\u043a\u0442\u0443\u0440\u0430"}
      </h1>

      {/* Document Type */}
      <div className="flex items-center gap-1 mb-5">
        <span className="text-sm font-semibold text-slate-700 mr-3">{"\u0422\u0438\u043f:"}</span>
        <label className="flex items-center gap-1.5 cursor-pointer mr-4">
          <input type="radio" name="docType" checked={documentType === "proforma"} onChange={() => setDocumentType("proforma")} className="w-3.5 h-3.5" />
          <span className={`text-sm ${documentType === "proforma" ? "font-bold" : ""}`}>{"\u041f\u0440\u043e\u0444\u043e\u0440\u043c\u0430"}</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer mr-4">
          <input type="radio" name="docType" checked={documentType === "invoice"} onChange={() => setDocumentType("invoice")} className="w-3.5 h-3.5" />
          <span className={`text-sm ${documentType === "invoice" ? "font-bold" : ""}`}>{"\u0424\u0430\u043a\u0442\u0443\u0440\u0430"}</span>
        </label>
      </div>

      {/* Two-column: Client (left) + Invoice Details (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 mb-4">
        {/* LEFT: Client data */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3" ref={clientDropdownRef}>
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u041a\u043b\u0438\u0435\u043d\u0442:"}</label>
            <div className="flex-1 relative">
              <div className="flex gap-1">
                <Input placeholder={"\u0422\u044a\u0440\u0441\u0435\u043d\u0435 \u043f\u043e \u0438\u043c\u0435 \u0438\u043b\u0438 \u0415\u0418\u041a..."} value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); if (!e.target.value) setSelectedClient(null); }} onFocus={() => setShowClientDropdown(true)} className="h-[30px] text-sm flex-1 rounded-sm border-slate-300" />
                <button className="h-[30px] w-[30px] border border-slate-300 rounded-sm bg-white flex items-center justify-center hover:bg-slate-50" title="Search"><Search className="h-3.5 w-3.5 text-blue-600" /></button>
              </div>
              {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-20 w-full mt-0.5 bg-white border border-slate-300 shadow-md max-h-48 overflow-auto">
                  {filteredClients.map((client) => (
                    <button key={client.id} onClick={() => selectClient(client)} className="w-full text-left px-3 py-1.5 hover:bg-blue-100 text-sm border-b border-slate-100 last:border-0">
                      <div className="font-medium text-sm">{client.name}</div>
                      <div className="text-xs text-slate-500">{client.eik && `\u0415\u0418\u041a: ${client.eik}`}{client.city && ` \u2022 ${client.city}`}</div>
                    </button>
                  ))}
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

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u0415\u0418\u041a/\u0411\u0443\u043b\u0441\u0442\u0430\u0442:"}</label>
            <div className="flex-1 flex gap-1">
              <Input value={selectedClient?.eik || ""} readOnly className="h-[30px] text-sm flex-1 rounded-sm border-slate-300 bg-white" />
              <button className="h-[30px] w-[30px] border border-slate-300 rounded-sm bg-white flex items-center justify-center hover:bg-slate-50" title="TR"><Search className="h-3.5 w-3.5 text-amber-600" /></button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-[130px] shrink-0" />
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={isVatRegistered || (selectedClient?.is_vat_registered ?? false)} onChange={(e) => setIsVatRegistered(e.target.checked)} className="w-3.5 h-3.5" />
              {"\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u043f\u043e \u0417\u0414\u0414\u0421"}
            </label>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u041c\u041e\u041b:"}</label>
            <Input value={selectedClient?.mol || ""} readOnly className="h-[30px] text-sm flex-1 rounded-sm border-slate-300 bg-white" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u0413\u0440\u0430\u0434:"}</label>
            <Input value={selectedClient?.city || ""} readOnly className="h-[30px] text-sm flex-1 rounded-sm border-slate-300 bg-white" />
          </div>

          <div className="flex items-start gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right pt-1">{"\u0410\u0434\u0440\u0435\u0441:"}<br /><span className="text-xs font-normal text-slate-500">{"\u043d\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f"}</span></label>
            <Textarea value={selectedClient?.address || ""} readOnly rows={2} className="text-sm flex-1 rounded-sm border-slate-300 bg-white resize-none" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u041f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b:"}</label>
            <Input value={selectedClient?.mol || ""} readOnly className="h-[30px] text-sm flex-1 rounded-sm border-slate-300 bg-white" />
          </div>
        </div>

        {/* RIGHT: Invoice details */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[185px] shrink-0 text-right">{documentType === "invoice" ? "\u0424\u0430\u043a\u0442\u0443\u0440\u0430" : "\u041f\u0440\u043e\u0444\u043e\u0440\u043c\u0430"} {"\u2116:"}<br /><span className="text-xs font-normal text-slate-500">{"\u0441\u043b\u0435\u0434\u0432\u0430\u0449\u0438\u044f\u0442 \u0441\u0432\u043e\u0431\u043e\u0434\u0435\u043d \u2116"}</span></label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="h-[30px] text-sm flex-1 rounded-sm border-slate-300 max-w-[180px]" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[185px] shrink-0 text-right">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u0438\u0437\u0434\u0430\u0432\u0430\u043d\u0435:"}</label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-[30px] text-sm rounded-sm border-slate-300 w-[160px]" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 w-[185px] shrink-0 text-right">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u0434\u0430\u043d\u044a\u0447\u043d\u043e \u0441\u044a\u0431\u0438\u0442\u0438\u0435:"}</label>
            <Input type="date" value={taxEventDate} onChange={(e) => setTaxEventDate(e.target.value)} className="h-[30px] text-sm rounded-sm border-slate-300 w-[160px]" />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-[185px] shrink-0 flex items-center justify-end gap-2">
              <input type="checkbox" checked={showDueDate} onChange={(e) => setShowDueDate(e.target.checked)} className="w-3.5 h-3.5" />
              <label className="text-sm font-semibold text-slate-700">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u043f\u0430\u0434\u0435\u0436:"}</label>
            </div>
            {showDueDate && <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-[30px] text-sm rounded-sm border-slate-300 w-[160px]" />}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="border border-slate-300 mb-1 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="w-[100px] px-1 py-2 border-r border-slate-200" />
              <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 border-r border-slate-200" style={{ minWidth: 220 }}>{"\u0410\u0440\u0442\u0438\u043a\u0443\u043b"}</th>
              <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 w-[130px] border-r border-slate-200">{"\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e"}</th>
              <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 w-[150px] border-r border-slate-200">{"\u0415\u0434. \u0446\u0435\u043d\u0430"}</th>
              <th className="text-center text-sm font-semibold text-slate-700 px-2 py-2 w-[100px]">{"\u0421\u0442\u043e\u0439\u043d\u043e\u0441\u0442"}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 group">
                <td className="px-1 py-1 text-center border-r border-slate-200">
                  <div className="flex items-center justify-center gap-0.5">
                    <button className="text-slate-400 hover:text-slate-600 cursor-grab p-0.5"><GripVertical className="h-4 w-4" /></button>
                    <button onClick={() => addLineAt(i)} className="text-blue-500 hover:text-blue-700 p-0.5"><Plus className="h-4 w-4" /></button>
                    <button onClick={() => removeLine(i)} disabled={lines.length <= 1} className="text-red-400 hover:text-red-600 disabled:text-slate-200 disabled:cursor-not-allowed p-0.5"><X className="h-4 w-4" /></button>
                  </div>
                </td>
                <td className="px-1 py-1 border-r border-slate-200 relative">
                  <Input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="h-[26px] text-sm border-slate-300 rounded-sm" />
                  {line.description && !line.item_id && items.some((item) => item.name.toLowerCase().startsWith(line.description.toLowerCase())) && (
                    <div className="absolute z-20 left-1 right-1 mt-0.5 bg-white border border-slate-300 shadow-md max-h-32 overflow-auto">
                      {items.filter((item) => item.name.toLowerCase().startsWith(line.description.toLowerCase())).slice(0, 5).map((item) => (
                        <button key={item.id} onClick={() => selectItem(i, item)} className="w-full text-left px-2 py-1 hover:bg-blue-100 text-sm">{item.name} \u2014 {Number(item.default_price).toFixed(2)} EUR</button>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-1 py-1 border-r border-slate-200">
                  <div className="flex gap-0.5 items-center">
                    <Input type="number" step="0.01" min="0" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} className="h-[26px] text-sm text-center border-slate-300 rounded-sm w-[55px]" />
                    <select value={line.unit} onChange={(e) => updateLine(i, "unit", e.target.value)} className="h-[26px] border border-slate-300 rounded-sm px-1 text-sm bg-white">
                      <option>{"\u0431\u0440."}</option><option>{"\u043a\u0433"}</option><option>{"\u043c"}</option><option>{"\u043b"}</option><option>{"\u043c\u00b2"}</option><option>{"\u043c\u00b3"}</option><option>{"\u0447\u0430\u0441"}</option><option>{"\u0434\u0435\u043d"}</option><option>{"\u043c\u0435\u0441."}</option><option>{"\u0443\u0441\u043b\u0443\u0433\u0430"}</option>
                    </select>
                  </div>
                </td>
                <td className="px-1 py-1 border-r border-slate-200">
                  <div className="flex gap-0.5 items-center">
                    <button onClick={() => updateLine(i, "unit_price", "")} className="text-slate-300 hover:text-red-400 p-0.5"><X className="h-3 w-3" /></button>
                    <Input type="number" step="0.01" min="0" value={line.unit_price} onChange={(e) => updateLine(i, "unit_price", e.target.value)} className="h-[26px] text-sm text-right border-slate-300 rounded-sm flex-1" />
                    <span className="text-xs text-slate-500 ml-1 shrink-0">EUR</span>
                  </div>
                </td>
                <td className="px-2 py-1 text-right text-sm font-medium">{calcLineTotal(line).toFixed(2)} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-2 py-1.5 border-t border-slate-200">
          <button onClick={addLine} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"><Plus className="h-3.5 w-3.5" /><span>{"\u0414\u043e\u0431\u0430\u0432\u0438 \u0440\u0435\u0434"}</span></button>
        </div>
      </div>

      {/* Totals */}
      <div className="flex flex-col items-end mb-3">
        <table className="border-collapse">
          <tbody>
            <tr>
              <td className="text-right text-sm text-slate-600 pr-4 py-1">{"\u0421\u0443\u043c\u0430 (\u0431\u0435\u0437 \u043e\u0442\u0441\u0442\u044a\u043f\u043a\u0430)"}</td>
              <td className="text-right text-sm font-semibold py-1 w-[120px]">{subtotal.toFixed(2)} EUR</td>
            </tr>
            <tr>
              <td className="text-right text-sm text-slate-600 pr-4 py-1">{"\u041e\u0442\u0441\u0442\u044a\u043f\u043a\u0430"}</td>
              <td className="text-right py-1">
                <div className="flex items-center justify-end gap-1">
                  <Input type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-[26px] text-sm text-right border-slate-300 rounded-sm w-[70px]" />
                  <span className="text-xs text-slate-500">EUR</span>
                </div>
              </td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="text-right text-sm text-slate-600 pr-4 py-1">{"\u0414\u0430\u043d\u044a\u0447\u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0430"}</td>
              <td className="text-right text-sm font-semibold py-1">
                <div>{taxBase.toFixed(2)} EUR</div>
                <div className="text-xs text-slate-500 font-normal">{(taxBase * 1.9558).toFixed(2)} {"\u043b\u0432."}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* VAT settings row */}
      <div className="flex items-start justify-between mb-3 border-t border-b border-slate-200 py-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-slate-700">{"\u0414\u0414\u0421 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438:"}</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input type="checkbox" checked={noVat} onChange={(e) => setNoVat(e.target.checked)} className="w-3.5 h-3.5" />
            {"\u041d\u0435 \u043d\u0430\u0447\u0438\u0441\u043b\u044f\u0432\u0430\u0439 \u0414\u0414\u0421 \u043f\u043e \u0442\u0430\u0437\u0438 \u0444\u0430\u043a\u0442\u0443\u0440\u0430"}
          </label>
          {noVat && (
            <select value={noVatReason} onChange={(e) => setNoVatReason(e.target.value)} className="h-[28px] border border-slate-300 rounded-sm px-2 text-sm bg-white">
              <option value="">{"\u0418\u0437\u0431\u0435\u0440\u0435\u0442\u0435 \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u0435..."}</option>
              <option value={"\u0447\u043b. 113, \u0430\u043b. 9 \u043e\u0442 \u0417\u0414\u0414\u0421"}>{"\u0447\u043b. 113, \u0430\u043b. 9 \u043e\u0442 \u0417\u0414\u0414\u0421"}</option>
              <option value={"\u0447\u043b. 21, \u0430\u043b. 2 \u043e\u0442 \u0417\u0414\u0414\u0421"}>{"\u0447\u043b. 21, \u0430\u043b. 2 \u043e\u0442 \u0417\u0414\u0414\u0421"}</option>
              <option value={"\u0447\u043b. 28 \u043e\u0442 \u0417\u0414\u0414\u0421"}>{"\u0447\u043b. 28 \u043e\u0442 \u0417\u0414\u0414\u0421 (\u0438\u0437\u043d\u043e\u0441)"}</option>
              <option value={"\u0447\u043b. 7 \u043e\u0442 \u0417\u0414\u0414\u0421"}>{"\u0447\u043b. 7 \u043e\u0442 \u0417\u0414\u0414\u0421 (\u0412\u041e\u0414)"}</option>
              <option value={"\u0447\u043b. 69, \u0430\u043b. 2 \u043e\u0442 \u0417\u0414\u0414\u0421"}>{"\u0447\u043b. 69, \u0430\u043b. 2 \u043e\u0442 \u0417\u0414\u0414\u0421"}</option>
              <option value={"\u043d\u0435\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0430\u043d\u043e \u043f\u043e \u0417\u0414\u0414\u0421 \u043b\u0438\u0446\u0435"}>{"\u041d\u0435\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0430\u043d\u043e \u043f\u043e \u0417\u0414\u0414\u0421 \u043b\u0438\u0446\u0435"}</option>
            </select>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-slate-600">{"\u0414\u0414\u0421"}</span>
            <select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="h-[26px] border border-slate-300 rounded-sm px-1 text-sm bg-white" disabled={noVat}>
              <option value="20">20%</option><option value="9">9%</option><option value="0">0%</option>
            </select>
          </div>
          <div className="text-sm font-semibold">{vatAmount.toFixed(2)} EUR</div>
          <div className="text-xs text-slate-500">{(vatAmount * 1.9558).toFixed(2)} {"\u043b\u0432."}</div>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-end mb-4 border-b border-slate-200 pb-2">
        <div className="text-right">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{"\u0421\u0443\u043c\u0430 \u0437\u0430 \u043f\u043b\u0430\u0449\u0430\u043d\u0435"}</span>
            <div>
              <div className="text-lg font-bold text-slate-900">{total.toFixed(2)} EUR</div>
              <div className="text-xs text-slate-500 font-semibold">{(total * 1.9558).toFixed(2)} {"\u043b\u0432."}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1" />
        <label className="text-sm text-slate-600">{"\u0421\u044a\u0441\u0442\u0430\u0432\u0438\u043b"}</label>
        <select className="h-[30px] border border-slate-300 rounded-sm px-2 text-sm bg-white min-w-[200px]">
          <option>{company.mol || company.name}</option>
        </select>
      </div>

      {/* Language tabs + Notes */}
      <div className="border-t border-slate-200 pt-3 mb-4">
        <div className="flex gap-4 mb-3">
          <button onClick={() => setNotesLang("bg")} className={`text-sm pb-1 ${notesLang === "bg" ? "text-slate-900 font-semibold border-b-2 border-slate-700" : "text-blue-500 hover:text-blue-700"}`}>{"\u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438 \u0435\u0437\u0438\u043a"}</button>
          <button onClick={() => setNotesLang("en")} className={`text-sm pb-1 ${notesLang === "en" ? "text-slate-900 font-semibold border-b-2 border-slate-700" : "text-blue-500 hover:text-blue-700"}`}>{"\u0410\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438 \u0435\u0437\u0438\u043a"}</button>
        </div>
        <div className="flex items-start gap-3 mb-4">
          <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right pt-1">{"\u0417\u0430\u0431\u0435\u043b\u0435\u0436\u043a\u0438"}<br /><span className="text-xs font-normal text-slate-500">{"\u0432\u0438\u0434\u0438\u043c\u0438 \u0437\u0430 \u043a\u043b\u0438\u0435\u043d\u0442\u0430"}</span></label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="text-sm flex-1 rounded-sm border-slate-300 resize-none" />
        </div>
      </div>

      {/* Payment */}
      <div className="flex items-center gap-3 mb-4 border-t border-slate-200 pt-3">
        <label className="text-sm font-semibold text-slate-700 w-[130px] shrink-0 text-right">{"\u041d\u0430\u0447\u0438\u043d \u043d\u0430 \u043f\u043b\u0430\u0449\u0430\u043d\u0435"}</label>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-[30px] border border-slate-300 rounded-sm px-2 text-sm bg-white">
          <option>{"\u0411\u0430\u043d\u043a\u043e\u0432 \u043f\u044a\u0442"}</option><option>{"\u0412 \u0431\u0440\u043e\u0439"}</option><option>{"\u0421 \u043a\u0430\u0440\u0442\u0430"}</option><option>PayPal</option><option>{"\u041d\u0430\u043b\u043e\u0436\u0435\u043d \u043f\u043b\u0430\u0442\u0435\u0436"}</option>
        </select>
        {paymentMethod === "\u0411\u0430\u043d\u043a\u043e\u0432 \u043f\u044a\u0442" && company.iban && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">{"\u041f\u043e \u0441\u043c\u0435\u0442\u043a\u0430:"}</span>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="w-3.5 h-3.5" />{company.bank_name || "\u0411\u0430\u043d\u043a\u0430"} (EUR)</label>
          </div>
        )}
      </div>

      {/* Internal comments */}
      <div className="border border-slate-300 rounded-sm mb-5">
        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-300">
          <span className="text-sm font-semibold text-slate-700">{"\u041a\u043e\u043c\u0435\u043d\u0442\u0430\u0440\u0438"}</span>
        </div>
        <div className="p-3">
          <p className="text-sm text-red-500 font-semibold mb-2">{"\u041d\u0430\u043f\u0438\u0448\u0435\u0442\u0435 \u043a\u043e\u043c\u0435\u043d\u0442\u0430\u0440 (\u043d\u0435 \u0441\u0435 \u0432\u0438\u0436\u0434\u0430 \u043e\u0442 \u043a\u043b\u0438\u0435\u043d\u0442\u0430):"}</p>
          <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} className="text-sm rounded-sm border-slate-300 resize-none" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-6 pb-8">
        <button onClick={() => handleSave("issued")} disabled={saving || !selectedClient} className="bg-[#28a745] hover:bg-[#218838] text-white font-semibold text-base px-12 py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
          {saving ? "\u0421\u044a\u0437\u0434\u0430\u0432\u0430\u043d\u0435..." : "\u0421\u044a\u0437\u0434\u0430\u0439 \u0444\u0430\u043a\u0442\u0443\u0440\u0430\u0442\u0430"}
        </button>
        <button onClick={() => handleSave("draft")} disabled={saving || !selectedClient} className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base px-12 py-2.5 rounded-md border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
          {"\u0421\u044a\u0437\u0434\u0430\u0439 \u0447\u0435\u0440\u043d\u043e\u0432\u0430"}
        </button>
      </div>
    </div>
  );
}
