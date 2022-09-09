import { ContractExecuteTransaction } from "@hashgraph/sdk";

async function contractExecuteNoSignFcn(
	contractId,
	gasLim,
	payableAmt,
	fcnName,
	paramsObj,
	client
) {
	const contractExecTx = new ContractExecuteTransaction()
		.setContractId(contractId)
		.setGas(gasLim)
		.setPayableAmount(payableAmt)
		.setFunction(fcnName, paramsObj);
	const contractExecSubmit = await contractExecTx.execute(client);
	const contractExecRec = await contractExecSubmit.getRecord(client);

	return contractExecRec;
}
export default contractExecuteNoSignFcn;
