import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, prisma } from "@pelis/db";
import { AdminChrome } from "./admin-chrome";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth().api.getSession({ headers: headers() });
  if (!session?.user?.id) {
    redirect("/login");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    redirect("/");
  }
  return <AdminChrome>{children}</AdminChrome>;
}
