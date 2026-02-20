import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <Link to="/dashboard" className="text-xl font-semibold text-gray-800">
        ControlPlane PM
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
