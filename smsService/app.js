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
var cryptoHelper  = require('./cryptoHelper');
var adminActions  = require('./adminActions');
var userActions   = require('./userActions');

var app      = express();

var G = {
  twilio:           twilio,
  adminActions:     new AdminActions(),
  userActions:      new UserActions(),
  cryptoHelper:     new CryptoHelper(),
};


function doAction(res, client, sender, body)
{
  var messageHandled = G.adminActions.doAdminAction(G, res, client, sender, body);
  if (!messageHandled) {
    G.userActions.doUserAction(G, res, client, sender, body);
  }
}

// [START receive_call]
app.post('/call/receive', function (req, res) {
  var resp = new TwimlResponse();
  resp.say('Thanks for calling Bad Batch Alert. Lets save some lives!.');

  res.status(200)
    .contentType('text/xml')
    .send(resp.toString());
});
// [END receive_call]


// [START receive_sms]
app.post('/sms/receive', bodyParser, function (req, res) {
  
  var sender = req.body.From;
  var body   = req.body.Body;
  console.log ('SENDER:' + sender + ', BODY:' + body);

  //connect to the db
  pg.defaults.ssl = true;
  pg.connect(process.env.DATABASE_URL, function(err, client) {
    if (err) throw err;
    console.log('Connected to db');

    //add sender to the db before we do anything else. 
    var cryptoSender = G.cryptoHelper.encrypt(sender);
    var insertQueryString = "INSERT INTO users (phone_number, message_body) VALUES ('" + cryptoSender + "', '" + body + "')";
    var insertQuery = client.query(insertQueryString);
    insertQuery.on('error', function() {
      console.log("It's cool we're already in here.");
      doAction(res, client, sender, body);
    });
    insertQuery.on('end', function() {
      console.log("New User Added.");
      doAction(res, client, sender, body);
    });
  });
});
// [END receive_sms]

// Start the server
var server = app.listen(process.env.PORT || '8080', function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});


// [END app]
