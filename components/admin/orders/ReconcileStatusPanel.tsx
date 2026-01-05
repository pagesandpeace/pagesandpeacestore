"use client";

import { Button } from "@/components/ui/Button";

type ReconcilePlanItem = {
  ticketTypeId: string;
  action: string;
  seatsCount?: number;
};

type Props = {
  preview: { plan: ReconcilePlanItem[] } | null;
  hasPreviewActions: boolean;
  reconciling: boolean;
  onConfirm: () => void;
};

export default function ReconcileStatusPanel({
  preview,
  hasPreviewActions,
  reconciling,
  onConfirm,
}: Props) {
  if (!preview) return null;

  const seatsToCreate = preview.plan.reduce(
    (sum, p) => sum + (p.seatsCount ?? 0),
    0
  );

  /* --------------------------------------------
     RECONCILIATION REQUIRED
  --------------------------------------------- */
  if (hasPreviewActions) {
    return (
      <div className="border border-green-300 bg-green-50 rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-green-900">
          Action required: event seats missing
        </h2>

        <p className="text-sm text-green-800">
          This order was paid successfully, but the event attendee records were
          not created.
        </p>

        <ul className="text-sm text-green-800 list-disc pl-5">
          <li>
            <strong>{seatsToCreate}</strong> event seat
            {seatsToCreate > 1 ? "s" : ""} need to be created
          </li>
        </ul>

        <p className="text-sm text-green-700">
          No payment changes will be made. This only restores missing booking
          data.
        </p>

        <div className="pt-2">
          <Button onClick={onConfirm} disabled={reconciling}>
            {reconciling ? "Reconciling…" : "Fix booking"}
          </Button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------
     FULLY RECONCILED
  --------------------------------------------- */
  return (
    <div className="border border-green-300 bg-green-50 rounded-lg p-4">
      <h2 className="font-semibold text-green-900">
        Order fully reconciled ✓
      </h2>
      <p className="text-sm text-green-800">
        All event seats and order records are present and correct.
      </p>
    </div>
  );
}
