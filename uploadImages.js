const ipfsAPI = require("ipfs-api");
const express = require("express");
const fs = require("fs");
const app = express();
const path = require("path");

const assetssDir = `${__dirname}/assetss/materials/`;
const weaponsDir = `${__dirname}/assetss/weapons/`;

const upload = async () => {
  // Our starting point
  try {
    // Get the files as an array
    const files = await fs.promises.readdir(weaponsDir);
    console.log(files);
    const URLs = await Promise.all(
      files.map(async function (file) {
        const file_ = fs.readFileSync(`${weaponsDir}${file}`);
        let Buffer_ = await new Buffer.from(file_);
        const response = await uploadFile(Buffer_);
      })
    );
    console.log(files.map((x) => x.split(".")[0]));
  } catch (e) {
    console.log(e);
  }
};

const names = [
  'anvil',               'axe',
  'crusaidersword',      'crystaljade',
  'dagger',              'gemmedsnakesword',
  'hammer',              'katana',
  'medievalsword',       'persianjambiyadagger',
  'persianshashirsword', 'spear',
  'splitter',            'sword',
  'tanto',               'tongs'
] 
const URLS = [ 'QmZK3Vo812NC9GaRtzFdH6wRxyryzkYTsruRo9xWC277EH',
  'QmWZGrn3HkfBJzZHi5qiJ4wdFPmMjWKw4YegBiRRoqhTxU',
  'QmfVHgRhmQRsgebaxPU9kNUmQR9aDzHRqtpTuqmeE9McgM',
  'QmPhxQKexzndec7WkwUKqegnd9cewUhE2J3hGdAV2oFeVC',
 'QmT9JhwZVn3KYzDdodw2rs8NaLJmDJteAYx2aSBH2gfs1Q',
  'QmVRCZZJntKtRnH3dBdoREw1iK2YhMRgZLUaUkRf3R6XU6',
  'Qmf7VJ1bU2Qo31AHPT3MBg5LmtQuQncpf3BrdMweEsNdfi',
  'QmT9XiaLeoW3RMPqk6vz2mqd32aKFXLZLvq3V7E5XUJqb6',
  'QmRQcF7drQGWR3qGPGi9KZxhmC7niNmSPExLujtsZ9VL8N',
  'QmVTXXzGiWtmHrHDMM9i2AaBVCdt1DvDC2MuJqvYDvRvts',
  'QmazCRqaevxLvzFs3bFxkMCRsBDiCq1p4XWHkbwiNAN53n',
  'QmWtdX5GMunZGgDF1j3RRuEvg1u7noJ2qo2yvxzeReyS6V',
  'QmS8x5XZpU2s7ovoxvgEQddD69NDhTpJeNiGwyxxQdp7cR',
  'QmS7dPwfEQHQGaUUTxgze9HNs6zi32oEWHi8bFzKAf5tzH',
  'Qme6xsAR5wVi3BD3v1W12pVhfp4qynn5E68PuunFvEDkTF',
  'QmQ2tm1WpHCP6kUhMJDHiZ8yBZ1SQUYm5cxcAeuhKFCVQo']
  console.log(names.length == URLS.length())

//Connceting to the ipfs network via infura gateway
const ipfs = ipfsAPI("ipfs.infura.io", "5001", { protocol: "https" });

//Reading file from computer
let testFile = fs.readFileSync(`${__dirname}/assetss/materials/charcoal.jpg`);
//Creating buffer for ipfs function to add file to the system
let testBuffer = new Buffer.from(testFile);
const uploadFile = async function (testBuffer) {
  try {
    const upload = await ipfs.files.add(testBuffer);
    console.log(upload[0].path);
  } catch (e) {
    console.log(e);
  }
};
upload();
uploadFile(testBuffer);
/* 
//Addfile router for adding file a local file to the IPFS network without any local node
app.get("/addfile", function (req, res) {
  ipfs.files.add(testBuffer, function (err, file) {
    if (err) {
      console.log(err);
    }
    console.log(file);
  });
});
//Getting the uploaded file via hash code.
app.get("/getfile", function (req, res) {
  //This hash is returned hash of addFile router.
  const validCID = "HASH_CODE";

  ipfs.files.get(validCID, function (err, files) {
    files.forEach((file) => {
      console.log(file.path);
      console.log(file.content.toString("utf8"));
    });
  });
});

app.listen(3001, () => console.log("App listening on port 3000!"));
 */
