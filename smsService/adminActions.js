// 
// A collection of functions related to special admin actions that can be triggered from an admin phone number*/
//
var adminActions = function() {

  var self = this;
  
  var TWILIO_NUMBER = process.env.TWILIO_NUMBER;
  var MY_NUMBER = process.env.MY_NUMBER;
  
  //fires off a test alert to all the registered users
  self.adminTestAlerts = function(twilio, res, client, action)
  {
    //Query for all users and send them alerts.
    var findQueryString = "SELECT * FROM users";
    var findQuery = client.query(findQueryString);
    findQuery.on('row', function(row) {
      console.log(JSON.stringify(row));
      console.log(row.phone_number);
      twilio.sendMessage({
        to: row.phone_number,
        from: TWILIO_NUMBER,
        body: '⚠️ Overdose nearby, please be careful: http://health.baltimorecity.gov/Fentanyl ⚠️',
        mediaUrl: "http://www.mike-legrand.com/BadBatchAlert/uplift.jpg"  
      }, function (err) {
        if (err) {
          return next(err);
        }
        res.status(200).send('Message sent.');
      });
    });
  }

  self.adminHelloWorld = function(twilio, res, client, action)
  {
    twilio.sendMessage({
      to: MY_NUMBER,
      from: TWILIO_NUMBER,
      body: '👋 Hello World 👋'
    }, function (err) {
      if (err) {
        return next(err);
      }
      res.status(200).send('Message sent.');
    });
  }


  //Special admin actions, like mass text etc.
  self.doAdminAction = function(twilio, res, client, action)
  {
    console.log("ADMIN ACTION:" + action);
    if (action == "⚠️") {//Alert Emoji
      self.adminTestAlerts(res, client, action);
    } else if (action == "👋") {
      self.adminHelloWorld(res, client, action);
    }
  }

};

module.exports = adminActions;