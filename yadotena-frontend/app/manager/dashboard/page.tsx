'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { ShoppingCart, Clock, AlertTriangle, Users } from 'lucide-react';

export default function ManagerDashboard() {
  const stats = [
    { title: 'Active Orders', value: '12', change: '+3', icon: ShoppingCart },
    { title: 'Pending Payments', value: '5', change: '-2', icon: Clock },
    { title: 'Issues', value: '1', change: '0', icon: AlertTriangle },
    { title: 'Staff Online', value: '6', change: '+1', icon: Users },
  ];
  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER']}>
      <h1 className="text-3xl font-bold mb-2">Manager Dashboard</h1>
      <p className="text-gray-600 mb-6">Operations overview</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{stat.title}</span>
              <stat.icon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className={`text-sm mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>{stat.change} from yesterday</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Active Orders</h2>
          {[1,2,3,4].map(i => (
            <div key={i} className="flex justify-between items-center p-3 border-b last:border-0">
              <div><p className="font-medium">#ORD-{1000+i}</p><p className="text-sm text-gray-500">Table {i} • {['Preparing','Ready','Completed'][i%3]}</p></div>
              <span className={`px-2 py-1 text-xs rounded ${i%3===0?'bg-yellow-100 text-yellow-800':i%3===1?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>{['Preparing','Ready','Completed'][i%3]}</span>
            </div>
          ))}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Staff Activity</h2>
          {[{name:'John Doe',role:'Waiter'},{name:'Jane Smith',role:'Chef'},{name:'Mike Johnson',role:'Manager'}].map((s,i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
              <div><p className="font-medium">{s.name}</p><p className="text-sm text-gray-500">{s.role}</p></div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
