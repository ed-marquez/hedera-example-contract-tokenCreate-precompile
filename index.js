console.clear();
import {
	AccountId,
	PrivateKey,
	Client,
	Wallet,
	LocalProvider,
	Hbar,
	ContractFunctionParameters,
	TransferTransaction,
	NftId,
} from "@hashgraph/sdk";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config();

import * as fs from "fs";

import accountCreateFcn from "./accountCreate.js";
import contractDeployFcn from "./contractDeploy.js";
import contractExecuteNoSignFcn from "./contractExecuteNoSign.js";
import contractExecuteSignFcn from "./contractExecuteSign.js";
import txFormatterFcn from "./txFormatter.js";
import * as queries from "./queries.js";

const operatorId = AccountId.fromString(process.env.BOB_ID);
const operatorKey = PrivateKey.fromString(process.env.BOB_PVKEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);
client.setDefaultMaxTransactionFee(new Hbar(100));

// const myWallet = new Wallet(operatorId, operatorKey, new LocalProvider());

async function main() {
	console.log(`\n- STEP 1 ===================================\n `);
	// Create accounts
	const initBalance = new Hbar(10);
	const aliceKey = PrivateKey.generateED25519();
	const [aliceSt, aliceId] = await accountCreateFcn(aliceKey, initBalance, client);
	console.log(`- Alice's account: https://hashscan.io/#/testnet/account/${aliceId}`);
	const bobKey = PrivateKey.generateED25519();
	const [bobSt, bobId] = await accountCreateFcn(bobKey, initBalance, client);
	console.log(`- Bob's account: https://hashscan.io/#/testnet/account/${bobId}`);

	// Deploy the contract
	const bytecode = fs.readFileSync("./binaries/TokenCreateContract_sol_TokenCreator.bin");
	let gasLimit = 100000;
	// const [contractId, contractAddress] = await contractDeployFcn(bytecode, gasLimit, client);
	const contractId = "0.0.48216014";

	console.log(`\n- Deployed smart contract with ID: ${contractId}`);
	// console.log(`- The smart contract ID in Solidity format is: ${contractId.toSolidityAddress()}`);
	console.log(`- See: https://hashscan.io/#/testnet/contract/${contractId}`);

	console.log(`\n- STEP 2 ===================================\n`);
	// Create the NFT by executing a contract function
	let gasLimHi = 4000000;
	let payAmt = new Hbar(20);
	let fcnName = "createNft";
	let fcnParams = new ContractFunctionParameters()
		.addString("myToken")
		.addString("MTK")
		.addString("No Memo")
		.addUint32(250)
		.addUint32(7700000)
		.addBytes(operatorKey.publicKey.toBytes());

	const nftCreateRec = await contractExecuteNoSignFcn(
		contractId,
		gasLimHi,
		payAmt,
		fcnName,
		fcnParams,
		client
	);
	const recInfo = await queries.txRecQueryFcn(nftCreateRec.transactionId, client);
	const tokenId = recInfo.children[0].receipt.tokenId;
	console.log(`- Created NFT collection ${tokenId}: ${recInfo.children[0].receipt.status}`);
	console.log(`- See: https://hashscan.io/#/testnet/token/${tokenId}`);

	console.log(`\n- STEP 3 ===================================\n`);
	// Mint new NFTs by executing a contract function

	const cidArray = [
		Buffer.from("ipfs://QmNPCiNA3Dsu3K5FxDPMG5Q3fZRwVTg14EXA92uqEeSRXn"),
		Buffer.from("ipfs://QmZ4dgAgt8owvnULxnKxNe8YqpavtVCXmc1Lt2XajFpJs9"),
		Buffer.from("ipfs://QmPzY5GxevjyfMUF5vEAjtyRoigzWp47MiKAtLBduLMC1T"),
		Buffer.from("ipfs://Qmd3kGgSrAwwSrhesYcY7K54f3qD7MDo38r7Po2dChtQx5"),
		Buffer.from("ipfs://QmWgkKz3ozgqtnvbCLeh7EaR1H8u5Sshx3ZJzxkcrT3jbw"),
	];

	gasLimit = 4000000;
	payAmt = new Hbar(0);
	fcnName = "mintNft";
	fcnParams = new ContractFunctionParameters()
		.addAddress(tokenId.toSolidityAddress())
		// .addBytesArray([Buffer.from(CID[0])]); //Individual minting
		.addBytesArray(cidArray); //Batch minting - UP TO 10 NFTs in single tx

	const nftMintRec = await contractExecuteSignFcn(
		contractId,
		gasLimit,
		payAmt,
		fcnName,
		fcnParams,
		client,
		operatorKey
	);
	const mintInfo = await queries.txRecQueryFcn(nftMintRec.transactionId, client);
	const formattedMintTx = await txFormatterFcn(nftMintRec.transactionId.toString());
	console.log(`- Minted NFTs: ${mintInfo.children[0].receipt.status}`);
	console.log(`- See: https://hashscan.io/#/testnet/transactionsById/${formattedMintTx}`);

	// Show balances
	await queries.balanceCheckerFcn(operatorId, tokenId, client);
	await queries.balanceCheckerFcn(contractId, tokenId, client);
	await queries.balanceCheckerFcn(aliceId, tokenId, client);
	await queries.balanceCheckerFcn(bobId, tokenId, client);

	console.log(`\n- STEP 4 ===================================\n`);

	// Transfer NFTS and collect royalties
	payAmt = new Hbar(3);
	fcnName = "sendNft";
	fcnParams = new ContractFunctionParameters()
		.addAddress(tokenId.toSolidityAddress())
		.addAddress(aliceId.toSolidityAddress())
		.addInt64(3)
		.addAddress(bobId.toSolidityAddress());

	const nftSendRec = await contractExecuteSignFcn(
		contractId,
		gasLimit,
		payAmt,
		fcnName,
		fcnParams,
		client,
		aliceKey
	);
	const sendInfo = await queries.txRecQueryFcn(nftSendRec.transactionId, client);
	const formattedSendTx = await txFormatterFcn(nftSendRec.transactionId.toString());
	console.log(`- Sent NFTs: ${mintInfo.children[0].receipt.status}`);
	console.log(`- See: https://hashscan.io/#/testnet/transactionsById/${formattedSendTx}`);
	console.log(``);

	// Show balances
	await queries.balanceCheckerFcn(operatorId, tokenId, client);
	await queries.balanceCheckerFcn(contractId, tokenId, client);
	await queries.balanceCheckerFcn(aliceId, tokenId, client);
	await queries.balanceCheckerFcn(bobId, tokenId, client);

	console.log(`\n- DONE ===================================\n`);
	console.log(`- See Operator history: https://hashscan.io/#/testnet/account/${operatorId}`);
}
main();
