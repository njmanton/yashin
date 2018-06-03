/* eslint-env browser, jquery */
/* eslint prefer-template: 0 no-console: 0 */
'use strict';

// auto clear message boxes after 4s
window.setTimeout(function() {
  $('.alert .close').click();
}, 4000);

$(function() {

  // show/hide the edit score button
  $('button.editscore').on('click', function() {
    $(this).next().toggle();
  });

  // handle a goal deletion
  $('button.goaldel').on('click', function() {
    var gid = $(this).data('gid'),
        row = $(this).closest('tr');
    $.ajax({
      url: '/admin/goals/' + gid,
      type: 'delete'
    }).done(function(r) {
      if (r) {
        row.fadeOut(500, function() { row.remove(); });
      } else {
        console.error('problem deleting goal');
      }
    }).fail(function(e) {
      console.error(e);
    });
  });

  // handler for leaving a league
  $('#leaveLeague').on('click', function() {

    var lid = $('h2').data('lid');
    if (confirm('Are you sure you want to leave this league?')) {
      $.ajax({
        url: `/leagues/${ lid }/user`,
        method: 'delete'
      }).done(function(ret) {
        console.log(ret);
        if (ret) window.location.reload();
      });
    }

  });

  // handle a request to join a public league
  $('#leagueJoin').on('click', function() {
    const lid = $(this).data('lid');
    $.ajax({
      method: 'put',
      url: `/leagues/${ lid }/join`
    }).done(function(res) {
      if (res) window.location.reload();
    }).fail(function(e) {
      console.error(e);
    });

  });

  // handle a request to join a private league
  $('#leagueRequestJoin').on('click', function() {

    const lid = $(this).data('lid');
    $.ajax({
      method: 'put',
      url: `/leagues/${ lid }/join`
    }).done(function(res) {
      if (res) window.location.reload();
    }).fail(function(e) {
      console.error(e);
    });

  });

  // handler for making/editing prediction
  $('#preds :text').on('change', function() {
    var pred = $(this),
        icon = pred.next().next(),
        icons = $('span.ajax'),
        re = /^\b\d{1,2}[-|_|=]\d{1,2}\b$/;

    icons.addClass('hide');
    if (pred.val().match(re) || pred.val() == '') {
      $.post('/predictions/update', {
        mid: pred.data('mid'),
        pred: pred.val()
      }).done(function(res) {
        console.log(res && res.updates);
        if (res) {
          icon.removeClass('hide');
          window.setTimeout(function() {
            icon.addClass('hide');
          }, 2000);
        }
      }).fail(function(err) {
        console.error('err', err);
      });
    } else {
      pred.val('');
    }
  });

  // handler for clicking joker button
  $('#preds :radio').on('click', function() {
    var radio = $(this),
        icon = radio.next(),
        mid = radio.data('mid'),
        stage = radio.data('stage');

    $.post('/predictions/joker', {
      mid: mid,
      stage: stage
    }).done(function(res) {
      if (res && res.updates) {
        icon.removeClass('hide');
        window.setTimeout(function() {
          icon.addClass('hide');
        }, 1000);
      }
    }).fail(function(err) {
      console.error('err', err);
    });

  });

  // handle marking player as paid
  $('#payments :checkbox').on('click', function() {
    console.log('event');
    var check = $(this);

    $.post('/admin/payment', {
      payee: check.data('uid')
    }).done(function(res) {
      if (res) {
        console.log(res);
        check.prev().text('Updated');
        check.replaceWith('<i class="fas fa-check"></i>');
      }
    }).fail(function(err) {
      console.error(err);
    });

  });

  // manage creating new league decisions
  $('#pending_league button').on('click', function() {
    var btn = $(this),
        row = btn.closest('tr'),
        lid = btn.data('lid'),
        decision = btn.data('decision');
    $.post('/admin/league/request', {
      lid: lid,
      decision: decision
    }).done(function(res) {
      if (res) row.fadeOut(1000);
    }).fail(function(err) {
      console.error(err);
    });

  });

  // manage joining private league decisions
  $('#pending_league_member button').on('click', function() {
    var btn = $(this),
        row = btn.closest('tr'),
        lid = $('h2').data('lid'),
        uid = btn.data('uid'),
        decision = btn.data('decision');

    $.post(`/leagues/${ lid }/decision`, {
      uid: uid,
      decision: decision
    }).done(function(res) {
      if (res) {
        btn.parent().append('<span class="badge badge-success">processed and email sent</span>');
        row.fadeOut(3000);
      } else {
        btn.parent().append('<span class="badge badge-danger">email not sent!</span>');
      }

    }).fail(function(err) {
      console.error(err);
      btn.append('<span class="badge badge-danger">failed to process</span>');
    });

  });

  // enable/disable tao field based on normal time
  $('#addGoal #time').on('blur', function() {
    var n = $(this).next();
    if ($(this).val() == 45 || $(this).val() == 90) {
      n.attr('disabled', null);
    } else {
      n.attr('disabled', 'disabled');
    }
  });

  // handlers for confirm account form
  $('#confirm-submit').attr('disabled', 'disabled');

  var user = $('#confirmAccount #username'),
      email = $('#confirmAccount #email'),
      pwd = $('#confirmAccount #password'),
      rpt = $('#confirmAccount #repeat'),
      pwd_err = $('#confirmAccount #password-not-valid'),
      uid_err = $('#confirmAccount #user-not-valid'),
      email_err = $('#confirmAccount #email-not-valid'),
      rpt_err = $('#confirmAccount #password-not-repeated');

  var checkConfirm = function() {
    var state = (uid_err.hasClass('success') && pwd_err.hasClass('success') && !email_err.hasClass('error') && rpt_err.hasClass('success') && user.val().length >= 3);
    if (state) {
      $('#confirm-submit').removeAttr('disabled');
    } else {
      $('#confirm-submit').attr('disabled', 'disabled');
    }
  };

  pwd.on('blur', function() {
    if (pwd.val().length < 8) {
      pwd_err
        .addClass('err')
        .removeClass('success')
        .html('⚠️')
        .show();
    } else {
      pwd_err
        .addClass('success')
        .removeClass('err')
        .html('&#10003;')
        .show();
    }
  });

  rpt.on('blur', function() {
    if (rpt.val() != pwd.val() || rpt.val().length == 0) {
      rpt_err
        .addClass('err')
        .removeClass('success')
        .html('&ne;')
        .show();
    } else {
      rpt_err
        .addClass('success')
        .removeClass('err')
        .html('&#10003;')
        .show();
    }
    checkConfirm();
  });

  user.on('keyup', function() {
    if (user.val().length > 2) {
      if (~user.val().indexOf(' ')) {
        uid_err
        .addClass('error')
        .removeClass('success')
        .html('<span class="fas fa-exclamation"></span>')
        .show();
      } else {
        uid_err.html(' <span>spinner</span>');
        $.get('/users/available/' + user.val())
          .done(function(res) {
            if (res) {
              uid_err
                .removeClass('err')
                .addClass('success')
                .html('&#10003;')
                .show();
            } else {
              uid_err
                .addClass('err')
                .removeClass('success')
                .html('taken')
                .show();
            }
            checkConfirm();
        });
      }
    } else {
      uid_err.hide();
    }
  });

  email.on('keyup', function() {
    var add = $(this).val(),
        re = /\S+@\S+\.\S+/;

    if (add.match(re)) {
      email_err
        .removeClass('err')
        .addClass('success')
        .html('&#10003;')
        .show();
    } else {
      email_err.show().addClass('err').removeClass('success').html('<span class="fas fa-exclamation"></span>');
    }
    checkConfirm();

  });

  // ajax call to render preview of emojified/markdown text
  $('#postPreview').on('click', function() {
    $.post({
      url: '/preview/',
      data: { text: $('#leagueDesc').val() }
    }).done(function(res) {
      $('#postPreviewPane').html(res);
    }).fail(function(e) {
      console.error(e);
      $('#postPreviewPane').text('Could not render text');
    });
  });

});
