import { Suspense } from "react";
import PaymentFailedClient from "./PaymentFailedClient";

export const dynamic = "force-dynamic";

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Yükleniyor...</div>}>
      <PaymentFailedClient />
    </Suspense>
  );
}
