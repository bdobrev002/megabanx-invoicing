import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/lib/company-context";
import { clientsApi, itemsApi, invoicesApi } from "@/lib/api";
import type { Client, Item } from "@/types";
import { Plus, Trash2, GripVertical } from "lucide-react";

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
  quantity: "1",
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
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [taxEventDate, setTaxEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("\u041f\u043e \u0431\u0430\u043d\u043a\u0430");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [noVat, setNoVat] = useState(false);
  const [noVatReason, setNoVatReason] = useState("");

  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }]);
  const [saving, setSaving] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load clients and items
  useEffect(() => {
    if (!company) return;
    clientsApi.list({ company_id: company.id }).then(setClients).catch(() => {});
    itemsApi.list({ company_id: company.id }).then(setItems).catch(() => {});
    invoicesApi
      .getNextNumber(company.id, documentType)
      .then((data) => setInvoiceNumber(String(data.next_number)))
      .catch(() => {});
  }, [company, documentType]);

  // Client autocomplete filter
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.eik && c.eik.includes(clientSearch))
  );

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  // Line item management
  const updateLine = (index: number, field: keyof LineItem, value: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, { ...emptyLine }]);
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

  // Calculations
  const calcLineTotal = (line: LineItem) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unit_price) || 0;
    return qty * price;
  };

  const subtotal = lines.reduce((sum, line) => sum + calcLineTotal(line), 0);
  const vatAmount = noVat ? 0 : subtotal * 0.2;
  const total = subtotal + vatAmount;

  // Save
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
        vat_rate: 20,
        no_vat: noVat,
        no_vat_reason: noVat ? noVatReason || undefined : undefined,
        payment_method: paymentMethod || undefined,
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        currency: "EUR",
        lines: lines.map((line, i) => ({
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
    <div className="space-y-4">
      {/* Document Type Selection - like inv.bg top bar */}
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-3 flex items-center gap-6">
        <span className="text-sm font-medium text-slate-500 mr-2">{"\u0422\u0438\u043f \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442:"}</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="docType"
            checked={documentType === "proforma"}
            onChange={() => setDocumentType("proforma")}
            className="w-4 h-4 accent-blue-600"
          />
          <span className={`text-sm ${documentType === "proforma" ? "font-semibold text-blue-700" : "text-slate-600"}`}>
            {"\u041f\u0440\u043e\u0444\u043e\u0440\u043c\u0430"}
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="docType"
            checked={documentType === "invoice"}
            onChange={() => setDocumentType("invoice")}
            className="w-4 h-4 accent-blue-600"
          />
          <span className={`text-sm ${documentType === "invoice" ? "font-semibold text-blue-700" : "text-slate-600"}`}>
            {"\u0424\u0430\u043a\u0442\u0443\u0440\u0430"}
          </span>
        </label>
      </div>

      {/* Main two-column layout: Client (left) + Invoice Details (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Client Section - Left side (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{"\u041a\u043b\u0438\u0435\u043d\u0442"}</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Client search */}
            <div className="relative" ref={clientDropdownRef}>
              <Label className="text-xs text-slate-500 mb-1 block">{"\u041a\u043b\u0438\u0435\u043d\u0442"}</Label>
              <Input
                placeholder={"\u0422\u044a\u0440\u0441\u0435\u043d\u0435 \u043f\u043e \u0438\u043c\u0435 \u0438\u043b\u0438 \u0415\u0418\u041a..."}
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                  if (!e.target.value) setSelectedClient(null);
                }}
                onFocus={() => setShowClientDropdown(true)}
                className="h-9"
              />
              {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-0"
                    >
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-slate-500">
                        {client.eik && `\u0415\u0418\u041a: ${client.eik}`}
                        {client.city && ` \u2022 ${client.city}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Client details grid - like inv.bg */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">{"\u0415\u0418\u041a / \u0411\u0443\u043b\u0441\u0442\u0430\u0442"}</Label>
                <Input
                  value={selectedClient?.eik || ""}
                  readOnly
                  className="h-9 bg-slate-50"
                  placeholder={"\u2014"}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">{"\u0414\u0414\u0421 \u043d\u043e\u043c\u0435\u0440"}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={selectedClient?.vat_number || ""}
                    readOnly
                    className="h-9 bg-slate-50"
                    placeholder={"\u2014"}
                  />
                  {selectedClient?.is_vat_registered && (
                    <span className="text-xs text-green-600 font-medium whitespace-nowrap">{"\u0420\u0435\u0433. \u043f\u043e \u0417\u0414\u0414\u0421"}</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">{"\u041c\u041e\u041b"}</Label>
                <Input
                  value={selectedClient?.mol || ""}
                  readOnly
                  className="h-9 bg-slate-50"
                  placeholder={"\u2014"}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">{"\u0413\u0440\u0430\u0434"}</Label>
                <Input
                  value={selectedClient?.city || ""}
                  readOnly
                  className="h-9 bg-slate-50"
                  placeholder={"\u2014"}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-500 mb-1 block">{"\u0410\u0434\u0440\u0435\u0441"}</Label>
                <Input
                  value={selectedClient?.address || ""}
                  readOnly
                  className="h-9 bg-slate-50"
                  placeholder={"\u2014"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Details - Right side (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              {documentType === "invoice" ? "\u0424\u0430\u043a\u0442\u0443\u0440\u0430" : "\u041f\u0440\u043e\u0444\u043e\u0440\u043c\u0430"} {"\u2116"}
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">
                {documentType === "invoice" ? "\u0424\u0430\u043a\u0442\u0443\u0440\u0430" : "\u041f\u0440\u043e\u0444\u043e\u0440\u043c\u0430"} {"\u2116"}
              </Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="h-9 text-lg font-bold text-center"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u0438\u0437\u0434\u0430\u0432\u0430\u043d\u0435"}</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u0434\u0430\u043d. \u0441\u044a\u0431\u0438\u0442\u0438\u0435"}</Label>
              <Input
                type="date"
                value={taxEventDate}
                onChange={(e) => setTaxEventDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">{"\u0414\u0430\u0442\u0430 \u043d\u0430 \u043f\u0430\u0434\u0435\u0436"}</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table - full width like inv.bg */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="w-8 px-2 py-2.5"></th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-2.5" style={{ minWidth: 280 }}>
                {"\u0410\u0440\u0442\u0438\u043a\u0443\u043b"}
              </th>
              <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-2.5 w-20">
                {"\u041a\u043e\u043b-\u0432\u043e"}
              </th>
              <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-2.5 w-20">
                {"\u041c\u044f\u0440\u043a\u0430"}
              </th>
              <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-2.5 w-28">
                {"\u0415\u0434. \u0446\u0435\u043d\u0430"}
              </th>
              <th className="text-center text-xs font-semibold text-slate-600 uppercase tracking-wider px-2 py-2.5 w-16">
                {"\u0412\u0430\u043b\u0443\u0442\u0430"}
              </th>
              <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 py-2.5 w-28">
                {"\u0421\u0442\u043e\u0439\u043d\u043e\u0441\u0442"}
              </th>
              <th className="w-10 px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 group">
                <td className="px-2 py-1.5 text-center">
                  <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-400 cursor-grab mx-auto" />
                </td>
                <td className="px-3 py-1.5 relative">
                  <Input
                    placeholder={"\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 / \u0430\u0440\u0442\u0438\u043a\u0443\u043b..."}
                    value={line.description}
                    onChange={(e) => updateLine(i, "description", e.target.value)}
                    className="h-8 text-sm border-slate-200"
                  />
                  {line.description &&
                    !line.item_id &&
                    items.some((item) =>
                      item.name.toLowerCase().startsWith(line.description.toLowerCase())
                    ) && (
                      <div className="absolute z-20 left-3 right-3 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-32 overflow-auto">
                        {items
                          .filter((item) =>
                            item.name.toLowerCase().startsWith(line.description.toLowerCase())
                          )
                          .slice(0, 5)
                          .map((item) => (
                            <button
                              key={item.id}
                              onClick={() => selectItem(i, item)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                            >
                              {item.name} {"\u2014"} {Number(item.default_price).toFixed(2)} EUR
                            </button>
                          ))}
                      </div>
                    )}
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)}
                    className="h-8 text-sm text-center border-slate-200"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={line.unit}
                    onChange={(e) => updateLine(i, "unit", e.target.value)}
                    className="h-8 w-full border border-slate-200 rounded-md px-2 text-sm text-center bg-white"
                  >
                    <option>{"\u0431\u0440."}</option>
                    <option>{"\u043a\u0433"}</option>
                    <option>{"\u043c"}</option>
                    <option>{"\u043b"}</option>
                    <option>{"\u043c\u00b2"}</option>
                    <option>{"\u043c\u00b3"}</option>
                    <option>{"\u0447\u0430\u0441"}</option>
                    <option>{"\u0434\u0435\u043d"}</option>
                    <option>{"\u043c\u0435\u0441."}</option>
                    <option>{"\u0443\u0441\u043b\u0443\u0433\u0430"}</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.unit_price}
                    onChange={(e) => updateLine(i, "unit_price", e.target.value)}
                    className="h-8 text-sm text-right border-slate-200"
                  />
                </td>
                <td className="px-2 py-1.5 text-center text-sm text-slate-500">
                  EUR
                </td>
                <td className="px-3 py-1.5 text-right font-semibold text-sm">
                  {calcLineTotal(line).toFixed(2)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 1}
                    className="text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={addLine}
            className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            {"\u0414\u043e\u0431\u0430\u0432\u0438 \u0440\u0435\u0434"}
          </Button>
        </div>
      </div>

      {/* Bottom section: VAT/Notes (left) + Totals (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: VAT settings + Notes + Payment */}
        <div className="lg:col-span-7 space-y-4">
          {/* VAT Settings */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="no_vat"
                checked={noVat}
                onChange={(e) => setNoVat(e.target.checked)}
                className="rounded border-slate-300 w-4 h-4"
              />
              <Label htmlFor="no_vat" className="text-sm cursor-pointer">
                {"\u041d\u0435 \u043d\u0430\u0447\u0438\u0441\u043b\u044f\u0432\u0430\u0439 \u0414\u0414\u0421 \u043f\u043e \u0442\u0430\u0437\u0438 \u0444\u0430\u043a\u0442\u0443\u0440\u0430"}
              </Label>
            </div>
            {noVat && (
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">{"\u041e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u0437\u0430 \u043d\u0435\u043d\u0430\u0447\u0438\u0441\u043b\u044f\u0432\u0430\u043d\u0435 \u043d\u0430 \u0414\u0414\u0421"}</Label>
                <select
                  value={noVatReason}
                  onChange={(e) => setNoVatReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white h-9"
                >
                  <option value="">{"\u0418\u0437\u0431\u0435\u0440\u0435\u0442\u0435 \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u0435..."}</option>
                  <option value="\u0447\u043b. 113, \u0430\u043b. 9 \u043e\u0442 \u0417\u0414\u0414\u0421">{"\u0447\u043b. 113, \u0430\u043b. 9 \u043e\u0442 \u0417\u0414\u0414\u0421"}</option>
                  <option value="\u0447\u043b. 21, \u0430\u043b. 2 \u043e\u0442 \u0417\u0414\u0414\u0421">{"\u0447\u043b. 21, \u0430\u043b. 2 \u043e\u0442 \u0417\u0414\u0414\u0421"}</option>
                  <option value="\u0447\u043b. 28 \u043e\u0442 \u0417\u0414\u0414\u0421">{"\u0447\u043b. 28 \u043e\u0442 \u0417\u0414\u0414\u0421 (\u0438\u0437\u043d\u043e\u0441)"}</option>
                  <option value="\u0447\u043b. 7 \u043e\u0442 \u0417\u0414\u0414\u0421">{"\u0447\u043b. 7 \u043e\u0442 \u0417\u0414\u0414\u0421 (\u0412\u041e\u0414)"}</option>
                  <option value="\u0447\u043b. 69, \u0430\u043b. 2 \u043e\u0442 \u0417\u0414\u0414\u0421">{"\u0447\u043b. 69, \u0430\u043b. 2 \u043e\u0442 \u0417\u0414\u0414\u0421"}</option>
                  <option value="\u043d\u0435\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0430\u043d\u043e \u043f\u043e \u0417\u0414\u0414\u0421 \u043b\u0438\u0446\u0435">{"\u041d\u0435\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0430\u043d\u043e \u043f\u043e \u0417\u0414\u0414\u0421 \u043b\u0438\u0446\u0435"}</option>
                </select>
              </div>
            )}
          </div>

          {/* Payment + Notes */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">{"\u041d\u0430\u0447\u0438\u043d \u043d\u0430 \u043f\u043b\u0430\u0449\u0430\u043d\u0435"}</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white h-9"
              >
                <option>{"\u041f\u043e \u0431\u0430\u043d\u043a\u0430"}</option>
                <option>{"\u0412 \u0431\u0440\u043e\u0439"}</option>
                <option>{"\u0421 \u043a\u0430\u0440\u0442\u0430"}</option>
                <option>PayPal</option>
                <option>{"\u041d\u0430\u043b\u043e\u0436\u0435\u043d \u043f\u043b\u0430\u0442\u0435\u0436"}</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">{"\u0417\u0430\u0431\u0435\u043b\u0435\u0436\u043a\u0438 (\u0432\u0438\u0434\u0438\u043c\u0438 \u0437\u0430 \u043a\u043b\u0438\u0435\u043d\u0442\u0430)"}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={"\u0417\u0430\u0431\u0435\u043b\u0435\u0436\u043a\u0438 \u043a\u044a\u043c \u0444\u0430\u043a\u0442\u0443\u0440\u0430\u0442\u0430..."}
                rows={2}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">{"\u041a\u043e\u043c\u0435\u043d\u0442\u0430\u0440\u0438 (\u0432\u044a\u0442\u0440\u0435\u0448\u043d\u0438, \u043d\u0435 \u0441\u0435 \u0432\u0438\u0436\u0434\u0430\u0442 \u043e\u0442 \u043a\u043b\u0438\u0435\u043d\u0442\u0430)"}</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder={"\u0412\u044a\u0442\u0440\u0435\u0448\u043d\u0438 \u0431\u0435\u043b\u0435\u0436\u043a\u0438..."}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right: Totals */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{"\u0421\u0443\u043c\u0438"}</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{"\u0414\u0430\u043d\u044a\u0447\u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0430:"}</span>
                <span className="font-medium text-slate-800">{subtotal.toFixed(2)} EUR</span>
              </div>
              {!noVat && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{"\u0414\u0414\u0421 (20%):"}</span>
                  <span className="font-medium text-slate-800">{vatAmount.toFixed(2)} EUR</span>
                </div>
              )}
              {noVat && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{"\u0414\u0414\u0421:"}</span>
                  <span className="font-medium text-slate-400">0.00 EUR</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-slate-900">{"\u0421\u0443\u043c\u0430 \u0437\u0430 \u043f\u043b\u0430\u0449\u0430\u043d\u0435:"}</span>
                  <span className="text-xl font-bold text-blue-600">{total.toFixed(2)} EUR</span>
                </div>
              </div>
            </div>

            {/* Action Buttons - at bottom of totals like inv.bg */}
            <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 space-y-2">
              <Button
                onClick={() => handleSave("issued")}
                disabled={saving || !selectedClient}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium h-10"
              >
                {saving ? "\u0421\u044a\u0437\u0434\u0430\u0432\u0430\u043d\u0435..." : `\u0421\u044a\u0437\u0434\u0430\u0439 ${documentType === "invoice" ? "\u0444\u0430\u043a\u0442\u0443\u0440\u0430\u0442\u0430" : "\u043f\u0440\u043e\u0444\u043e\u0440\u043c\u0430\u0442\u0430"}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave("draft")}
                disabled={saving || !selectedClient}
                className="w-full h-9 text-sm"
              >
                {"\u0421\u044a\u0437\u0434\u0430\u0439 \u0447\u0435\u0440\u043d\u043e\u0432\u0430"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
