import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { fetchStations } from "@/lib/queries";
import { fmtDateTime, minutesToHuman } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({
    meta: [
      { title: "Réservations — GameHub ERP" },
      { name: "description", content: "Planifiez les réservations de postes par client et horaire." },
      { property: "og:title", content: "Réservations — GameHub ERP" },
      { property: "og:description", content: "Agenda des réservations de la salle." },
    ],
  }),
  component: ReservationsPage,
});

function ReservationsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: fetchStations });
  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reservations").select("*").order("start_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ station: "", name: "", phone: "", start: "", duration: "60" });

  async function save() {
    if (!form.name.trim() || !form.start) { toast.error("Client et horaire requis"); return; }
    const { error } = await supabase.from("reservations").insert({
      station_id: form.station || null,
      customer_name: form.name.trim(),
      phone: form.phone.trim() || null,
      start_at: new Date(form.start).toISOString(),
      duration_minutes: Number(form.duration) || 60,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Réservation créée");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["reservations"] });
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["reservations"] });
  }

  return (
    <div>
      <PageHeader
        title="Réservations"
        subtitle={`${reservations.length} réservation(s)`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="glow-ring">
                <Plus className="size-4" />
                Nouvelle réservation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle réservation</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Poste</Label>
                  <Select value={form.station} onValueChange={(v) => setForm({ ...form, station: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un poste" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-name">Client</Label>
                  <Input id="r-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-phone">Téléphone</Label>
                  <Input id="r-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-start">Date et heure</Label>
                  <Input id="r-start" type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-dur">Durée (minutes)</Label>
                  <Input id="r-dur" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full glow-ring" onClick={save}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="glow-card overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>État</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.customer_name}
                  {r.phone && <span className="block text-xs text-muted-foreground">{r.phone}</span>}
                </TableCell>
                <TableCell>{stations.find((s) => s.id === r.station_id)?.name ?? "—"}</TableCell>
                <TableCell>{fmtDateTime(r.start_at)}</TableCell>
                <TableCell>{minutesToHuman(r.duration_minutes)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.status}</Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" onClick={() => setStatus(r.id, "honorée")} aria-label="Honorer">
                      <Check className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setStatus(r.id, "annulée")} aria-label="Annuler">
                      <X className="size-4" />
                    </Button>
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
