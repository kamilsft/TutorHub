import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/jwt";

export default function DashboardPage() {
  const tokenRaw = cookies().get("authToken")?.value;
  const token = tokenRaw ? decodeURIComponent(tokenRaw) : null;
  const payload = token ? verifyToken(token) : null;
  const role = (payload?.role || "").toLowerCase();

  if (!role) {
    redirect("/login");
  }
  if (role === "student") redirect("/dashboard/student");
  if (role === "tutor") redirect("/dashboard/tutor");
  if (role === "admin") redirect("/dashboard/admin");

  redirect("/login");
}
