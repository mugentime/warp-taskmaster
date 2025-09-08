import axios from 'axios';
import crypto from 'crypto';
const timestamp = Date.now() - 3000;
const signature = crypto.createHmac("sha256", "2bUXyAuNY0zjrlXWi5xC8DDmVxkhOtYu7W6RwstZ33Ytr7jzins2SUemRCDpLIV5").update(`timestamp=${timestamp}`).digest("hex");
const response = await axios.get("https://api.binance.com/api/v3/account", {
  headers: { "X-MBX-APIKEY": "KP5NFDffn3reE3md2SKkrcRTgTLwJKrE7wvBVNizdZfuBswKGVbBTluopkmofax1" },
  params: { timestamp, signature }
});
console.log("Balance USDT:", response.data.balances.find(b => b.asset === "USDT"));
