export type LoadState = {
  phase: "loading" | "ready" | "error";
  message: string | null;
  attempt: number;
};
export type LoadEvent =
  { type: "start" | "finish" } | { type: "error"; message: string };
export const initialLoad: LoadState = {
  phase: "loading",
  message: null,
  attempt: 0,
};
export function loadState(state: LoadState, event: LoadEvent): LoadState {
  if (event.type === "start")
    return { ...initialLoad, attempt: state.attempt + 1 };
  if (event.type === "error")
    return { phase: "error", message: event.message, attempt: state.attempt };
  // WebView fires onLoadEnd after onError too; it must not hide the recovery UI.
  return state.phase === "error"
    ? state
    : { phase: "ready", message: null, attempt: state.attempt };
}
