$("#login-button").click(function(event){
  event.preventDefault();
  $('form').fadeOut(500);
  $('.wrapper').addClass('form-success');
  $('form h1').text("Authenticating...");
  $('form h1').show();

  var inputs = $('input');
  var postData = {
    username: inputs.eq(0).val(),
    password: inputs.eq(1).val()
  }
  $.ajax({ 
    url: 'https://badbatchalertstaging.herokuapp.com/webadmin/receive',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify( postData ), 
    success: onLoginResponse,
    error: onError
  });

  function onLoginResponse(response) {
    setTimeout(function(){
      if (response.err != null) {
        $('.wrapper').removeClass('form-success');
        $('form').fadeIn(500);
        $('form h1').text("The username or password is incorrect.")
        $('form h1').show();
      } else {
        window.location.href = "http://mike-legrand.com/bad_batch_web_admin/adminPanel.html";
      }
    }, 1000);
  };

  function onError() {
    cnsole.log("an unexpected error has ocurred");
    $('.wrapper').removeClass('form-success');
    $('form').fadeIn(500);
  }


});