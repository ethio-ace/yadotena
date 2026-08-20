'use client';
import DashboardLayout from '@/components/DashboardLayout';

const pendingPayments = [
  { id: 'ORD-1001', table: 'Table 3', total: 45.99, method: null },
  { id: 'ORD-1003', table: 'Table 2', total: 67.00, method: null },
];

export default function PaymentsPage() {
  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER', 'WAITER']}>
      <h1 className="text-3xl font-bold mb-2">Payments</h1>
      <p className="text-gray-600 mb-6">Process customer payments</p>
      <div className="space-y-4">
        {pendingPayments.map(o => (
          <div key={o.id} className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
            <div><p className="font-medium">{o.id} - {o.table}</p><p className="text-lg font-bold">${o.total.toFixed(2)}</p></div>
            <div className="flex gap-2"><button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Cash</button><button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Card</button><button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Wallet</button></div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
