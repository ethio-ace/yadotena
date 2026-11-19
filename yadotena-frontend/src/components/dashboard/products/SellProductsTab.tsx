"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PackageCheck, MinusCircle, PlusCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { formatETB } from "@/lib/currency";
import { Product } from "@/types";
import { toast } from "sonner";


export function SellProductsTab() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: api.products.getAll,
  });

  const registerSale = useMutation({
    mutationFn: api.productSales.create,
    onSuccess: () => {
      toast.success(`Successfully sold ${quantity}x ${selectedProduct?.name}`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productSales"] });
      setSelectedProduct(null);
      setQuantity(1);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to register sale");
    }
  });

  const handleSell = () => {
    if (!selectedProduct) return;
    registerSale.mutate({
      product: selectedProduct.id,
      quantity,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xl font-bold">Select Product</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.filter(p => p.is_active).map(product => (
            <Card 
              key={product.id}
              className={`cursor-pointer transition-all border-2 ${selectedProduct?.id === product.id ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/30"}`}
              onClick={() => {
                setSelectedProduct(product);
                setQuantity(1);
              }}
            >
              <CardContent className="p-4 flex flex-col h-full justify-between gap-4">
                <div>
                  <h4 className="font-bold leading-tight">{product.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                </div>
                <div className="flex justify-between items-end">
                  <div className="font-black text-primary">{formatETB(product.price)}</div>
                  <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"} className="text-[10px]">
                    {product.stock_quantity} in stock
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {products.filter(p => p.is_active).length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
              <PackageCheck className="mx-auto h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground font-medium">No active products available for sale.</p>
            </div>
          )}
        </div>
      </div>
      
      <div>
        <Card className="sticky top-4 rounded-3xl border-muted-foreground/15 shadow-lg overflow-hidden">
          <CardHeader className="bg-muted/30 border-b py-4">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Register Sale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {!selectedProduct ? (
              <div className="py-8 text-center text-muted-foreground">
                <PackageCheck className="mx-auto h-12 w-12 opacity-20 mb-3" />
                <p>Select a product to sell</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h4 className="font-bold text-lg">{selectedProduct.name}</h4>
                  <p className="text-primary font-black">{formatETB(selectedProduct.price)} each</p>
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Quantity</label>
                  <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl w-fit">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <MinusCircle className="h-5 w-5" />
                    </Button>
                    <span className="font-black text-xl w-8 text-center">{quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => setQuantity(Math.min(selectedProduct.stock_quantity, quantity + 1))}
                      disabled={quantity >= selectedProduct.stock_quantity}
                    >
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  </div>
                  {quantity >= selectedProduct.stock_quantity && (
                    <p className="text-xs text-rose-500 font-bold">Max stock reached</p>
                  )}
                </div>
                
                <div className="pt-4 border-t space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">Total to pay</span>
                    <span className="font-black text-2xl">{formatETB(selectedProduct.price * quantity)}</span>
                  </div>
                  
                  <Button 
                    className="w-full h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary/20"
                    disabled={registerSale.isPending || selectedProduct.stock_quantity < 1}
                    onClick={handleSell}
                  >
                    Confirm Sale
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
