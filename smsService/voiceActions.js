//handles all voice commands.
var TwimlResponse = require('twilio').TwimlResponse;


var _activeCalls = [];//all phone calls in progress.
var _activeMessage;//where they are at in the menu.

var site = "http://www.badbatchalert.com/audio/";//the site where the audio lives  
var ext = ".wav";//the audio extension.

var audio = { //all the available messages we can play.
  zero:         '0',
  one:          '1',
  two:          '2',
  three:        '3',
  four:         '4',
  five:         '5',
  six:          '6',
  seven:        '7',
  eight:        '8',
  nine:         '9',
  correctZip:   'correctZip',
  help:         'help',
  afterWelcome: 'playsAfterWelcomeChildren',
  registerZip1: 'registerZip1',
  registerZip2: 'registerZip2',
  registration: 'registration',
  welcome:      'welcome'
};

function isZipCode(body)
{
  if (body.length !== 5) return false;
  if (isNaN(body)) return false;
  return true;
};

var VoiceActions = function() {
  var self = this;



  self.doVoiceActions = function(request, response, hasRegion) {  

    var phone = request.body.From;
    var input = request.body.RecordingUrl || request.body.Digits;
    var twiml = new TwimlResponse();

    //see if we have a call in progress. Find out where we were if so. Otherwise add us and start at the beginning.
    _activeMessage = hasRegion ? audio.welcome : audio.registration;
    var callFound = false;
    for(var i = 0; i < _activeCalls.length; i++) {
      var activeCall = _activeCalls[i];
      if (activeCall.phone === phone) {
        _activeMessage = activeCall.message;
        callFound = true;
        console.log('found call');
        break;
      }
    }

    if (!callFound) {
      console.log("new call");
      _activeCalls.push({phone:phone, message:_activeMessage});
    }

    console.log("input = " + input);

    // Add a greeting if this is the first question
    //twiml.play('http://www.mike-legrand.com/BadBatchAlert/Info.mp3');
    if (_activeMessage == audio.registration && input) {
      var zipvalid = isZipCode(input);

      if (zipvalid) {
        _activeMessage = audio.registerZip2;
        twiml.say(input, { voice: 'alice'});
      } 
    } 

    var url = site + _activeMessage + ext;
    console.log(url);
    twiml.play(url);

    // Depending on the type of question, we either need to get input via
    // DTMF tones or recorded speech
    twiml.gather({
      timeout: 10,
      finishOnKey: '*'
    });

    // render TwiML response
    response.type('text/xml');
    response.send(twiml.toString());
  };
 
};


module.exports = VoiceActions;
