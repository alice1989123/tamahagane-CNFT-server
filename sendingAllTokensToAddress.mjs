import {
  getUtxos,
  getTokensbyPolicyId,
  getWalletBalance,
  amountToValue,
  makeTxBuilder,
  submitTx,
} from "./Lib/Wallet.mjs";
import dotenv from "dotenv";
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import { initTx } from "./Lib/Wallet.mjs";
import { getKeyAddress } from "./Wallet/keys.mjs";
import { __wasm } from "@emurgo/cardano-serialization-lib-nodejs";

dotenv.config();

export async function sendAllTokens(sender, reciver) {
  //we must provide sender prvKeyBech32 , and reciver addressBech32
  console.log(getKeyAddress(sender));

  const senderBech32 = getKeyAddress(sender).address;

  const prvKey = getKeyAddress(sender).prvKey;
  const shelleySenderAddress = CardanoWasm.Address.from_bech32(
    getKeyAddress(sender).address
  );
  const shelleyReciverAddress = CardanoWasm.Address.from_bech32(reciver);
  const walletBalance = await getWalletBalance(senderBech32);

  const totalMultiAssets = walletBalance.amount.filter(
    (x) => x.unit !== "lovelace"
  );
  //console.log(totalMultiAssets);

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

  const utxos = await getUtxos(senderBech32);

  const selection = utxos;
  selection.forEach((input) => {
    txBuilder.add_input(
      CardanoWasm.Address.from_bech32(reciver),
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
/* sendAllTokens(
  process.env.WALLET_KEY,
  "addr_test1qzuyknghkculhjwup9yxse6rjxe33nyqenf2g6lvrs3g8anl8mc4fcux9z30v47fp4zct2z70uyk5xsskma2whe2g93snuxle3"
); */
