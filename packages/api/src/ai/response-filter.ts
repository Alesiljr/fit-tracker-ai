import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { userBoundaries } from '../db/schema.js';

export async function filterResponse(
  response: string,
  userId: string,
): Promise<{ safe: boolean; violations: string[] }> {
  const boundaries = await db
    .select()
    .from(userBoundaries)
    .where(and(eq(userBoundaries.userId, userId), eq(userBoundaries.isActive, true)));

  const violations: string[] = [];
  const responseLower = response.toLowerCase();

  for (const boundary of boundaries) {
    const keywords = boundary.keywords ?? [];

    for (const keyword of keywords) {
      if (keyword && responseLower.includes(keyword.toLowerCase())) {
        violations.push(
          `Boundary violation: "${boundary.item}" (keyword: "${keyword}")`,
        );
        break;
      }
    }

    if (responseLower.includes(boundary.itemNormalized.toLowerCase())) {
      const alreadyReported = violations.some((v) => v.includes(boundary.item));
      if (!alreadyReported) {
        violations.push(`Boundary violation: "${boundary.item}" (direct match)`);
      }
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}
