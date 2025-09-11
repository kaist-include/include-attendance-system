// Application Configuration
export const APP_CONFIG = {
  name: 'Include Attendance System',
  description: '동아리 세미나 관리 시스템',
  version: '1.0.0',
  author: 'KAIST Include',
} as const;

// Database Configuration
export const DB_CONFIG = {
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
  cache: {
    defaultTTL: 300, // 5 minutes
  },
} as const;

// QR Code Configuration
export const QR_CONFIG = {
  expiryMinutes: 30,
  size: 256,
  errorCorrectionLevel: 'M',
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  avatarMaxSize: 1 * 1024 * 1024, // 1MB
} as const;

// UI Configuration
export const UI_CONFIG = {
  toastDuration: 5000,
  debounceDelay: 300,
  animationDuration: 200,
} as const;

// Date/Time Configuration
export const DATE_CONFIG = {
  defaultFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
  dateTimeFormat: 'YYYY-MM-DD HH:mm',
  timezone: 'Asia/Seoul',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255,
  },
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
  seminar: {
    titleMaxLength: 100,
    descriptionMaxLength: 2000,
    maxCapacity: 1000,
    minCapacity: 1,
    maxTags: 10,
  },
  session: {
    titleMaxLength: 100,
    descriptionMaxLength: 1000,
    maxDurationMinutes: 480, // 8 hours
    minDurationMinutes: 30,
  },
} as const;

// Default Values
export const DEFAULTS = {
  userRole: 'member' as const,
  seminarStatus: 'draft' as const,
  sessionStatus: 'scheduled' as const,
  enrollmentStatus: 'pending' as const,
  attendanceStatus: 'absent' as const,
  sessionDuration: 120, // 2 hours
  seminarCapacity: 20,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  general: {
    unknown: '알 수 없는 오류가 발생했습니다.',
    networkError: '네트워크 오류가 발생했습니다.',
    unauthorized: '권한이 없습니다.',
    forbidden: '접근이 금지되었습니다.',
    notFound: '요청한 리소스를 찾을 수 없습니다.',
    serverError: '서버 오류가 발생했습니다.',
  },
  auth: {
    invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    emailAlreadyExists: '이미 사용 중인 이메일입니다.',
    passwordTooWeak: '비밀번호가 너무 약합니다.',
    sessionExpired: '세션이 만료되었습니다. 다시 로그인해주세요.',
  },
  validation: {
    required: '필수 입력 항목입니다.',
    invalidEmail: '올바른 이메일 형식이 아닙니다.',
    invalidDate: '올바른 날짜 형식이 아닙니다.',
    fileTooLarge: '파일 크기가 너무 큽니다.',
    invalidFileType: '지원하지 않는 파일 형식입니다.',
  },
  seminar: {
    capacityExceeded: '정원이 초과되었습니다.',
    applicationClosed: '신청 기간이 아닙니다.',
    alreadyEnrolled: '이미 신청한 세미나입니다.',
    notEnrolled: '신청하지 않은 세미나입니다.',
  },
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  auth: {
    loginSuccess: '성공적으로 로그인되었습니다.',
    logoutSuccess: '성공적으로 로그아웃되었습니다.',
    signupSuccess: '회원가입이 완료되었습니다.',
  },
  seminar: {
    createSuccess: '세미나가 생성되었습니다.',
    updateSuccess: '세미나가 수정되었습니다.',
    deleteSuccess: '세미나가 삭제되었습니다.',
    enrollSuccess: '세미나 신청이 완료되었습니다.',
    cancelSuccess: '세미나 신청이 취소되었습니다.',
  },
  attendance: {
    markSuccess: '출석이 처리되었습니다.',
    qrSuccess: 'QR 코드로 출석이 완료되었습니다.',
  },
} as const;

// Route Paths
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  seminars: '/seminars',
  seminarDetail: (id: string) => `/seminars/${id}`,
  createSeminar: '/seminars/create',
  editSeminar: (id: string) => `/seminars/${id}/edit`,
  applySeminar: (id: string) => `/seminars/${id}/apply`,
  admin: '/admin',
  settings: '/settings',
} as const;

// Semester options and labels
export const SEMESTER_OPTIONS: { code: string; label: string }[] = [
  { code: '2024-1', label: '2024년 봄학기' },
  { code: '2024-2', label: '2024년 가을학기' },
  { code: '2025-1', label: '2025년 봄학기' },
  { code: '2025-summer', label: '2025년 여름학기' },
  { code: '2025-fall', label: '2025년 가을학기' },
];

// Seminar Status Labels and Styles
export const SEMINAR_STATUS = {
  labels: {
    draft: '준비중',
    recruiting: '모집중',
    in_progress: '진행중',
    completed: '완료',
    cancelled: '취소됨',
  },
  colors: {
    draft: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
      darkBg: 'dark:bg-gray-800',
      darkText: 'dark:text-gray-300',
    },
    recruiting: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
      darkBg: 'dark:bg-green-900/30',
      darkText: 'dark:text-green-400',
    },
    in_progress: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300',
      darkBg: 'dark:bg-blue-900/30',
      darkText: 'dark:text-blue-400',
    },
    completed: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-300',
      darkBg: 'dark:bg-purple-900/30',
      darkText: 'dark:text-purple-400',
    },
    cancelled: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
      darkBg: 'dark:bg-red-900/30',
      darkText: 'dark:text-red-400',
    },
  },
  order: ['draft', 'recruiting', 'in_progress', 'completed', 'cancelled'] as const,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    register: '/api/auth/register',
    me: '/api/auth/me',
  },
  users: {
    list: '/api/users',
    profile: (id: string) => `/api/users/${id}`,
    update: (id: string) => `/api/users/${id}`,
  },
  seminars: {
    list: '/api/seminars',
    create: '/api/seminars',
    detail: (id: string) => `/api/seminars/${id}`,
    update: (id: string) => `/api/seminars/${id}`,
    delete: (id: string) => `/api/seminars/${id}`,
    enroll: (id: string) => `/api/seminars/${id}/enroll`,
    sessions: (id: string) => `/api/seminars/${id}/sessions`,
  },
  attendance: {
    mark: '/api/attendance/mark',
    qrCode: (sessionId: string) => `/api/attendance/qr/${sessionId}`,
    verify: '/api/attendance/verify',
  },
} as const; 