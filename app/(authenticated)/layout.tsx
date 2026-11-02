import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Sidebar from "@/components/sidebar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) redirect("/login");
  return (
    <div className="workspace">
      <Sidebar />
      {children}
    </div>
  );
}
