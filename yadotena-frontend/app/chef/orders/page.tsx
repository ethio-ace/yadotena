'use client';
import DashboardLayout from '@/components/DashboardLayout';

const orders = [
  { id: 'ORD-1001', table: 'Table 3', items: ['Pizza x1', 'Salad x2'], status: 'PREPARING' },
  { id: 'ORD-1002', table: 'Table 5', items: ['Steak x1', 'Fries x2'], status: 'READY' },
];

export default function ChefOrders() {
  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER', 'CHEF']}>
      <h1 className="text-3xl font-bold mb-2">Kitchen Orders</h1>
      <p className="text-gray-600 mb-6">All food orders</p>
      <div className="space-y-4">
        {orders.map(o => (
          <div key={o.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between mb-2"><p className="font-medium">{o.id} - {o.table}</p><span className={`px-2 py-1 text-xs rounded ${o.status==='READY'?'bg-green-100 text-green-800':'bg-blue-100 text-blue-800'}`}>{o.status}</span></div>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4">{o.items.map((i,j)=><li key={j}>{i}</li>)}</ul>
            <button className="text-xs border px-3 py-1 rounded">Update Status</button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
