import { ContractCreateFlow } from "@hashgraph/sdk";

async function contractDeployFcn(bytecode, gasLim, client) {
	// Create the smart contract
	const contractCreateTx = new ContractCreateFlow().setBytecode(bytecode).setGas(gasLim);
	const contractCreateSubmit = await contractCreateTx.execute(client);
	const contractCreateRx = await contractCreateSubmit.getReceipt(client);
	const contractId = contractCreateRx.contractId;
	const contractAddress = contractId.toSolidityAddress();

	return [contractId, contractAddress];
}
export default contractDeployFcn;
