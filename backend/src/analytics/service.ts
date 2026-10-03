import type { Pool, PoolClient } from 'pg'

export const analyticsEventNames = [
  'page_view',
  'cta_clicked',
  'schedule_viewed',
  'registration_started',
  'registration_completed',
  'booking_started',
  'booking_completed',
  'trial_completed',
  'lead_converted',
] as const

export type AnalyticsEventName = (typeof analyticsEventNames)[number]
type Queryable = Pool | PoolClient

export async function recordAnalyticsEvent(queryable: Queryable, input: {
  eventName: AnalyticsEventName
  userId?: number | null
  leadId?: number | null
  sessionId?: string | null
  path?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  metadata?: Record<string, unknown>
}) {
  await queryable.query(
    `INSERT INTO analytics_events
       (event_name, user_id, lead_id, session_id, path, utm_source, utm_medium, utm_campaign, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      input.eventName,
      input.userId ?? null,
      input.leadId ?? null,
      input.sessionId ?? null,
      input.path ?? null,
      input.utmSource ?? null,
      input.utmMedium ?? null,
      input.utmCampaign ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  )
}

export async function findLeadIdForUser(queryable: Queryable, userId: number) {
  const result = await queryable.query<{ id: number }>('SELECT id FROM leads WHERE converted_user_id = $1 LIMIT 1', [userId])
  return result.rows[0]?.id ?? null
}
