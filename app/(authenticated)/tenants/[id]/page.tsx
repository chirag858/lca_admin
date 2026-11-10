import { notFound } from "next/navigation";
import TenantDetailPage from "@/components/tenant-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <TenantDetailPage tenantId={id} />;
}
