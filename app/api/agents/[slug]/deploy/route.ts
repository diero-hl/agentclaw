import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const agent = await storage.getAgentBySlug(slug);
    if (!agent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }
    await storage.incrementPurchases(slug);
    return NextResponse.json({ message: "Agent deployed successfully", agentId: agent.id });
  } catch (err) {
    console.error("Failed to deploy agent:", err);
    return NextResponse.json({ message: "Failed to deploy agent" }, { status: 500 });
  }
}
