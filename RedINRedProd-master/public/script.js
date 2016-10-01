$(document).ready(function() {
  var is_rec = false;
  var is_http = false;

  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');
  var video = document.getElementById('video');

  var last_snap = false;

  var snap = new Audio('/snap.wav');
  var resize = function() {
    $('.video-wrapper').css('height', $('.video-wrapper').width());
    $('.last-preview').css('height', $('.last-preview').width());
  };
  resize();
  $(window).on('resize', resize);

  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
        video.src = window.URL.createObjectURL(stream);
        video.play();
    });
  }

  $('.control').click(function() {
    if (is_http) {
      return;
    }
    if (!is_rec) {
      $('.scott').fadeOut();
      $('.preview').fadeOut();
      $('.control').attr('src', '/img/rec.png');
      is_rec = true;
    } else {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      var url_b64 = canvas.toDataURL();
      $('.preview').css('background-image', 'url("' + url_b64 + '")');
      is_http = true;
      $('.preview').fadeIn();
      snap.play();
      $('#loader').fadeIn();
      is_http = true;
      $.post('/snap', {snap: url_b64}, function(data){
        if (last_snap) {
          $('.prev-stats').prepend("<li><a href='" + last_snap.img.replace('./public', '') + "' target='_blank'><div class='preview-tiny' style='background-image:url(" + last_snap.img.replace('./public', '') + ")'></div></a>Confidence <strong>" + Math.round(last_snap.trust * 100) + "</strong>% Gender: " + last_snap.gender + " Color: " + last_snap.color + "<br />" + last_snap.trust_context + "</li>");
          $('.prev-stats li').last().remove();
        }
        last_snap = data;
        $('.display-block-wrapper').fadeIn();
        $('.stat-age').text(data.age);
        $('.stat-trust').text(Math.round(data.trust * 100));
        $('.stat-happy').text(Math.round(data.happy * 100));
        $('.stat-time-hours').text(getTime('h'));
        $('.stat-time-minutes').text(getTime('m'));
        $('.stat-gender').shuffleLetters({
    			"text": data.gender
    		});
        $('.stat-color').shuffleLetters({
          "text": data.color
        });
        $('.stat-context').shuffleLetters({
          "text": data.trust_context
        });
        $('.last-preview').css('background-image', 'url("' + url_b64 + '")');
        $('.last-preview').css('height', $('.last-preview').width());
        $('#loader').fadeOut();
        $('.preview').fadeOut();
        $('.scott').fadeIn();
        $('.control').attr('src', '/img/go.png');
        is_http = false;
        is_rec = false;
      });
    }
  });

  var getTime = function(what) {
    var d = new Date();
    if (what == 'h') {
      return ('0' + d.getHours()).slice(-2);
    } else {
      return ('0' + d.getMinutes()).slice(-2);
    }
  };

  $('.stat-time-hours').text(getTime('h'));
  $('.stat-time-minutes').text(getTime('m'));

});
