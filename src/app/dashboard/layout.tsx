import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";
import AIAgent from "@/components/AIAgent";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role as string;
  const showAI = role !== "COLLECTOR";

  return (
    <Providers>
      <div className="min-h-screen bg-noir overflow-x-hidden">
        <Sidebar />
        <div className="md:ml-64 pt-14 md:pt-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
        {showAI && <AIAgent />}
      </div>
    </Providers>
  );
}
