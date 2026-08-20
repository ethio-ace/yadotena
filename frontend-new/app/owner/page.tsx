'use client';

import { useAuth } from '../../lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { OrderStatus } from '../../types';

export default function OwnerDashboard() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: orders, isLoading: ordersLoading } = useOrders();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && user?.role !== 'OWNER') {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const pendingOrders = orders?.filter(o => o.status === 'PENDING').length || 0;
  const completedToday = orders?.filter(o => o.status === 'COMPLETED').length || 0;
  const totalRevenue = orders?.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + o.totalAmount, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Yadotena</h1>
              <p className="text-sm text-gray-500">Owner Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">Owner</p>
              </div>
              <button
                onClick={logout}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['overview', 'orders', 'menu', 'products', 'staff', 'analytics', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <dt className="text-sm font-medium text-gray-500 truncate">Pending Orders</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{pendingOrders}</dd>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <dt className="text-sm font-medium text-gray-500 truncate">Completed Today</dt>
                <dd className="mt-1 text-3xl font-semibold text-green-600">{completedToday}</dd>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-600">${totalRevenue.toFixed(2)}</dd>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <dt className="text-sm font-medium text-gray-500 truncate">Active Staff</dt>
                <dd className="mt-1 text-3xl font-semibold text-purple-600">--</dd>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ordersLoading ? (
                      <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                    ) : orders && orders.length > 0 ? (
                      orders.slice(0, 5).map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.id.slice(0, 8)}...</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customerName || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.totalAmount.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="px-6 py-4 text-center">No orders found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">All Orders</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                New Order
              </button>
            </div>
            <div className="p-6">
              {ordersLoading ? (
                <div className="text-center py-8">Loading orders...</div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-500">{order.customerName || 'No customer name'}</p>
                          <p className="text-sm text-gray-500">{order.orderItems.length} items</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</p>
                          <span className={`inline-block px-2 py-1 mt-1 text-xs rounded-full ${
                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No orders found</div>
              )}
            </div>
          </div>
        )}

        {(activeTab === 'menu' || activeTab === 'products' || activeTab === 'staff' || activeTab === 'analytics' || activeTab === 'settings') && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">{activeTab}</h3>
            <p className="text-gray-500">This section is under development.</p>
          </div>
        )}
      </main>
    </div>
  );
}
