"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommunityModerationActions({ reportId, target }: { reportId:string; target:"review"|"comment" }) {
  const router = useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function act(action:string) {
    if ((action.includes("remove") || action.includes("hide")) && !window.confirm("Apply this moderation action to public community content?")) return;
    setBusy(true); setMessage("");
    const response=await fetch("/api/app-core/admin/community",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reportId,action})});
    const data=await response.json().catch(()=>null); setBusy(false);
    if(!response.ok){setMessage(data?.error||"Moderation failed.");return;} router.refresh();
  }
  return <div className="mt-3 flex flex-wrap gap-2">{target==="review"?<><button disabled={busy} onClick={()=>act("hide_review")} className="rounded-full border px-3 py-1.5 text-xs">Hide review</button><button disabled={busy} onClick={()=>act("remove_review")} className="rounded-full border border-red-300 px-3 py-1.5 text-xs text-red-700">Remove review</button></>:<><button disabled={busy} onClick={()=>act("hide_comment")} className="rounded-full border px-3 py-1.5 text-xs">Hide comment</button><button disabled={busy} onClick={()=>act("remove_comment")} className="rounded-full border border-red-300 px-3 py-1.5 text-xs text-red-700">Remove comment</button></>}<button disabled={busy} onClick={()=>act("dismiss")} className="rounded-full border px-3 py-1.5 text-xs">Dismiss report</button>{message?<span className="text-xs text-red-700">{message}</span>:null}</div>;
}
