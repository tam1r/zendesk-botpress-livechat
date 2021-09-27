<h1>Zendesk - Botpress - Livechat</h1>
Integration module between Zendesk Chat and Botpress chat builder.
<hr>

<h2><strong>Main files</strong></h2>

-- <strong>index.js</strong> - entry point. Here we connect to Heroku Postgres, Twilio, initiate WebSocket connection to Zendesk in order to receive messages.
<br>
-- <strong>botpress.js</strong> - wrapper for Botpress Converse API. Here is where the main logics is stored, which receives the answer from Botpress bot, processes it and transfers it to Zendesk chat.
<br>
-- <strong>pgApi.js</strong> - wrappers for Heroku Postgres, mostly session stuff.
<br>
-- <strong>zendesk.js</strong> - wrappers for Zendesk Conversational API. More: https://developer.zendesk.com/documentation/live-chat/getting-started/getting-started-with-the-chat-conversations-api/
<br>
-- <strong>twilio.js</strong> - only one wrapper which executed Twilio Flow. Used while we were trying to use Twilio Studio as a bot builder. Not relevant now.
<br>
-- <strong>index.html</strong> - test file with Zendesk chat widget inside.

<h2><strong>How it works, briefly</strong></h2>

Session - one Zendesk chat with visitor. To get a new session, open index.html in the new incognito window.
<strong>Right now ID of the session is channel_id from Zendesk API payload.</strong>

1. Daemon starts. We connect to Heroku Postgres to work with sessions and initiate WebSocket listener to listen for new incoming messages from Zendesk chat visitors.
2. Previously there was a Chatbot user created in Zendesk as default user joining converations. We use updateAgentStatusQuery mutation to keep that user alive so the visitor see actie chat window, not "We are currently offline" one.
3. We listen for incoming message and if it has TYPE.VISITOR, we either create a new session or use existing one. Then we proxy the message to Botpress bot and pass the response back to visitor as soon as we get it, like this:
```
BotpressFunctions.sendToBot(channelId, message)
  .then((responses) => responses.forEach(val => {
    if (val?.quick_replies?.length) {
      Zendesk.sendStructuredMessage(webSocket, channelId, val.text, val.quick_replies);
    } else {
      Zendesk.sendMessage(webSocket, channelId, val.text);
    }
  }));
```

<h3><strong>Useful links</strong></h3>
Production daemon: https://dashboard.heroku.com/apps/zendesk-livechat-bot
Botpress instance: https://dashboard.heroku.com/apps/adelante-botpress
Zendesk Conversational API docs: https://developer.zendesk.com/documentation/live-chat/getting-started/getting-started-with-the-chat-conversations-api/
Botpress Converse API docs: https://botpress.com/docs/channels/converse
