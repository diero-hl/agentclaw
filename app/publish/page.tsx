"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CATEGORIES } from "@/shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Publish() {
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    fullDescription: "",
    category: "",
    publisherName: "",
    capabilities: "",
    tags: "",
    platforms: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const slug = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const res = await apiRequest("POST", "/api/agents", {
        name: form.name,
        slug,
        shortDescription: form.shortDescription,
        fullDescription: form.fullDescription,
        category: form.category,
        price: "0",
        priceLabel: "Free",
        imageUrl: "",
        publisherName: form.publisherName || "Anonymous",
        capabilities: form.capabilities.split(",").map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        platforms: form.platforms.split(",").map((s) => s.trim()).filter(Boolean),
        purchases: 0,
        rating: "0",
        featured: false,
        version: "1.0.0",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Agent published", description: "Your agent is now live on the marketplace." });
      router.push(`/agent/${data.slug}`);
    },
    onError: () => {
      toast({ title: "Failed to publish", description: "Please check your inputs and try again.", variant: "destructive" });
    },
  });

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const categories = CATEGORIES.filter((c) => c !== "All");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Publish an Agent</h1>
          <p className="text-sm text-muted-foreground">
            Share your agent with the marketplace community. All agents are free.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Agent Name *</label>
              <Input
                placeholder="e.g. Shopify Sales Booster"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                data-testid="input-agent-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Short Description *</label>
              <Input
                placeholder="A brief one-liner about what your agent does"
                value={form.shortDescription}
                onChange={(e) => update("shortDescription", e.target.value)}
                data-testid="input-short-description"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Full Description *</label>
              <Textarea
                placeholder="Detailed description of capabilities, use cases, and how to use..."
                value={form.fullDescription}
                onChange={(e) => update("fullDescription", e.target.value)}
                rows={6}
                className="resize-none text-sm"
                data-testid="input-full-description"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Category *</label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Publisher Name</label>
              <Input
                placeholder="Your name or company"
                value={form.publisherName}
                onChange={(e) => update("publisherName", e.target.value)}
                data-testid="input-publisher-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Capabilities</label>
              <Input
                placeholder="Task Automation, Content Generation, Analytics (comma-separated)"
                value={form.capabilities}
                onChange={(e) => update("capabilities", e.target.value)}
                data-testid="input-capabilities"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list of capabilities</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Platforms</label>
              <Input
                placeholder="Shopify, WooCommerce, BigCommerce (comma-separated)"
                value={form.platforms}
                onChange={(e) => update("platforms", e.target.value)}
                data-testid="input-platforms"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags</label>
              <Input
                placeholder="shopify, automation, marketing (comma-separated)"
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                data-testid="input-tags"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => mutation.mutate()}
              disabled={
                !form.name.trim() ||
                !form.shortDescription.trim() ||
                !form.fullDescription.trim() ||
                !form.category ||
                mutation.isPending
              }
              data-testid="button-submit-agent"
            >
              {mutation.isPending ? "Publishing..." : "Publish Agent"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
