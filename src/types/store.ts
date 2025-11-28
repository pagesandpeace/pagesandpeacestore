export interface StoreSettings {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string | null;
  email: string | null;
  collection_instructions: string | null;
  opening_hours: Record<string, string>;
}
