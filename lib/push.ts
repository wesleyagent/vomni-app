/**
 * Business owner push notifications via Expo Push API.
 * Reads device_tokens table, sends to Expo, cleans up invalid tokens.
 * All calls are non-blocking — never let a push failure break a request.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

interface PushNotification {
  title: string;
  body: string;
  data: {
    type: "new_booking" | "cancellation" | "new_review" | "no_show" | "chat_message" | "nudge_converted" | "complaint";
    id: string;
  };
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send push notification to all registered devices for a business.
 * Fire-and-forget safe — handles DeviceNotRegistered by deleting stale tokens.
 */
export async function sendBusinessPushNotification(
  businessId: string,
  notification: PushNotification
): Promise<void> {
  const { data: tokens } = await supabaseAdmin
    .from("device_tokens")
    .select("id, token")
    .eq("business_id", businessId);

  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    sound: "default" as const,
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error("[push] Expo API error:", res.status);
      return;
    }

    const result = await res.json() as { data: ExpoPushTicket[] };

    // Clean up invalid tokens
    const toDelete: string[] = [];
    if (Array.isArray(result.data)) {
      result.data.forEach((ticket, i) => {
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          toDelete.push(tokens[i].id);
        }
      });
    }

    if (toDelete.length > 0) {
      await supabaseAdmin
        .from("device_tokens")
        .delete()
        .in("id", toDelete);
      console.log(`[push] Cleaned up ${toDelete.length} stale device tokens`);
    }
  } catch (err) {
    console.error("[push] send failed:", err);
  }
}
