import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCompany } from "@/lib/company-context";
import { clientsApi, itemsApi, invoicesApi } from "@/lib/api";
import type { Client, Item } from "@/types";
import { Plus, Trash2, Save, FileText } from "lucide-react";

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
  unit: "бр.",
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

  const [documentType, setDocumentType] = useState<"invoice" | "proforma">("invoice");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [taxEventDate, setTaxEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("По банка");
  const [notes, setNotes] = useState("");
  const [noVat, setNoVat] = useState(false);

  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }]);
  const [saving, setSaving] = useState(false);

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
  const vatRate = noVat ? 0 : 20;
  const vatAmount = noVat ? 0 : subtotal * (vatRate / 100);
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
        vat_rate: vatRate,
        no_vat: noVat,
        payment_method: paymentMethod || undefined,
        notes: notes || undefined,
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
      alert("Грешка при създаване на фактурата");
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return (
      <div className="text-center py-12 text-slate-500">
        Моля, настройте фирмата в Настройки.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Нова {documentType === "invoice" ? "Фактура" : "Проформа"}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={saving || !selectedClient}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Чернова
          </Button>
          <Button
            onClick={() => handleSave("issued")}
            disabled={saving || !selectedClient}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {saving ? "Създаване..." : "Създай"}
          </Button>
        </div>
      </div>

      {/* Document Type */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="docType"
                checked={documentType === "invoice"}
                onChange={() => setDocumentType("invoice")}
                className="accent-blue-600"
              />
              <span className="font-medium">Фактура</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="docType"
                checked={documentType === "proforma"}
                onChange={() => setDocumentType("proforma")}
                className="accent-blue-600"
              />
              <span className="font-medium">Проформа</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Клиент</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                placeholder="Търсене на клиент по име или ЕИК..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                  if (!e.target.value) setSelectedClient(null);
                }}
                onFocus={() => setShowClientDropdown(true)}
              />
              {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-0"
                    >
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-slate-500">
                        {client.eik && `ЕИК: ${client.eik}`}
                        {client.city && ` • ${client.city}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedClient && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
                <p className="font-medium">{selectedClient.name}</p>
                {selectedClient.eik && (
                  <p className="text-slate-600">ЕИК: {selectedClient.eik}</p>
                )}
                {selectedClient.city && (
                  <p className="text-slate-600">
                    {selectedClient.city}
                    {selectedClient.address && `, ${selectedClient.address}`}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Данни за документа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Номер</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Дата на издаване</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Дата на дан. събитие</Label>
              <Input
                type="date"
                value={taxEventDate}
                onChange={(e) => setTaxEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Дата на падеж</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Начин на плащане</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option>По банка</option>
                <option>В брой</option>
                <option>С карта</option>
                <option>PayPal</option>
                <option>Наложен платеж</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Артикули</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
              <div className="col-span-4">Описание</div>
              <div className="col-span-1">Мярка</div>
              <div className="col-span-2">Кол-во</div>
              <div className="col-span-2">Ед. цена</div>
              <div className="col-span-2 text-right">Стойност</div>
              <div className="col-span-1"></div>
            </div>

            <Separator />

            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 relative">
                  <Input
                    placeholder="Описание / артикул"
                    value={line.description}
                    onChange={(e) => updateLine(i, "description", e.target.value)}
                    list={`items-list-${i}`}
                  />
                  <datalist id={`items-list-${i}`}>
                    {items.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                  {/* Quick select from items catalog */}
                  {line.description &&
                    !line.item_id &&
                    items.some((item) =>
                      item.name
                        .toLowerCase()
                        .startsWith(line.description.toLowerCase())
                    ) && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-32 overflow-auto">
                        {items
                          .filter((item) =>
                            item.name
                              .toLowerCase()
                              .startsWith(line.description.toLowerCase())
                          )
                          .slice(0, 5)
                          .map((item) => (
                            <button
                              key={item.id}
                              onClick={() => selectItem(i, item)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                            >
                              {item.name} — {Number(item.default_price).toFixed(2)} EUR
                            </button>
                          ))}
                      </div>
                    )}
                </div>
                <div className="col-span-1">
                  <Input
                    value={line.unit}
                    onChange={(e) => updateLine(i, "unit", e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)}
                    className="text-right"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.unit_price}
                    onChange={(e) => updateLine(i, "unit_price", e.target.value)}
                    className="text-right"
                  />
                </div>
                <div className="col-span-2 text-right font-semibold text-sm pr-2">
                  {calcLineTotal(line).toFixed(2)} EUR
                </div>
                <div className="col-span-1 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 1}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addLine} className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Добави ред
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totals & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Допълнителни</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="no_vat"
                checked={noVat}
                onChange={(e) => setNoVat(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="no_vat">
                Не начислявай ДДС по тази фактура
              </Label>
            </div>
            <div>
              <Label>Забележки (видими за клиента)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Опционални забележки..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg">Суми</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Данъчна основа:</span>
              <span className="font-semibold">{subtotal.toFixed(2)} EUR</span>
            </div>
            {!noVat && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">ДДС (20%):</span>
                <span className="font-semibold">
                  {vatAmount.toFixed(2)} EUR
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-bold text-slate-900">Сума за плащане:</span>
              <span className="font-bold text-blue-600">
                {total.toFixed(2)} EUR
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
