import { blockFrostReq, BlockFrost } from "./blockfrost.mjs";
import { sendNFTs } from "./Utils.mjs";
import { policysId } from "../Constants/policyId.mjs";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const policy = policysId[0];
//console.log(address);

const utxosURL =
  "https://cardano-testnet.blockfrost.io/api/v0/addresses/{address}/utxos/{asset}";

export async function getWalletData(addr) {
  try {
    const uTXOs = function (addrsBench32) {
      return `https://cardano-testnet.blockfrost.io/api/v0/addresses/${addrsBench32}`;
    };
    const URL = uTXOs(addr);
    const response = await blockFrostReq(URL);
    //console.log(response);

    return response;
  } catch (e) {
    console.log(e);
  }
}

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

async function selectTokens(policy, address, numberofTokens) {
  const utxos = await BlockFrost.addressesUtxos(address);
  let amounts = utxos.map((x) => x.amount);

  let serverTokens = [];
  for (let i = 0; i < amounts.length; i++) {
    //console.log(amounts[i]);
    serverTokens = serverTokens.concat(amounts[i]);
    serverTokens = serverTokens.filter((x) => x.unit.slice(0, 56) == policy);
  }
  // console.log(serverTokens);
  const selectedTokens = serverTokens.slice(0, numberofTokens);
  //console.log(selectedTokens);
  return selectedTokens;
}

export async function sendTokens(
  sender,
  prvKeysSender,
  address,
  numberofTokens,
  change
) {
  //console.log(address, numberofTokens, change);
  const tokens = await selectTokens(policy, sender, numberofTokens);
  console.log(sender, tokens);
  return sendNFTs(sender, prvKeysSender, address, tokens, change);
}

//console.log(await selectTokens(10));
