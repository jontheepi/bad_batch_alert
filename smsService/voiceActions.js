//handles all voice commands.
var TwimlResponse = require('twilio').TwimlResponse;


var _activeCalls = [];//all phone calls in progress.
var _activeCall;

var site = "http://www.badbatchalert.com/audio/";//the site where the audio lives  
var ext = ".wav";//the audio extension.

var audio = { //all the available messages we can play.
  correctZip:   'correctZip',
  help:         'help',
  afterWelcome: 'playsAfterWelcomeChildren',
  registerZip1: 'registerZip1',
  registerZip2: 'registerZip2',
  registration: 'registration',
  welcome:      'welcome'
};

var HELP_STR = "If you would like to know where the Baltimore Needle Exchange Van is right now, Press 2. If you'd like to send an anonymous report to the Bad Batch Alert team, press 3.  If you would like to learn more about the Bad Batch alert service, press 4. If you would like to stop recieving overdose alerts, press 5. If you would like to hear this message again, press 1.";
var INVALID_LOCATION = "Sorry, this service is only available in the Baltimore metro area. If you'd like to have your area added to the Bad Batch Alert Serivce, send an email to badbatchalert@gmail.com. To hear more options, please press 1 now.";
var ZIPCODE_CONFIRM = ". If this zipcode is correct press 1 , if not press 2. To hear the zipcode again press three.";
var REGISTRATION = "Thanks for calling the bad batch alert service, to begin receiving overdose alerts in your area, please enter your 5 digit zipcode now.";
var REGISTRATION_INVALID = "Sorry, that is not an available option. To begin receiving overdose alerts in your area, please enter the 5 digits of your zip code";
var REGISTRATION_SUCCESS = "Congratulations! You are all set to receive alerts. If you like to hear more options, press 1 now.";
var WELCOME = "Thank you for calling Bad Batch Alert, " + HELP_STR;
var LEAVE = "Thank you for using the Bad Batch Alert service. You are no longer registered to receive alerts. Press 1 for more options.";
var INFO = "Bad Batch Alert is an anonymous free text message service to help heroin users stay alive in Baltimore City. Find out more at Bad Batch Alert dot com. Press 1 for more options";
var REPORT = "Please record your message and we will get back to you. If this is a medical emergency, please call nine one one.";

var VoiceActions = function() {
  var self = this;

  function roboGather(response, twiml, message, numDigits)
  {
    if (!numDigits) numDigits = 1;

    twiml.gather({
      input: 'dtmf',
      timeout: 15,
      numDigits: numDigits,
    }, (gatherNode) => {
      gatherNode.say(message, { voice: 'alice'});
    });

  };


  self.doVoiceActions = function(request, response, hasRegion, G, userClient) {  

    var phone = request.body.From;
    var input = request.body.RecordingUrl || request.body.Digits;
    //see if we have a call in progress. Find out where we were if so. Otherwise add us and start at the beginning.
    var twiml = new TwimlResponse();

    var initialMessage = hasRegion ? audio.help : audio.registration;
    _activeCall = {phone:phone, message:initialMessage, zip:undefined};
    var callFound = false;
    for(var i = 0; i < _activeCalls.length; i++) {
      var activeCall = _activeCalls[i];
      if (activeCall.phone === phone) {
        _activeCall = activeCall;
        callFound = true;
        console.log('found call');
        break;
      }
    }

    if (!callFound) {
      console.log("new call");
      _activeCalls.push(_activeCall);
    }

    console.log("input = " + input);

    // Add a greeting if this is the first question
    //twiml.play('http://www.mike-legrand.com/BadBatchAlert/Info.mp3');
    if (_activeCall.message == audio.registration) {
      //user registration, set zipcode
      console.log('registration');

      if (input) {
        var zipvalid = G.userActions.isZipCode(input);
        if (zipvalid) {
          var matchedRegionsArray = G.userActions.getRegionsFromZipCode(input);
          if (matchedRegionsArray.length === 0) {
            roboGather(response, twiml, INVALID_LOCATION);
            _activeCall.message = audio.help;
          } else {
            _activeCall.message = audio.registerZip2;
            _activeCall.zip = input;
            roboGather(response, twiml, input + ZIPCODE_CONFIRM);
          }
        } 
      } else {
        roboGather(response, twiml, REGISTRATION, 5);
      }
    } else if((_activeCall.message == audio.registerZip1 || _activeCall.message == audio.registerZip1) && input) {
      //after user has successfully registered a zipcode
      if (input == '1') {
        _activeCall.message = audio.help;
        roboGather(response, twiml, HELP_STR);
      }
    } else if (_activeCall.message == audio.registerZip2 && input) {
      // confirm zipcode
      if (input == '1') {
        console.log("registerZip1");
        roboGather(response, twiml, REGISTRATION_SUCCESS);
        _activeCall.message = audio.help;
        G.userActions.userSetZipCode(G, null, userClient, phone, _activeCall.zip) 
      } else if (input == '2') {
        console.log('registration');
        _activeCall.message = audio.registration;
        roboGather(response, twiml, REGISTRATION, 5);
      } else if (input == '3') {
        console.log('registerZip2');
        _activeCall.message = audio.registerZip2;
        roboGather(response, twiml, input + ZIPCODE_CONFIRM);
      } else {
        console.log('not recognized');
        roboGather(response, twiml, REGISTRATION_INVALID, 5);
        _activeCall.message = audio.registration;
      }
    } else if (_activeCall.message == audio.help && input) {
      //say help options
      switch(input) {
        case '2'://van
          var vanLocation =  G.userActions.userVan(G, null, userClient, phone, '');
          var message = vanLocation + ". To Hear more options, press 1 now.";
          _activeCall.message = audio.help;
          roboGather(response, twiml, message);
          break;
        case '3'://send message
          twiml.say(REPORT, { voice: 'alice'});
          twiml.record();
          break;
        case '4'://learn more/info
          //needs to get audio currently on live
          roboGather(response, twiml, INFO);
          break;
        case '5'://stop alerts
          roboGather(response, twiml, LEAVE);
          G.userActions.userLeave(G, null, userClient, phone, '');
          break;
        default:
          _activeCall.message = audio.help;
          roboGather(response, twiml, HELP_STR);
          break;
      }
    } else {
      _activeCall.message = audio.help;
      roboGather(response, twiml, WELCOME);
    } 


    twiml.redirect('/call/receive');

    //var url = site + _activeCall.message + ext;
    //console.log(url);
    //twiml.play(url);

    // Depending on the type of question, we either need to get input via
    // DTMF tones or recorded speech

    // render TwiML response
    response.type('text/xml');
    response.send(twiml.toString());
    
    
 
  };
 
};


module.exports = VoiceActions;
