import { notFound } from "next/navigation";
import PackageDetailPage from "@/components/package-detail";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code);
  if (!code) notFound();
  return <PackageDetailPage code={code} />;
}
