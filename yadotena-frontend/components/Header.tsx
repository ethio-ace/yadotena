'use client';

import { User } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface HeaderProps { user: User; }

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <header className="border-b bg-white p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:hidden">Yadotena</h1>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.name}</span>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
