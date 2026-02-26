/**
 * Extracts a user-friendly error message from an Axios error response.
 *
 * This utility centralizes the error extraction pattern that was previously
 * repeated 49+ times across frontend pages and components.
 *
 * @param err - The caught error (typically from an Axios call)
 * @param fallback - Fallback message if no API error message is available
 * @returns A string error message suitable for displaying in a toast
 *
 * @example
 * try {
 *   await someApiCall();
 * } catch (err) {
 *   addToast(getApiErrorMessage(err, 'Operation failed'), 'error');
 * }
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { error?: string } } };
  return axiosErr.response?.data?.error || fallback;
}
