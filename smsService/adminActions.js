// 
// A collection of functions related to special admin actions that can be triggered from an admin phone number*/
//
var adminActions = function() {

  var self = this;

  var TWILIO_NUMBER = process.env.TWILIO_NUMBER;
  var MY_NUMBER     = process.env.MY_NUMBER;
  
  //fires off a test alert to all the registered users
  self.adminTestAlerts = function(twilio, client, action, decrypt)
  {
    //Query for all users and send them alerts.
    console.log("adminTestAlerts " + action );
    var region = action.charAt(2);//in test alert the 2nd character is the region so.. like this is alert region '⚠2'️ (2 because unicode)
    var findQueryString = "SELECT * FROM users WHERE region = " + region;
    console.log(findQueryString);
    var findQuery = client.query(findQueryString);
    findQuery.on('row', function(row) {
      console.log(JSON.stringify(row));
      var phoneNumber = decrypt(row.phone_number);
      console.log(phoneNumber);
      twilio.sendMessage({
        to: phoneNumber,
        from: TWILIO_NUMBER,
        body: '⚠️ Overdose nearby, please be careful: http://health.baltimorecity.gov/Fentanyl ⚠️',
        mediaUrl: "http://www.mike-legrand.com/BadBatchAlert/uplift.jpg"  
      }, function (err) {
        if (err) {
          return next(err);
        }
      });
    }).on('error', function() {
      console.log("nobody in region " + region + " to alert.")
    });
 
  };

  self.adminHelloWorld = function(twilio, client, sender, action)
  {
    console.log("adminHelloWorld");
    twilio.sendMessage({
      to: MY_NUMBER,
      from: TWILIO_NUMBER,
      body: '👋 Hello World 👋'
    }, function (err) {
      if (err) {
        return next(err);
      }
    });
  };


  //Special admin actions, like mass text etc.
  self.doAdminAction = function(twilio, res, client, sender, action, decrypt)
  {
    if (sender != MY_NUMBER) return false;//not admin sorry buddy.

    if (action.startsWith("⚠️")) {//Alert Emoji
      self.adminTestAlerts(twilio, client, action, decrypt);
    } else if (action == "👋") {
      self.adminHelloWorld(twilio, client, action);
    } else {
      return false;
    }

    return true;
  };

};

module.exports = adminActions;