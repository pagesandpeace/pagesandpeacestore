"use client";

import { useEffect, useState } from "react";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { Cell } from "@/components/table/Cell";
import { HeadCell } from "@/components/table/HeadCell";

type AuthUser = {
  id: string;
  email: string;
  last_sign_in_at: string | null;
  created_at: string;
  last_magic_link_sent_at?: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "inactive">("inactive");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const res = await fetch("/api/admin/users");
      const data = await res.json();

      if (!isMounted) return;

      setUsers(data.users || []);
      setLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  async function sendMagicLink(email: string) {
    await fetch("/api/admin/send-magic-links", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    alert(`Magic link sent to ${email}`);

    // refresh table
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  function fmtDate(date?: string | null) {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatus(user: AuthUser) {
    if (user.last_sign_in_at) return "active";
    if (user.last_magic_link_sent_at) return "chased";
    return "new";
  }

  function StatusBadge({ user }: { user: AuthUser }) {
    const status = getStatus(user);

    const styles = {
      active: "bg-green-100 text-green-700",
      chased: "bg-yellow-100 text-yellow-700",
      new: "bg-gray-100 text-gray-600",
    };

    const labels = {
      active: "Active",
      chased: "Chased",
      new: "New",
    };

    return (
      <span
        className={`text-xs px-2 py-1 rounded ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  }

  const filtered =
    filter === "inactive"
      ? users.filter((u) => !u.last_sign_in_at)
      : users;

  if (loading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Users</h1>

      {/* FILTER */}
      <div className="flex gap-3">
        <button onClick={() => setFilter("inactive")}>
          Inactive
        </button>
        <button onClick={() => setFilter("all")}>
          All
        </button>
      </div>

      <TableSurface>
        <Table>
          <TableHead>
            <tr>
              <HeadCell>Email</HeadCell>
              <HeadCell>Status</HeadCell>
              <HeadCell>Signed Up</HeadCell>
              <HeadCell>Last Login</HeadCell>
              <HeadCell>Last Link Sent</HeadCell>
              <HeadCell>{" "}</HeadCell>
            </tr>
          </TableHead>

          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <Cell>{user.email}</Cell>

                <Cell>
                  <StatusBadge user={user} />
                </Cell>

                <Cell>{fmtDate(user.created_at)}</Cell>

                <Cell>{fmtDate(user.last_sign_in_at)}</Cell>

                <Cell>
                  {fmtDate(user.last_magic_link_sent_at)}
                </Cell>

                <Cell>
                  {!user.last_sign_in_at && (
                    <button
                      onClick={() => sendMagicLink(user.email)}
                      className="text-xs px-3 py-1 border rounded hover:bg-gray-100"
                    >
                      Send Link
                    </button>
                  )}
                </Cell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableSurface>
    </div>
  );
}