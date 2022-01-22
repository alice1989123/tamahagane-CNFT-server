import {
  Bip32PrivateKey,
  BaseAddress,
  NetworkInfo,
  StakeCredential,
} from "@emurgo/cardano-serialization-lib-nodejs";
import * as dotenv from "dotenv";
dotenv.config();
const walletKey = process.env.WALLET_KEY;
const walletKey2 = process.env.WALLET_KEY_SECONDARY;
function harden(num) {
  return 0x80000000 + num;
}
//const walletKey = Bip32PrivateKey.generate_ed25519_bip32().to_bech32();

export const prvKey = getKeyAddress(walletKey).prvKey;
export const address = getKeyAddress(walletKey).baseAddr;
export const prvKey2 = getKeyAddress(walletKey2).prvKey;
export const address2 = getKeyAddress(walletKey2).baseAddr;

export function getKeyAddress(Bip32PrivateKey_) {
  try {
    const rootKey = Bip32PrivateKey.from_bech32(Bip32PrivateKey_);
    const accountKey = rootKey
      .derive(harden(1852)) // purpose
      .derive(harden(1815)) // coin type
      .derive(harden(0)); // account #0

    const utxoPubKey = accountKey
      .derive(0) // external
      .derive(0)
      .to_public();

    const stakeKey = accountKey
      .derive(2) // chimeric
      .derive(0)
      .to_public();

    const baseAddr = BaseAddress.new(
      NetworkInfo.testnet().network_id(),
      StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
      StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
    );

    const address = baseAddr.to_address().to_bech32();
    const prvKey = accountKey
      .derive(0) // external
      .derive(0)
      .to_raw_key();
    return { prvKey: prvKey, address: address };
  } catch (e) {
    console.log(`${e}`);
  }
}
