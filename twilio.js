const Config = require('./config.json');

const Twilio = {
  executeFlow: (TwilioClient, channelId, message) => {
    TwilioClient.studio.flows(Config.TWILIO_FLOW_1_ID)
                      .executions
                      .create({
                        from: '+972526986504',
                        to: '+972526986504',
                        parameters: {
                          channelId,
                          message
                        }
                      })
                      .then((execution => console.log(execution.sid)))
                      .catch(err => {console.log('error');console.log(err)});
  }
};

module.exports = Twilio;