import { NextRequest, NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const PAGE_SIZE = 25;

export const GET = adminRoute(async (req: NextRequest) => {
  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const search = url.searchParams.get("search")?.trim() ?? "";

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        region: true,
        createdAt: true,
        subscription: {
          select: { status: true, tier: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      region: u.region,
      tier: u.subscription?.tier ?? "FREE",
      status: u.subscription?.status ?? "INACTIVE",
      createdAt: u.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
});
