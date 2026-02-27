import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { layout } from "@/lib/email-templates";
import { log } from "@/lib/logger";

export async function notifyAdmins(subject: string, body: string): Promise<void> {
  log.debug("admin-notify", `notifyAdmins called — subject="${subject}"`);
  try {
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });
    log.debug("admin-notify", `Found ${admins.length} admin(s): ${admins.map((a) => a.email).join(", ") || "(none)"}`);

    if (admins.length === 0) {
      log.warn("admin-notify", "No admin users found in database — nobody to notify");
      return;
    }

    const html = layout(body);
    log.debug("admin-notify", `Wrapped body in layout template (${html.length} chars)`);

    const results = await Promise.allSettled(
      admins.map((admin) => {
        log.debug("admin-notify", `Sending to ${admin.email}...`);
        return sendEmail(admin.email, subject, html);
      })
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const email = admins[i].email;
      if (r.status === "fulfilled") {
        log.debug("admin-notify", `Sent OK to ${email}`);
      } else {
        log.error("admin-notify", `Failed to email ${email}:`, r.reason);
      }
    }
  } catch (err) {
    log.error("admin-notify", "notifyAdmins threw unexpectedly:", err);
  }
}
