import { provisionedCards } from "@/lib/cards";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    success: true,
    cards: provisionedCards,
    count: provisionedCards.length,
  });
}
