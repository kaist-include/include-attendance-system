// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  nickname?: string;
  department?: string;
  student_id?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'member';

// Semester Types
export interface Semester {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Seminar Types
export interface Seminar {
  id: string;
  title: string;
  description: string;
  capacity: number;
  semester_id: string;
  owner_id: string;
  start_date: string;
  end_date?: string;
  location?: string;
  tags: string[];
  status: SeminarStatus;
  application_start: string;
  application_end: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  semester?: Semester;
  owner?: User;
  sessions?: Session[];
  enrollments?: Enrollment[];
  announcements?: Announcement[];
}

export type SeminarStatus = 'draft' | 'recruiting' | 'in_progress' | 'completed' | 'cancelled';


// Session Types
export interface Session {
  id: string;
  seminar_id: string;
  session_number: number;
  title: string;
  description?: string;
  date: string;
  duration_minutes: number;
  location?: string;
  materials_url?: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  
  // Relations
  seminar?: Seminar;
  attendances?: Attendance[];
}

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Enrollment Types
export interface Enrollment {
  id: string;
  user_id: string;
  seminar_id: string;
  status: EnrollmentStatus;
  applied_at: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  
  // Relations
  user?: User;
  seminar?: Seminar;
}

export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// Attendance Types
export interface Attendance {
  id: string;
  user_id: string;
  session_id: string;
  status: AttendanceStatus;
  checked_at?: string;
  checked_by?: string;
  notes?: string;
  qr_code?: string;
  
  // Relations
  user?: User;
  session?: Session;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// Announcement Types
export interface Announcement {
  id: string;
  seminar_id?: string;
  title: string;
  content: string;
  is_global: boolean;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  seminar?: Seminar;
  author?: User;
}

// Comment Types
export interface Comment {
  id: string;
  seminar_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  seminar?: Seminar;
  user?: User;
  replies?: Comment[];
}

// Statistics Types
export interface AttendanceStats {
  total_sessions: number;
  attended_sessions: number;
  attendance_rate: number;
  late_count: number;
}

export interface SeminarStats {
  total_capacity: number;
  enrolled_count: number;
  pending_count: number;
  completion_rate: number;
  average_attendance: number;
}

export interface UserStats {
  seminars_enrolled: number;
  seminars_completed: number;
  total_attendance_rate: number;
  seminars_led: number;
}

// Form Types
export interface CreateSeminarForm {
  title: string;
  description: string;
  capacity: number;
  semester_id: string;
  start_date: string;
  end_date?: string;
  location?: string;
  tags: string[];
  application_start: string;
  application_end: string;
}

export interface CreateSessionForm {
  seminar_id: string;
  session_number: number;
  title: string;
  description?: string;
  date: string;
  duration_minutes: number;
  location?: string;
  materials_url?: string;
}

export interface UpdateProfileForm {
  nickname?: string;
  department?: string;
  student_id?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Filter Types
export interface SeminarFilters {
  semester_id?: string;
  status?: SeminarStatus;
  tags?: string[];
  search?: string;
  my_seminars?: boolean;
}

export interface SessionFilters {
  seminar_id?: string;
  status?: SessionStatus;
  date_from?: string;
  date_to?: string;
}

// Dashboard Types
export interface DashboardData {
  user_stats: UserStats;
  recent_seminars: Seminar[];
  upcoming_sessions: Session[];
  recent_announcements: Announcement[];
  attendance_summary: AttendanceStats;
}

// QR Code Types
export interface QRCodeData {
  session_id: string;
  seminar_id: string;
  timestamp: number;
  expires_at: number;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read_at?: string;
  created_at: string;
  
  // Metadata for different notification types
  seminar_id?: string;
  session_id?: string;
  enrollment_id?: string;
}

export type NotificationType = 
  | 'enrollment_approved'
  | 'enrollment_rejected'
  | 'session_reminder'
  | 'seminar_updated'
  | 'announcement'
  | 'attendance_marked';

// Dashboard Types
export interface DashboardStats {
  currentSeminars: number;
  attendanceRate: number;
  upcomingSessions: number;
  completedSeminars: number;
  totalEnrollments: number;
  recentActivity: number;
  currentSemester: string;
}

export interface DashboardAnnouncement {
  id: string;
  title: string;
  content: string;
  time: string;
  isNew: boolean;
  isGlobal: boolean;
  isPinned: boolean;
  seminarTitle?: string;
  authorName?: string;
} 