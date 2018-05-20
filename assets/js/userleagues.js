/* eslint-env browser, jquery */
/* eslint prefer-template: 0 no-console: 0 */
'use strict';

// runs on GET /home to populate user leagues
$(document).ready(function() {

  var uid  = $('h3').data('uid'),
      list = $('#homeUserLeagues');

  $.get(`/users/${ uid }/leagues`).done(function(leagues) {
    if (leagues.length) {
      $.each(leagues, function(k, v) {
        const status = v.league.public ? '' : '<i class="fa fa-lock"></i>';
        list.append(`<li><a href="leagues/${ v.league.id }">${ v.league.name }</a> ${ status }</li>`);
      });
    } else {
      list.replaceWith('<p>You are not a member of any user leagues yet</p>');
    }
  }).fail(function(e) {
    console.error(e);
  });

});

