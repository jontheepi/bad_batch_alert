var crypto = require('crypto');
var CIPHER_KEY = process.env.CIPHER_KEY;
var CIPHER_IV  = process.env.CIPHER_IV; 
var CIPHER_ALGO   = process.env.CIPHER_ALGO;

var cryptoHelper = function() {

  var self = this;

  self.encrypt = function(text) {

    const key = Buffer.from(CIPHER_KEY, 'hex');
    const iv  = Buffer.from(CIPHER_IV,  'hex');
    var cipher = crypto.createCipheriv(CIPHER_ALGO, key, iv);
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');

    //var test = self.decrypt(crypted);
    //console.log('works both ways? : ' + test);

    return crypted;
  };
   
  self.decrypt = function(text) {
    const key = Buffer.from(CIPHER_KEY, 'hex');
    const iv  = Buffer.from(CIPHER_IV,  'hex');
    var decipher = crypto.createDecipheriv(CIPHER_ALGO, key, iv);
    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  };

  self.generateAuthtoken = function(callback) {
    crypto.randomBytes(48, function(err, buffer) {
      var authtoken = buffer.toString('hex');
      callback(authtoken);
    });
  };

};

module.exports = cryptoHelper;