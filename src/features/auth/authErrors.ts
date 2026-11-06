const CUSTOM_MESSAGES: Record<string, string> = {
  OWNER_ALREADY_INITIALIZED:
    'This store already has an owner account. Please sign in with the owner email instead.',
  NO_SESSION: 'You must be signed in before completing owner setup.',
  PROFILE_ALREADY_EXISTS:
    'This account already has a staff profile. Please sign in instead of creating a new owner account.',
  PROFILE_NOT_CREATED:
    'Your sign-in succeeded but your staff profile could not be loaded. Please try again.',
  MISSING_PROFILE:
    'No staff profile was found for this account. If you are the owner, use first-time setup. Otherwise ask the owner to create your staff account.',
  ACCOUNT_DEACTIVATED:
    'This staff account has been deactivated. Please contact the business owner.',
  EMPLOYEE_PROFILE_EXISTS:
    'This email already has a staff profile in this business. Use a different email address.',
  EMPLOYEE_EMAIL_EXISTS:
    'This email already has a login account, but the password entered is not its current password. Enter the existing password or use a different email.',
};

export function getAuthErrorMessage(error: unknown): string {
  const code = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : '';
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (message && CUSTOM_MESSAGES[message]) {
    return CUSTOM_MESSAGES[message];
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact the business owner.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in with its current password, or use a different email.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled in Firebase Authentication.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured for this project.';
    case 'permission-denied':
      return 'Firestore denied access. Deploy the latest firestore.rules and try again.';
    case 'unavailable':
      return 'Could not reach Firestore. Check your internet connection and try again.';
    case 'failed-precondition':
      return message || 'Firestore rejected this operation. Please try again.';
    default:
      return message || 'Something went wrong. Please try again.';
  }
}
