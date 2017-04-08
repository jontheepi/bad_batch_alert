//handles all voice commands.
var VoiceActions = function() {
  var self = this;

  self.doVoiceActions = function(req, res) {

  var resp = new twilio.TwimlResponse();
  resp.play('http://www.mike-legrand.com/BadBatchAlert/Info.mp3');
  //resp.record({timeout:30, transcribe:true, transcribeCallback:"https://badbatchalertstaging.herokuapp.com/watson/receive"});
  
  res.status(200)
    .contentType('text/xml')
    .send(resp.toString());
  };
 
};


module.exports = VoiceActions;
