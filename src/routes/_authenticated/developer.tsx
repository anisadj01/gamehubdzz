import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Wallet, Trophy, Users, Download, KeyRound, Plus, Save } from "lucide-react";
import { getDeveloperOverview } from "@/lib/developer.functions";
import { savePublicConfig } from "@/lib/devmode.functions";
import { fetchPublicConfig, emptyPublicConfig, type PublicConfig } from "@/lib/public-config";
import {
  listAllUsers,
  listLicenses,
  listLoginLogs,
  browseTable,
  generateLicense,
  updateLicense,
  setUserActive,
  resetUserPassword,
  deleteAnyUser,
  dbTables,
} from "@/lib/devmode.functions";
import { money, num } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/developer")({
  head: () => ({
    meta: [
      { title: "Console développeur — GameHub ERP" },
      { name: "description", content: "Supervision globale de toutes les salles, comptes et gains." },
      { property: "og:title", content: "Console développeur — GameHub ERP" },
      { property: "og:description", content: "Vue globale multi-salles : revenus, dépenses, bénéfices." },
    ],
  }),
  component: DeveloperPage,
});

function downloadCsv(name: string, rows: Record<string, string>[]) {
  if (rows.length === 0) { toast.error("Aucune donnée à exporter"); return; }
  const headers = Object.keys(rows[0]!);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function DeveloperPage() {
  return (
    <div>
      <PageHeader title="Mode développeur" subtitle="Supervision globale · GameHub ERP" />
      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="overview">Salles</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="licenses">Licences</TabsTrigger>
          <TabsTrigger value="logins">Connexions</TabsTrigger>
          <TabsTrigger value="db">Base de données</TabsTrigger>
        <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="licenses" className="mt-4"><LicensesTab /></TabsContent>
        <TabsContent value="logins" className="mt-4"><LoginsTab /></TabsContent>
        <TabsContent value="db" className="mt-4"><DbTab /></TabsContent>
      <TabsContent value="config" className="mt-4"><ConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const fetchOverview = useServerFn(getDeveloperOverview);
  const { data: venues = [], isLoading, error } = useQuery({
    queryKey: ["developer-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 60_000,
  });

  const totals = venues.reduce(
    (a, v) => ({
      revenue: a.revenue + v.revenue,
      profit: a.profit + v.profit,
      accounts: a.accounts + v.accounts.length,
    }),
    { revenue: 0, profit: 0, accounts: 0 },
  );

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Salles enregistrées" value={num(venues.length)} icon={Building2} />
        <StatCard label="Chiffre d'affaires global" value={money(totals.revenue)} icon={Wallet} tone="cyan" />
        <StatCard label="Bénéfice global" value={money(totals.profit)} icon={Trophy} tone="warn" />
        <StatCard label="Comptes actifs" value={num(totals.accounts)} icon={Users} tone="muted" />
      </div>

      <div className="glow-card mt-4 overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Salle</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Postes</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Recettes</TableHead>
              <TableHead>Dépenses</TableHead>
              <TableHead>Bénéfice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            )}
            {venues.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.ownerEmail}</TableCell>
                <TableCell>{num(v.stations)}</TableCell>
                <TableCell>{num(v.sessions)}</TableCell>
                <TableCell>{money(v.revenue)}</TableCell>
                <TableCell>{money(v.expenses)}</TableCell>
                <TableCell className="font-semibold text-primary">{money(v.profit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {venues.map((v) => (
          <div key={v.id} className="glow-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold">{v.name}</h2>
              <Badge variant="outline" className="border-accent/40 text-accent">
                {v.accounts.length} comptes
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Jeux : {money(v.gamesRevenue)} · Boissons : {money(v.drinksRevenue)}
              {v.lastActivity
                ? ` · Dernière activité : ${new Date(v.lastActivity).toLocaleDateString("fr-FR")}`
                : ""}
            </p>
            <ul className="mt-3 space-y-2">
              {v.accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    {a.fullName || a.email}
                    <span className="ms-2 text-xs text-muted-foreground">{a.email}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {a.role}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
function UsersTab() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listAllUsers);
  const toggleActive = useServerFn(setUserActive);
  const resetPwd = useServerFn(resetUserPassword);
  const removeUser = useServerFn(deleteAnyUser);
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["dev-users"],
    queryFn: () => fetchUsers(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["dev-users"] });
  const filtered = users.filter((u) =>
    `${u.email} ${u.fullName} ${u.venueName} ${u.role}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function run(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="glow-card rounded-2xl p-4">
      {error && <p className="mb-3 text-sm text-destructive">{(error as Error).message}</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur…"
          className="max-w-xs"
        />
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              "utilisateurs",
              filtered.map((u) => ({
                email: u.email,
                nom: u.fullName,
                role: u.role,
                salle: u.venueName,
                cree_le: u.createdAt,
                derniere_connexion: u.lastSignInAt ?? "",
                ip: u.lastIp ?? "",
                appareil: u.lastDevice ?? "",
                machine: u.lastMachineId ?? "",
                actif: u.banned ? "non" : "oui",
              })),
            )
          }
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Salle</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead>IP / Appareil / Machine</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <span className="font-medium">{u.fullName || u.email}</span>
                  <span className="block text-xs text-muted-foreground">{u.email}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase">{u.role}</Badge>
                </TableCell>
                <TableCell className="text-xs">{u.venueName}</TableCell>
                <TableCell className="text-xs">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="text-xs">
                  {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString("fr-FR") : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.lastIp ?? "—"}
                  <span className="block">{u.lastDevice ?? "—"}</span>
                  <span className="block font-mono text-[10px]">{u.lastMachineId ?? "—"}</span>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        run(
                          () => toggleActive({ data: { userId: u.id, active: u.banned } }),
                          u.banned ? "Compte activé" : "Compte désactivé",
                        )
                      }
                    >
                      {u.banned ? "Activer" : "Désactiver"}
                    </Button>
                    <ResetPasswordDialog
                      email={u.email}
                      onSubmit={(pwd) =>
                        run(
                          () => resetPwd({ data: { userId: u.id, password: pwd } }),
                          "Mot de passe réinitialisé",
                        )
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() =>
                        run(() => removeUser({ data: { userId: u.id } }), "Utilisateur supprimé")
                      }
                    >
                      Supprimer
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

function ResetPasswordDialog({
  email,
  onSubmit,
}: {
  email: string;
  onSubmit: (password: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <KeyRound className="size-3" />
          Mot de passe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser — {email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`pwd-${email}`}>Nouveau mot de passe</Label>
          <Input id={`pwd-${email}`} value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            className="w-full glow-ring"
            onClick={() => {
              if (pwd.length < 4) { toast.error("4 caractères minimum"); return; }
              onSubmit(pwd);
              setPwd("");
              setOpen(false);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LicensesTab() {
  const qc = useQueryClient();
  const fetchLicenses = useServerFn(listLicenses);
  const create = useServerFn(generateLicense);
  const update = useServerFn(updateLicense);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerName: "", venueName: "", expiresAt: "", notes: "" });
  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["dev-licenses"],
    queryFn: () => fetchLicenses(),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["dev-licenses"] });

  async function generate() {
    if (form.customerName.trim().length < 2 || form.venueName.trim().length < 2) {
      toast.error("Client et salle requis");
      return;
    }
    try {
      const res = await create({
        data: {
          customerName: form.customerName.trim(),
          venueName: form.venueName.trim(),
          ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        },
      });
      toast.success(`Licence générée : ${res.key}`);
      setOpen(false);
      setForm({ customerName: "", venueName: "", expiresAt: "", notes: "" });
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function act(licenseId: string, action: "suspend" | "reactivate" | "reset-machine" | "delete") {
    try {
      await update({ data: { licenseId, action } });
      toast.success("Licence mise à jour");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="glow-card rounded-2xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold">{licenses.length} licence(s)</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow-ring">
              <Plus className="size-4" />
              Générer une licence
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle licence</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="lic-client">Nom du client</Label>
                <Input
                  id="lic-client"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lic-venue">Nom de la salle</Label>
                <Input
                  id="lic-venue"
                  value={form.venueName}
                  onChange={(e) => setForm({ ...form, venueName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lic-exp">Date d'expiration (optionnelle)</Label>
                <Input
                  id="lic-exp"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lic-notes">Notes</Label>
                <Input
                  id="lic-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full glow-ring" onClick={generate}>
                Générer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Licence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Salle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Activation</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Machine liée</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            )}
            {licenses.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.license_key}</TableCell>
                <TableCell className="text-xs">{l.customer_name}</TableCell>
                <TableCell className="text-xs">{l.venue_name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      l.status === "active"
                        ? "border-primary/40 text-primary"
                        : "border-warn/40 text-warn"
                    }
                  >
                    {l.status === "active" ? "Active" : l.status === "suspended" ? "Suspendue" : "Expirée"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {l.activated_at ? new Date(l.activated_at).toLocaleDateString("fr-FR") : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {l.expires_at ? new Date(l.expires_at).toLocaleDateString("fr-FR") : "Illimitée"}
                </TableCell>
                <TableCell className="font-mono text-[10px]">{l.machine_id ?? "—"}</TableCell>
                <TableCell className="text-end">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => act(l.id, l.status === "active" ? "suspend" : "reactivate")}
                    >
                      {l.status === "active" ? "Suspendre" : "Réactiver"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => act(l.id, "reset-machine")}>
                      Réinitialiser
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => act(l.id, "delete")}
                    >
                      Supprimer
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

function LoginsTab() {
  const fetchLogs = useServerFn(listLoginLogs);
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["dev-logins"],
    queryFn: () => fetchLogs(),
  });

  return (
    <div className="glow-card overflow-x-auto rounded-2xl p-4">
      <Button
        variant="outline"
        className="mb-3"
        onClick={() =>
          downloadCsv(
            "connexions",
            logs.map((l) => ({
              email: l.email,
              ip: l.ip_address ?? "",
              appareil: l.device ?? "",
              os: l.os ?? "",
              navigateur: l.browser ?? "",
              machine: l.machine_id ?? "",
              date: l.created_at,
            })),
          )
        }
      >
        <Download className="size-4" />
        Export CSV
      </Button>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Appareil</TableHead>
            <TableHead>Machine</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Chargement…
              </TableCell>
            </TableRow>
          )}
          {logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.email}</TableCell>
              <TableCell className="text-xs">{l.ip_address ?? "—"}</TableCell>
              <TableCell className="text-xs">
                {[l.device, l.os, l.browser].filter(Boolean).join(" · ") || "—"}
              </TableCell>
              <TableCell className="font-mono text-[10px]">{l.machine_id ?? "—"}</TableCell>
              <TableCell className="text-xs">
                {new Date(l.created_at).toLocaleString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DbTab() {
  const browse = useServerFn(browseTable);
  const [table, setTable] = useState<(typeof dbTables)[number]>("venues");
  const [search, setSearch] = useState("");
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["dev-db", table, search],
    queryFn: () => browse({ data: { table, search, limit: 200 } }),
  });
  const headers = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="glow-card rounded-2xl p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={table} onValueChange={(v) => setTable(v as typeof table)}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dbTables.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans la table…"
          className="max-w-xs"
        />
        <Button variant="outline" onClick={() => downloadCsv(table, rows)}>
          <Download className="size-4" />
          Exporter
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h} className="whitespace-nowrap text-[11px]">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell className="text-sm text-muted-foreground">Chargement…</TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={i}>
                {headers.map((h) => (
                  <TableCell key={h} className="max-w-[220px] truncate text-[11px]">
                    {r[h]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Lecture seule et export CSV. Les modifications de données passent par les écrans métier pour
        préserver la traçabilité.
      </p>
    </div>
  );
}

function ConfigTab() {
  const save = useServerFn(savePublicConfig);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["public-config"], queryFn: fetchPublicConfig });
  const [form, setForm] = useState<PublicConfig | null>(null);
  const value = form ?? data ?? emptyPublicConfig;

  function set(patch: Partial<PublicConfig>) {
    setForm({ ...value, ...patch });
  }

  async function submit() {
    try {
      await save({ data: value });
      toast.success("Configuration enregistrée");
      qc.invalidateQueries({ queryKey: ["public-config"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="glow-card max-w-2xl space-y-4 rounded-2xl p-5">
      <div>
        <h2 className="font-display text-sm font-bold">Page de connexion</h2>
        <p className="text-xs text-muted-foreground">
          Liens de téléchargement et contacts affichés aux clients sur la page de connexion.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cfg-win">Lien de téléchargement PC (.exe)</Label>
        <Input id="cfg-win" value={value.downloadWindowsUrl} onChange={(e) => set({ downloadWindowsUrl: e.target.value })} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cfg-android">Lien application mobile (.apk / store)</Label>
        <Input id="cfg-android" value={value.downloadAndroidUrl} onChange={(e) => set({ downloadAndroidUrl: e.target.value })} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cfg-wa">WhatsApp (numéro international)</Label>
        <Input id="cfg-wa" value={value.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="213xxxxxxxxx" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cfg-fb">Page Facebook</Label>
        <Input id="cfg-fb" value={value.facebook} onChange={(e) => set({ facebook: e.target.value })} placeholder="https://facebook.com/..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cfg-tel">Téléphone</Label>
        <Input id="cfg-tel" value={value.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+213 ..." />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.requireLicense}
          onChange={(e) => set({ requireLicense: e.target.checked })}
        />
        <span>
          Exiger une clé de licence à la création d'une salle
          <span className="block text-xs text-muted-foreground">
            Désactivez pour autoriser les inscriptions sans licence (démo).
          </span>
        </span>
      </label>
      <Button className="glow-ring" onClick={submit}>
        <Save className="size-4" />
        Enregistrer
      </Button>
    </div>
  );
}
