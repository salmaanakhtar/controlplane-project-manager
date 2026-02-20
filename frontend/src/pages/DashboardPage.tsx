import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Welcome, {user?.name || user?.email}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/projects"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-medium mb-2">Projects</h2>
          <p className="text-gray-500 text-sm">Manage your projects</p>
        </Link>
      </div>
    </div>
  );
}
