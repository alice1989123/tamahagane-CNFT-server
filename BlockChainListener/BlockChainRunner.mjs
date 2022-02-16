import {
  registerTransactionstoPay,
  getLastTxConfirmation,
} from "./BlockChainListener.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

while (true) {
  try {
    await sleep(60000);
    const lastTxConfirmed = await getLastTxConfirmation();
    if (lastTxConfirmed) {
      await registerTransactionstoPay();
    }
  } catch (e) {
    console.log(e);
  }
}
