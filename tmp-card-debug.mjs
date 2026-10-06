import "dotenv/config";
import { getPublicCardByToken } from "./src/lib/loyalty/cards";

const tokens = ["RBLOY_HPQV8QUK9SCT", "RBLOY_UZTNM9LIY7QK"];
for (const token of tokens) {
  try {
    const card = await getPublicCardByToken(token);
    console.log(token, card ? { visits: card.visits, name: card.firstName, org: card.organizationName } : "NOT_FOUND");
  } catch (error) {
    console.log(token, "ERR", error instanceof Error ? error.message : error);
  }
}
process.exit(0);
