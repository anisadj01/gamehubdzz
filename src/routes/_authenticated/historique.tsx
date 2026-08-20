import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({
    meta: [
      { title: "Historique — GameHub ERP" },
      { name: "description", content: "Journal complet des actions réalisées dans la salle." },
      { property: "og:title", content: "Historique — GameHub ERP" },
      { property: "og:description", content: "Traçabilité des opérations par utilisateur." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data: logs = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader title="Historique d'activité" subtitle={`${logs.length} dernières actions`} />
      <div className="glow-card overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Cible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap">{fmtDateTime(l.created_at)}</TableCell>
                <TableCell>{l.user_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    {l.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[l.entity, l.details].filter(Boolean).join(" · ") || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
