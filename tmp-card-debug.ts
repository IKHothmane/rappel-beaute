import "dotenv/config";
import { getPublicCardByToken } from "./src/lib/loyalty/cards";

async function main() {
  const tokens = ["RBLOY_HPQV8QUK9SCT", "RBLOY_UZTNM9LIY7QK"];
  for (const token of tokens) {
    try {
      const card = await getPublicCardByToken(token);
      console.log(token, card ? `${card.firstName} ${card.visits}` : "NOT_FOUND");
    } catch (error) {
      console.log(token, "ERR", error instanceof Error ? error.message : error);
    }
  }
}

main().finally(() => process.exit(0));
