import { cookies } from "next/headers";

export async function getLocalePrefix(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("NEXT_LOCALE")?.value || "en";
}
