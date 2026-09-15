/** KV keys shared by both Workers. Change here, nowhere else. */
export const KV_KEYS = {
  /** Full `Asset[]` snapshot (JSON). */
  snapshotCrypto: 'snapshot:crypto',
  /** `SnapshotMeta` (JSON). */
  snapshotMeta: 'snapshot:meta',
} as const;

/** Name of the KV binding in both wrangler.jsonc files. */
export const KV_BINDING = 'SNAPSHOT' as const;
