import { blockFrostReq, BlockFrost } from "./blockfrost.mjs";
import dotenv from "dotenv";
import {
  getLastRegisteredTx,
  registerTransaction,
  getRegisteredTx,
} from "../Database/AddressChecker.mjs";
import { sendTokens } from "./NFTsender.mjs";
dotenv.config();
const serverAddress = process.env.ADDRESS;
//console.log(serverAddress);
const pricePacket = 7000000;

const getTransactionsUTXOs = async function (hash) {
  const transaction = await blockFrostReq(
    `https://cardano-testnet.blockfrost.io/api/v0/txs/${hash}/utxos

  `
  );
  return transaction;
};

export const registerpassedTx = async function () {
  const TransactionsInBlockChain = await BlockFrost.addressesTransactions(
    serverAddress,
    { order: "desc" }
  );

  console.log(
    TransactionsInBlockChain.forEach((x) => {
      x._id = x.tx_hash;
    })
  );
  console.log(TransactionsInBlockChain);
  const registerPassed = await registerTransaction(
    TransactionsInBlockChain,
    "PayedTxs"
  );
};

export const registerTransactionstoPay = async function () {
  const TransactionsInBlockChain = await BlockFrost.addressesTransactions(
    serverAddress,
    { order: "desc" }
  );
  //console.log(TransactionsInBlockChain);

  TransactionsInBlockChain.forEach((tx) => (tx._id = tx.tx_hash));

  const payedTx = await getRegisteredTx("PayedTxs");
  const payedTxHashes = payedTx.map((x) => x._id);

  const TxToPay = await TransactionsInBlockChain.filter(function (tx) {
    return !payedTxHashes.includes(tx.tx_hash);
  });

  async function getDoubts() {
    let currentDoubts = [];
    try {
      for (let j = 0; j < TxToPay.length; j++) {
        const details = await getTransactionsUTXOs(TxToPay[j].tx_hash);
        const hash = details.hash;
        const senderAddress = details.inputs[0].address;
        const outpusToServer = details.outputs.filter(function (x) {
          return x.address == serverAddress;
        });

        const amountPayedtoServer = outpusToServer
          .map((x) => parseInt(x.amount[0].quantity))
          .reduce((x, y) => x + y, 0);
        if (senderAddress !== serverAddress) {
          currentDoubts.push([senderAddress, amountPayedtoServer, hash]);
        }
      }
    } catch (e) {
      console.log(e);
    }
    return currentDoubts;
  }

  const transactionsToPay = await getDoubts();

  const getDoubtsOuputs = transactionsToPay.map((tx) => classyfyTx(tx));

  const payDoubs = async function payDoubs() {
    try {
      for (let j = 0; j < getDoubtsOuputs.length; j++) {
        const tokensqty = getDoubtsOuputs[j].quantityOfNFTsToSend;
        const address = getDoubtsOuputs[j].senderAddress;
        const change = 0;

        const hash_ = await sendTokens(address, tokensqty, change);

        if (hash_ || tokensqty == 0) {
          await registerTransaction(
            [
              {
                _id: getDoubtsOuputs[j].hash,
                address: address,
                change: change,
                tokensqty: tokensqty,
                change: change,
                hash: hash_,
              },
            ],
            "PayedTxs"
          );
          //console.log(details);

          await sleep(60000);
        } else {
          return;
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const hashes = await payDoubs();
};

function classyfyTx(Doubt) {
  const senderAddress = Doubt[0];
  const adarecived = Doubt[1];
  const hash = Doubt[2];

  let quantityOfNFTsToSend;
  let change;
  //console.log(index);
  if (senderAddress == serverAddress) {
    change = 0;
    quantityOfNFTsToSend = 0;
    return { quantityOfNFTsToSend, senderAddress, change, hash };
  }
  quantityOfNFTsToSend = Math.floor(adarecived / pricePacket) * 5;
  //console.log(quantityOfNFTsToSend, senderAddress);
  change = adarecived - quantityOfNFTsToSend * pricePacket * 5;

  return { quantityOfNFTsToSend, senderAddress, change, hash };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getLastTxConfirmation() {
  const lastRegister = await getLastRegisteredTx("PayedTxs");
  const lastHash = lastRegister[0].hash;
  console.log(lastHash);
  const serverTxs = await BlockFrost.addressesTransactions(serverAddress, {
    order: "desc",
  });
  const isTxConfirmed = serverTxs.map((x) => x.tx_hash).includes(lastHash);
  //console.log(isTxConfirmed);
  return isTxConfirmed;
}
