import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function RefPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const upperCode = code.toUpperCase();

  const promoter = await db.promoter.findUnique({ where: { refCode: upperCode } });

  const cookieStore = await cookies();
  if (promoter && !cookieStore.get("bonistock_ref")) {
    cookieStore.set("bonistock_ref", upperCode, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }

  if (promoter) {
    redirect(`/${locale}?ref=${upperCode}`);
  } else {
    redirect(`/${locale}`);
  }
}
