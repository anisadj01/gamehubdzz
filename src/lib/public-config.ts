import { supabase } from "@/integrations/supabase/client";

export type PublicConfig = {
  downloadWindowsUrl: string;
  downloadAndroidUrl: string;
  whatsapp: string;
  facebook: string;
  phone: string;
  requireLicense: boolean;
};

export const emptyPublicConfig: PublicConfig = {
  downloadWindowsUrl: "",
  downloadAndroidUrl: "",
  whatsapp: "",
  facebook: "",
  phone: "",
  requireLicense: true,
};

export async function fetchPublicConfig(): Promise<PublicConfig> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "public_config")
    .maybeSingle();
  const value = (data?.value ?? {}) as Partial<PublicConfig>;
  return { ...emptyPublicConfig, ...value };
}