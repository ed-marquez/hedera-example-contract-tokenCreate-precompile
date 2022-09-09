import { ContractExecuteTransaction } from "@hashgraph/sdk";

async function contractExecuteSignFcn(
	contractId,
	gasLim,
	payableAmt,
	fcnName,
	paramsObj,
	client,
	signingKey
) {
	const contractExecTx = new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(gasLim)
		.setPayableAmount(payableAmt)
		.setFunction(fcnName, paramsObj)
		.freezeWith(client);
	const contractExecSign = await contractExecTx.sign(signingKey);
	const contractExecSubmit = await contractExecSign.execute(client);
	const contractExecRec = await contractExecSubmit.getRecord(client);

	return contractExecRec;
}
export default contractExecuteSignFcn;
