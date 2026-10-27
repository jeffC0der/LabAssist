// Maximum lengths (characters) for device repair intake fields.
// Shared by the intake form (maxLength + counters) and the repairs API (server-side validation).
export const REPAIR_FIELD_LIMITS = {
  clientName: 80,
  clientEmail: 120,
  clientPhone: 20,
  clientDepartment: 100,
  deviceModel: 80,
  serialNumber: 50,
  osSpecs: 200,
  reportedIssue: 1000,
  additionalInspectionNotes: 500,
} as const;

const FIELD_LABELS: Record<keyof typeof REPAIR_FIELD_LIMITS, string> = {
  clientName: 'Client name',
  clientEmail: 'Email',
  clientPhone: 'Phone number',
  clientDepartment: 'Department',
  deviceModel: 'Device model',
  serialNumber: 'Serial number',
  osSpecs: 'OS / specs',
  reportedIssue: 'Reported issue',
  additionalInspectionNotes: 'Inspection remarks',
};

/** Returns an error message for the first field over its limit, or null when everything fits. */
export function findOverLimitField(values: Partial<Record<keyof typeof REPAIR_FIELD_LIMITS, unknown>>): string | null {
  for (const key of Object.keys(REPAIR_FIELD_LIMITS) as Array<keyof typeof REPAIR_FIELD_LIMITS>) {
    const value = values[key];
    if (typeof value === 'string' && value.length > REPAIR_FIELD_LIMITS[key]) {
      return `${FIELD_LABELS[key]} must be ${REPAIR_FIELD_LIMITS[key]} characters or fewer.`;
    }
  }
  return null;
}

/** Invoice line "Work Scope Description": server limit and the input's maxLength */
export const WORK_SCOPE_MAX = 150;

/** Pre-filled scope for a job's first invoice line, cut to fit the limit. */
export function defaultWorkScope(reportedIssue?: string | null, fallback = 'Diagnostics & Repair'): string {
  const issue = String(reportedIssue || '').replace(/\s+/g, ' ').trim();
  if (!issue) return fallback;
  const full = `Diagnostics & Repair: ${issue}`;
  return full.length <= WORK_SCOPE_MAX ? full : full.slice(0, WORK_SCOPE_MAX - 1).trimEnd() + '…';
}
