import {
  getUtxos,
  getTokensbyPolicyId,
  getWalletBalance,
  amountToValue,
  makeTxBuilder,
  submitTx,
  getWalletData,
  fromHex,
  toHex,
} from "./Lib/Wallet.mjs";
import dotenv from "dotenv";
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import { initTx } from "./Lib/Wallet.mjs";
import { prvKey } from "./Wallet/keys.mjs";
import CoinSelection from "./Lib/CoinSelection.mjs";

dotenv.config();

const addressBench32_1 = process.env.ADDRESS;
console.log(addressBench32_1);
const addressBench32_2 =
  "addr_test1wp9cnq967kcf7dtn7fhpqr0cz0wjffse67qc3ww4v3c728c4qjr6j"; //always succeds script

async function sendTokens(sender, reciver) {
  const shelleySenderAddress = CardanoWasm.Address.from_bech32(sender);
  const shelleyReciverAddress = CardanoWasm.Address.from_bech32(reciver);
  const walletBalance = await getWalletBalance(sender);
  console.log(walletBalance);

  const totalMultiAssets = walletBalance.amount.filter(
    (x) => x.unit !== "lovelace"
  );
  console.log(totalMultiAssets);

  const value = await amountToValue(totalMultiAssets);

  const protocolParameters = await initTx();

  console.log(protocolParameters.minUtxo);

  const minAda = CardanoWasm.min_ada_required(
    // Why is min ADA so HIGH??
    value,
    false,
    CardanoWasm.BigNum.from_str(protocolParameters.coinsPerUtxoWord)
  );

  value.set_coin(minAda);

  const outPut = CardanoWasm.TransactionOutput.new(
    shelleyReciverAddress,
    value
  );

  const outPuts = CardanoWasm.TransactionOutputs.new();
  outPuts.add(outPut);

  const txBuilder = await makeTxBuilder();

  const utxos = await getUtxos(sender);

  const selection = utxos;
  selection.forEach((input) => {
    txBuilder.add_input(
      CardanoWasm.Address.from_bech32(addressBench32_1),
      input.input(),
      input.output().amount()
    );
  });

  txBuilder.add_output(outPut);

  txBuilder.set_ttl(protocolParameters.slot + 1000);

  txBuilder.add_change_if_needed(shelleySenderAddress);

  const tx = txBuilder.build_tx();

  const txHash = CardanoWasm.hash_transaction(tx.body());
  const witnesses = tx.witness_set();

  const vkeysWitnesses = CardanoWasm.Vkeywitnesses.new();
  const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, prvKey);
  vkeysWitnesses.add(vkeyWitness);
  witnesses.set_vkeys(vkeysWitnesses);
  const transaction = CardanoWasm.Transaction.new(
    tx.body(),
    witnesses,
    tx.auxiliary_data() // transaction metadata
  );

  await submitTx(transaction);
}

sendTokens(addressBench32_1, addressBench32_2);
