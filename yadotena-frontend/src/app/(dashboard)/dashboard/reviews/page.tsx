"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { mockReviews } from "@/mocks";
import { formatDistanceToNow } from "date-fns";

export default function ReviewsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Customer Reviews</h2>
        <p className="text-muted-foreground mt-1">See what customers are saying.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mockReviews.map((review) => (
          <Card key={review.id} className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-bold">{review.customerName}</CardTitle>
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-amber-500" : "text-muted opacity-30"}`} />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm italic text-muted-foreground">"{review.comment}"</p>
              <div className="mt-4 text-xs text-muted-foreground font-medium">
                {formatDistanceToNow(new Date(review.date))} ago
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
