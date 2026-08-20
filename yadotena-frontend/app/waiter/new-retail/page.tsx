'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Plus, Minus } from 'lucide-react';

const products = [
  { id: '1', name: 'Coca Cola', price: 2.99, stock: 45 },
  { id: '2', name: 'Chips', price: 1.99, stock: 23 },
  { id: '3', name: 'Cookies', price: 3.49, stock: 0 },
  { id: '4', name: 'Water Bottle', price: 1.49, stock: 67 },
];

interface CartItem { productId: string; name: string; price: number; quantity: number; }

export default function NewRetailPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const addToCart = (p: any) => { if (p.stock <= 0) return; setCart(prev => { const ex = prev.find(i => i.productId === p.id); if (ex) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i); return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }]; }); };
  const updateQty = (id: string, d: number) => { setCart(prev => prev.map(i => i.productId === id ? { ...i, quantity: Math.max(0, i.quantity + d) } : i).filter(i => i.quantity > 0)); };
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0) * 1.08;
  return (
    <DashboardLayout allowedRoles={['OWNER', 'MANAGER', 'WAITER']}>
      <h1 className="text-3xl font-bold mb-2">New Retail Sale</h1>
      <p className="text-gray-600 mb-6">Process retail transaction</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className={`border p-4 rounded-lg cursor-pointer flex justify-between items-center ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                <div><p className="font-medium">{p.name}</p><p className="text-sm text-gray-500">${p.price.toFixed(2)} • Stock: {p.stock}</p></div>
                <button disabled={p.stock <= 0} className="bg-blue-100 text-blue-600 p-2 rounded disabled:opacity-50"><Plus className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Cart</h2>
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {cart.length === 0 ? <p className="text-gray-500 text-center py-4">No items</p> : cart.map(item => (
              <div key={item.productId} className="flex justify-between items-center">
                <div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-gray-500">${item.price.toFixed(2)} x {item.quantity}</p></div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.productId, -1)} className="p-1 hover:bg-gray-100 rounded"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="p-1 hover:bg-gray-100 rounded"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4"><div className="flex justify-between font-bold text-lg"><span>Total:</span><span>${total.toFixed(2)}</span></div></div>
          <Link href="/waiter/payments" className={`block w-full mt-4 py-2 px-4 rounded text-center font-medium ${cart.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}>Checkout</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
