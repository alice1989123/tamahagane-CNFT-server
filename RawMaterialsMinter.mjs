import { materialsURL } from "./Constants/assetsURLS.mjs";
import { MintTx } from "./mintRawMaterials.mjs";
import { metadataBuilder } from "./Lib/Wallet.mjs";
import { AssetName } from "@emurgo/cardano-serialization-lib-nodejs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const numberofAssets = 20;
const assetsGenerator = function (baseName, rawmetadata) {
  let assets = [];
  let metadatas = {};
  for (let i = 0; i < numberofAssets; i++) {
    const name_ = `${baseName}-${i}`;
    const asset = { name: name_, quantity: "1" };
    metadatas[name_] = rawmetadata;
    metadatas[name_].name = name_;
    assets.push(asset);
  }
  return { assets, metadatas };
};

async function Mint() {
  for (let i = 0; i < materialsURL.length; i++) {
    const baseName = materialsURL[i][0];
    const URL = materialsURL[i][1];
    const description = materialsURL[i][2];

    const assets = assetsGenerator(
      baseName,
      rawmetadataBuilder(description, "image/png", URL)
    );

    MintTx(assets);
    await sleep(60000);
  }
}

const rawmetadataBuilder = function (description, mediaType, src) {
  return {
    description: description,
    files: [
      {
        mediaType: mediaType,
        src: `ipfs://${src}`,
      },
    ],
    image: `ipfs://${src}`,
    mediaType: mediaType,
  };
};
const test = assetsGenerator(
  "lala",
  rawmetadataBuilder("description", "mediaType", "src")
);
Mint();
