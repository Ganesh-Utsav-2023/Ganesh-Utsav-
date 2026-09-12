/**
 * Translates Firebase Auth error codes into clear, user-friendly messages.
 */
export function translateAuthError(err: any): string {
  if (!err) return "An unexpected error occurred.";
  
  // Extract error code if available, supporting both code property and string message extraction
  let code = err.code || "";
  if (!code && err.message) {
    const match = err.message.match(/\((auth\/[^)]+)\)/);
    if (match) {
      code = match[1];
    }
  }

  switch (code) {
    case "auth/invalid-credential":
      return "Invalid email address or password. Please verify your credentials.";
    case "auth/user-not-found":
      return "No devotee account found with this email. Please check the email or sign up.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again or reset your password.";
    case "auth/email-already-in-use":
      return "This email address is already registered. Please log in instead.";
    case "auth/weak-password":
      return "Password is too weak. It must be at least 6 characters long.";
    case "auth/invalid-email":
      return "Invalid email address format. Please enter a valid email.";
    case "auth/popup-closed-by-user":
      return "The Google authentication popup was closed before completing. Please try again.";
    case "auth/popup-blocked":
      return "The Google authentication popup was blocked by your browser. Please allow popups or open the app directly in a new tab.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google authentication. Please contact the administrator or register using email and password.";
    case "auth/network-request-failed":
      return "A network error occurred. Please check your internet connection and try again.";
    default:
      // Return original message if no specific match, so we never lose debug info
      return err.message || "Authentication failed. Please try again.";
  }
}
