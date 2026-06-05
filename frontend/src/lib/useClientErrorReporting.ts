import { useEffect } from "react";
import { reportClientError } from "./monitoring";

export function useClientErrorReporting() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportClientError(event.error || event.message, {
        source: "window.error",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason, {
        source: "window.unhandledrejection",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}
