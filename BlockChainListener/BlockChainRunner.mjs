import {
  registerTransactionstoPay,
  getLastTxConfirmation,
} from "./BlockChainListener.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

while (true) {
  await sleep(60000);
  console.log("hey");
  /*  try {
    //const lastTxConfirmed = await getLastTxConfirmation();
    console.log("hey");

      if (lastTxConfirmed) {
      console.log("hey");
      await registerTransactionstoPay();
    } 
  } catch (e) {
    console.log(e);
  } */
}
