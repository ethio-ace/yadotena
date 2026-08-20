'use client';

import { useAuth } from '../../lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOrders, useCreateOrder } from '../../hooks/useOrders';

export default function WaiterDashboard() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('orders');
  
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const createOrder = useCreateOrder();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
    if (!isLoading && isAuthenticated && user?.role !== 'WAITER') router.push('/login');
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
  }

  const myOrders = orders?.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div><h1 className="text-2xl font-bold text-gray-900">Yadotena</h1><p className="text-sm text-gray-500">Waiter Dashboard</p></div>
            <div className="flex items-center space-x-4">
              <div className="text-right"><p className="text-sm font-medium text-gray-900">{user?.username}</p><p className="text-xs text-gray-500">Waiter</p></div>
              <button onClick={logout} className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['orders', 'new-order', 'menu'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Orders</h2>
            {ordersLoading ? <div>Loading...</div> : myOrders && myOrders.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myOrders.map((order) => (
                  <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border">
                    <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">Table: {order.tableNumber || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{order.orderItems.length} items - ${order.totalAmount.toFixed(2)}</p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{order.status}</span>
                  </div>
                ))}
              </div>
            ) : <div className="text-gray-500">No active orders</div>}
          </div>
        )}
        {activeTab === 'new-order' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Create New Order</h3>
            <p className="text-gray-500">Order creation form under development</p>
          </div>
        )}
        {activeTab === 'menu' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Menu Items</h3>
            <p className="text-gray-500">Menu viewer under development</p>
          </div>
        )}
      </main>
    </div>
  );
}
