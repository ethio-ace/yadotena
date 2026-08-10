"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { api } from "@/services/api";
import { formatDistanceToNow } from "date-fns";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";

export default function ReviewsPage() {
  const { data: reviews = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["reviews"],
    queryFn: api.reviews.getAll,
  });

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Reviews</h2>
          <p className="text-muted-foreground mt-1">Feedback submitted from order tracking.</p>
        </div>
        {avgRating && (
          <p className="text-sm font-bold">
            Avg {avgRating} / 5 · {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {isError && (
        <ErrorState
          title="Could not load reviews"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="p-8 text-muted-foreground">Loading reviews…</div>
      ) : reviews.length === 0 && !isError ? (
        <EmptyState
          title="No reviews yet"
          description="Guests can rate completed orders from the order tracking page."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reviews.map((review) => (
            <Card key={review.id} className="flex flex-col h-full rounded-3xl">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-bold">{review.customerName}</CardTitle>
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? "fill-amber-500" : "text-muted opacity-30"}`}
                      />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm italic text-muted-foreground">
                  &ldquo;{review.comment || "No comment"}&rdquo;
                </p>
                <div className="mt-4 text-xs text-muted-foreground font-medium">
                  {formatDistanceToNow(new Date(review.date))} ago
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
