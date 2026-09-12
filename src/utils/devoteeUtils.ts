import { RegisteredDevotee } from '../types/index.ts';

export const AUTHORIZED_ADMIN_EMAIL = 'navyuvakganeshmitramandal14@gmail.com';

/**
 * Checks if the given email matches the single authorized mandap administrator email.
 */
export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL;
};

/**
 * Filter to count and list ONLY real registered devotees.
 * Excludes:
 * - Admin account (navyuvakganeshmitramandal14@gmail.com)
 * - Admin role accounts
 * - Demo accounts
 * - Temporary accounts
 * - Anonymous users
 * - Fake / test records created during development (e.g. @example.com, devotee@ganeshutsav.org)
 */
export function isRealDevotee(devotee: Partial<RegisteredDevotee> | any): boolean {
  if (!devotee) return false;

  const email = (devotee.email || '').trim().toLowerCase();

  // 1. Exclude official Mandap Admin account
  if (email === AUTHORIZED_ADMIN_EMAIL || devotee.role === 'admin') {
    return false;
  }

  // 2. Exclude demo, temporary, or anonymous accounts
  if (
    devotee.is_demo ||
    devotee.isDemo ||
    devotee.isAnonymous ||
    devotee.is_temporary ||
    devotee.temporary
  ) {
    return false;
  }

  // 3. Exclude legacy mock or test accounts
  if (
    email.includes('example.com') ||
    email.includes('test@') ||
    email.includes('@test.') ||
    email.includes('fake') ||
    email.includes('sample') ||
    email === 'devotee@ganeshutsav.org' ||
    email === 'admin@ganeshutsav.org'
  ) {
    return false;
  }

  // 4. Must have an identifying property (UID, email, or mobile)
  if (!devotee.uid && !devotee.id && !email && !devotee.phone) {
    return false;
  }

  return true;
}

/**
 * Helper to display human-readable provider name
 */
export function formatProviderName(provider?: string | null): string {
  if (!provider) return 'Email & Password';
  const p = provider.toLowerCase();
  if (p.includes('google')) return 'Google Sign-In';
  if (p.includes('password')) return 'Email & Password';
  if (p.includes('phone')) return 'Phone Verification';
  return provider;
}
