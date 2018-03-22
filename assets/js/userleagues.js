'use strict';

$(document).ready(function() {

  var uid  = $('h3').data('uid'),
      list = $('#homeUserLeagues');

  $.get(`/users/${ uid }/leagues`).done(function(leagues) {
    if (leagues.length) {
      $.each(leagues, function(k, v) {
        list.append(`<li><a href="leagues/${ v.league.id }">${ v.league.name }</a></li>`);
      }) ;      
    } else {
      list.replaceWith('<p>You are not a member of any user leagues yet</p>')
    }
  }).fail(function(e) {
    console.error(e);
  })

});

