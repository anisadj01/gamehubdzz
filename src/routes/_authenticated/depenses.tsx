import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, FileDown, Tags } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { money, fmtDate } from "@/lib/format";
import { exportCsv, exportExcel, exportPdf } from "@/lib/exports";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/depenses")({
  head: () => ({
    meta: [
      { title: "Dépenses — GameHub ERP" },
      { name: "description", content: "Loyer, électricité, salaires : suivez toutes les charges." },
      { property: "og:title", content: "Dépenses — GameHub ERP" },
      { property: "og:description", content: "Suivi des charges et calcul du bénéfice net." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [form, setForm] = useState({ category: "", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("spent_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = expenses.reduce((a, e) => a + Number(e.amount), 0);

  async function save() {
    const cat = categories.find((c) => c.id === form.category);
    if (!cat) { toast.error("Catégorie requise"); return; }
    if (!Number(form.amount)) { toast.error("Montant requis"); return; }
    const { error } = await supabase.from("expenses").insert({
      category_id: cat.id,
      category_name: cat.name,
      amount: Number(form.amount),
      spent_on: form.date,
      description: form.description.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Dépense enregistrée");
    setOpen(false);
    setForm({ ...form, amount: "", description: "" });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["expenses"] });
  }

  async function addCategory() {
    const name = newCat.trim();
    if (name.length < 2) { toast.error("Nom de catégorie requis"); return; }
    const { error } = await supabase
      .from("expense_categories")
      .insert({ name, venue_id: user?.venueId ?? null });
    if (error) { toast.error(error.message); return; }
    setNewCat("");
    toast.success("Catégorie ajoutée");
    qc.invalidateQueries({ queryKey: ["expense-categories"] });
  }

  async function removeCategory(id: string) {
    const { error } = await supabase.from("expense_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["expense-categories"] });
  }

  const columns = [
    { header: "Date", key: "spent_on" },
    { header: "Catégorie", key: "category_name" },
    { header: "Montant", key: "amount" },
    { header: "Description", key: "description" },
  ];

  return (
    <div>
      <PageHeader
        title="Dépenses"
        subtitle={`Total : ${money(total)}`}
        actions={
          <>
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Tags className="size-4" />
                  Catégories
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Catégories de dépenses</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      placeholder="Ex : Loyer, Électricité, Salaires"
                      maxLength={60}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addCategory(); } }}
                    />
                    <Button onClick={addCategory}>
                      <Plus className="size-4" />
                      Ajouter
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {categories.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucune catégorie pour l'instant.</p>
                    )}
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span>{c.name}</span>
                        <Button size="icon" variant="ghost" onClick={() => removeCategory(c.id)} aria-label="Supprimer">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => exportCsv("depenses", columns, expenses)}>
              <FileDown className="size-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => exportExcel("depenses", columns, expenses)}>
              <FileDown className="size-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => exportPdf("depenses", "Rapport des dépenses", columns, expenses, [`Total : ${money(total)}`])}>
              <FileDown className="size-4" />
              PDF
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="glow-ring">
                  <Plus className="size-4" />
                  Nouvelle dépense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle dépense</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 && (
                          <div className="px-2 py-3 text-xs text-muted-foreground">
                            Créez d'abord une catégorie via le bouton « Catégories ».
                          </div>
                        )}
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-amount">Montant (DA)</Label>
                    <Input id="e-amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-date">Date</Label>
                    <Input id="e-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-desc">Description</Label>
                    <Input id="e-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} />
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full glow-ring" onClick={save}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="glow-card overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{fmtDate(e.spent_on)}</TableCell>
                <TableCell className="font-medium">{e.category_name}</TableCell>
                <TableCell>{money(e.amount)}</TableCell>
                <TableCell className="text-muted-foreground">{e.description ?? "—"}</TableCell>
                <TableCell className="text-end">
                  <Button size="icon" variant="ghost" onClick={() => remove(e.id)} aria-label="Supprimer">
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
