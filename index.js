import * as dotenv from "dotenv";
dotenv.config()
import * as fs from "fs";
import * as path from "path"
import {similarity,leftSimilarity} from "./utils/func_helpers.js";
import * as puppeteer from "puppeteer";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", RUN_ID);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
 
}

(async () => {
  ensureDir(OUT_DIR);

  const browser = await puppeteer.launch({
    headless: false, // en Windows, para depurar es mejor verlo
    defaultViewport: { width: 1366, height: 768 },
  });

 })();