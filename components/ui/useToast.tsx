"use client";

import { Toast } from "./Toast";
import React from "react";

export type ToastMessage = {
  id: number;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

let listeners: ((toast: ToastMessage) => void)[] = [];

export function useToast() {
  function toast(toast: Omit<ToastMessage, "id">) {
    const id = Date.now();
    listeners.forEach((l) =>
      l({
        ...toast,
        id,
      })
    );
  }

  return { toast };
}

export function ToastManager() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  React.useEffect(() => {
    const handler = (t: ToastMessage) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id));
      }, 4000);
    };

    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
        />
      ))}
    </>
  );
}
