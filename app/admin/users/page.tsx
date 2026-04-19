"use client";

import { useEffect, useState } from "react";

import { TableSurface } from "@/components/table/TableSurface";
import { Table } from "@/components/table/Table";
import { TableHead } from "@/components/table/TableHead";
import { TableBody } from "@/components/table/TableBody";
import { TableRow } from "@/components/table/TableRow";
import { Cell } from "@/components/table/Cell";
import { HeadCell } from "@/components/table/HeadCell";

type User = {
  id: string;
  email: string;
  created_at: string;

  last_login_at: string | null;
  last_magic_link_sent_at: string | null;

  has_logged_in: boolean;
  signup_status: string;

  magic_link_send_count?: number;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "inactive">("inactive");

  const [now, setNow] = useState(() => Date.now());

  /* -------------------------
     ⏱ LIVE TIME
  ------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  /* -------------------------
     INITIAL LOAD
  ------------------------- */
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();

        if (!mounted) return;

        setUsers(data.users || []);
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  async function refreshUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  async function sendLoginLink(email: string) {
  const res = await fetch("/api/auth/send-magic-links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      intent: "signin",
      callbackURL: "/dashboard",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Failed to send login link");
    return;
  }

  alert(`Login link sent to ${email}`);
  await refreshUsers();
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

  /* -------------------------
     🔥 IMPROVED STATUS LOGIC
  ------------------------- */
  function getStatus(user: User) {
    if (user.has_logged_in) return "active";

    if (user.magic_link_send_count && user.magic_link_send_count >= 3) {
      return "cold";
    }

    if (user.last_magic_link_sent_at) {
      const diff =
        now - new Date(user.last_magic_link_sent_at).getTime();

      if (diff < 5 * 60 * 1000) return "recent";

      return "pending";
    }

    return "new";
  }

  function StatusBadge({ user }: { user: User }) {
    const status = getStatus(user);

    const styles = {
      active: "bg-green-100 text-green-700",
      recent: "bg-blue-100 text-blue-700",
      pending: "bg-yellow-100 text-yellow-700",
      new: "bg-gray-100 text-gray-600",
      cold: "bg-red-100 text-red-700",
    };

    const labels = {
      active: "Active",
      recent: "Link Sent",
      pending: "Awaiting Login",
      new: "New",
      cold: "Cold",
    };

    return (
      <span className={`text-xs px-2 py-1 rounded ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  }

  /* -------------------------
     FILTER
  ------------------------- */
  const filtered =
    filter === "inactive"
      ? users.filter((u) => !u.has_logged_in)
      : users;

  if (loading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-semibold">Users</h1>

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
              <HeadCell>Last Login Link</HeadCell>
              <HeadCell>Actions</HeadCell>
            </tr>
          </TableHead>

          <TableBody>
            {filtered.map((user) => {
              const recentlySent =
                user.last_magic_link_sent_at &&
                now -
                  new Date(user.last_magic_link_sent_at).getTime() <
                  5 * 60 * 1000;

              const isActive = user.has_logged_in;

              return (
                <TableRow key={user.id}>
                  <Cell>{user.email}</Cell>

                  <Cell>
                    <StatusBadge user={user} />
                  </Cell>

                  <Cell>{fmtDate(user.created_at)}</Cell>

                  <Cell>{fmtDate(user.last_login_at)}</Cell>

                  <Cell>
                    {fmtDate(user.last_magic_link_sent_at)}
                  </Cell>

                  <Cell>
                    <button
                      onClick={() => sendLoginLink(user.email)}
                      disabled={recentlySent || isActive}
                      className={`text-xs px-3 py-1 border rounded ${
                        recentlySent || isActive
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {isActive
                        ? "Active"
                        : recentlySent
                        ? "Link Sent"
                        : "Send Login Link"}
                    </button>
                  </Cell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableSurface>
    </div>
  );
}