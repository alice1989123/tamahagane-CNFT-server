import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import { baseAddr, prvKey } from "./Wallet/keys.mjs";
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { idTestnet } from "./Wallet/blockfrost.mjs";
import CoinSelection from "./Lib/CoinSelection.mjs";

const BlockFrost = new BlockFrostAPI({ isTestnet: true, projectId: idTestnet });

const initTx = async () => {
  try {
    const latest_block = await BlockFrost.blocksLatest();
    const p = await BlockFrost.epochsParameters(latest_block.epoch);
    return {
      linearFee: {
        minFeeA: p.min_fee_a.toString(),
        minFeeB: p.min_fee_b.toString(),
      },
      minUtxo: "1000000", //p.min_utxo, minUTxOValue protocol paramter has been removed since Alonzo HF. Calulation of minADA works differently now, but 1 minADA still sufficient for now
      poolDeposit: p.pool_deposit,
      keyDeposit: p.key_deposit,
      coinsPerUtxoWord: "34482",
      maxValSize: 5000,
      priceMem: 5.77e-2,
      priceStep: 7.21e-5,
      maxTxSize: parseInt(p.max_tx_size),
      slot: parseInt(latest_block.slot),
    };
  } catch (e) {
    console.log(e);
  }
};

const addressBench32_1 = baseAddr.to_address().to_bech32();
const addressBench32_2 =
  "addr_test1qp6kuchljenmrpeqndh7rdthqc2frnm0jw5pu8u3ws0zuwkvhpj2uecg0a5mhkdtwnm30qw38tjq42uxu80rpjn7yytsmffw4e";

const lovelaces = "3000000";

const sendLoveLaces = async function (
  addressBench32_1,
  addressBench32_2,
  lovelaces
) {
  const address1 = CardanoWasm.Address.from_bech32(addressBench32_1);
  const address2 = CardanoWasm.Address.from_bech32(addressBench32_2);
  const value_ = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(lovelaces));

  let value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str("0"));

  const protocolParameters = await initTx();

  const minAda = CardanoWasm.min_ada_required(
    CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(lovelaces)),
    CardanoWasm.BigNum.from_str(protocolParameters.minUtxo)
  );

  const _outputs = CardanoWasm.TransactionOutputs.new();
  _outputs.add(CardanoWasm.TransactionOutput.new(address2, value_));
  _outputs.add(
    CardanoWasm.TransactionOutput.new(address2, CardanoWasm.Value.new(minAda))
  );
  try {
    const utxos = await BlockFrost.addressesUtxosAll(addressBench32_1);

    const inputs_ = utxos.map((x) => [
      CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_bytes(Buffer.from(x.tx_hash, "hex")),
        x.tx_index
      ),
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(x.amount[0].quantity)),
    ]);
    console.log(inputs_);

    const outputs = inputs_.map((x) => [
      x[0],
      CardanoWasm.TransactionOutput.new(address1, x[1]),
    ]);
    const transactionUnspendOutputs = outputs.map((x) =>
      CardanoWasm.TransactionUnspentOutput.new(x[0], x[1])
    );

    CoinSelection.setProtocolParameters(
      protocolParameters.minUtxo,
      protocolParameters.linearFee.minFeeA,
      protocolParameters.linearFee.minFeeB,
      protocolParameters.maxTxSize
    );
    const selection = await CoinSelection.randomImprove(
      transactionUnspendOutputs,
      _outputs,
      20
    );
    console.log(selection);
    console.log(_outputs.get(1).amount().coin().to_str());
    const inputs = CardanoWasm.TransactionInputs.new();
    selection.input.forEach((utxo) => {
      inputs.add(
        CardanoWasm.TransactionInput.new(
          utxo.input().transaction_id(),
          utxo.input().index()
        )
      );
      value = value.checked_add(utxo.output().amount());
    });
    const rawOutputs = CardanoWasm.TransactionOutputs.new();
    rawOutputs.add(CardanoWasm.TransactionOutput.new(address2, value));

    /* const txBuilder = CardanoWasm.TransactionBuilder.new(
      CardanoWasm.LinearFee.new(
        CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeA),

        CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeB)
      ),
      // minimum utxo value

      CardanoWasm.BigNum.from_str(protocolParameters.minUtxo),
      // pool deposit

      CardanoWasm.BigNum.from_str(protocolParameters.poolDeposit),
      // key deposit
      CardanoWasm.BigNum.from_str(protocolParameters.keyDeposit),
      protocolParameters.maxValSize,
      protocolParameters.maxTxSize
    );
    console.log(rawOutputs.len());
    console.log(rawOutputs.get(0).amount().coin().to_str());

    console.log(inputs.len());
    for (let i = 0; i < inputs.len; i++) {
      txBuilder.add_input(address1, inputs.get(i),CardanoWasm.TransactionOutput.new());
      console.log(inputs.get(i).transaction_id());
    }

    for (let i = 0; i < rawOutputs.len(); i++) {
      txBuilder.add_output(rawOutputs.get(i));
    }

    const ttl = protocolParameters.slot + 1000;
    txBuilder.set_ttl(ttl);
    txBuilder.add_change_if_needed(address1); 
    const txBody = txBuilder.build();
    const txHash = CardanoWasm.hash_transaction(txBody);
    const witnesses = CardanoWasm.TransactionWitnessSet.new();
    const vkeyWitnesses = CardanoWasm.Vkeywitness.new();
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, prvKey);
    vkeyWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeyWitnesses);
    const transaction = CardanoWasm.Transaction.new(
      txBody,
      witnesses,
      undefined // transaction metadata
    );

    CardanoWasm.Vkeywitness;
    */

    const fee = CardanoWasm.BigNum.from_str("0");
    const ttl = protocolParameters.slot + 1000;

    const rawTxBody = CardanoWasm.TransactionBody.new(
      inputs,
      rawOutputs,
      fee,
      ttl
    );
    const witnesses = CardanoWasm.TransactionWitnessSet.new();

    const dummyVkeyWitness =
      "8258208814c250f40bfc74d6c64f02fc75a54e68a9a8b3736e408d9820a6093d5e38b95840f04a036fa56b180af6537b2bba79cec75191dc47419e1fd8a4a892e7d84b7195348b3989c15f1e7b895c5ccee65a1931615b4bdb8bbbd01e6170db7a6831310c";

    const vkeys = CardanoWasm.Vkeywitnesses.new();
    vkeys.add(
      CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
    );
    vkeys.add(
      CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
    );
    witnesses.set_vkeys(vkeys);

    const rawTx = CardanoWasm.Transaction.new(rawTxBody, witnesses);
    const linearFee = CardanoWasm.LinearFee.new(
      CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeA),
      CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeB)
    );
    let minFee = CardanoWasm.min_fee(rawTx, linearFee);

    value = value.checked_sub(CardanoWasm.Value.new(minFee));
    const outputs_ = CardanoWasm.TransactionOutputs.new();
    outputs_.add(CardanoWasm.TransactionOutput.new(address2, value));

    const finalTxBody = CardanoWasm.TransactionBody.new(
      inputs,
      outputs_,
      minFee,
      ttl
    );
    const txHash = CardanoWasm.hash_transaction(finalTxBody);

    const finalWitnesses = CardanoWasm.TransactionWitnessSet.new();
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, prvKey);
    console.log(prvKey);
    console.log(vkeyWitnesses.len());
    vkeyWitnesses.add(vkeyWitness);
    console.log(vkeyWitnesses.len());
      
    finalWitnesses.set_vkeys(vkeyWitnesses);
    console.log(finalWitnesses.vkeys().len());
    const transaction = CardanoWasm.Transaction.new(
      finalTxBody,
      finalWitnesses,
      undefined
    );
    const size = transaction.to_bytes().length * 2;
    if (size > protocolParameters.maxTxSize) throw ERROR.txTooBig;

    console.log(Buffer.from(transaction.to_bytes(), "hex").toString("hex"));
    const CBORTx = Buffer.from(transaction.to_bytes(), "hex").toString("hex");
    const submitionHash = await BlockFrost.txSubmit(CBORTx);
  } catch (e) {
    console.log(e);
  }
};

const hexToAscii = (hex) => {
  var _hex = hex.toString();
  var str = "";
  for (var i = 0; i < _hex.length && _hex.substr(i, 2) !== "00"; i += 2)
    str += String.fromCharCode(parseInt(_hex.substr(i, 2), 16));
  return str;
};

const asciiToHex = (str) => {
  var arr = [];
  for (var i = 0, l = str.length; i < l; i++) {
    var hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex);
  }
  return arr.join("");
};

sendLoveLaces(addressBench32_1, addressBench32_2, lovelaces);
