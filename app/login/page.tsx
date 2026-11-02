import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Login from "@/components/login";

export default async function Page() {
  if (await isAuthenticated()) redirect("/");
  return <Login />;
}
