async function txFormatterFcn(txId) {
	const a = txId.split("@");
	const b = a[1].split(".");
	return `${a[0]}-${b[0]}-${b[1]}`;
}
export default txFormatterFcn;
