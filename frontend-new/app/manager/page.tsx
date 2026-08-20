'use client';

import { useAuth } from '../../lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { useUpdateOrderStatus } from '../../hooks/useOrders';

export default function ManagerDashboard() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('orders');
  
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && user?.role !== 'MANAGER') {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleStatusUpdate = (orderId: string, newStatus: any) => {
    updateStatus.mutate({ id: orderId, status: newStatus });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Yadotena</h1>
              <p className="text-sm text-gray-500">Manager Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">Manager</p>
              </div>
              <button onClick={logout} className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['orders', 'menu', 'products', 'staff', 'settings'].map((tab) => (
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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">All Orders</h2>
            {ordersLoading ? <div>Loading...</div> : orders?.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">{order.customerName || 'N/A'} - ${order.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{order.status}</span>
                    {order.status === 'PENDING' && (
                      <button onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Confirm</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {(activeTab === 'menu' || activeTab === 'products' || activeTab === 'staff' || activeTab === 'settings') && (
          <div className="bg-white p-6 rounded-lg shadow-sm border"><h3 className="text-lg font-medium capitalize mb-4">{activeTab}</h3><p className="text-gray-500">Under development</p></div>
        )}
      </main>
    </div>
  );
}
