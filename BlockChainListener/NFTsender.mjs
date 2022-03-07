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
  amounts = shuffle(amounts);
  let serverTokens = [];
  let filteredAmounts = [];
  amounts.forEach((x) => {
    const filtered = x.filter((x) => x.unit.slice(0, 56) == policy);
    filteredAmounts.push(filtered);
  });
  // console.log(filteredAmounts.length);

  let neededamounts = [];
  let acummulator = 0;
  for (let i = 0; i < filteredAmounts.length; i++) {
    if (acummulator >= numberofTokens) {
      break;
    }
    neededamounts.push(filteredAmounts[i]);

    acummulator = acummulator + filteredAmounts[i].length;
  }
  //console.log(filteredAmounts.length);
  console.log(neededamounts.length);
  for (let i = 0; i < neededamounts.length; i++) {
    //console.log(amounts[i]);
    serverTokens = [...serverTokens, ...neededamounts[i]];
  }
  const selectedTokens = shuffle(serverTokens).slice(0, numberofTokens);
  console.log(selectedTokens.length);
  return selectedTokens;
}

export async function sendTokens(
  sender,
  prvKeysSender,
  address,
  numberofTokens,
  change
) {
  console.log(policy, sender, numberofTokens);
  const tokens = await selectTokens(policy, sender, numberofTokens);
  console.log(sender, tokens);
  return sendNFTs(sender, prvKeysSender, address, tokens, change);
}

//console.log(await selectTokens(policy, process.env.ADDRESS_SECONDARY, 35));
