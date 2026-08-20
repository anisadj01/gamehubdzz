import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { money, minutesToHuman, fmtTime, fmtDate } from "@/lib/format";
import type { Session, SessionItem } from "@/lib/queries";

export function TicketDialog({
  session,
  items,
  open,
  onOpenChange,
}: {
  session: Session | null;
  items: SessionItem[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ticket N° {session.ticket_no}</DialogTitle>
        </DialogHeader>

        <div id="ticket-print" className="rounded-lg border border-border p-4 font-mono text-xs">
          <p className="text-center text-sm font-bold tracking-widest">GAMEHUB ERP</p>
          <p className="mt-1 text-center">Ticket N° {session.ticket_no}</p>
          <p className="text-center">{fmtDate(session.ended_at ?? session.started_at)}</p>
          <div className="my-3 border-t border-dashed border-border" />

          <Row label="Poste" value={session.station_name} />
          {session.customer_name && <Row label="Client" value={session.customer_name} />}
          <Row label="Début" value={fmtTime(session.started_at)} />
          {session.ended_at && <Row label="Fin" value={fmtTime(session.ended_at)} />}
          {session.mode === "timer" ? (
            <Row label="Durée" value={minutesToHuman(session.duration_minutes)} />
          ) : (
            <Row label="Parties" value={String(session.games_count)} />
          )}
          <Row label="Jeu" value={money(session.game_amount)} />

          {items.length > 0 && (
            <>
              <div className="my-3 border-t border-dashed border-border" />
              {items.map((it) => (
                <Row
                  key={it.id}
                  label={`${it.quantity} × ${it.product_name}`}
                  value={money(it.total)}
                />
              ))}
              <Row label="Total boissons" value={money(session.products_amount)} />
            </>
          )}

          <div className="my-3 border-t border-dashed border-border" />
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>{money(session.total_amount)}</span>
          </div>
          <div className="my-3 border-t border-dashed border-border" />
          <Row label="Employé" value={session.employee_name} />
          <p className="mt-3 text-center">Merci et à bientôt !</p>
        </div>

        <Button onClick={() => window.print()} className="w-full">
          <Printer className="size-4" />
          Imprimer
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
