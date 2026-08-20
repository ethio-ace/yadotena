'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

const menuItems = [
  { id: '1', name: 'Margherita Pizza', price: 12.99, category: 'Main' },
  { id: '2', name: 'Caesar Salad', price: 8.99, category: 'Appetizer' },
  { id: '3', name: 'Chocolate Cake', price: 6.99, category: 'Dessert' },
  { id: '4', name: 'Coffee Latte', price: 4.99, category: 'Drink' },
];

interface CartItem { menuItemId: string; name: string; price: number; quantity: number; }

export default function NewOrderPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.menuItemId === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal * 1.08;

  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER', 'WAITER']}>
      <h1 className="text-3xl font-bold mb-2">New Menu Order</h1>
      <p className="text-gray-600 mb-6">Select items and create order</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Menu Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map(item => (
              <div key={item.id} onClick={() => addToCart(item)} className="border p-4 rounded-lg cursor-pointer hover:bg-gray-50 flex justify-between items-center">
                <div><p className="font-medium">{item.name}</p><p className="text-sm text-gray-500">${item.price.toFixed(2)}</p></div>
                <button className="bg-blue-100 text-blue-600 p-2 rounded"><Plus className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <input type="text" placeholder="Table Number" value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="w-full border p-2 rounded mb-4" />
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {cart.length === 0 ? <p className="text-gray-500 text-center py-4">No items added</p> : cart.map(item => (
              <div key={item.menuItemId} className="flex justify-between items-center">
                <div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-gray-500">${item.price.toFixed(2)} x {item.quantity}</p></div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.menuItemId, -1)} className="p-1 hover:bg-gray-100 rounded"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.menuItemId, 1)} className="p-1 hover:bg-gray-100 rounded"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Tax:</span><span>${(total - subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>${total.toFixed(2)}</span></div>
          </div>
          <Link href={`/waiter/orders?table=${tableNumber}`} className={`block w-full mt-4 py-2 px-4 rounded text-center font-medium ${cart.length > 0 && tableNumber ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Proceed to Checkout</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
