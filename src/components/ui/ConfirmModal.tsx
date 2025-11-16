"use client";

import { Button } from "./Button";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center font-[Montserrat]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <h2 className="text-xl font-semibold mb-3">{title}</h2>
            <p className="text-neutral-700 mb-6">{message}</p>

            <div className="flex justify-center gap-3">
              <Button
                variant="neutral"
                size="sm"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Yes, Cancel"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
