import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

// GET — list all email templates
export const GET = adminRoute(async () => {
  const templates = await db.emailTemplate.findMany({
    orderBy: { slug: "asc" },
  });
  return NextResponse.json(templates);
});
