import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/lib/company-context";
import { companiesApi, registryApi, numberSetsApi } from "@/lib/api";
import type { NumberSet } from "@/lib/api";
import { Save, Upload, Building2, Search, Loader2, Plus, Trash2 } from "lucide-react";

export default function Settings() {
  const { company, refreshCompanies } = useCompany();
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [numberSets, setNumberSets] = useState<NumberSet[]>([]);
  const [newNs, setNewNs] = useState({ name: "", range_from: "0000000001", range_to: "1000000000" });
  const [showNsForm, setShowNsForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    eik: "",
    vat_number: "",
    is_vat_registered: false,
    mol: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    iban: "",
    bank_name: "",
    bic: "",
  });

  useEffect(() => {
    if (company) {
      numberSetsApi.list(company.id).then(setNumberSets).catch(() => {});
      setForm({
        name: company.name || "",
        eik: company.eik || "",
        vat_number: company.vat_number || "",
        is_vat_registered: company.is_vat_registered,
        mol: company.mol || "",
        city: company.city || "",
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        iban: company.iban || "",
        bank_name: company.bank_name || "",
        bic: company.bic || "",
      });
    }
  }, [company]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (company) {
        await companiesApi.update(company.id, form);
      } else {
        await companiesApi.create(form);
      }
      await refreshCompanies();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    try {
      await companiesApi.uploadLogo(company.id, file);
      await refreshCompanies();
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const handleEikLookup = async () => {
    const eik = form.eik.trim();
    if (!eik || eik.length < 9) {
      setLookupError("Въведете валиден ЕИК (поне 9 цифри)");
      return;
    }
    setLookingUp(true);
    setLookupError("");
    try {
      const data = await registryApi.lookupEik(eik);
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        eik: data.eik || prev.eik,
        vat_number: data.vat_number || prev.vat_number,
        is_vat_registered: data.is_vat_registered,
        mol: data.mol || prev.mol,
        city: data.city || prev.city,
        address: data.address || prev.address,
        phone: data.phone || prev.phone,
        email: data.email || prev.email,
      }));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setLookupError(error.response?.data?.detail || "Грешка при търсене в Търговски регистър");
    } finally {
      setLookingUp(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Настройки</h1>
          <p className="text-slate-500 mt-1">Данни на фирмата</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Запазване..." : "Запази"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Фирмени данни
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Име на фирмата *</Label>
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Моята фирма ЕООД"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ЕИК *</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.eik}
                    onChange={(e) => { updateField("eik", e.target.value); setLookupError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEikLookup(); } }}
                    placeholder="123456789"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEikLookup}
                    disabled={lookingUp || !form.eik.trim()}
                    className="shrink-0 gap-1 px-3"
                    title="Попълни от Търговски регистър"
                  >
                    {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    ТР
                  </Button>
                </div>
                {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
              </div>
              <div>
                <Label>ИН по ЗДДС</Label>
                <Input
                  value={form.vat_number}
                  onChange={(e) => updateField("vat_number", e.target.value)}
                  placeholder="BG123456789"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vat_reg"
                checked={form.is_vat_registered}
                onChange={(e) => updateField("is_vat_registered", e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="vat_reg">Регистрирана по ЗДДС</Label>
            </div>
            <div>
              <Label>МОЛ</Label>
              <Input
                value={form.mol}
                onChange={(e) => updateField("mol", e.target.value)}
                placeholder="Иван Иванов"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Град</Label>
                <Input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="София"
                />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+359 888 123 456"
                />
              </div>
            </div>
            <div>
              <Label>Адрес</Label>
              <Textarea
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="ул. Примерна 1, ет. 2"
                rows={2}
              />
            </div>
            <div>
              <Label>Имейл</Label>
              <Input
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="office@firma.bg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Info & Logo */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Банкови данни</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>IBAN</Label>
                <Input
                  value={form.iban}
                  onChange={(e) => updateField("iban", e.target.value)}
                  placeholder="BG12XXXX12345678901234"
                />
              </div>
              <div>
                <Label>BIC</Label>
                <Input
                  value={form.bic}
                  onChange={(e) => updateField("bic", e.target.value)}
                  placeholder="XXXXBGSF"
                />
              </div>
              <div>
                <Label>Банка</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                  placeholder="Банка ХХХ"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Лого на фирмата</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {company?.logo_path ? (
                  <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border">
                    <img
                      src={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/companies/${company.id}/logo`}
                      alt="Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
                    <Building2 className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <div>
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    Качи лого
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={!company}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    PNG, JPG или SVG, макс. 2MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Number Sets (Кочани) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Номериране (кочани)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">Използвайте кочани за генериране на номера на фактури в определен диапазон.</p>
          {numberSets.length > 0 && (
            <div className="space-y-2">
              {numberSets.map((ns) => (
                <div key={ns.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-md border border-slate-200">
                  <span className="text-sm font-mono">{String(ns.range_from).padStart(10, "0")} — {String(ns.range_to).padStart(10, "0")}</span>
                  {ns.name && <span className="text-sm text-slate-600">({ns.name})</span>}
                  <button
                    onClick={async () => {
                      await numberSetsApi.delete(ns.id);
                      setNumberSets((prev) => prev.filter((n) => n.id !== ns.id));
                    }}
                    className="ml-auto text-red-400 hover:text-red-600 p-1"
                    title="Изтрий"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {showNsForm ? (
            <div className="p-3 border border-blue-200 rounded-md bg-blue-50 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>От номер</Label>
                  <Input value={newNs.range_from} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setNewNs((p) => ({ ...p, range_from: v })); }} onBlur={() => setNewNs((p) => ({ ...p, range_from: p.range_from ? p.range_from.padStart(10, "0") : p.range_from }))} placeholder="0000000001" className="font-mono" maxLength={10} />
                </div>
                <div>
                  <Label>До номер</Label>
                  <Input value={newNs.range_to} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setNewNs((p) => ({ ...p, range_to: v })); }} onBlur={() => setNewNs((p) => ({ ...p, range_to: p.range_to ? p.range_to.padStart(10, "0") : p.range_to }))} placeholder="1000000000" className="font-mono" maxLength={10} />
                </div>
                <div>
                  <Label>Име (по избор)</Label>
                  <Input value={newNs.name} onChange={(e) => setNewNs((p) => ({ ...p, name: e.target.value }))} placeholder="Основен" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!company) return;
                    const created = await numberSetsApi.create({
                      company_id: company.id,
                      name: newNs.name || undefined,
                      range_from: parseInt(newNs.range_from.replace(/^0+/, "") || "0") || 1,
                      range_to: parseInt(newNs.range_to.replace(/^0+/, "") || "0") || 1000000000,
                    });
                    setNumberSets((prev) => [...prev, created]);
                    setNewNs({ name: "", range_from: "0000000001", range_to: "1000000000" });
                    setShowNsForm(false);
                  }}
                >
                  Добави
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNsForm(false)}>Откажи</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowNsForm(true)}>
              <Plus className="h-4 w-4" /> Добави нов кочан
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
