import { useState, useCallback } from "react";

/**
 * Reusable hook for async operations with loading, error, and success states.
 * Usage:
 *   const action = useAsyncAction();
 *   <button disabled={action.loading} onClick={() => action.run(async () => { ... }, "Done!")}>
 *   {action.error && <ErrorBanner message={action.error} />}
 */
export default function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const run = useCallback(async (fn, successMsg) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess(successMsg || true);
      return true;
    } catch (err) {
      setError(err.message || "Something went wrong");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return { run, loading, error, success, clear };
}
