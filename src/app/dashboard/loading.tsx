export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-or/10 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card-noir">
            <div className="w-7 h-7 bg-or/10 rounded mb-2" />
            <div className="h-3 w-20 bg-or/10 rounded mb-1" />
            <div className="h-5 w-24 bg-or/10 rounded" />
          </div>
        ))}
      </div>
      <div className="card-noir">
        <div className="h-5 w-48 bg-or/10 rounded mb-4" />
        <div className="h-48 w-full bg-or/5 rounded" />
      </div>
    </div>
  );
}
