import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompany } from "@/lib/company-context";
import { companiesApi } from "@/lib/api";
import { Save, Upload, Building2 } from "lucide-react";

export default function Settings() {
  const { company, refreshCompanies } = useCompany();
  const [saving, setSaving] = useState(false);
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
                <Input
                  value={form.eik}
                  onChange={(e) => updateField("eik", e.target.value)}
                  placeholder="123456789"
                />
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
                      src={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/uploads/logos/${company.id}.png`}
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
    </div>
  );
}
