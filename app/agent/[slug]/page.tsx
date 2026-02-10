"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Share2, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { Agent, Review } from "@/shared/schema";

function StarRating({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  return (
    <div className="flex gap-0.5" data-testid="input-star-rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="p-0.5"
          data-testid={`button-star-${i}`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function AgentDetail() {
  const params = useParams();
  const slug = params?.slug as string;
  const { toast } = useToast();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ["/api/agents", slug],
    enabled: !!slug,
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ["/api/agents", slug, "reviews"],
    enabled: !!slug,
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/agents/${slug}/deploy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", slug] });
      toast({ title: "Agent deployed", description: "Your agent is now active and ready to use." });
    },
    onError: () => {
      toast({ title: "Deployment failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/agents/${slug}/reviews`, {
        authorName: reviewAuthor || "Anonymous",
        rating: reviewRating,
        comment: reviewComment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", slug, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", slug] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      setReviewComment("");
      setReviewAuthor("");
      setReviewRating(5);
      toast({ title: "Review submitted", description: "Thanks for your feedback!" });
    },
    onError: () => {
      toast({ title: "Failed to submit review", variant: "destructive" });
    },
  });

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4" data-testid="text-not-found">Agent not found</p>
          <Link href="/">
            <Button variant="ghost" data-testid="button-back-marketplace">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const ratingNum = parseFloat(agent.rating ?? "0");
  const firstLetter = agent.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-muted-foreground">{firstLetter}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold tracking-tight" data-testid="text-agent-title">{agent.name}</h1>
                  <p className="text-xs text-muted-foreground mt-1">{agent.category}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                {agent.shortDescription}
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">About</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {agent.fullDescription}
              </div>
            </div>

            {agent.capabilities && agent.capabilities.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Capabilities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {agent.capabilities.map((cap) => (
                    <div key={cap} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                      {cap}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agent.platforms && agent.platforms.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Platforms</h2>
                <div className="flex flex-wrap gap-1.5">
                  {agent.platforms.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs font-normal">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                Reviews ({reviews?.length ?? 0})
              </h2>

              {reviews && reviews.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {reviews.map((review) => (
                    <Card key={review.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-muted">
                            {review.authorName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-medium">{review.authorName}</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">No reviews yet. Be the first to review this agent.</p>
              )}

              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4">Write a Review</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Your name</label>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Anonymous"
                      value={reviewAuthor}
                      onChange={(e) => setReviewAuthor(e.target.value)}
                      data-testid="input-review-author"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Rating</label>
                    <StarRating rating={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Comment</label>
                    <Textarea
                      placeholder="Share your experience with this agent..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="resize-none text-sm"
                      rows={3}
                      data-testid="input-review-comment"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => reviewMutation.mutate()}
                    disabled={!reviewComment.trim() || reviewMutation.isPending}
                    data-testid="button-submit-review"
                  >
                    {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-5 space-y-5 lg:sticky lg:top-20">
              <div>
                <span className="text-xs text-muted-foreground">{agent.category}</span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-bold">Free</span>
                </div>
              </div>

              {ratingNum > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">{ratingNum.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({agent.reviewCount})</span>
                </div>
              )}

              <div className="space-y-2">
                <Link href={`/agent/${slug}/chat`}>
                  <Button className="w-full" data-testid="button-chat">
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Chat with Agent
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => deployMutation.mutate()}
                  disabled={deployMutation.isPending}
                  data-testid="button-deploy"
                >
                  {deployMutation.isPending ? "Deploying..." : "Deploy Agent"}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleShare}
                  data-testid="button-share"
                >
                  {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Share2 className="w-4 h-4 mr-1.5" />}
                  {copied ? "Copied!" : "Share"}
                </Button>
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between gap-4">
                  <span>Version</span>
                  <span className="font-medium text-foreground">{agent.version}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Published</span>
                  <span className="font-medium text-foreground">
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-muted">
                    {agent.publisherName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-tight">{agent.publisherName}</p>
                  <p className="text-[11px] text-muted-foreground">Publisher</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
