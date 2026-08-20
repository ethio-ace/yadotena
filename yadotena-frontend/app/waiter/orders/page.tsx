'use client';
import DashboardLayout from '@/components/DashboardLayout';

const orders = [
  { id: 'ORD-1001', table: 'Table 3', total: 45.99, status: 'PENDING', paymentStatus: 'UNPAID' },
  { id: 'ORD-1002', table: 'Table 5', total: 32.50, status: 'COMPLETED', paymentStatus: 'PAID' },
  { id: 'ORD-1003', table: 'Table 2', total: 67.00, status: 'PREPARING', paymentStatus: 'UNPAID' },
];

export default function OrdersPage() {
  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER', 'WAITER']}>
      <h1 className="text-3xl font-bold mb-2">Orders</h1>
      <p className="text-gray-600 mb-6">View and manage all orders</p>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className="text-left p-4">Order ID</th><th className="text-left p-4">Table</th><th className="text-left p-4">Total</th><th className="text-left p-4">Status</th><th className="text-left p-4">Payment</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t"><td className="p-4 font-medium">{o.id}</td><td className="p-4">{o.table}</td><td className="p-4">${o.total.toFixed(2)}</td><td className="p-4"><span className={`px-2 py-1 text-xs rounded ${o.status==='COMPLETED'?'bg-green-100 text-green-800':o.status==='PREPARING'?'bg-blue-100 text-blue-800':'bg-yellow-100 text-yellow-800'}`}>{o.status}</span></td><td className="p-4"><span className={`px-2 py-1 text-xs rounded ${o.paymentStatus==='PAID'?'bg-green-100 text-green-800':'bg-yellow-100 text-yellow-800'}`}>{o.paymentStatus}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
