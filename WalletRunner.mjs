import { sendAllTokens } from "./sendingAllTokensToAddress.mjs";
import * as keys from "./Wallet/keys.mjs";
import { sendAda } from "./Lib/Wallet.mjs";

//console.log(process.env.ADDRESS);
//console.log(process.env.ADDRESS_SECONDARY);
sendAllTokens(
  process.env.WALLET_KEY,
  "addr_test1qpujcmmsumgj6xpyknwlh4ga8y0t3vg5jtsw09s8v5xwpdta9xq2u7rwnp0q43xh8qku3prjv2yk9ex80p7368034uxs9fcr36",
  1
);
/* sendAda(
  keys.address2,
  keys.prvKey2,
  "addr_test1qr88p6ggv58c8jylngznrf4h82lyjyjt533ekzcp4aqe07c5ksvfsaavj230h28nu4gtdgk8ct2rpwu4nrchng7e5f4qn6p6p9",
  80000000
); */
