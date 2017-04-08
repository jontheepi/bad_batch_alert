//handles all voice commands.
var VoiceActions = function() {
  var self = this;

  self.doVoiceActions = function(req, res) {


     res.status(200)
    .contentType('text/xml')
    .send(resp.toString());
  };
 
};


module.exports = VoiceActions;
