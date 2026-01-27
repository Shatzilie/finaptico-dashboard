import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useClientContext } from "@/context/ClientContext";
import { toast } from "@/hooks/use-toast";
import { Pencil, Plus, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

type TaxFiling = {
  id: string;
  client_code: string;
  tax_model_code: string;
  period_start: string;
  period_end: string;
  status: "DRAFT" | "PRESENTED" | "SETTLED";
  result: "PAYABLE" | "COMPENSABLE" | "REFUNDABLE" | "ZERO";
  amount: number;
  currency: string;
  presented_at: string | null;
  settled_at: string | null;
  reference: string | null;
  notes: string | null;
};

type FormData = {
  id: string;
  client_code: string;
  tax_model_code: string;
  period_start: string;
  period_end: string;
  status: "DRAFT" | "PRESENTED" | "SETTLED";
  result: "PAYABLE" | "COMPENSABLE" | "REFUNDABLE" | "ZERO";
  amount: number;
  currency: string;
  presented_at: string;
  settled_at: string;
  reference: string;
  notes: string;
};

const emptyForm: FormData = {
  id: "",
  client_code: "CLIENT_001",
  tax_model_code: "",
  period_start: "",
  period_end: "",
  status: "DRAFT",
  result: "PAYABLE",
  amount: 0,
  currency: "EUR",
  presented_at: "",
  settled_at: "",
  reference: "",
  notes: "",
};

const clientOptions = [
  { value: "CLIENT_001", label: "CLIENT_001" },
  { value: "CLIENT_002", label: "CLIENT_002" },
];

const statusOptions: { value: TaxFiling["status"]; label: string }[] = [
  { value: "DRAFT", label: "Borrador" },
  { value: "PRESENTED", label: "Presentado" },
  { value: "SETTLED", label: "Cerrado" },
];

const resultOptions: { value: TaxFiling["result"]; label: string }[] = [
  { value: "PAYABLE", label: "A pagar" },
  { value: "COMPENSABLE", label: "A compensar" },
  { value: "REFUNDABLE", label: "A devolver" },
  { value: "ZERO", label: "Resultado cero" },
];

export default function AdminTaxFilings() {
  const { session } = useAuth();
  const { canSwitchClient } = useClientContext();
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  // Solo admins pueden acceder
  if (!canSwitchClient) {
    return <Navigate to="/" replace />;
  }

  const loadFilings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tax_filings")
        .select("*")
        .order("period_start", { ascending: false });

      if (error) throw error;
      setFilings((data as TaxFiling[]) || []);
    } catch (err) {
      console.error("Error loading tax filings:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros fiscales.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilings();
  }, []);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = (filing: TaxFiling) => {
    setFormData({
      id: filing.id,
      client_code: filing.client_code,
      tax_model_code: filing.tax_model_code,
      period_start: filing.period_start,
      period_end: filing.period_end,
      status: filing.status,
      result: filing.result,
      amount: filing.amount,
      currency: filing.currency,
      presented_at: filing.presented_at ? filing.presented_at.slice(0, 16) : "",
      settled_at: filing.settled_at ? filing.settled_at.slice(0, 16) : "",
      reference: filing.reference || "",
      notes: filing.notes || "",
    });
    setIsEditing(true);
  };

  const handleNewFiling = () => {
    setFormData(emptyForm);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!session?.access_token) {
      toast({
        title: "Error",
        description: "No hay sesión activa.",
        variant: "destructive",
      });
      return;
    }

    // Validación básica
    if (!formData.client_code || !formData.tax_model_code || !formData.period_start || !formData.period_end) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const body = {
        id: formData.id || null,
        client_code: formData.client_code,
        tax_model_code: formData.tax_model_code,
        period_start: formData.period_start,
        period_end: formData.period_end,
        status: formData.status,
        result: formData.result,
        amount: formData.amount,
        currency: formData.currency,
        presented_at: formData.presented_at || null,
        settled_at: formData.settled_at || null,
        reference: formData.reference || null,
        notes: formData.notes || null,
      };

      const { data, error } = await supabase.functions.invoke("admin-tax-filing-upsert", {
        body,
      });

      if (error) throw error;

      toast({
        title: "Guardado",
        description: formData.id ? "Registro actualizado correctamente." : "Registro creado correctamente.",
      });

      handleNewFiling();
      loadFilings();
    } catch (err) {
      console.error("Error saving tax filing:", err);
      toast({
        title: "Error",
        description: "No se pudo guardar el registro.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Admin · Presentaciones fiscales</h1>
          <Button onClick={handleNewFiling} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        </div>

        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isEditing ? "Editar presentación fiscal" : "Crear presentación fiscal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* client_code */}
              <div className="space-y-2">
                <Label htmlFor="client_code">Cliente *</Label>
                <Select
                  value={formData.client_code}
                  onValueChange={(v) => handleInputChange("client_code", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* tax_model_code */}
              <div className="space-y-2">
                <Label htmlFor="tax_model_code">Modelo fiscal *</Label>
                <Input
                  id="tax_model_code"
                  value={formData.tax_model_code}
                  onChange={(e) => handleInputChange("tax_model_code", e.target.value)}
                  placeholder="Ej: 303, 111…"
                />
              </div>

              {/* period_start */}
              <div className="space-y-2">
                <Label htmlFor="period_start">Inicio del periodo *</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => handleInputChange("period_start", e.target.value)}
                />
              </div>

              {/* period_end */}
              <div className="space-y-2">
                <Label htmlFor="period_end">Fin del periodo *</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => handleInputChange("period_end", e.target.value)}
                />
              </div>

              {/* status */}
              <div className="space-y-2">
                <Label htmlFor="status">Estado *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleInputChange("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* result */}
              <div className="space-y-2">
                <Label htmlFor="result">Resultado *</Label>
                <Select
                  value={formData.result}
                  onValueChange={(v) => handleInputChange("result", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    {resultOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Importe *</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda *</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange("currency", e.target.value)}
                  placeholder="EUR"
                />
              </div>

              {/* presented_at */}
              <div className="space-y-2">
                <Label htmlFor="presented_at">Fecha de presentación</Label>
                <Input
                  id="presented_at"
                  type="datetime-local"
                  value={formData.presented_at}
                  onChange={(e) => handleInputChange("presented_at", e.target.value)}
                />
              </div>

              {/* settled_at */}
              <div className="space-y-2">
                <Label htmlFor="settled_at">Fecha de cierre</Label>
                <Input
                  id="settled_at"
                  type="datetime-local"
                  value={formData.settled_at}
                  onChange={(e) => handleInputChange("settled_at", e.target.value)}
                />
              </div>

              {/* reference */}
              <div className="space-y-2">
                <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => handleInputChange("reference", e.target.value)}
                  placeholder="Referencia opcional"
                />
              </div>

              {/* notes */}
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Notas adicionales…"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
              {isEditing && (
                <Button variant="outline" onClick={handleNewFiling}>
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Listado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Listado de presentaciones fiscales</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay registros fiscales.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filings.map((filing) => (
                    <TableRow key={filing.id}>
                      <TableCell className="font-medium">{filing.client_code}</TableCell>
                      <TableCell>{filing.tax_model_code}</TableCell>
                      <TableCell>{filing.period_start}</TableCell>
                      <TableCell>{filing.period_end}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          filing.status === "SETTLED" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : filing.status === "PRESENTED"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {statusOptions.find(s => s.value === filing.status)?.label || filing.status}
                        </span>
                      </TableCell>
                      <TableCell>{resultOptions.find(r => r.value === filing.result)?.label || filing.result}</TableCell>
                      <TableCell className="text-right">
                        {filing.amount.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} {filing.currency}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(filing)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
