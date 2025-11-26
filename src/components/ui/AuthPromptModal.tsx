"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AuthPromptModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;          // ⭐ NEW
  message?: string;        // ⭐ NEW
  callbackURL?: string;
}

export default function AuthPromptModal({
  open,
  onClose,
  title = "Sign in required",
  message = "You need an account to continue.",
  callbackURL = "/",
}: AuthPromptModalProps) {

  const handleSignIn = () => {
    window.location.href = `/sign-in?callbackURL=${encodeURIComponent(
      callbackURL
    )}`;
  };

  const handleSignUp = () => {
    window.location.href = `/sign-up?callbackURL=${encodeURIComponent(
      callbackURL
    )}`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-xl font-semibold text-[#111]">
              {title}
            </h2>

            <p className="text-neutral-600 mt-3 text-sm leading-relaxed">
              {message}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleSignIn}
                className="bg-[var(--accent)] text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Sign In
              </button>

              <button
                onClick={handleSignUp}
                className="bg-[#111] text-white py-2 rounded-lg font-semibold hover:bg-black transition"
              >
                Create Account
              </button>

              <button
                onClick={onClose}
                className="text-neutral-500 text-sm underline hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
