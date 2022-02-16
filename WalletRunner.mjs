import { sendAllTokens } from "./sendingAllTokensToAddress.mjs";
import { sendAda } from "./Lib/Wallet.mjs";

//console.log(process.env.ADDRESS);
//console.log(process.env.ADDRESS_SECONDARY);
sendAllTokens(process.env.WALLET_KEY, process.env.ADDRESS_SECONDARY);
/* sendAda(
  "addr_test1qqun73zs2lnnzqadj9km7npzmskhskqwrlzqg0q6k9ny0psscd6eljn034ak28hz55d90h2823sev7qrhxyafhz989dq8e3na4",
  2000000000
); */
