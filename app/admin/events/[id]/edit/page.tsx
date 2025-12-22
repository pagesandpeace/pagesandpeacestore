import { supabaseServer } from "@/lib/supabase/server";
import EditEventForm from "./EditEventForm";

type PageParams = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventPage({ params }: PageParams) {
  const { id } = await params;

  const supabase = await supabaseServer();

  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  // Fetch stores
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name");

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <h1 className="text-3xl font-bold mb-4">Event not found</h1>
        <p className="text-neutral-600">This event does not exist.</p>
      </div>
    );
  }

  return <EditEventForm event={event} stores={stores || []} />;
}
