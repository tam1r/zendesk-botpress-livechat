const express = require("express");
const path = require("path");
const cors = require('cors');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const FormData = require('form-data');
const fs = require('fs');
const Config = require('./config.json');
const { Client } = require('pg');
const pgApi = require('./pgApi');
const { Zendesk, REQUEST_ID, TYPE } = require('./zendesk');
const twilio = require('twilio');
const Twilio = require('./twilio');
const util = require('util');
const request = require('superagent');
const BotpressFunctions = require('./botpress');
const he = require('he');

// global variable for transferred channel id
const channelsToBeTransferred = [];

if (!globalThis.fetch) {
	globalThis.fetch = fetch;
}

// Connecting to Heroku Postgres
const client = new Client({
  connectionString: 'postgres://tcuotqforytydb:d2fc8d8920a79aa135ef33f6cd022200e5d5f018afd70b540487cd8d71dff238@ec2-54-73-58-75.eu-west-1.compute.amazonaws.com:5432/d7kvbgrigvab81',
  ssl: {
    rejectUnauthorized: false
  }
});
client.connect();

// Connecting to Twilio
const TwilioClient = require('twilio')(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN);

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(
  express.urlencoded({
    extended: true,
    limit: '50mb'
  })
);
app.use(cors());

let webSocket;

app.listen(process.env.PORT || 8301, () => {
  console.log("Server running on port " + process.env.PORT);

  // connecting to Live Chat
  const CHAT_API_URL = 'https://chat-api.zopim.com/graphql/request';
  const query = `mutation {
    startAgentSession(access_token: "${Config.LIVE_CHAT_AUTH_TOKEN}") {
      websocket_url
      session_id
      client_id
    }
  }`;

  request
    .post(CHAT_API_URL)
    .set({
      'Content-Type': 'application/json'
    })
    .send({ query })
    .then((res) => {
      const data = res.body.data.startAgentSession;
      // console.log(data);
      webSocket = new WebSocket(data.websocket_url);
      
      webSocket.on('open', () => {
        console.log('successfully opened socket')
        
        // for connection keep alive
        pingInterval = setInterval(() => {
          webSocket.send(
            JSON.stringify({
              sig: "PING",
              payload: +new Date()
            })
          );
          // for later use if needed - update agent status to online if invisible
          const updateAgentStatusQuery = {
            payload: {
              query: `mutation {
                          updateAgentStatus(status: ONLINE) {
                              node {
                                  id
                              }
                          }
                      }`
            },
            type: "request",
            id: REQUEST_ID.UPDATE_AGENT_STATUS
          };
          webSocket.send(JSON.stringify(updateAgentStatusQuery));
          // console.log("[updateAgentStatus] Request sent");
        }, 5000);

        // subscribe to livechat
        Zendesk.subscribe(webSocket);
      });

      let messageSubscriptionId;
      webSocket.on('message', function(message) {
        const data = JSON.parse(message);
        
        // console.log(data)
        if (data.payload && data.payload.errors) console.log(data.payload.errors);
        // Listen to successful message subscription request
        if (data.id === 'subscription') {
          messageSubscriptionId = data.payload.data.subscription_id;
          console.log(data.id)
          console.log(messageSubscriptionId)
        }

        if (data.id === REQUEST_ID.GET_DEPARTMENTS) {
          // transferring to department with real agent
          const channelToBeTransferred = channelsToBeTransferred.pop();
          Zendesk.transferToDepartment(webSocket, channelToBeTransferred, data);
          // update session status
          pgApi.setSessionStatus(client, channelToBeTransferred, 'inactive');
        }
      
        // Listen to chat messages from the visitor
        if (
          data.sig === 'DATA' &&
          data.subscription_id === messageSubscriptionId &&
          data.payload.data
        ) {
          const chatMessage = data.payload.data.message.node;
          const sender = chatMessage.from;
          const channelId = chatMessage.channel.id;
          const message = chatMessage.content;

          // console.log(chatMessage)
          if (sender.__typename === TYPE.VISITOR) {
            pgApi.getSession(client, channelId)
            .then((result) => {
              const count = result.rows.length;
              if (!count) {
                // we don't have an active session,
                // create session and trigger Botpress context
                pgApi.createSession(client, channelId, sender.display_name)
                  .then(() => {
                    console.log('session created, ' + sender.display_name)
                    BotpressFunctions.sendToBot(channelId, message)
                      .then((responses) => responses.forEach(val => Zendesk.sendMessage(webSocket, channelId, val.text)));
                  })
                  .catch(err => console.log(err));
              } else {
                // if session != inactive and still in the Botpress - execute flow
                if (result.rows[0].status !== 'inactive') {
                  BotpressFunctions.sendToBot(channelId, message)
                    .then((responses) => responses.forEach(val => Zendesk.sendMessage(webSocket, channelId, val.text)));
                }
              }
            })
            .catch((err) => console.log(err));

            console.log(
              `[message] Received: '${chatMessage.content}' from: '${
                sender.display_name
              }'`
            );
          }
        }
      });
    })
    .catch(err => console.log(err));
});

app.post("/zendesk/sendMessage", (req, res, next) => {
  console.log(req.body)
  const decodedChannelId = he.decode(req.body.channelId);
  console.log('COMPOSING A MESSAGE======')
  // proxying message back to visitor
  Zendesk.sendMessage(webSocket, decodedChannelId, req.body.message);
  res.json('Test');
});

app.post("/zendesk/handover", (req, res, next) => {
  // handing over to operator
  // decoding id as Botpress decodes channelId html characters
  const decodedChannelId = he.decode(req.body.channelId);
  channelsToBeTransferred.push(decodedChannelId);
  // sending getDepartments request to Zendesk
  Zendesk.getDepartments(webSocket);
  res.json('Test');
});

app.get("/", (req, res, next) => {
  console.log(req.body)
  res.json('Test');
});