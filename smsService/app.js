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

var pg = require('pg');
var format = require('util').format;
var express = require('express');

var adminActions = require('./adminActions.js');

var bodyParser = require('body-parser').urlencoded({
  extended: false
});

var app = express();


var TWILIO_NUMBER = process.env.TWILIO_NUMBER;

var twilio = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN);

var TwimlResponse = require('twilio').TwimlResponse;

var admin = new adminActions();

var messages = [
  'join',
  'map',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9'
];
// [END config]

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
    
    //check to see if the sender is an admin.
    //if so do special logic based on the message body.
    var isAdmin = sender == process.env.MY_NUMBER;
    if (isAdmin) console.log("Admin");
    var doAdminAction = isAdmin;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i] == body.toLowerCase()) {
        doAdminAction = false;
        break;
      }
    }

    if (doAdminAction) {
      admin.doAdminAction(twilio, client, body);
      return;
    }
   
    //look for sender in db
    var findQueryString = "SELECT * FROM users WHERE phone_number = '" + process.env.MY_NUMBER + "'";
    var findQuery = client.query(findQueryString);
    findQuery.on('row', function(row) {
      console.log(JSON.stringify(row));
      //can do something special if we know them. Maybe check for name?
      //update their message_body?
    });
   

    //add sender to db
    var insertQueryString = "INSERT INTO users (phone_number, message_body) VALUES ('" + sender + "', '" + body + "')";
    var insertQuery = client.query(insertQueryString);
    insertQuery.on('error', function() {
      console.log("It's cool we're already in here.");
    });


    var joinResponse = '<Response><Message><Body>Thank you for registering. Text the word "map" to set your location. Find out more at BadBatchAlert.com</Body><Media>http://www.mike-legrand.com/BadBatchAlert/logoSmall150.png</Media></Message></Response>';
    var mapResponse  = '<Response><Message><Body>Text the number for your location./Body><Media>http://www.mike-legrand.com/BadBatchAlert/regions_01.jpg</Media></Message></Response>';
    
    var resp;
    if (body.toLowerCase() == 'map') {
      resp = mapResponse;
    } else {
      resp = joinResponse;
    }
    res.status(200)
      .contentType('text/xml')
      .send(resp);
  });
});
// [END receive_sms]

// Start the server
var server = app.listen(process.env.PORT || '8080', function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});



// [END app]
