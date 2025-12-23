import Link from "next/link";

type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  status: string;
};

export default function AdminOrdersList({
  orders,
}: {
  orders: OrderRow[];
}) {
  return (
    <div className="grid gap-4">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/admin/orders/${order.id}`}
          className="block border rounded-lg p-4 hover:bg-neutral-50 transition"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">
                Order #{order.id.slice(0, 8)}
              </p>
              <p className="text-xs text-neutral-500">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold">
                £{Number(order.total).toFixed(2)}
              </p>
              <p className="text-xs capitalize text-neutral-500">
                {order.status}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
