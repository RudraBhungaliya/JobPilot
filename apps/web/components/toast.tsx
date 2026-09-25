"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, AlertCircle, X } from "./icons";

export interface ToastMessage {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 duration-200 ${
            toast.type === "success"
              ? "bg-[#10121a]/95 border-emerald-500/30 text-emerald-400 shadow-emerald-950/40"
              : toast.type === "warning"
              ? "bg-[#10121a]/95 border-amber-500/30 text-amber-400 shadow-amber-950/40"
              : toast.type === "error"
              ? "bg-[#10121a]/95 border-rose-500/30 text-rose-400 shadow-rose-950/40"
              : "bg-[#10121a]/95 border-blue-500/30 text-blue-400 shadow-blue-950/40"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0">
              {toast.type === "success" && <CheckCircle size={16} className="text-emerald-400" />}
              {toast.type === "warning" && <AlertTriangle size={16} className="text-amber-400" />}
              {toast.type === "error" && <AlertCircle size={16} className="text-rose-400" />}
              {toast.type === "info" && <CheckCircle size={16} className="text-blue-400" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-100">{toast.title}</span>
              {toast.description && (
                <span className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  {toast.description}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-zinc-500 hover:text-zinc-300 p-0.5 transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
