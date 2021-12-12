import { materialsURL } from "./Constants/assetsURLS.mjs";
import { MintTx } from "./mintRawMaterials.mjs";
import { initTx } from "./Lib/Wallet.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const ProtocolParameters = await initTx();
const ttl = ProtocolParameters.slot + 20000;
const numberofAssets = 30;
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

async function Mint(ttl) {
  for (let i = 0; i < materialsURL.length; i++) {
    const baseName = materialsURL[i][0];
    const URL = materialsURL[i][1];
    const description = materialsURL[i][2];

    const assets = assetsGenerator(
      baseName,
      rawmetadataBuilder(description, "image/png", URL)
    );

    MintTx(assets, ttl);
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
Mint(ttl);
