export const REGIONS = ['Andhra Pradesh', 'Telangana'] as const;
export type Region = (typeof REGIONS)[number];

export const USER_ROLES = ['admin', 'team_lead', 'engineer', 'viewer'] as const;
export const VISIT_STATUSES = ['scheduled', 'accepted', 'completed', 'rejected', 'cancelled'] as const;
export const ACTIVITY_TYPES = ['school_visit', 'work_from_home', 'leave', 'holiday', 'other'] as const;
export const LOG_ACTIVITY_TYPES = ['school_visit', 'work_from_home', 'other'] as const;
export const ESCALATION_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export const ESCALATION_URGENCIES = ['low', 'medium', 'high', 'critical'] as const;
export const ESCALATION_ISSUE_TYPES = ['missing_material', 'undelivered_material', 'other'] as const;

export const ACTIVITY_LABELS: Record<(typeof ACTIVITY_TYPES)[number], string> = {
  school_visit: 'School Visit',
  work_from_home: 'Work From Home',
  leave: 'Leave',
  holiday: 'Holiday',
  other: 'Other',
};

export const VISIT_STATUS_LABELS: Record<(typeof VISIT_STATUSES)[number], string> = {
  scheduled: 'Scheduled',
  accepted: 'Accepted',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const ESCALATION_STATUS_LABELS: Record<(typeof ESCALATION_STATUSES)[number], string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const ESCALATION_URGENCY_LABELS: Record<(typeof ESCALATION_URGENCIES)[number], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ESCALATION_ISSUE_TYPE_LABELS: Record<(typeof ESCALATION_ISSUE_TYPES)[number], string> = {
  missing_material: 'Missing Material',
  undelivered_material: 'Undelivered Material',
  other: 'Other',
};

export const ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  admin: 'Administrator',
  team_lead: 'Team Lead',
  engineer: 'Engineer',
  viewer: 'Viewer',
};