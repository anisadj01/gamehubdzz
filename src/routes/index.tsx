import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth" });
  },
  head: () => ({
    meta: [
      { title: "GameHub ERP — gestion de salle de jeux" },
      {
        name: "description",
        content:
          "Pilotez votre salle de jeux : postes PS5, billard, baby-foot, chronomètre, caisse boissons, dépenses et bénéfices en temps réel.",
      },
      { property: "og:title", content: "GameHub ERP — gestion de salle de jeux" },
      {
        property: "og:description",
        content: "Locations, caisse, stock, dépenses et statistiques dans une seule interface.",
      },
    ],
  }),
  component: () => null,
});
