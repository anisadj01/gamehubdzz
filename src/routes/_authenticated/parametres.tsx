import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { UserPlus, Trash2, Volume2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createEmployee, deleteEmployee } from "@/lib/admin.functions";
import { useCurrentUser } from "@/lib/auth";
import { isBeepEnabled, setBeepEnabled, playBeep } from "@/lib/sound";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres & équipe — GameHub ERP" },
      { name: "description", content: "Gérez les comptes employés et les accès de la salle." },
      { property: "og:title", content: "Paramètres & équipe — GameHub ERP" },
      { property: "og:description", content: "Administration des utilisateurs et rôles." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const create = useServerFn(createEmployee);
  const remove = useServerFn(deleteEmployee);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [beep, setBeep] = useState(true);
  const [venueName, setVenueName] = useState("");

  useEffect(() => setBeep(isBeepEnabled()), []);
  useEffect(() => setVenueName(user?.venueName ?? ""), [user?.venueName]);

  function toggleBeep(next: boolean) {
    setBeep(next);
    setBeepEnabled(next);
    if (next) playBeep(true);
    toast.success(next ? "Bip sonore activé" : "Bip sonore désactivé");
  }

  async function saveVenueName() {
    if (!user?.venueId) return;
    if (venueName.trim().length < 2) { toast.error("Nom de salle requis"); return; }
    const { error } = await supabase
      .from("venues")
      .update({ name: venueName.trim().slice(0, 60) })
      .eq("id", user.venueId);
    if (error) { toast.error(error.message); return; }
    toast.success("Nom de la salle mis à jour");
    qc.invalidateQueries({ queryKey: ["current-user"] });
  }

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at");
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      return (data ?? []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? "employee",
      }));
    },
  });

  async function saveShiftMinutes(id: string, hours: number) {
    const minutes = Math.round(Math.min(24, Math.max(0.5, hours)) * 60);
    const { error } = await supabase.from("profiles").update({ shift_minutes: minutes }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Durée de service mise à jour");
    qc.invalidateQueries({ queryKey: ["staff"] });
    qc.invalidateQueries({ queryKey: ["staff-shifts"] });
  }

  async function submit() {
    if (!form.email.trim() || form.password.length < 6) { toast.error("Email et mot de passe (6+) requis"); return; }
    setBusy(true);
    try {
      await create({
        data: {
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim() || form.email.trim(),
          role: "employee",
        },
      });
      toast.success("Employé créé");
      setOpen(false);
      setForm({ email: "", password: "", fullName: "" });
      qc.invalidateQueries({ queryKey: ["staff"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    try {
      await remove({ data: { userId: id } });
      toast.success("Employé supprimé");
      qc.invalidateQueries({ queryKey: ["staff"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div>
      <PageHeader
        title="Paramètres & équipe"
        subtitle={`${staff.length} compte(s)`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="glow-ring">
                <UserPlus className="size-4" />
                Nouvel employé
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un compte employé</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="s-name">Nom complet</Label>
                  <Input id="s-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-email">Email</Label>
                  <Input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-pass">Mot de passe</Label>
                  <Input id="s-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full glow-ring" onClick={submit} disabled={busy}>
                  {busy ? "Création…" : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="glow-card rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Nom de la salle</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ce nom s'affiche partout dans l'application et sur les tickets.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              maxLength={60}
              disabled={!user?.venueId}
            />
            <Button onClick={saveVenueName} disabled={!user?.venueId}>
              Enregistrer
            </Button>
          </div>
        </div>

        <div className="glow-card rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Volume2 className="size-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Bip de fin de chronomètre</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Joue une alerte sonore lorsqu'une location atteint la durée prévue. Réglage propre à cet
            appareil.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2/60 px-4 py-3">
            <Label htmlFor="beep">Activer le bip sonore</Label>
            <Switch id="beep" checked={beep} onCheckedChange={toggleBeep} />
          </div>
        </div>
      </div>

      <div className="glow-card overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Heures de service</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={s.role === "admin" ? "border-primary/40 text-primary" : ""}>
                    {s.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    defaultValue={((s as { shift_minutes?: number }).shift_minutes ?? 360) / 60}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v * 60 !== ((s as { shift_minutes?: number }).shift_minutes ?? 360)) {
                        saveShiftMinutes(s.id, v);
                      }
                    }}
                    className="w-24"
                    aria-label={`Heures de service de ${s.full_name ?? s.email}`}
                  />
                </TableCell>
                <TableCell className="text-end">
                  {s.role !== "admin" && (
                    <Button size="icon" variant="ghost" onClick={() => del(s.id)} aria-label="Supprimer">
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
