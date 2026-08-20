'use client';

import { useAuth } from '../../lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOrders, useUpdateOrderStatus } from '../../hooks/useOrders';

export default function ChefDashboard() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
    if (!isLoading && isAuthenticated && user?.role !== 'CHEF') router.push('/login');
  }, [isAuthenticated, isLoading, user, router]);

  const handleStatusUpdate = (orderId: string, newStatus: any) => {
    updateStatus.mutate({ id: orderId, status: newStatus });
  };

  if (isLoading || !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
  }

  const kitchenOrders = orders?.filter(o => ['CONFIRMED', 'PREPARING', 'READY'].includes(o.status));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div><h1 className="text-2xl font-bold text-gray-900">Yadotena</h1><p className="text-sm text-gray-500">Kitchen Display</p></div>
            <div className="flex items-center space-x-4">
              <div className="text-right"><p className="text-sm font-medium text-gray-900">{user?.username}</p><p className="text-xs text-gray-500">Chef</p></div>
              <button onClick={logout} className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex gap-2">
          {['all', 'CONFIRMED', 'PREPARING', 'READY'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}>
              {f === 'all' ? 'All Orders' : f}
            </button>
          ))}
        </div>

        {ordersLoading ? <div>Loading...</div> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kitchenOrders?.filter(o => filter === 'all' || o.status === filter).map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-lg">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">Table: {order.tableNumber || 'N/A'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' : order.status === 'PREPARING' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>{order.status}</span>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Items:</p>
                  <ul className="space-y-1">
                    {order.orderItems.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        {item.quantity}x {item.product?.name || item.menuItem?.name || 'Item'}
                        {item.notes && <span className="text-gray-500 italic"> - {item.notes}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex gap-2">
                  {order.status === 'CONFIRMED' && (
                    <button onClick={() => handleStatusUpdate(order.id, 'PREPARING')} className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">Start Preparing</button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button onClick={() => handleStatusUpdate(order.id, 'READY')} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Mark Ready</button>
                  )}
                  {order.status === 'READY' && (
                    <span className="flex-1 text-center text-green-600 font-medium">Ready for pickup</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
