'use client';

import { useState } from 'react';
import { useAuth } from '../../../lib/auth/context';
import { useRouter } from 'next/navigation';
import { useOrders, orderKeys } from '../../../hooks/useOrders';
import { useQueryClient } from '@tanstack/react-query';
import { Order, OrderStatus } from '../../../types';

export default function OwnerOrdersPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  
  const { data: orders = [], isLoading, error } = useOrders(
    statusFilter ? { status: statusFilter as OrderStatus } : undefined
  );

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      PENDING: 'bg-orange-100 text-orange-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-indigo-100 text-indigo-800',
      READY: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
              <p className="text-sm text-gray-500 mt-1">View and manage all orders</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName || user?.username} ({user?.role})
              </span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => router.push('/owner')}
              className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/owner/orders')}
              className="py-4 px-1 border-b-2 border-blue-500 text-sm font-medium text-blue-600 whitespace-nowrap"
            >
              Orders
            </button>
            <button
              onClick={() => router.push('/owner/menu')}
              className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
            >
              Menu
            </button>
            <button
              onClick={() => router.push('/owner/products')}
              className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
            >
              Products
            </button>
            <button
              onClick={() => router.push('/owner/analytics')}
              className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
            >
              Analytics
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
            className="input-base w-48"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Orders</h2>
          </div>
          
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-red-600">
              Error loading orders. Please try again.
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No orders found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead className="table-header">
                  <tr>
                    <th className="table-cell font-medium text-gray-900">Order ID</th>
                    <th className="table-cell font-medium text-gray-900">Type</th>
                    <th className="table-cell font-medium text-gray-900">Customer</th>
                    <th className="table-cell font-medium text-gray-900">Amount</th>
                    <th className="table-cell font-medium text-gray-900">Status</th>
                    <th className="table-cell font-medium text-gray-900">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="table-row cursor-pointer hover:bg-blue-50" onClick={() => router.push(`/owner/orders/${order.id}`)}>
                      <td className="table-cell font-mono text-sm">{order.id.slice(0, 8)}...</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.orderType === 'MENU' ? 'bg-purple-100 text-purple-800' : 'bg-cyan-100 text-cyan-800'}`}>
                          {order.orderType}
                        </span>
                      </td>
                      <td className="table-cell">{order.customerName || 'N/A'}</td>
                      <td className="table-cell font-medium">${order.totalAmount.toFixed(2)}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
