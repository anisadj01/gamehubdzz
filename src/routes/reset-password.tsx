import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — GameHub ERP" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte." },
      { property: "og:title", content: "Nouveau mot de passe — GameHub ERP" },
      { property: "og:description", content: "Réinitialisation sécurisée du mot de passe." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 4) { toast.error("4 caractères minimum"); return; }
    if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-30" />
      <div className="glow-card relative w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary/15 glow-ring">
            <KeyRound className="size-6 text-primary" />
          </div>
          <h1 className="mt-4 font-display text-lg font-bold">Nouveau mot de passe</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {ready
              ? "Choisissez un mot de passe d'au moins 4 caractères."
              : "Ouvrez cette page depuis le lien reçu par email."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="np">Mot de passe</Label>
            <Input id="np" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="np2">Confirmer</Label>
            <Input id="np2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full glow-ring" disabled={loading || !ready}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </div>
    </div>
  );
}