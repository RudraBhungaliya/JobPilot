"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CheckpointRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id;
    if (id) {
      router.replace(`/?tab=pipeline&checkpointId=${encodeURIComponent(String(id))}`);
    } else {
      router.replace("/?tab=pipeline");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-6 space-y-4">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold text-white">Redirecting to Application Checkpoint...</h2>
        <p className="text-xs text-slate-400">Loading pre-filled details and resuming submission session</p>
      </div>
    </div>
  );
}
