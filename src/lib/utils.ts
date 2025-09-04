import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isValid, differenceInMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import { VALIDATION_RULES, DATE_CONFIG } from '@/config/constants';

// Tailwind CSS class merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export const formatDate = (date: string | Date, formatStr: string = DATE_CONFIG.defaultFormat) => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, formatStr, { locale: ko });
  } catch {
    return '';
  }
};

export const formatDateTime = (date: string | Date) => {
  return formatDate(date, DATE_CONFIG.dateTimeFormat);
};

export const formatTime = (date: string | Date) => {
  return formatDate(date, DATE_CONFIG.timeFormat);
};

export const formatRelativeTime = (date: string | Date) => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, dateObj);
    
    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return formatDate(dateObj);
  } catch {
    return '';
  }
};

export const isDateInRange = (date: string | Date, start: string | Date, end: string | Date) => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const startObj = typeof start === 'string' ? parseISO(start) : start;
    const endObj = typeof end === 'string' ? parseISO(end) : end;
    
    return dateObj >= startObj && dateObj <= endObj;
  } catch {
    return false;
  }
};

// Validation utilities
export const validateEmail = (email: string) => {
  return VALIDATION_RULES.email.pattern.test(email) && 
         email.length <= VALIDATION_RULES.email.maxLength;
};

export const validatePassword = (password: string) => {
  const rules = VALIDATION_RULES.password;
  
  if (password.length < rules.minLength || password.length > rules.maxLength) {
    return false;
  }
  
  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }
  
  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }
  
  if (rules.requireNumbers && !/\d/.test(password)) {
    return false;
  }
  
  if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false;
  }
  
  return true;
};

export const validateFileSize = (file: File, maxSize: number) => {
  return file.size <= maxSize;
};

export const validateFileType = (file: File, allowedTypes: string[]) => {
  return allowedTypes.includes(file.type);
};

// String utilities
export const truncate = (str: string, length: number, suffix = '...') => {
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

export const slugify = (str: string) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Array utilities
export const groupBy = <T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((result, item) => {
    const key = getKey(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<K, T[]>);
};

export const unique = <T>(array: T[], getKey?: (item: T) => any): T[] => {
  if (!getKey) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const sortBy = <T>(
  array: T[],
  getKey: (item: T) => any,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = getKey(a);
    const bVal = getKey(b);
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Number utilities
export const formatNumber = (num: number, locale = 'ko-KR') => {
  return new Intl.NumberFormat(locale).format(num);
};

export const formatCurrency = (amount: number, currency = 'KRW', locale = 'ko-KR') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatPercentage = (value: number, decimals = 1) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

// Object utilities
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// URL utilities
export const getQueryParam = (param: string, url?: string) => {
  const urlObj = new URL(url || window.location.href);
  return urlObj.searchParams.get(param);
};

export const setQueryParams = (params: Record<string, string | null>, url?: string) => {
  const urlObj = new URL(url || window.location.href);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === null) {
      urlObj.searchParams.delete(key);
    } else {
      urlObj.searchParams.set(key, value);
    }
  });
  
  return urlObj.toString();
};

// Error handling utilities
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  
  return '알 수 없는 오류가 발생했습니다.';
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Local storage utilities
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch {
      return defaultValue ?? null;
    }
  },
  
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore errors
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear();
    } catch {
      // Ignore errors
    }
  },
};

// Semester utilities
export interface SemesterOption {
  value: string;
  label: string;
  year: number;
  semester: number;
}

/**
 * Generate available semester options for seminar creation
 * Returns current year's 1st & 2nd semester, and next year's 1st semester
 */
export const getAvailableSemesters = (): SemesterOption[] => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  return [
    {
      value: `${currentYear}-1`,
      label: `${currentYear}년 1학기`,
      year: currentYear,
      semester: 1
    },
    {
      value: `${currentYear}-2`, 
      label: `${currentYear}년 2학기`,
      year: currentYear,
      semester: 2
    },
    {
      value: `${nextYear}-1`,
      label: `${nextYear}년 1학기`,
      year: nextYear,
      semester: 1
    }
  ];
};

/**
 * Get the default semester based on current date
 * Returns 1st semester if in Jan-Aug, 2nd semester if in Sep-Dec
 */
export const getDefaultSemester = (): string => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 0-based to 1-based
  const currentYear = currentDate.getFullYear();

  // Jan-Aug: 1st semester, Sep-Dec: 2nd semester
  if (currentMonth <= 8) {
    return `${currentYear}-1`;
  } else {
    return `${currentYear}-2`;
  }
};

/**
 * Format semester value to display label
 */
export const formatSemesterLabel = (semesterValue: string): string => {
  const [year, semester] = semesterValue.split('-');
  if (semester === '1') {
    return `${year}년 1학기`;
  } else if (semester === '2') {
    return `${year}년 2학기`;
  }
  // Fallback for legacy formats
  return semesterValue;
};
