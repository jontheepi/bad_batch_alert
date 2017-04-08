// Copyright 2015-2016, Google, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START app]
'use strict';

// [START config]
var pg            = require('pg');
var format        = require('util').format;
var express       = require('express');
var twilio        = require('twilio') (process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
var TwimlResponse = require('twilio').TwimlResponse;
var bodyParser    = require('body-parser').urlencoded({extended: false});
var CryptoHelper  = require('./cryptoHelper');
var AdminActions  = require('./adminActions');
var UserActions   = require('./userActions');

var app      = express();

var G = {
  twilio:           twilio,
  adminActions:     new AdminActions(),
  userActions:      new UserActions(),
  cryptoHelper:     new CryptoHelper(),
};


//Trying global clients instead of 1 per message.
pg.defaults.ssl = true;
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
});


function doAction(res, sender, body)
{
  var messageHandled = G.adminActions.doAdminAction(G, res, userClient, sender, body);
  if (!messageHandled) {
    var cryptoSender = G.cryptoHelper.encrypt(sender);
    var date = new Date();
    var timestamp = date.toGMTString();
    var insertQueryString = "INSERT INTO users (phone_number, message_body, timestamp) VALUES ('" + cryptoSender + "', '" + body + "', '" + timestamp + "')";
    var insertQuery = appClient.query(insertQueryString);
    insertQuery.on('error', function() {
      console.log("It's cool we're already in here.");
      G.userActions.doUserAction(G, res, userClient, sender, body);
      //appClient.end();
    });
    insertQuery.on('end', function() {
      console.log("New User Added.");
      G.userActions.doUserAction(G, res, userClient, sender, body);
      //appClient.end();
    });
  }
}

// [START receive_call]
app.post('/call/receive', function (req, res) {
  var resp = new TwimlResponse();
  resp.play('http://www.mike-legrand.com/BadBatchAlert/Info.mp3');
  //resp.record({timeout:30, transcribe:true, transcribeCallback:"https://badbatchalertstaging.herokuapp.com/watson/receive"});
  var sender = req.body.From;
  var body   = "join";
  console.log ('SENDER:' + sender + ', BODY:' + body);
  doAction(res, sender, body);
});
// [END receive_call]

// [START receive_sms]
app.post('/sms/receive', bodyParser, function (req, res) {
  
  var sender = req.body.From;
  var body   = req.body.Body;
  console.log ('SENDER:' + sender + ', BODY:' + body);
  doAction(res, sender, body);
});
// [END receive_sms]

// Voice to text test
app.post('/watson/receive', function (test) {
  console.log("inside watson call");
  console.log(test);
});


// Start the server
var server = app.listen(process.env.PORT || '8080', function () {
  console.log('Bad Batch Alert listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});




// [END app]
