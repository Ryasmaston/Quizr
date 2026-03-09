/**
 * Username validation helper.
 *
 * Allowed characters: letters, numbers, dashes, dots, and spaces.
 * No leading spaces, no consecutive spaces.
 * Trailing spaces are stripped on blur.
 *
 * The approach: sanitize the ENTIRE value on every change.
 * This is robust no matter where the cursor is, what was pasted, or which input method is used.
 */

const INVALID_CHARS_REGEX = /[^a-zA-Z0-9 .\-]/g;
const CONSECUTIVE_SPACES = /  +/g;

/**
 * Processes a username input change.
 * Call this from onChange: const { value, warning } = formatUsernameInput(newValue).
 *
 * Returns { value, warning } where warning is null or a string to display.
 * The value is guaranteed to never contain invalid chars, leading spaces, or consecutive spaces.
 */
export function formatUsernameInput(newValue) {
  let sanitized = newValue;
  let warning = null;

  // 1. Strip invalid characters
  const afterInvalid = sanitized.replace(INVALID_CHARS_REGEX, "");
  if (afterInvalid !== sanitized) {
    warning = "Only letters, numbers, dashes (-), dots (.), and spaces are allowed.";
    sanitized = afterInvalid;
  }

  // 2. Strip leading spaces
  const afterLeading = sanitized.replace(/^ +/, "");
  if (afterLeading !== sanitized) {
    warning = warning || "Leading spaces are not allowed.";
    sanitized = afterLeading;
  }

  // 3. Collapse consecutive spaces into one
  const afterSpaces = sanitized.replace(CONSECUTIVE_SPACES, " ");
  if (afterSpaces !== sanitized) {
    warning = warning || "Consecutive spaces are not allowed.";
    sanitized = afterSpaces;
  }

  return { value: sanitized, warning };
}

/**
 * Call on blur to strip trailing spaces.
 * Returns { value, warning }.
 */
export function trimTrailingSpace(value) {
  if (value !== value.trimEnd()) {
    return {
      value: value.trimEnd(),
      warning: "Trailing space was removed."
    };
  }
  return { value, warning: null };
}

/**
 * Converts a username to a URL-safe path segment.
 * Replaces spaces with underscores.
 */
export function toProfileUrl(username) {
  return `/users/${username.replace(/ /g, '_')}`;
}

/**
 * Converts a URL path segment back to a username.
 * Replaces underscores with spaces.
 */
export function fromProfileUrl(urlParam) {
  return urlParam.replace(/_/g, ' ');
}
