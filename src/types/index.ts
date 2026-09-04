export type UserRole = 'admin' | 'team_lead' | 'engineer' | 'viewer';
export type VisitStatus = 'scheduled' | 'accepted' | 'completed' | 'rejected' | 'cancelled';
export type ActivityType = 'school_visit' | 'work_from_home' | 'leave' | 'holiday' | 'other';
export type EscalationStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type EscalationUrgency = 'low' | 'medium' | 'high' | 'critical';
export type EscalationIssueType = 'missing_material' | 'undelivered_material' | 'other';
export type MaterialStatus = 'pending' | 'in_transit' | 'delivered' | 'returned';
export type LmsStatus = 'active' | 'pending' | 'revoked';
export type Region = 'Andhra Pradesh' | 'Telangana';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  engineer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Engineer {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  region: Region;
  team_id: string | null;
  role: UserRole;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: string;
  name: string;
  spoc_name: string;
  spoc_contact: string;
  location: string;
  region: Region;
  area: string;
  latitude: number | null;
  longitude: number | null;
  maps_link: string | null;
  assigned_engineer_id: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolVisit {
  id: string;
  school_id: string;
  engineer_id: string;
  visit_date: string;
  checklist_items: unknown;
  notes: string | null;
  reason: string;
  next_visit_due: string | null;
  status: VisitStatus;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolChecklist {
  id: string;
  school_id: string;
  component_verified: boolean;
  component_verified_date: string | null;
  initial_teacher_training: boolean;
  initial_teacher_training_date: string | null;
  teachers_lms: boolean;
  teachers_lms_date: string | null;
  students_lms: boolean;
  students_lms_date: string | null;
  lab_setup: boolean;
  lab_setup_date: string | null;
  feedback_form: boolean;
  feedback_form_date: string | null;
  training_dates: unknown;
  completion_percentage: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: string;
  engineer_id: string;
  school_id: string | null;
  log_date: string;
  activity_type: ActivityType;
  start_time: string | null;
  end_time: string | null;
  activities_done: string;
  notes: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Escalation {
  id: string;
  school_id: string;
  engineer_id: string;
  issue_type: EscalationIssueType;
  issue_description: string;
  urgency: EscalationUrgency;
  status: EscalationStatus;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolTeam {
  id: string;
  name: string;
  region: string;
  created_at: string;
}

export interface VisitFeedback {
  id: string;
  visit_id: string;
  school_id: string;
  engineer_id: string;
  rating: number | null;
  feedback_text: string | null;
  created_at: string;
}

export interface MaterialDelivery {
  id: string;
  school_id: string;
  engineer_id: string | null;
  item_name: string;
  quantity: number;
  delivered_date: string | null;
  status: MaterialStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LmsAccess {
  id: string;
  school_id: string;
  user_email: string;
  user_role: string;
  status: LmsStatus;
  granted_at: string | null;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyVisitTarget {
  id: string;
  engineer_id: string;
  month: string;
  target_visits: number;
  created_at: string;
  updated_at: string;
}

export type ChecklistKey =
  | 'component_verified'
  | 'initial_teacher_training'
  | 'teachers_lms'
  | 'students_lms'
  | 'lab_setup'
  | 'feedback_form';

export interface ChecklistItem {
  key: ChecklistKey;
  label: string;
  done: boolean;
  date: string | null;
}

export interface SchoolWithRelations extends School {
  assigned_engineer?: Pick<Engineer, 'id' | 'full_name' | 'email' | 'region' | 'role'> | null;
  checklist?: SchoolChecklist | null;
}

export interface VisitWithRelations extends SchoolVisit {
  school?: Pick<School, 'id' | 'name' | 'region' | 'area'> | null;
  engineer?: Pick<Engineer, 'id' | 'full_name' | 'email'> | null;
}

export interface DailyLogWithRelations extends DailyLog {
  engineer?: Pick<Engineer, 'id' | 'full_name' | 'email'> | null;
  school?: Pick<School, 'id' | 'name'> | null;
  approver?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface EscalationWithRelations extends Escalation {
  school?: Pick<School, 'id' | 'name' | 'region'> | null;
  engineer?: Pick<Engineer, 'id' | 'full_name' | 'email'> | null;
  assignee?: Pick<Engineer, 'id' | 'full_name' | 'email'> | null;
}