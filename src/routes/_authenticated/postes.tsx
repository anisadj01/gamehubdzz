import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, Plus, Trash2, Wrench, Timer, Dices, Minus, ShoppingBasket, Pencil, BellRing, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, logActivity } from "@/lib/auth";
import {
  fetchStations,
  fetchProducts,
  fetchActiveSessions,
  fetchCategories,
  fetchSessionItems,
  type Station,
  type Session,
  type SessionItem,
} from "@/lib/queries";
import { money, secondsToClock, minutesToHuman } from "@/lib/format";
import { playBeep } from "@/lib/sound";
import { PageHeader } from "@/components/PageHeader";
import { TicketDialog } from "@/components/TicketDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/postes")({
  head: () => ({
    meta: [
      { title: "Postes & locations — GameHub ERP" },
      { name: "description", content: "Démarrez, suivez et encaissez les locations de postes." },
      { property: "og:title", content: "Postes & locations — GameHub ERP" },
      { property: "og:description", content: "Chronomètre, parties, boissons et encaissement." },
    ],
  }),
  component: StationsPage,
});

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function StationsPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: fetchStations });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: sessions = [] } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: fetchActiveSessions,
    refetchInterval: 30_000,
  });

  const [ticket, setTicket] = useState<{ session: Session; items: SessionItem[] } | null>(null);

  const sessionByStation = useMemo(() => {
    const map = new Map<string, Session>();
    sessions.forEach((s) => s.station_id && map.set(s.station_id, s));
    return map;
  }, [sessions]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["active-sessions"] });
    qc.invalidateQueries({ queryKey: ["stations"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const deleteStation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stations").delete().eq("id", id);
      if (error) throw error;
      await logActivity("suppression", "poste", id);
    },
    onSuccess: () => {
      toast.success("Poste supprimé");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMaintenance = useMutation({
    mutationFn: async (station: Station) => {
      const next = station.status === "maintenance" ? "available" : "maintenance";
      const { error } = await supabase.from("stations").update({ status: next }).eq("id", station.id);
      if (error) throw error;
      await logActivity("modification", "poste", `${station.name} → ${next}`);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const moveStation = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const target = index + dir;
      if (target < 0 || target >= stations.length) return;
      const a = stations[index]!;
      const b = stations[target]!;
      const [oa, ob] = [a.sort_order ?? index, b.sort_order ?? target];
      const orderA = oa === ob ? target : ob;
      const orderB = oa === ob ? index : oa;
      const r1 = await supabase.from("stations").update({ sort_order: orderA }).eq("id", a.id);
      const r2 = await supabase.from("stations").update({ sort_order: orderB }).eq("id", b.id);
      if (r1.error || r2.error) throw new Error(r1.error?.message ?? r2.error!.message);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Postes & locations"
        subtitle={`${stations.length} postes · ${sessions.length} location(s) en cours`}
        actions={isAdmin ? <StationFormDialog categories={categories} onSaved={refresh} /> : null}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stations.map((station, index) => (
          <StationCard
            key={station.id}
            station={station}
            {...(sessionByStation.get(station.id) ? { session: sessionByStation.get(station.id)! } : {})}
            products={products}
            categories={categories}
            isAdmin={isAdmin}
            employeeId={user?.id ?? ""}
            employeeName={user?.fullName ?? ""}
            onRefresh={refresh}
            onTicket={(session, items) => setTicket({ session, items })}
            onDelete={() => deleteStation.mutate(station.id)}
            onToggleMaintenance={() => toggleMaintenance.mutate(station)}
            onMoveUp={index > 0 ? () => moveStation.mutate({ index, dir: -1 }) : undefined}
            onMoveDown={
              index < stations.length - 1 ? () => moveStation.mutate({ index, dir: 1 }) : undefined
            }
          />
        ))}
      </div>

      <TicketDialog
        session={ticket?.session ?? null}
        items={ticket?.items ?? []}
        open={!!ticket}
        onOpenChange={(v) => !v && setTicket(null)}
      />
    </div>
  );
}

function StationCard({
  station,
  session,
  products,
  categories,
  isAdmin,
  employeeId,
  employeeName,
  onRefresh,
  onTicket,
  onDelete,
  onToggleMaintenance,
  onMoveUp,
  onMoveDown,
}: {
  station: Station;
  session?: Session;
  products: ReturnType<typeof Object> extends never ? never : import("@/lib/queries").Product[];
  categories: import("@/lib/queries").GameCategory[];
  isAdmin: boolean;
  employeeId: string;
  employeeName: string;
  onRefresh: () => void;
  onTicket: (s: Session, items: SessionItem[]) => void;
  onDelete: () => void;
  onToggleMaintenance: () => void;
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
}) {
  const now = useNow(!!session);
  const [startOpen, setStartOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [mode, setMode] = useState<"timer" | "game">(station.game_rate ? "game" : "timer");
  const [games, setGames] = useState(1);
  const [planned, setPlanned] = useState("");
  const [busy, setBusy] = useState(false);
  const beepedFor = useRef<string | null>(null);

  const categoryName = categories.find((c) => c.id === station.category_id)?.name ?? null;

  const { data: items = [] } = useQuery({
    queryKey: ["session-items", session?.id],
    queryFn: () => fetchSessionItems(session!.id),
    enabled: !!session,
  });

  const elapsedSec = session ? Math.max(0, (now - new Date(session.started_at).getTime()) / 1000) : 0;
  const plannedMinutes = session
    ? Number((session as { planned_minutes?: number | null }).planned_minutes ?? 0)
    : 0;
  const timeUp =
    !!session && session.mode === "timer" && plannedMinutes > 0 && elapsedSec >= plannedMinutes * 60;

  useEffect(() => {
    if (!session || !timeUp) return;
    if (beepedFor.current === session.id) return;
    beepedFor.current = session.id;
    playBeep();
    toast.warning(`${station.name} : temps écoulé (${plannedMinutes} min)`);
  }, [timeUp, session, station.name, plannedMinutes]);

  const productsAmount = items.reduce((s, i) => s + Number(i.total), 0);
  const gameAmount = session
    ? session.mode === "timer"
      ? (elapsedSec / 3600) * Number(session.hourly_rate)
      : Number(session.game_rate) * session.games_count
    : 0;
  const runningTotal = gameAmount + productsAmount;

  async function startSession() {
    setBusy(true);
    try {
      const { error } = await supabase.from("sessions").insert({
        station_id: station.id,
        station_name: station.name,
        category_name: categoryName,
        mode,
        status: "active",
        customer_name: customer.trim() || null,
        planned_minutes: mode === "timer" && Number(planned) > 0 ? Number(planned) : null,
        hourly_rate: station.hourly_rate,
        game_rate: station.game_rate ?? 0,
        games_count: mode === "game" ? games : 0,
        employee_id: employeeId,
        employee_name: employeeName,
      });
      if (error) throw error;
      await supabase.from("stations").update({ status: "busy" }).eq("id", station.id);
      await logActivity("location", "session", `Démarrage ${station.name}`);
      toast.success(`${station.name} démarré`);
      setStartOpen(false);
      setCustomer("");
      setGames(1);
      setPlanned("");
      onRefresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addProduct(productId: string) {
    if (!session) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) { toast.error("Stock épuisé"); return; }
    const { error } = await supabase.from("session_items").insert({
      session_id: session.id,
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      total: product.price,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("products").update({ stock: product.stock - 1 }).eq("id", product.id);
    await supabase.from("inventory_movements").insert({
      product_id: product.id,
      product_name: product.name,
      delta: -1,
      reason: "vente",
      user_id: employeeId,
    });
    toast.success(`${product.name} ajouté`);
    onRefresh();
  }

  async function removeItem(item: SessionItem) {
    const { error } = await supabase.from("session_items").delete().eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    if (item.product_id) {
      const product = products.find((p) => p.id === item.product_id);
      if (product) {
        await supabase
          .from("products")
          .update({ stock: product.stock + item.quantity })
          .eq("id", product.id);
        await supabase.from("inventory_movements").insert({
          product_id: product.id,
          product_name: product.name,
          delta: item.quantity,
          reason: "annulation",
          user_id: employeeId,
        });
      }
    }
    onRefresh();
  }

  async function updateGames(delta: number) {
    if (!session) return;
    const next = Math.max(1, session.games_count + delta);
    const { error } = await supabase.from("sessions").update({ games_count: next }).eq("id", session.id);
    if (error) { toast.error(error.message); return; }
    onRefresh();
  }

  async function stopSession() {
    if (!session) return;
    setBusy(true);
    try {
      const endedAt = new Date();
      const durationMinutes = (endedAt.getTime() - new Date(session.started_at).getTime()) / 60000;
      const finalGameAmount =
        session.mode === "timer"
          ? (durationMinutes / 60) * Number(session.hourly_rate)
          : Number(session.game_rate) * session.games_count;
      const total = finalGameAmount + productsAmount;

      const { data, error } = await supabase
        .from("sessions")
        .update({
          status: "paid",
          ended_at: endedAt.toISOString(),
          duration_minutes: Math.round(durationMinutes),
          game_amount: Math.round(finalGameAmount),
          products_amount: Math.round(productsAmount),
          total_amount: Math.round(total),
        })
        .eq("id", session.id)
        .select("*")
        .single();
      if (error) throw error;

      await supabase.from("stations").update({ status: "available" }).eq("id", station.id);
      await logActivity("paiement", "session", `${station.name} — ${Math.round(total)} DA`);
      toast.success(`Encaissé : ${money(total)}`);
      onTicket(data as Session, items);
      onRefresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const statusBadge = session
    ? timeUp
      ? { label: "Temps écoulé", cls: "bg-warn/20 text-warn border-warn/40" }
      : { label: "Occupé", cls: "bg-destructive/15 text-destructive border-destructive/30" }
    : station.status === "maintenance"
      ? { label: "Maintenance", cls: "bg-warn/15 text-warn border-warn/30" }
      : { label: "Disponible", cls: "bg-primary/15 text-primary border-primary/30" };

  return (
    <div className="glow-card overflow-hidden rounded-2xl">
      <div className="h-1.5 w-full" style={{ backgroundColor: station.color }} />
      {station.image_url && (
        <img
          src={station.image_url}
          alt={`Poste ${station.name}`}
          loading="lazy"
          className="h-28 w-full object-cover"
        />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">{station.name}</h3>
            <p className="text-xs text-muted-foreground">
              {categoryName ?? "—"} ·{" "}
              {station.game_rate
                ? `${money(station.game_rate)} / partie`
                : `${money(station.hourly_rate)} / h`}
            </p>
          </div>
          <Badge variant="outline" className={statusBadge.cls}>
            {statusBadge.label}
          </Badge>
        </div>

        {session ? (
          <div className="mt-4 space-y-3">
            <div className={`rounded-xl p-4 text-center ${timeUp ? "bg-warn/10 ring-1 ring-warn/40" : "bg-surface-2/70"}`}>
              {session.mode === "timer" ? (
                <>
                  <p className={`font-display text-3xl font-bold tabular-nums ${timeUp ? "text-warn" : "neon-text"}`}>
                    {secondsToClock(elapsedSec)}
                  </p>
                  {plannedMinutes > 0 && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                      <BellRing className="size-3" />
                      Durée prévue : {minutesToHuman(plannedMinutes)}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Button size="icon" variant="outline" onClick={() => updateGames(-1)}>
                    <Minus className="size-4" />
                  </Button>
                  <p className="font-display text-3xl font-bold tabular-nums neon-text">
                    {session.games_count}
                  </p>
                  <Button size="icon" variant="outline" onClick={() => updateGames(1)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {session.mode === "timer" ? "Temps écoulé" : "Parties"}
                {session.customer_name ? ` · ${session.customer_name}` : ""}
              </p>
            </div>

            <div className="space-y-1 text-sm">
              <Line label="Jeu" value={money(gameAmount)} />
              <Line label="Boissons" value={money(productsAmount)} />
              <div className="flex justify-between border-t border-border pt-2 font-display text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{money(runningTotal)}</span>
              </div>
            </div>

            {items.length > 0 && (
              <ul className="space-y-1 text-xs">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">
                      {it.quantity} × {it.product_name}
                    </span>
                    <span className="flex items-center gap-2">
                      {money(it.total)}
                      <button
                        onClick={() => removeItem(it)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Retirer"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Dialog open={posOpen} onOpenChange={setPosOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <ShoppingBasket className="size-4" />
                    Boissons
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter des produits — {station.name}</DialogTitle>
                  </DialogHeader>
                  <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p.id)}
                        disabled={p.stock <= 0}
                        className="rounded-xl border border-border p-3 text-start transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40"
                      >
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-primary">{money(p.price)}</p>
                        <p className="text-[10px] text-muted-foreground">Stock : {p.stock}</p>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Button className="flex-1 glow-ring" onClick={stopSession} disabled={busy}>
                <Square className="size-4" />
                Arrêter & encaisser
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Dialog open={startOpen} onOpenChange={setStartOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 glow-ring" disabled={station.status === "maintenance"}>
                  <Play className="size-4" />
                  Démarrer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Démarrer — {station.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mode de facturation</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={mode === "timer" ? "default" : "outline"}
                        onClick={() => setMode("timer")}
                        disabled={!station.hourly_rate}
                      >
                        <Timer className="size-4" />
                        Chronomètre
                      </Button>
                      <Button
                        type="button"
                        variant={mode === "game" ? "default" : "outline"}
                        onClick={() => setMode("game")}
                        disabled={!station.game_rate}
                      >
                        <Dices className="size-4" />
                        Partie
                      </Button>
                    </div>
                  </div>

                  {mode === "game" && (
                    <div className="space-y-2">
                      <Label htmlFor="games">Nombre de parties</Label>
                      <Input
                        id="games"
                        type="number"
                        min={1}
                        value={games}
                        onChange={(e) => setGames(Math.max(1, Number(e.target.value)))}
                      />
                      <p className="text-xs text-muted-foreground">
                        {games} × {money(station.game_rate ?? 0)} ={" "}
                        {money(games * Number(station.game_rate ?? 0))}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="customer">Client (optionnel)</Label>
                    <Input
                      id="customer"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      maxLength={80}
                    />
                  </div>

                  {mode === "timer" && (
                    <div className="space-y-2">
                      <Label htmlFor="planned">Durée prévue en minutes (optionnel)</Label>
                      <Input
                        id="planned"
                        type="number"
                        min={1}
                        value={planned}
                        onChange={(e) => setPlanned(e.target.value)}
                        placeholder="Ex : 60 — bip sonore à la fin"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={startSession} disabled={busy} className="w-full glow-ring">
                    Démarrer la location
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {isAdmin && (
              <>
                <StationFormDialog station={station} categories={categories} onSaved={onRefresh} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onToggleMaintenance}
                  aria-label={station.status === "maintenance" ? "Activer le poste" : "Désactiver le poste"}
                  title={station.status === "maintenance" ? "Activer le poste" : "Désactiver le poste"}
                >
                  <Wrench className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onMoveUp}
                  disabled={!onMoveUp}
                  aria-label="Déplacer vers le haut"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onMoveDown}
                  disabled={!onMoveDown}
                  aria-label="Déplacer vers le bas"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={onDelete} aria-label="Supprimer">
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function StationFormDialog({
  station,
  categories,
  onSaved,
}: {
  station?: Station;
  categories: import("@/lib/queries").GameCategory[];
  onSaved: () => void;
}) {
  const editing = !!station;
  const [open, setOpen] = useState(false);
  const qcLocal = useQueryClient();
  const [newCategory, setNewCategory] = useState("");
  const [name, setName] = useState(station?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(station?.category_id ?? "");
  const [hourly, setHourly] = useState(String(station?.hourly_rate ?? 300));
  const [gameRate, setGameRate] = useState(station?.game_rate ? String(station.game_rate) : "");
  const [color, setColor] = useState(station?.color ?? "#00E28A");
  const [imageUrl, setImageUrl] = useState(station?.image_url ?? "");
  const [sortOrder, setSortOrder] = useState(String(station?.sort_order ?? 0));

  async function addCategory() {
    if (newCategory.trim().length < 2) { toast.error("Nom de catégorie requis"); return; }
    const { data, error } = await supabase
      .from("game_categories")
      .insert({ name: newCategory.trim() })
      .select("id")
      .maybeSingle();
    if (error) { toast.error(error.message); return; }
    setNewCategory("");
    if (data?.id) setCategoryId(data.id);
    qcLocal.invalidateQueries({ queryKey: ["categories"] });
    toast.success("Catégorie ajoutée");
  }

  async function save() {
    if (name.trim().length < 1) { toast.error("Nom requis"); return; }
    const payload = {
      name: name.trim(),
      category_id: categoryId || null,
      hourly_rate: Number(hourly) || 0,
      game_rate: gameRate ? Number(gameRate) : null,
      color,
      image_url: imageUrl.trim() || null,
      sort_order: Number(sortOrder) || 0,
    };
    const { error } = editing
      ? await supabase.from("stations").update(payload).eq("id", station!.id)
      : await supabase.from("stations").insert(payload);
    if (error) { toast.error(error.message); return; }
    await logActivity(editing ? "modification" : "création", "poste", name.trim());
    toast.success(editing ? "Poste mis à jour" : "Poste ajouté");
    setOpen(false);
    if (!editing) setName("");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline" size="icon" aria-label="Modifier le poste">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className="glow-ring">
            <Plus className="size-4" />
            Nouveau poste
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Modifier — ${station!.name}` : "Nouveau poste"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="st-name">Nom</Label>
            <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nouvelle catégorie (PS5, Billard…)"
                maxLength={40}
              />
              <Button type="button" variant="outline" onClick={addCategory}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="st-h">Tarif / heure (DA)</Label>
              <Input id="st-h" type="number" value={hourly} onChange={(e) => setHourly(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-g">Tarif / partie (DA)</Label>
              <Input
                id="st-g"
                type="number"
                value={gameRate}
                onChange={(e) => setGameRate(e.target.value)}
                placeholder="optionnel"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-c">Couleur</Label>
            <Input id="st-c" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 p-1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-img">Image (URL)</Label>
            <Input
              id="st-img"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-order">Ordre d'affichage</Label>
            <Input
              id="st-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} className="w-full glow-ring">
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
