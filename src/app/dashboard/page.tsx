import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const roleRedirects: Record<string, string> = {
  COLLECTOR: "/dashboard/collector",
  TREASURER: "/dashboard/treasurer",
  PASTOR: "/dashboard/pastor",
  AUDITOR: "/dashboard/auditor",
  ADMIN: "/dashboard/admin",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role as string;
  const target = roleRedirects[role] || "/dashboard/collector";
  redirect(target);
}
