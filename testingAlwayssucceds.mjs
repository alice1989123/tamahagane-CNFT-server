import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import { prvKey } from "./Wallet/keys.mjs";
import {
  initTx,
  getUtxos,
  getTokensbyPolicyId,
  getWalletBalance,
  amountToValue,
  makeTxBuilder,
  submitTx,
  getWalletData,
  baseAddr,
} from "./Lib/Wallet.mjs";
import CoinSelection from "./Lib/CoinSelection.mjs";

export const encodeCbor = (val) => Buffer.from(val.to_bytes()).toString("hex");

const scriptCbor = "4e4d01000033222220051200120011";

const fromHex = (hex) => Buffer.from(hex, "hex");
const toHex = (str) => Buffer.from(str.to_bytes()).toString("hex");

const getScript = (scriptCbor) => {
  return CardanoWasm.PlutusScript.new(fromHex(scriptCbor));
};

const getDatum = () => {
  const datumVals = CardanoWasm.PlutusList.new();
  datumVals.add(
    CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str("42"))
  );

  return CardanoWasm.PlutusData.new_constr_plutus_data(
    CardanoWasm.ConstrPlutusData.new(
      CardanoWasm.BigNum.from_str("0"),
      datumVals
    )
  );
};

const clientAddress = baseAddr;

const script = getScript(scriptCbor);
const scriptAddress =
  "addr_test1wp9cnq967kcf7dtn7fhpqr0cz0wjffse67qc3ww4v3c728c4qjr6j";
const datum = getDatum();

async function lockFunds() {
  const protocolParameters = await initTx();

  let OutPutvalue = CardanoWasm.Value.new(
    CardanoWasm.BigNum.from_str(`2000000`)
  );
  const datumHash = CardanoWasm.hash_plutus_data(datum);
  console.log(Buffer.from(datumHash.to_bytes(), "hex").toString("hex"));
  const outPut = CardanoWasm.TransactionOutput.new(
    CardanoWasm.Address.from_bech32(scriptAddress),
    OutPutvalue
  );
  outPut.set_data_hash(datumHash);

  const RawOutPuts = CardanoWasm.TransactionOutputs.new();
  RawOutPuts.add(outPut);

  const utxos = await getUtxos(clientAddress);

  CoinSelection.setProtocolParameters(
    protocolParameters.minUtxo,
    protocolParameters.coinsPerUtxoWord,
    protocolParameters.linearFee.minFeeA,
    protocolParameters.linearFee.minFeeB,
    protocolParameters.maxTxSize
  );

  const selection = await CoinSelection.randomImprove(utxos, RawOutPuts, 20);

  let changeValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str("0"));

  const inputs = CardanoWasm.TransactionInputs.new();

  selection.input.forEach((utxo) => {
    inputs.add(utxo.input());
    changeValue = changeValue.checked_add(utxo.output().amount());
  });
  changeValue = changeValue.checked_sub(OutPutvalue);

  let fee = CardanoWasm.BigNum.from_str("0");

  let changeOutput = CardanoWasm.TransactionOutput.new(
    CardanoWasm.Address.from_bech32(clientAddress),
    changeValue
  );

  RawOutPuts.add(changeOutput);

  const ttl = protocolParameters.slot + 1000;

  let rawTxBody = CardanoWasm.TransactionBody.new(inputs, RawOutPuts, fee, ttl);

  const arr = [
    197209, 0, 1, 1, 396231, 621, 0, 1, 150000, 1000, 0, 1, 150000, 32, 2477736,
    29175, 4, 29773, 100, 29773, 100, 29773, 100, 29773, 100, 29773, 100, 29773,
    100, 100, 100, 29773, 100, 150000, 32, 150000, 32, 150000, 32, 150000, 1000,
    0, 1, 150000, 32, 150000, 1000, 0, 8, 148000, 425507, 118, 0, 1, 1, 150000,
    1000, 0, 8, 150000, 112536, 247, 1, 150000, 10000, 1, 136542, 1326, 1, 1000,
    150000, 1000, 1, 150000, 32, 150000, 32, 150000, 32, 1, 1, 150000, 1,
    150000, 4, 103599, 248, 1, 103599, 248, 1, 145276, 1366, 1, 179690, 497, 1,
    150000, 32, 150000, 32, 150000, 32, 150000, 32, 150000, 32, 150000, 32,
    148000, 425507, 118, 0, 1, 1, 61516, 11218, 0, 1, 150000, 32, 148000,
    425507, 118, 0, 1, 1, 148000, 425507, 118, 0, 1, 1, 2477736, 29175, 4, 0,
    82363, 4, 150000, 5000, 0, 1, 150000, 32, 197209, 0, 1, 1, 150000, 32,
    150000, 32, 150000, 32, 150000, 32, 150000, 32, 150000, 32, 150000, 32,
    3345831, 1, 1,
  ];

  const getRedeemer = () => {
    const data = CardanoWasm.PlutusData.new_constr_plutus_data(
      CardanoWasm.ConstrPlutusData.new(
        CardanoWasm.BigNum.from_str("42"),
        CardanoWasm.PlutusList.new()
      )
    );

    return CardanoWasm.Redeemer.new(
      CardanoWasm.RedeemerTag.new_spend(),
      CardanoWasm.BigNum.from_str("0"),
      data,
      CardanoWasm.ExUnits.new(
        CardanoWasm.BigNum.from_str("7000000"),
        CardanoWasm.BigNum.from_str("3000000000")
      )
    );
  };

  CardanoWasm.RedeemerTag.new_spend();

  const costModel = CardanoWasm.CostModel.new();
  arr.forEach((x, i) => costModel.set(i, CardanoWasm.Int.new_i32(x)));

  const costModels = CardanoWasm.Costmdls.new();
  costModels.insert(CardanoWasm.Language.new_plutus_v1(), costModel);
  // set script data hash
  /*  tx.set_script_data_hash(
    CardanoWasm.hash_script_data(redeemers, costModels, scriptDatums)
  ); */
  //console.log(tx.witness_set().native_scripts().len());

  let dummyWitnesses = CardanoWasm.TransactionWitnessSet.new();

  //const plutusList = CardanoWasm.PlutusList.new();

  //plutusList.add(datum);

  //dummyWitnesses.set_plutus_data(plutusList);

  const dummyVkeyWitness =
    "8258208814c250f40bfc74d6c64f02fc75a54e68a9a8b3736e408d9820a6093d5e38b95840f04a036fa56b180af6537b2bba79cec75191dc47419e1fd8a4a892e7d84b7195348b3989c15f1e7b895c5ccee65a1931615b4bdb8bbbd01e6170db7a6831310c";
  const vkeys = CardanoWasm.Vkeywitnesses.new();

  vkeys.add(
    CardanoWasm.Vkeywitness.from_bytes(Buffer.from(dummyVkeyWitness, "hex"))
  );

  dummyWitnesses.set_vkeys(vkeys);

  const rawTx = CardanoWasm.Transaction.new(rawTxBody, dummyWitnesses);

  const linearFee = CardanoWasm.LinearFee.new(
    CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeA),
    CardanoWasm.BigNum.from_str(protocolParameters.linearFee.minFeeB)
  );
  fee = CardanoWasm.min_fee(rawTx, linearFee).checked_add(
    CardanoWasm.BigNum.from_str("200")
  );
  changeValue = changeValue.checked_sub(CardanoWasm.Value.new(fee));
  changeOutput = CardanoWasm.TransactionOutput.new(
    CardanoWasm.Address.from_bech32(clientAddress),
    changeValue
  );
  const finalOutputs = CardanoWasm.TransactionOutputs.new();
  finalOutputs.add(changeOutput);
  finalOutputs.add(outPut);

  const txBody = CardanoWasm.TransactionBody.new(
    inputs,
    finalOutputs,
    fee,
    ttl
  );
  const txHash = CardanoWasm.hash_transaction(txBody);

  const witnesses = CardanoWasm.TransactionWitnessSet.new();
  //witnesses.set_plutus_data(plutusList);

  const vkeysWitnesses = CardanoWasm.Vkeywitnesses.new();
  const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, prvKey);
  vkeysWitnesses.add(vkeyWitness);
  witnesses.set_vkeys(vkeysWitnesses);
  const transaction = CardanoWasm.Transaction.new(
    txBody,
    witnesses
    //tx.auxiliary_data() // transaction metadata
  );

  const Hash = await submitTx(transaction);
  console.log(Hash);
}

lockFunds();
