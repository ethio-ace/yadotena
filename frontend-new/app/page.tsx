'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/context';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        switch (user?.role) {
          case 'OWNER':
            router.push('/owner');
            break;
          case 'MANAGER':
            router.push('/manager');
            break;
          case 'WAITER':
            router.push('/waiter');
            break;
          case 'CHEF':
            router.push('/chef');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
