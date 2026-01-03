import GardnersLastImportCard from "@/components/admin/GardnersLastImportCard";
import GardnersSyncClient from "./GardnersSyncClient";

export default function GardnersPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Gardners Catalogue Sync</h1>

      {/* ✅ SERVER-SIDE SUMMARY */}
      <GardnersLastImportCard />

      {/* ✅ CLIENT-SIDE UPLOAD / DIFF / APPLY */}
      <GardnersSyncClient />
    </div>
  );
}
