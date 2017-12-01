// [START app]
'use strict';

// [START config]
require('dotenv').load(); // Load .env file to populate environment

var pg            = require('pg');
var express       = require('express');
var twilio        = require('twilio') (process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
var bodyParser    = require('body-parser').urlencoded({extended: false});

var CryptoHelper  = require('./lib/cryptoHelper');
var AdminActions  = require('./lib/adminActions');
var UserActions   = require('./lib/userActions');
var VoiceActions  = require('./lib/voiceActions');
var WebAdmin      = require('./lib/webAdmin');

var app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var G = {
  twilio:           twilio,
  adminActions:     new AdminActions(),
  userActions:      new UserActions(),
  voiceActions:     new VoiceActions(),
  cryptoHelper:     new CryptoHelper(),
  webAdmin:         new WebAdmin()
};


//Trying global clients instead of 1 per message.
pg.defaults.ssl = !process.env.DEBUG; // Don't try to connect over SSL in local dev mode
var appClient;
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err;
    console.log('App client Connected to db');
    appClient = client;
});

var userClient;
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err;
    console.log('User client Connected to db');
    userClient = client;
    G.webAdmin.setUserClient(userClient);
});

var historyClient;
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err;
    console.log('History client Connected to db');
    historyClient = client;
});

var webAdminClient;
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err;
    console.log('WebAdmin client Connected to db');
    webAdminClient = client;
    G.webAdmin.init(app, webAdminClient, G);
});


function doAction(res, sender, body)
{
  var messageHandled = G.adminActions.doAdminAction(G, res, userClient, sender, body);
  if (messageHandled) return;

  insertUser(res, sender, body, function() {
    storeMessageHistory(G, res, userClient, sender, body, function(messageHistory) {
      G.userActions.doUserAction(G, res, userClient, sender, body, messageHistory);
    });
  });
}

function insertUser(res, sender, body, callback)  {

  var cryptoSender = G.cryptoHelper.encrypt(sender);
  var date = new Date();
  var timestamp = date.toGMTString();
  var insertQueryString = "INSERT INTO users (phone_number, message_body, timestamp) VALUES ($1, $2, $3)";
  var insertQuery = appClient.query(insertQueryString, [cryptoSender, body, timestamp]);
  insertQuery.on('error', function() {
    console.log("It's cool we're already in here.");
    if (callback) callback();
  });
  insertQuery.on('end', function() {
    console.log("New User Added.");
    if (callback) callback();
  });

}

//storing history as a single string separated by the '*' character.
//only keep last 5 messages.
//trying to stay with free db.
function storeMessageHistory(g, res, userClient, sender, body, callback) {
  var divider = '*';
  var historyLength = 5;
  var cryptoSender = G.cryptoHelper.encrypt(sender);
  var findQueryString = "SELECT * FROM users WHERE phone_number = $1";
  var findQuery = historyClient.query(findQueryString, [cryptoSender]);
  findQuery.on('row', function(row) {
    console.log(JSON.stringify(row));
    var messageHistory = (body + divider + row.message_body).split(divider);
    messageHistory = messageHistory.slice(0, historyLength);

    if (callback) callback(messageHistory);

    var newBody = messageHistory.join(divider);

    var queryString = "UPDATE users SET message_body = $1 WHERE phone_number = $2";
    var updateQuery = historyClient.query(queryString, [newBody, cryptoSender]);
    updateQuery.on('end', function() {
      console.log("message history updated to " + newBody);
    });
  });
}

// [START receive_call]
app.post('/call/receive', bodyParser, function (req, res) {

  var sender = req.body.From;
  var body   = "phone call";
  console.log ('SENDER:' + sender + ', BODY:' + body);
  insertUser(res, sender, body, function(){
    var cryptoSender = G.cryptoHelper.encrypt(sender);
    var findQueryString = "SELECT * FROM users WHERE phone_number = $1";
    var findQuery = userClient.query(findQueryString, [cryptoSender]);
    findQuery.on('row', function(row) {
      console.log("regions =" + row.regions);
      var hasRegion = row.regions != null;
      G.voiceActions.doVoiceActions(req, res, hasRegion, G, userClient);
    });
  });
});


// [START receive_sms]
app.post('/sms/receive', bodyParser, function (req, res) {
  var sender = req.body.From;
  var body   = req.body.Body;
  console.log ('SENDER:' + sender + ', BODY:' + body);
  doAction(res, sender, body);
});

// [START receive_sms]
app.post('/sms/naloxsafereceive', bodyParser, function (req, res) {
  var sender = req.body.From;
  var body   = req.body.Body;
  console.log ('SENDER:' + sender + ', BODY:' + body);
  res.status(200).send();
});


// Start the server
var server = app.listen(process.env.PORT || '8080', function () {
  console.log('Bad Batch Alert listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});

// [END app]
