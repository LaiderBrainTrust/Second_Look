import { useCallback, useEffect, useRef } from "react";

const CHECK_DRAFTS = "second-look-check-drafts";
export function hasUnsavedChanges() {
  return !window.dispatchEvent(new Event(CHECK_DRAFTS, { cancelable: true }));
}
export function confirmDiscardChanges() {
  return (
    !hasUnsavedChanges() ||
    window.confirm("You have unsaved changes. Leave without saving them?")
  );
}
/** A draft stays in this tab only. No financial text is copied into browser storage. */
export function useDraftGuard() {
  const dirty = useRef(false);
  const markDirty = useCallback(() => {
    dirty.current = true;
  }, []);
  const markClean = useCallback(() => {
    dirty.current = false;
  }, []);
  useEffect(() => {
    const check = (event: Event) => {
      if (dirty.current) event.preventDefault();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener(CHECK_DRAFTS, check);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener(CHECK_DRAFTS, check);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);
  return { markDirty, markClean };
}
