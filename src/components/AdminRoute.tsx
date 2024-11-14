import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { useEffect } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export default function AdminRoute({ children, requireSuperAdmin = false }: AdminRouteProps) {
  const { isAdmin, isSuperAdmin, loading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!isAdmin) {
        navigate('/login', { 
          replace: true,
          state: { error: 'Admin access required' }
        });
      } else if (requireSuperAdmin && !isSuperAdmin) {
        navigate('/admin', {
          replace: true,
          state: { error: 'Super admin access required' }
        });
      }
    }
  }, [isAdmin, isSuperAdmin, loading, navigate, requireSuperAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return null;
  }

  return isAdmin ? <>{children}</> : null;
} 