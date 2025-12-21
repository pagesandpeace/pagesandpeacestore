"use client";

export function Alert({ type = "info", message }: { type: "success" | "warning" | "error" | "info"; message: string }) {
  const styles = {
    success: "bg-green-100 border-green-300 text-green-800",
    warning: "bg-yellow-100 border-yellow-300 text-yellow-800",
    error: "bg-red-100 border-red-300 text-red-800",
    info: "bg-blue-100 border-blue-300 text-blue-800",
  };

  return (
    <div className={`border p-3 rounded-md text-sm ${styles[type]}`}>
      {message}
    </div>
  );
}
