import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const rolePermissions: Record<string, string[]> = {
  COLLECTOR: ["/dashboard/collector"],
  TREASURER: ["/dashboard/treasurer"],
  PASTOR: ["/dashboard/pastor"],
  AUDITOR: ["/dashboard/auditor"],
  ADMIN: ["/dashboard/admin"],
};

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;
    const allowedPaths = rolePermissions[role] || [];

    const hasAccess = allowedPaths.some(
      (allowed) => pathname === allowed || pathname.startsWith(allowed + "/")
    );

    if (!hasAccess && pathname !== "/dashboard") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
