import {
	ChainAddress,
	ChainContext,
	Network,
	Signer,
	Wormhole,
	Chain,
} from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";
import dotenv from "dotenv";

dotenv.config();

const ETH_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY as string;
const SOL_PRIVATE_KEY = process.env.SOL_PRIVATE_KEY as string;

if (!ETH_PRIVATE_KEY || !SOL_PRIVATE_KEY) {
	throw new Error(
		"ETH_PRIVATE_KEY or SOL_PRIVATE_KEY is not defined in environment variables"
	);
}

export const getSigner = async <N extends Network, C extends Chain>(
	chain: ChainContext<N, C>
): Promise<{
	chain: ChainContext<N, C>;
	signer: Signer<N, C>;
	address: ChainAddress<C>;
}> => {
	let signer: Signer;
	const platform = chain.platform.utils()._platform;

	switch (platform) {
		case "Solana":
			signer = await (
				await solana()
			).getSigner(await chain.getRpc(), SOL_PRIVATE_KEY);
			break;
		case "Evm":
			signer = await (
				await evm()
			).getSigner(await chain.getRpc(), ETH_PRIVATE_KEY);
			break;
		default:
			throw new Error("Unsupported platform: " + platform);
	}

	return {
		chain,
		signer: signer as Signer<N, C>,
		address: Wormhole.chainAddress(chain.chain, signer.address()),
	};
};
