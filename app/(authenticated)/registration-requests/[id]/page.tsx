import { notFound } from "next/navigation";
import RegistrationRequestDetailPage from "@/components/registration-request-detail";

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!GUID_PATTERN.test(id)) notFound();
  return <RegistrationRequestDetailPage requestId={id} />;
}
