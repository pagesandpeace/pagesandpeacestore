import OrderTimeline from "./OrderTimeline";
import SupplierPOReference from "./SupplierPOReference";

type Props = {
  orderDate?: string | null;
  createdAt?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
  poNumber: string | null;

  // 👇 NEW
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;

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

  customerName,
  customerEmail,
  customerPhone,

  showBulkButton,
  bulkButtonLabel,
  onBulkClick,
  bulkDisabled,
}: Props) {
  return (
    <div className="flex justify-between items-start gap-6">
      <div className="space-y-2">
        {/* Order date */}
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

        {/* 👤 Customer details */}
        {(customerName || customerEmail || customerPhone) && (
          <div className="text-sm text-gray-700 space-y-0.5">
            {customerName && (
              <p className="font-medium">{customerName}</p>
            )}

            {customerEmail && (
              <p className="text-gray-600">{customerEmail}</p>
            )}

            {customerPhone && (
              <p className="text-gray-600">📞 {customerPhone}</p>
            )}
          </div>
        )}

        {/* Timeline */}
        <OrderTimeline
          createdAt={createdAt}
          orderedAt={orderedAt}
          receivedAt={receivedAt}
        />

        {/* PO reference – only when it exists */}
        {poNumber && (
          <SupplierPOReference poNumber={poNumber} />
        )}
      </div>

      {/* Bulk action */}
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
