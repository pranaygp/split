const asBuffer = require("as-buffer");
const Splitwise = require("splitwise");

const GROUP_ID = `10550412`;
const FRIEND_ID = `4901237`;
const ME_ID = `5009883`;

const transactionRegex = /Transaction notification/i;
const costRegex = /\$([0-9]{1,3},([0-9]{3},)*[0-9]{3}|[0-9]+)(.[0-9][0-9])?/;
const cardRegex = /on your \[split\] ([\w\d\s\-\&]+) card/i;

const sw = Splitwise({
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET
});

module.exports = async (req, res) => {
  try {
    console.log("Request");
    const buf = await asBuffer(req);
    const text = buf.toString("utf8");
    console.log("Text", text);
    const json = JSON.parse(text);
    console.log("JSON", json);
    const { sender, subject, time, body } = json;
    if (subject && sender && time && body) {
      if (transactionRegex.test(subject)) {
        // This is a transaction
        const card = body.match(cardRegex);
        if (card) {
          // This was on a [split] card
          const cost = body.match(costRegex);
          if (!cost) {
            // Missing a cost
            res.statusCode = 400;
            return res.end("Could not find a cost in the email body.");
          } else {
            // Use the cost to make a splitwise debt
            const amount =
              Math.round(
                (parseFloat(`${cost[1] || 0}${cost[3] || 0}`) / 2) * 100
              ) / 100;
              // The variables for "debt" aren't named correctly
            const data = await sw.createDebt({
              from: ME_ID,
              to: FRIEND_ID,
              group_id: GROUP_ID,
              description: card[1],
              amount
            });
            return res.end(JSON.stringify(data));
          }
        }
      }
      res.statusCode = 204;
      return res.end();
    } else {
      res.statusCode = 400;
      return res.end(
        "Missing required JSON fields subject, sender, time and body"
      );
    }
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    return res.end("Unknown Server Error");
  }
};
