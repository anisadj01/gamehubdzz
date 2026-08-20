import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, logActivity } from "@/lib/auth";
import {
  fetchProducts,
  fetchProductCategories,
  type Product,
  type ProductCategory,
} from "@/lib/queries";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/boutique")({
  head: () => ({
    meta: [
      { title: "Boutique & stock — GameHub ERP" },
      { name: "description", content: "Produits, prix et niveaux de stock de la salle de jeux." },
      { property: "og:title", content: "Boutique & stock — GameHub ERP" },
      { property: "og:description", content: "Gestion des boissons, snacks et alertes de stock." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: prodCategories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: fetchProductCategories,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "100", stock: "20", threshold: "5" });
  const [formCategory, setFormCategory] = useState<string>("");

  async function addProduct() {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const { error } = await supabase.from("products").insert({
      name: form.name.trim(),
      category_id: formCategory || null,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.threshold) || 5,
    });
    if (error) { toast.error(error.message); return; }
    await logActivity("création", "produit", form.name.trim());
    toast.success("Produit ajouté");
    setOpen(false);
    setForm({ name: "", price: "100", stock: "20", threshold: "5" });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function restock(id: string, current: number, delta: number, name: string) {
    const next = Math.max(0, current + delta);
    const { error } = await supabase.from("products").update({ stock: next }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("inventory_movements").insert({
      product_id: id,
      product_name: name,
      delta,
      reason: delta > 0 ? "réapprovisionnement" : "ajustement",
      user_id: user?.id ?? null,
    });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div>
      <PageHeader
        title="Boutique & stock"
        subtitle={`${products.length} produits`}
        actions={
          isAdmin ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="glow-ring">
                  <Plus className="size-4" />
                  Nouveau produit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau produit</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sans catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {prodCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(
                    [
                      ["name", "Nom", "text"],
                      ["price", "Prix (DA)", "number"],
                      ["stock", "Stock initial", "number"],
                      ["threshold", "Seuil d'alerte", "number"],
                    ] as const
                  ).map(([key, label, type]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button className="w-full glow-ring" onClick={addProduct}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {isAdmin && (
        <CategoryManager
          categories={prodCategories}
          onChanged={() => qc.invalidateQueries({ queryKey: ["product-categories"] })}
        />
      )}

      <div className="glow-card overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {prodCategories.find((c) => c.id === p.category_id)?.name ?? "—"}
                </TableCell>
                <TableCell>{money(p.price)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      p.stock <= p.low_stock_threshold
                        ? "border-destructive/40 text-destructive"
                        : "border-primary/40 text-primary"
                    }
                  >
                    {p.stock}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => restock(p.id, p.stock, 10, p.name)}>
                      +10
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => restock(p.id, p.stock, -1, p.name)}>
                      -1
                    </Button>
                    {isAdmin && (
                      <>
                        <EditProductDialog
                          product={p}
                          categories={prodCategories}
                          onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => remove(p.id)} aria-label="Supprimer">
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CategoryManager({
  categories,
  onChanged,
}: {
  categories: ProductCategory[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");

  async function add() {
    if (name.trim().length < 2) { toast.error("Nom de catégorie requis"); return; }
    const { error } = await supabase.from("product_categories").insert({ name: name.trim() });
    if (error) { toast.error(error.message); return; }
    setName("");
    toast.success("Catégorie ajoutée");
    onChanged();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("product_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  }

  return (
    <div className="glow-card mb-4 rounded-2xl p-4">
      <h2 className="font-display text-sm font-semibold">Catégories de produits</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <Badge key={c.id} variant="outline" className="gap-1 border-accent/40 text-accent">
            {c.name}
            <button
              type="button"
              onClick={() => remove(c.id)}
              aria-label={`Supprimer ${c.name}`}
              className="ms-1 hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          </Badge>
        ))}
        {categories.length === 0 && (
          <span className="text-xs text-muted-foreground">Aucune catégorie</span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Boissons fraîches"
          maxLength={40}
        />
        <Button variant="outline" onClick={add}>
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}

function EditProductDialog({
  product,
  categories,
  onSaved,
}: {
  product: Product;
  categories: ProductCategory[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(product.category_id ?? "");
  const [form, setForm] = useState({
    name: product.name,
    price: String(product.price),
    stock: String(product.stock),
    threshold: String(product.low_stock_threshold),
  });

  async function save() {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const { error } = await supabase
      .from("products")
      .update({
        name: form.name.trim(),
        category_id: categoryId || null,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        low_stock_threshold: Number(form.threshold) || 5,
      })
      .eq("id", product.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("modification", "produit", form.name.trim());
    toast.success("Produit mis à jour");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Modifier">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sans catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(
            [
              ["name", "Nom", "text"],
              ["price", "Prix (DA)", "number"],
              ["stock", "Stock", "number"],
              ["threshold", "Seuil d'alerte", "number"],
            ] as const
          ).map(([key, label, type]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`edit-${product.id}-${key}`}>{label}</Label>
              <Input
                id={`edit-${product.id}-${key}`}
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button className="w-full glow-ring" onClick={save}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
