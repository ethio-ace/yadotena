'use client';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { ShoppingCart, CreditCard, Coffee } from 'lucide-react';

export default function WaiterDashboard() {
  const stats = [
    { title: 'Active Orders', value: '3', icon: ShoppingCart },
    { title: 'Pending Payments', value: '2', icon: CreditCard },
    { title: 'Tables Assigned', value: '5', icon: Coffee },
  ];
  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER', 'WAITER']}>
      <h1 className="text-3xl font-bold mb-2">Waiter Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome back!</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{stat.title}</span>
              <stat.icon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/waiter/new-order" className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 text-center font-medium">+ New Menu Order</Link>
            <Link href="/waiter/new-retail" className="block w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 text-center font-medium">+ New Retail Sale</Link>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Active Orders</h2>
          {[1,2,3].map(i => (
            <div key={i} className="flex justify-between items-center p-3 border-b last:border-0">
              <div><p className="font-medium">#ORD-{1000+i}</p><p className="text-sm text-gray-500">Table {i} • {['Preparing','Ready','Completed'][i%3]}</p></div>
              <span className={`px-2 py-1 text-xs rounded ${i%3===0?'bg-yellow-100 text-yellow-800':i%3===1?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>{['Preparing','Ready','Completed'][i%3]}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
