const Config = require('./config.json');
const request = require('superagent');

const BotpressFunctions = {
  sendToBot: (channelId, message) => {
    const data = {
      "type": "text",
      "text": message
    };

    // for now we are leaving userId as Zendesk channelId
    const userId = channelId;
    const url = Config.BOTPRESS_BOT_URL + Config.BOTPRESS_BOT_NAME + '/converse/' + userId;

    return request
      .post(url)
      .set({
        'Content-Type': 'application/json'
      })
      .send(data)
      .then((res) => {
        // going through responses to compose responses array
        console.log(res.body.responses)
        let responses = res.body.responses.filter(val => val.type === 'text' || val.type === 'custom');
        // for now mapping custom choice blocks to only show wrapper text
        responses = responses.map(val => {
          if (val.type === 'custom') {
            // console.log(val.quick_replies)
            const quickReplies = val.quick_replies.map((val) => ({
              text: `${val.title}`,
              action: {
                value: val.payload.toLowerCase()
              }
            }))
            console.log(quickReplies)
            return { ...val.wrapped, quick_replies: quickReplies };
          }
          return val;
        })
        console.log(responses)
        return responses;
      })
      .catch(err => console.log(err));
  }
};

module.exports = BotpressFunctions;