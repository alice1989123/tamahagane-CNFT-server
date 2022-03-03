import {
  registerTransactionstoPay,
  getLastTxConfirmation,
  registerpassedTx,
} from "./BlockChainListener.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//registerpassedTx();

while (true) {
  await sleep(60000);
  try {
    const lastTxConfirmed = await getLastTxConfirmation();
    console.log(lastTxConfirmed);

    if (lastTxConfirmed) {
      console.log(
        "We are fetching the Blockchain to see if any payment has arrived..."
      );
      await registerTransactionstoPay();
    }
  } catch (e) {
    console.log(e);
  }
}
