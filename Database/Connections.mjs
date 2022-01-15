import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { response } from "express";

dotenv.config();

const user = process.env.DB_USER;
const pw = process.env.DB_KEY;

var mongodb = require("mongodb"),
  server = new mongodb.Server("localhost", 27017, {}),
  server2 = new mongodb.Server("localhost", 27017, {}),
  db = new mongodb.Db("test", server, {}),
  db2 = new mongodb.Db("test", server2, {});
console.log("[1]", db.serverConfig.connected);
db.open(function (err, db) {
  console.log("[2]", err, db.serverConfig.connected);
  db.close();
  console.log("[3]", err, db.serverConfig.connected);
});

console.log("[4]", db2.serverConfig.connected);
db2.open(function (err, db2) {
  console.log("[5]", err, db2.serverConfig.connected);
  db2.close();
  console.log("[6]", err, db2.serverConfig.connected);
});
