import OrderTimeline from "./OrderTimeline";
import SupplierPOReference from "./SupplierPOReference";

type Props = {
  orderDate?: string | null;
  createdAt?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
  poNumber: string | null;

  showBulkButton: boolean;
  bulkButtonLabel: string;
  onBulkClick: () => void;
  bulkDisabled: boolean;
};

export default function OrderHeader({
  orderDate,
  createdAt,
  orderedAt,
  receivedAt,
  poNumber,
  showBulkButton,
  bulkButtonLabel,
  onBulkClick,
  bulkDisabled,
}: Props) {
  return (
    <div className="flex justify-between items-start gap-6">
      <div className="space-y-2">
        <p className="font-medium">
          Order date{" "}
          {orderDate
            ? new Date(orderDate).toLocaleDateString("en-GB", {
                timeZone: "Europe/London",
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </p>

        <OrderTimeline
          createdAt={createdAt}
          orderedAt={orderedAt}
          receivedAt={receivedAt}
        />

        <SupplierPOReference poNumber={poNumber} />
      </div>

      {showBulkButton && (
        <button
          disabled={bulkDisabled}
          onClick={onBulkClick}
          className="px-4 py-2 text-sm bg-black text-white rounded disabled:opacity-40"
        >
          {bulkButtonLabel}
        </button>
      )}
    </div>
  );
}
