import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertReviewSchema } from "@/shared/schema";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const agent = await storage.getAgentBySlug(slug);
    if (!agent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }
    const reviews = await storage.getReviewsByAgentId(agent.id);
    return NextResponse.json(reviews);
  } catch (err) {
    console.error("Failed to get reviews:", err);
    return NextResponse.json({ message: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const agent = await storage.getAgentBySlug(slug);
    if (!agent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }

    const body = await req.json();
    const reviewData = insertReviewSchema.parse({
      ...body,
      agentId: agent.id,
    });

    const review = await storage.createReview(reviewData);
    await storage.updateAgentRating(agent.id);
    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    console.error("Failed to create review:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid review data", errors: err.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create review" }, { status: 500 });
  }
}
