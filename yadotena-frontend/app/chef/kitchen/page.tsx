'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { ChefHat, Clock, CheckCircle } from 'lucide-react';

export default function ChefKitchen() {
  const stats = [
    { title: 'New Orders', value: '4', icon: ChefHat },
    { title: 'In Progress', value: '2', icon: Clock },
    { title: 'Ready to Serve', value: '1', icon: CheckCircle },
  ];
  const orders = [
    { id: 'ORD-1001', table: 'Table 3', items: ['Pizza Margherita x1', 'Caesar Salad x2'], time: '5 min ago', urgent: false },
    { id: 'ORD-1002', table: 'Table 5', items: ['Steak Medium x1', 'Fries x2'], time: '3 min ago', urgent: true },
    { id: 'ORD-1003', table: 'Table 2', items: ['Pasta Carbonara x1'], time: '1 min ago', urgent: false },
  ];
  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER', 'CHEF']}>
      <h1 className="text-3xl font-bold mb-2">Kitchen Display</h1>
      <p className="text-gray-600 mb-6">Order queue and preparation status</p>
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
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Order Queue</h2>
        <div className="space-y-4">
          {orders.map((order, i) => (
            <div key={i} className={`p-4 border rounded-lg ${order.urgent ? 'border-red-300 bg-red-50' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <div><p className="font-medium">{order.id} - {order.table}</p><p className="text-sm text-gray-500">{order.time}</p></div>
                {order.urgent && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">URGENT</span>}
              </div>
              <div className="space-y-1 mb-3">{order.items.map((item, j) => <p key={j} className="text-sm">{item}</p>)}</div>
              <div className="flex gap-2"><button className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Start</button><button className="text-xs border px-3 py-1 rounded">Mark Ready</button></div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
