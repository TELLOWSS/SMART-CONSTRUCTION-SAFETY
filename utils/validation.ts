/**
 * Form validation utilities for SafetyDak application
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates if a string is not empty
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validates Korean resident registration number (주민등록번호)
 * Format: XXXXXX-XXXXXXX (12 digits)
 */
export const isValidRRN = (value: string): boolean => {
  if (!value) return true; // Optional field
  const rrnRegex = /^\d{6}-\d{7}$/;
  if (!rrnRegex.test(value)) return false;
  
  // Luhn algorithm for RRN validation
  const digits = value.replace('-', '').split('').map(Number);
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * weights[i];
  }
  
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === digits[12];
};

/**
 * Validates Korean phone number
 * Formats: 010-1234-5678, 02-1234-5678, etc.
 */
export const isValidPhoneNumber = (value: string): boolean => {
  if (!value) return true; // Optional field
  const phoneRegex = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
  return phoneRegex.test(value.replace(/-/g, ''));
};

/**
 * Validates if a number is positive
 */
export const isPositiveNumber = (value: number): boolean => {
  return value >= 0 && Number.isFinite(value);
};

/**
 * Validates if a year is reasonable (1900-2100)
 */
export const isValidYear = (year: number): boolean => {
  return year >= 1900 && year <= 2100;
};

/**
 * Validates if a month is valid (1-12)
 */
export const isValidMonth = (month: number): boolean => {
  return month >= 1 && month <= 12;
};

/**
 * Validates a date string in YYYY-MM-DD format
 */
export const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Validates file size (in bytes)
 */
export const isValidFileSize = (sizeInBytes: number, maxSizeInMB: number = 10): boolean => {
  return sizeInBytes <= maxSizeInMB * 1024 * 1024;
};

/**
 * Validates image file type
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
};

/**
 * Sanitizes filename for download
 */
export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[/\\?%*:|"<>]/g, '-').trim();
};

/**
 * Formats currency string to number
 */
export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
};

/**
 * Formats number as Korean currency
 */
export const formatKoreanCurrency = (value: number): string => {
  return value.toLocaleString('ko-KR');
};
