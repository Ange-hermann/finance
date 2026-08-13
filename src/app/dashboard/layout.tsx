import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <Providers>
      <div className="min-h-screen bg-noir overflow-x-hidden">
        <Sidebar />
        <div className="md:ml-64 pt-14 md:pt-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </div>
    </Providers>
  );
}
