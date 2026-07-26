/**
 * utils/validation.ts
 * Client-side validation helpers.
 */

export const isValidEmail = (email: string): boolean => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email.trim());
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!isNotEmpty(email)) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!isNotEmpty(password)) {
    errors.password = 'Password is required.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateRegisterForm = (
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!isNotEmpty(name)) {
    errors.name = 'Full name is required.';
  } else if (name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  }

  if (!isNotEmpty(email)) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!isNotEmpty(password)) {
    errors.password = 'Password is required.';
  } else if (!isValidPassword(password)) {
    errors.password = 'Password must be at least 6 characters.';
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateMessage = (message: string): string | null => {
  if (!message || !message.trim()) return 'Message cannot be empty.';
  if (message.length > 2000) return 'Message is too long (max 2000 characters).';
  return null;
};
