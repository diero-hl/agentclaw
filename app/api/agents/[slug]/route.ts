import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

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
    await storage.incrementViews(slug);
    return NextResponse.json(agent);
  } catch (err) {
    console.error("Failed to get agent:", err);
    return NextResponse.json({ message: "Failed to fetch agent" }, { status: 500 });
  }
}
