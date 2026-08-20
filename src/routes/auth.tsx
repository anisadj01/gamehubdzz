import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gamepad2, Loader2, KeyRound, Monitor, Smartphone, MessageCircle, Facebook, Phone } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { passwordRules } from "@/lib/security-config";
import { recordLogin, validateLicenseKey, activateLicense } from "@/lib/devmode.functions";
import { fetchPublicConfig } from "@/lib/public-config";
import { getMachineId, getDeviceInfo } from "@/lib/device";
import { startShift } from "@/lib/shifts";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — GameHub ERP" },
      { name: "description", content: "Accès sécurisé à l'ERP de gestion de la salle de jeux." },
      { property: "og:title", content: "Connexion — GameHub ERP" },
      { property: "og:description", content: "Espace administrateur et employés." },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(passwordRules.min, passwordRules.message).max(72).regex(passwordRules.regex, passwordRules.message),
});

function AuthPage() {
  const navigate = useNavigate();
  const logLogin = useServerFn(recordLogin);
  const checkLicense = useServerFn(validateLicenseKey);
  const bindLicense = useServerFn(activateLicense);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const { data: config } = useQuery({
    queryKey: ["public-config"],
    queryFn: fetchPublicConfig,
    staleTime: 60_000,
  });
  const requireLicense = config?.requireLicense !== false;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function routeAfterLogin(userId: string) {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isDev = (roles ?? []).some((r) => String(r.role) === "developer");
    navigate({ to: isDev ? "/developer" : "/dashboard", replace: true });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Données invalides"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bienvenue !");
    try {
      const info = getDeviceInfo();
      await logLogin({ data: { machineId: getMachineId(), ...info } });
    } catch {
      /* la journalisation ne doit jamais bloquer la connexion */
    }
    if (data.user) {
      try {
        await startShift(data.user.id);
      } catch {
        /* le pointage ne doit jamais bloquer la connexion */
      }
    }
    if (data.user) await routeAfterLogin(data.user.id);
    else navigate({ to: "/dashboard", replace: true });
  }

  async function handleForgot() {
    const parsed = z.string().trim().email().max(255).safeParse(forgotEmail);
    if (!parsed.success) { toast.error("Email invalide"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setForgotOpen(false);
    toast.success("Lien de réinitialisation envoyé. Vérifiez votre boîte mail.");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Données invalides"); return; }
    if (fullName.trim().length < 2) { toast.error("Nom complet requis"); return; }
    if (venueName.trim().length < 2) { toast.error("Nom de la salle requis"); return; }
    const key = licenseKey.trim().toUpperCase();
    const machineId = getMachineId();
    if (requireLicense && key.length < 6) { toast.error("Clé de licence requise"); return; }
    setLoading(true);
    if (key.length >= 6) {
      try {
        const res = await checkLicense({ data: { licenseKey: key, machineId } });
        if (!res.ok) { setLoading(false); toast.error(res.reason); return; }
      } catch {
        setLoading(false);
        toast.error("Vérification de la licence impossible");
        return;
      }
    }
    const { data, error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim(), venue_name: venueName.trim().slice(0, 60) },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) {
      toast.success("Compte créé. Vérifiez votre email pour confirmer.");
      return;
    }
    if (key.length >= 6) {
      try {
        await bindLicense({ data: { licenseKey: key, machineId } });
        toast.success("Licence activée pour cet ordinateur");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Activation de la licence impossible");
      }
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-30" />
      <div className="glow-card relative w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {config?.downloadWindowsUrl && (
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a href={config.downloadWindowsUrl} target="_blank" rel="noreferrer">
                <Monitor className="size-4" />
                Télécharger pour PC
              </a>
            </Button>
          )}
          {config?.downloadAndroidUrl && (
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a href={config.downloadAndroidUrl} target="_blank" rel="noreferrer">
                <Smartphone className="size-4" />
                Application mobile
              </a>
            </Button>
          )}
        </div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary/15 glow-ring">
            <Gamepad2 className="size-6 text-primary" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold tracking-widest neon-text">
            GAMEHUB ERP
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">ERP de gestion de salle de jeux</p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Créer ma salle</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full glow-ring" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Se connecter
              </Button>
              <button
                type="button"
                onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                <KeyRound className="size-3" />
                Mot de passe oublié ?
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Ce compte devient l'administrateur de votre salle. Le nom saisi s'affiche dans
                toute l'application à la place de « GameHub ERP ». Les employés sont ensuite créés
                depuis les paramètres.
              </p>
              <div className="space-y-2">
                <Label htmlFor="venue">Nom de la salle</Label>
                <Input
                  id="venue"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  maxLength={60}
                  placeholder="Ex : Gaming Zone Alger"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name2">Nom complet</Label>
                <Input id="name2" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">Clé de licence {requireLicense ? "" : "(optionnelle)"}</Label>
                <Input
                  id="license"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="GH-XXXX-XXXX-XXXX-XXXX"
                  maxLength={40}
                  required={requireLicense}
                />
                <p className="text-[11px] text-muted-foreground">
                  Clé fournie à l'achat. Elle est liée à cet ordinateur lors de la première activation.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Mot de passe</Label>
                <Input
                  id="password2"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full glow-ring" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Créer le compte
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {(config?.whatsapp || config?.facebook || config?.phone) && (
          <div className="mt-8 border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">Besoin d'aide ? Contactez-nous :</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {config?.whatsapp && (
                <Button asChild variant="ghost" size="sm">
                  <a
                    href={`https://wa.me/${config.whatsapp.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {config?.facebook && (
                <Button asChild variant="ghost" size="sm">
                  <a href={config.facebook} target="_blank" rel="noreferrer">
                    <Facebook className="size-4" />
                    Facebook
                  </a>
                </Button>
              )}
              {config?.phone && (
                <Button asChild variant="ghost" size="sm">
                  <a href={`tel:${config.phone.replace(/\s/g, "")}`}>
                    <Phone className="size-4" />
                    {config.phone}
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mot de passe oublié</DialogTitle>
            <DialogDescription>
              Saisissez votre email : vous recevrez un lien pour définir un nouveau mot de passe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button className="w-full glow-ring" onClick={handleForgot} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Envoyer le lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
