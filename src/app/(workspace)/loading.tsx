export default function WorkspaceLoading() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-48 w-full" />
      <p>Loading workspace data…</p>
    </div>
  );
}
