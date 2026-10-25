export default function Loading() {
  return (
    <div className="loading-screen" role="status">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-48 w-full" />
      <p>Opening your workspace...</p>
    </div>
  );
}
