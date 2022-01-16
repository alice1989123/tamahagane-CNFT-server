import { blockFrostReq } from "./blockfrost.mjs";
import { sendNFTs } from "./Utils.mjs";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const policy = "e93ec6209631511713b832e5378f77b587762bc272893a7163ecc46e";
const address = process.env.ADDRESS;
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
  const walletData = await getWalletData(address);
  console.log(walletData);
  const amount = walletData.amount;
  const NFTs = amount.filter(
    // (x) => x.unit.slice(0, 56) == policy);
    (x) => x.unit !== "lovelace"
  );
  const randomNFTs = shuffle(NFTs).slice(0, numberofTokens);
  randomNFTs.forEach((x) => {
    x.quantity = "1";
  });
  //console.log(`NFTs here`, randomNFTs);
  //TODO:Implement what happens where there are not more NFTs!
  return randomNFTs;
}

export async function sendTokens(address, numberofTokens, change) {
  console.log(address, numberofTokens, change);
  const tokens = await selectTokens(numberofTokens);
  return sendNFTs(address, tokens, change);
}
