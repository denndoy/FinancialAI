import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload-receipt/:path*",
    "/add-transaction/:path*",
    "/settings",
    "/settings/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
