import { blockFrostReq, BlockFrost } from "./blockfrost.mjs";
import { sendNFTs } from "./Utils.mjs";
import { policysId } from "../Constants/policyId.mjs";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const policy = policysId[1];
const serverAddress = process.env.ADDRESS;
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

async function selectTokens(numberofTokens) {
  //Better version it chooses randomly agrouping of the same UTXOs when possible //TODO: HERE IS A BIG ERROR YOU MUST FILTER OUT THE ADAS!!
  const utxos = await BlockFrost.addressesUtxos(serverAddress);
  //const suffledutxos = shuffle(utxos); // It is no needed to shuffles since they are minted shuffled!!
  let amounts = utxos.map((x) => x.amount);

  //amounts = amounts.filter((x) => x.unit.slice(0, 56) == policy);

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

export async function sendTokens(address, numberofTokens, change) {
  console.log(address, numberofTokens, change);
  const tokens = await selectTokens(numberofTokens);
  return sendNFTs(address, tokens, change);
}

console.log(await selectTokens(10));
