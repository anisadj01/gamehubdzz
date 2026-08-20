import { useEffect, useState } from "react";
import { Download, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Bouton d'installation de l'application (bureau Windows / Android) via le manifeste PWA. */
export function InstallAppButton({
  className,
  variant = "outline",
  size = "sm",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default";
}) {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (!deferred) {
      toast.info(
        "Ouvrez le menu du navigateur puis « Installer l'application » (ou « Ajouter à l'écran d'accueil » sur mobile).",
      );
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") toast.success("Application installée");
    setDeferred(null);
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={install}>
      {deferred ? <Download className="size-4" /> : <MonitorSmartphone className="size-4" />}
      Installer l'application
    </Button>
  );
}