import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";

export async function notifyAdmins(subject: string, body: string): Promise<void> {
  try {
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });

    await Promise.all(
      admins.map((admin) =>
        sendEmail(admin.email, subject, body).catch((err) => {
          log.error("admin-notify", `Failed to email ${admin.email}:`, err);
        })
      )
    );
  } catch (err) {
    log.error("admin-notify", "Failed to notify admins:", err);
  }
}
