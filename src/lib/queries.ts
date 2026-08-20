import { supabase } from "@/integrations/supabase/client";

export type Station = {
  id: string;
  name: string;
  category_id: string | null;
  hourly_rate: number;
  game_rate: number | null;
  status: string;
  color: string;
  image_url: string | null;
  sort_order: number;
};

export type GameCategory = { id: string; name: string; color: string };

export type ProductCategory = { id: string; name: string };

export type Product = {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  stock: number;
  low_stock_threshold: number;
  image_url: string | null;
};

export type Session = {
  id: string;
  ticket_no: number;
  station_id: string | null;
  station_name: string;
  category_name: string | null;
  mode: string;
  status: string;
  customer_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  games_count: number;
  hourly_rate: number;
  game_rate: number;
  game_amount: number;
  products_amount: number;
  total_amount: number;
  employee_name: string;
};

export type SessionItem = {
  id: string;
  session_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export async function fetchStations() {
  const { data, error } = await supabase.from("stations").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as Station[];
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("game_categories").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as GameCategory[];
}

export async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function fetchProductCategories() {
  const { data, error } = await supabase.from("product_categories").select("id, name").order("name");
  if (error) throw error;
  return (data ?? []) as ProductCategory[];
}

export async function fetchActiveSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("status", "active")
    .order("started_at");
  if (error) throw error;
  return (data ?? []) as Session[];
}

export async function fetchSessionItems(sessionId: string) {
  const { data, error } = await supabase
    .from("session_items")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as SessionItem[];
}

export async function fetchPaidSessions(from?: Date, to?: Date) {
  let q = supabase.from("sessions").select("*").eq("status", "paid");
  if (from) q = q.gte("ended_at", from.toISOString());
  if (to) q = q.lte("ended_at", to.toISOString());
  const { data, error } = await q.order("ended_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Session[];
}
