import {
  getUtxos,
  amountToValue,
  ValuetoAmount,
  toHex,
  fromHex,
  getWalletData,
  BlockFrost,
  initTx,
} from "./Lib/Wallet.mjs";
import { Buffer } from "safe-buffer";
import * as fs from "fs";
import { exec } from "child_process";
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import CoinSelection from "./Lib/CoinSelection.mjs";
import { ProtocolParamUpdate } from "@emurgo/cardano-serialization-lib-nodejs";

const clientAddress =
  "addr_test1qp6kuchljenmrpeqndh7rdthqc2frnm0jw5pu8u3ws0zuwkvhpj2uecg0a5mhkdtwnm30qw38tjq42uxu80rpjn7yytsmffw4e";

const contractAddress =
  "addr_test1wp9cnq967kcf7dtn7fhpqr0cz0wjffse67qc3ww4v3c728c4qjr6j";

const price = 2;

const Martifypath = "/home/alice/Martify";

async function sh(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function getContractAddress() {
  let { stdout } =
    await sh(`cardano-cli address build --payment-script-file $HOME/Martify/market.plutus --testnet-magic $TESTNET_MAGIC 
  `);

  const address = stdout.split("\n")[0];
  return address;
}

const tokenToSell = async function sh(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

async function getdatumHash() {
  let { stdout } =
    await sh(`cardano-cli transaction hash-script-data --script-data-file ./CardanoCli/datum-${policyId}-${tokenName}.json
  `);

  const datum = stdout.split("\n")[0];
  return datum;
}

async function generateDatum() {
  const datumGenerator = {
    constructor: 0,
    fields: [
      { bytes: `${pkh}` },
      { int: 2 },
      { bytes: `${policyId}` },
      { bytes: `${toHex(tokenName)}` },
    ],
  };
  fs.writeFileSync(
    `./CardanoCli/datum-${policyId}-${tokenName}.json`,
    JSON.stringify(datumGenerator)
  );
  /*  let { stdout } = 
    await sh(`cd ${Martifypath} && cabal run datum-json ${price} ${pkh} ${tokenName} ${policyId}
  `); */
}

/* 
async function transactionBuild() {
  let { stdout } = await sh(`cardano-cli transaction build \
    --alonzo-era \
    --testnet-magic $TESTNET_MAGIC \
    --tx-in ${txHash}#${txId} \
    --tx-out "${contractAddress} + 1724100 lovelace + 1 ${policyId}.${tokenName}" \
    --tx-out-datum-hash ${datumHash} \
    --change-address ${clientAddress} \
    --protocol-params-file ./CardanoCli/protocol.json \
    --out-file ./CardanoCli/tx
  `);
}
 */
/*  const datum = await getdatumHash();
console.log(address, datum); */

/* const minAda = 2000000;



const hash = prvKey.to_public().hash().to_bytes();

const hashStr = Buffer.from(hash, "hex").toString("hex");

async function getContract() {
  try {
    // read contents of the file
    const data = JSON.parse(
      fs.readFileSync("/home/alice/Martify/market.plutus", "UTF-8")
    );

    const contract = data.cborHex;
    return contract;
  } catch (err) {
    return "error reading the contract";
    console.error(err);
  }
}
console.log(policyId, hashStr);
//console.log();

function getAddressScript() {}

const contract = await getContract();
// console.log(contract);





const scriptAddress = await getContractAddress();
const datumHash = await getdatumHash();
const latest_block = await BlockFrost.blocksLatest();
const parameters = await BlockFrost.epochsParameters(latest_block.epoch);
console.log(parameters);

async function getProtocolParamsCli() {
  let { stdout } = await sh(
    `cardano-cli query protocol-parameters --testnet-magic $TESTNET_MAGIC > ./CardanoCli/protocol.json`
  );
}
// console.log(scriptAddress, policyId, tokenName);

} */

//getProtocolParamsCli();

const baseAddress = CardanoWasm.BaseAddress.from_address(
  CardanoWasm.Address.from_bech32(clientAddress)
);
const pkh = toHex(baseAddress.payment_cred().to_keyhash()?.to_bytes());

let data = await getWalletData(clientAddress);

data = data.filter(
  (x) =>
    x.tx_hash ==
    "d595afd85580b06f2dee49e4baaf626df5b109217b355299b4657905cff22d8d"
);

const txHash = data[0].tx_hash;
const txId = data[0].tx_index;

const tokenName = fromHex(data[0].amount[1].unit.slice(56));

const policyId = data[0].amount[1].unit.slice(0, 56);
console.log(policyId);

await generateDatum();
const datumHash = await getdatumHash();

//console.log(datumHash);

//transactionBuild();

const utxos = await getUtxos(clientAddress);

console.log(
  utxos[0].input().index(),
  utxos[0].input().transaction_id(),
  utxos[0].output().address(),
  utxos[0].output().amount()
);
function getNftValue(policyId, tokenName, quantity) {
  return amountToValue([
    {
      unit: `${policyId}${toHex(tokenName)}`,
      quantity: `${quantity}`,
    },
  ]);
}
let nftValue = getNftValue(policyId, tokenName, 1);
const protocolParameters = await initTx();

const minAda = CardanoWasm.min_ada_required(
  nftValue,
  true,
  CardanoWasm.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
);

console.log(minAda);
nftValue.set_coin(minAda);

const nftOuput = CardanoWasm.TransactionOutput.new(
  CardanoWasm.Address.from_bech32(contractAddress),
  nftValue
);

console.log(ValuetoAmount(nftOuput.amount()));

let RawOutPuts = CardanoWasm.TransactionOutputs.new();
RawOutPuts.add(nftOuput);

CoinSelection.setProtocolParameters(
  protocolParameters.minUtxo,
  protocolParameters.coinsPerUtxoWord,
  protocolParameters.linearFee.minFeeA,
  protocolParameters.linearFee.minFeeB,
  protocolParameters.maxTxSize
);

function getTotalValue(utxos) {
  let value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str("0"));
  for (let i = 0; i < utxos.length; i++) {
    value = value.checked_add(utxos[i].output().amount());
  }
  return value;
}

console.log(ValuetoAmount(getTotalValue(utxos)));
console.log(ValuetoAmount(getTotalValue(nftOuput.amount())));

const selection = await CoinSelection.randomImprove(utxos, RawOutPuts, 20);

//console.log(data[0].amount);
