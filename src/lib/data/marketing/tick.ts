import "server-only";
import { sql } from "../db";
import { runAutomations } from "./automations";
import { startCampaign } from "./campaigns";
import { deliverMessages } from "./queue";

/** Cron entry: starts due campaigns, queues automation messages, and sends a batch of each. */
export async function processMarketing(budget = 150) {
  const due = await sql<{ id: string }>("select id from marketing_campaigns where status = 'scheduled' and scheduled_at <= now() order by scheduled_at limit 5");
  for (const campaign of due) await startCampaign(campaign.id, false);
  const queued = await runAutomations();
  let left = budget;
  const sending = await sql<{ id: string }>("select id from marketing_campaigns where status = 'sending' order by started_at limit 10");
  for (const campaign of sending) {
    if (left <= 0) break;
    const result = await deliverMessages({ campaignId: campaign.id }, Math.min(left, 100));
    left -= result.sent + result.failed + result.skipped;
  }
  if (left > 0) await deliverMessages({ automations: true }, left);
  return { started: due.length, queued };
}
