'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/types';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ShoppingCart, Utensils, Users, Package, BarChart3, ChefHat, Coffee, PlusCircle, CreditCard } from 'lucide-react';

interface SidebarProps { user: User; }

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(user.role);
  return (
    <aside className="w-64 bg-gray-900 text-white p-4 hidden md:block">
      <div className="mb-8"><h2 className="text-xl font-bold">Yadotena</h2><p className="text-sm text-gray-400 capitalize">{user.role.toLowerCase()}</p></div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium', pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-800')}>
            <item.icon className="h-4 w-4" />{item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function getNavItems(role: User['role']) {
  switch (role) {
    case 'OWNER': return [{ href: '/owner/dashboard', label: 'Dashboard', icon: BarChart3 }, { href: '/owner/orders', label: 'Orders', icon: ShoppingCart }, { href: '/owner/menu', label: 'Menu', icon: Utensils }, { href: '/owner/products', label: 'Products', icon: Package }, { href: '/owner/staff', label: 'Staff', icon: Users }];
    case 'MANAGER': return [{ href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { href: '/manager/orders', label: 'Orders', icon: ShoppingCart }, { href: '/manager/menu', label: 'Menu', icon: Utensils }, { href: '/manager/products', label: 'Products', icon: Package }, { href: '/manager/staff', label: 'Staff', icon: Users }];
    case 'WAITER': return [{ href: '/waiter/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { href: '/waiter/orders', label: 'Orders', icon: ShoppingCart }, { href: '/waiter/new-order', label: 'New Order', icon: PlusCircle }, { href: '/waiter/new-retail', label: 'Retail Sale', icon: Coffee }, { href: '/waiter/payments', label: 'Payments', icon: CreditCard }];
    case 'CHEF': return [{ href: '/chef/kitchen', label: 'Kitchen', icon: ChefHat }, { href: '/chef/orders', label: 'Orders', icon: Utensils }];
    default: return [];
  }
}
