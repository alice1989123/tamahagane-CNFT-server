import {
  getUtxos,
  getTokensbyPolicyId,
  getWalletBalance,
  amountToValue,
  makeTxBuilder,
  submitTx,
  getWalletData,
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
  "addr_test1qp6kuchljenmrpeqndh7rdthqc2frnm0jw5pu8u3ws0zuwkvhpj2uecg0a5mhkdtwnm30qw38tjq42uxu80rpjn7yytsmffw4e";

// pointer address

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
  if (value.multiasset()) {
    const multiAssets = value.multiasset().keys();
    for (let j = 0; j < multiAssets.len(); j++) {
      const policy = multiAssets.get(j);
      const policyAssets = value.multiasset().get(policy);
      const assetNames = policyAssets.keys();
      for (let k = 0; k < assetNames.len(); k++) {
        const assetPolicy = Buffer.from(policy.to_bytes()).toString("hex"); // hex encoded policy
        const assetName = Buffer.from(
          assetNames.get(k).name(),
          "hex"
        ).toString(); // utf8 encoded asset name
        const quantity = policyAssets.get(assetNames.get(k)).to_str(); // asset's quantity
        console.log(assetPolicy, assetName, quantity);
      }
    }
  }

  const protocolParameters = await initTx();

  console.log(protocolParameters.minUtxo);

  const minAda = CardanoWasm.min_ada_required(
    // Why is min ADA so HIGH??
    value,
    false,
    CardanoWasm.BigNum.from_str(protocolParameters.minUtxo)
  );

  // value.set_coin(minAda); Ideally we should use minada

  value.set_coin(CardanoWasm.BigNum.from_str("18000000"));

  const outPut = CardanoWasm.TransactionOutput.new(
    shelleyReciverAddress,
    value
  );

  const outPuts = CardanoWasm.TransactionOutputs.new();
  outPuts.add(outPut);

  const txBuilder = await makeTxBuilder();

  const utxos = await getUtxos(sender);

  CoinSelection.setProtocolParameters(
    protocolParameters.minUtxo,
    protocolParameters.coinsPerUtxoWord,
    protocolParameters.linearFee.minFeeA,
    protocolParameters.linearFee.minFeeB,
    protocolParameters.maxTxSize
  );

  // const selection = await CoinSelection.randomImprove(utxos, outPuts, 20); // Something is not working with the coin selection algorithm!! Must check it!
  const selection = utxos;
  console.log(selection);
  selection.forEach((input) => {
    txBuilder.add_input(
      CardanoWasm.Address.from_bech32(addressBench32_1),
      input.input(),
      input.output().amount()
    );
  });
  //console.log(utxos[0].input()); // For the moment we are sending all the utxos!! but it is not eficient we must FIX IT !!
  /*   utxos.forEach((utxo) => {
    txBuilder.add_input(
      shelleySenderAddress,
      utxo.input(),
      utxo.output().amount()
    );
  }); */

  txBuilder.add_output(outPut);

  txBuilder.set_ttl(protocolParameters.slot + 1000);

  txBuilder.add_change_if_needed(shelleySenderAddress);

  const tx = txBuilder.build_tx();
  //console.log(tx.witness_set().native_scripts().len());
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
