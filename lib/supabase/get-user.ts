import { supabaseServer } from "./server";

export async function getUser() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: data.user.user_metadata?.name ?? "",
    avatar_url: data.user.user_metadata?.avatar_url ?? "",
  };
}
