import { wormhole, Chain, chains, amount } from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import bs58 from "bs58";
import { z } from "zod";

import { getSigner } from "./utils";

export interface AutoTransferParams {
	transferAmount: number;
	fromChain: Chain;
	toChain: Chain;
	message?: string;
}

const server = new McpServer({
	name: "wormhole-mcp",
	version: "1.0.0",
	capabilities: {
		resources: {},
		tools: {},
	},
});

server.tool(
	"auto-transfer",
	"Automatically transfer assets between chains",
	{
		transferAmount: z.number().min(0).describe("Amount to transfer"),
		fromChain: z.enum(chains).describe("Chain to transfer from"),
		toChain: z.enum(chains).describe("Chain to transfer to"),
		message: z
			.string()
			.optional()
			.describe("Optional message to include in the transfer"),
	},
	async ({
		transferAmount,
		fromChain,
		toChain,
		message,
	}: AutoTransferParams) => {
		try {
			const amtBigInt = BigInt(transferAmount * 1_000_000);

			const wh = await wormhole("Testnet", [evm, solana]);

			const sendChain = wh.getChain(fromChain);
			const rcvChain = wh.getChain(toChain);

			const source = await getSigner(sendChain);
			const destination = await getSigner(rcvChain);

			const payload = !message?.trim() ? undefined : bs58.decode(message);

			const nativeGas = amount.units(amount.parse("0.0", 6));

			const transfer = await wh.circleTransfer(
				amtBigInt,
				source.address,
				destination.address,
				true, // Automatic defaults to true
				payload,
				nativeGas
			);

			console.log("Starting Transfer");
			const txnHashes = await transfer.initiateTransfer(source.signer);

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								message: "✅ Initiated automatic transfer",
								data: txnHashes,
							},
							null,
							2
						),
					},
				],
			};
		} catch (error) {
			console.error("Error in auto-transfer:", error);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								message:
									"❌ Failed to initiate automatic transfer",
								error:
									error instanceof Error
										? error.message
										: error,
							},
							null,
							2
						),
					},
					{
						type: "text",
						text: "Please check the logs for more details.",
					},
				],
			};
		}
	}
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
