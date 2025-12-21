"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function ErrorModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="
              bg-[#FAF6F1]
              rounded-xl
              p-6
              w-[90%]
              max-w-sm
              shadow-lg
              border border-[#D6C28B]
            "
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-xl font-semibold text-[#111] mb-3">
              Notice
            </h2>

            <p className="text-sm text-[#444] mb-5 leading-relaxed">
              {message}
            </p>

            <button
              onClick={onClose}
              className="
                w-full py-2.5 rounded-lg
                bg-[#5DA865] text-white
                font-medium
                hover:bg-[#4c8d54]
                transition
              "
            >
              OK
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
