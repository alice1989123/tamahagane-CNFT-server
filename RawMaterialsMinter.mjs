// import { materialsURL } from "./Constants/assetsURLS.mjs";
import { MintTx } from "./mintRawMaterials.mjs";
import { initTx } from "./Lib/Wallet.mjs";

const materialsURL = [
  [
    "charcoal",
    "QmRxLPC7YwHbWp5cMxRoU8JxvfHdwc9Lrv5o5tRu6yRgJx",
    "material-raw",
  ],
  [
    "gemstones",
    "QmZt9jpHEawzzJZkQ5gWntL3Fn74JPJLm85Ed7rEYuoM9H",
    "material-raw",
  ],
  [
    "goldcoin",
    "QmQrdCZsCQL1mBEEv9ZV9fANCzdicvwTL7TxxVG81mbrMK",
    "material-raw",
  ],
  [
    "ironore",
    "QmTdUD1TUpkjJQBj6DJmd9XaAJZy76z63rvteanrdhfFXY ",
    "material-raw",
  ],
  [
    "ironsands",
    "QmPhz8SS2kbWjUzw5imsZqVyxvd4MfoKctTHgsXcJ34u8Z",
    "material-raw",
  ],
  ["leather", "QmR8zcgemdKS96adBvkpzKNCfhZ9CfsyDyut7nuvUTo3WS", "material-raw"],
  ["oakwood", "Qmc6wzJAJZXneS1V5eUuir4wfFAbFxTJUZZBeuxZQ92jcW", "material-raw"],
  [
    "silvercoin",
    "QmaJJg732YyE6Eqq1vDZAqueKA2eEhpVFTFcNtLGEnni1Y",
    "material-raw",
  ],
  [
    "wootzsteal",
    "QmeX9fdNmwByvGP7CGMk4j7Ec42z6HLqWTU6a1EHFewvoF",
    "material-ingot",
  ],
  [
    "tamahaganesteal",
    "Qmd6kTFezXthNp6ijyZ1tRghfvRtMbEKYZHAvhMKy7mLqV",
    "material-ingot",
  ],
  [
    "bloomiron",
    "Qmb2ivgVpr71cMqPAqca8ZihEczcKt2Zk2EqYpznFvMqNJ",
    "material-ingot",
  ],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const ProtocolParameters = await initTx();
const ttl = ProtocolParameters.slot + 20000;
const numberofAssets = 25;
const assetsGenerator = function (baseName, rawmetadata) {
  let assets = [];
  let metadatas = {};
  for (let i = 0; i < numberofAssets; i++) {
    const name_ = `${baseName}${i}`;
    const asset = { name: name_, quantity: "1" };
    metadatas[name_] = rawmetadata;
    //metadatas[name_].name = name_;
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
    await sleep(120000);
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
Mint(47949788);
