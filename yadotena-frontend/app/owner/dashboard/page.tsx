'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';

export default function OwnerDashboard() {
  const stats = [
    { title: 'Total Revenue', value: '$12,450', change: '+12%', icon: DollarSign },
    { title: 'Orders Today', value: '42', change: '+8%', icon: ShoppingCart },
    { title: 'Avg Order Value', value: '$296', change: '+3%', icon: TrendingUp },
    { title: 'Active Staff', value: '8', change: '+2', icon: Users },
  ];
  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER']}>
      <h1 className="text-3xl font-bold mb-2">Owner Dashboard</h1>
      <p className="text-gray-600 mb-6">Business overview and analytics</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{stat.title}</span>
              <stat.icon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-green-600 mt-1">{stat.change} from last week</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex justify-between items-center p-3 border-b last:border-0">
              <div><p className="font-medium">#ORD-{1000+i}</p><p className="text-sm text-gray-500">Table {i}</p></div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Paid</span>
            </div>
          ))}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top Products</h2>
          {[{name:'Margherita Pizza',sales:24},{name:'Caesar Salad',sales:18},{name:'Coffee Latte',sales:32}].map((p,i) => (
            <div key={i} className="flex justify-between py-2 border-b last:border-0"><span>{p.name}</span><span className="font-medium">{p.sales} sold</span></div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
