"use client";

import React from "react";

export type ModalProps = {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-lg">
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>

            <button
              type="button"
              onClick={onClose}
              className="text-lg leading-none"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
