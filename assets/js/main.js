/* eslint-env browser, jquery */
/* eslint prefer-template: 0 */

'use strict';

// auto clear message boxes after 4s
window.setTimeout(function() {
  $('.alert .close').click();
}, 4000);

$(function() {

  $('button.editscore').on('click', function() {
    $(this).next().toggle();
  });

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
        console.log('problem deleting goal');
      }
    }).fail(function(e) {

    });
  });

  $('#leaveLeague').on('click', function() {

    var lid = $('h2').data('lid');

    $.ajax({
      url: `/leagues/${ lid }/user`,
      method: 'delete'
    }).done(function(ret) {
      console.log(ret);
      if (ret) {
        window.location.reload();
      }
    })

  });

  $('#leagueJoin').on('click', function() {
    const lid = $(this).data('lid');
    $.ajax({
      method: 'put',
      url: `/leagues/${ lid }/join`
    }).done(function(res) {
      window.location.reload();
    }).fail(function(e) {

    });

  });

  $('#leagueRequestJoin').on('click', function() {

    const lid = $(this).data('lid');
    $.ajax({
      method: 'put',
      url: `/leagues/${ lid }/join`
    }).done(function(res) {
      window.location.reload();
    }).fail(function(e) {

    });

  });

  $('#preds :text').on('change', function() {
    var pred = $(this),
        icon = pred.prev(),
        icons = $('span.ajax'),
        re = /^\b\d{1,2}[-|_|=]\d{1,2}\b$/;

    icons.addClass('hide');
    if (pred.val().match(re) || pred.val() == '') {
      $.post('/predictions/update', {
        //uid: 1,
        mid: pred.data('mid'),
        pred: pred.val()
      }).done(function(res) {
        console.log(res);
        icon.removeClass('hide');
        window.setTimeout(function() {
          icon.addClass('hide');
        }, 2000);
      }).fail(function(err) {
        console.log('err', err);
      });
    } else {
      pred.val('');
    }
  });

  $('#preds :radio').on('click', function() {
    var radio = $(this),
        mid = radio.data('mid'),
        stage = radio.data('stage');

    $.post('/predictions/joker', {
      mid: mid,
      stage: stage
    }).done(function(res) {
      console.log(res);
    }).fail(function(e) {

    });

  });

  $('#payments :checkbox').on('click', function() {
    console.log('event');
    var check = $(this);

    $.post('/admin/payment', {
      payee: check.data('uid')
    }).done(function(res) {
      if (res) {
        console.log(res);
        check.replaceWith('<i class="fas fa-check"></i>');
      }
    }).fail(function(err) {
      console.log(err);
    });

  });

  $('#pending_league button').on('click', function() {
    var btn = $(this),
        row = btn.closest('tr'),
        lid = btn.data('lid'),
        decision = btn.data('decision');
    $.post('/admin/league/request', {
      lid: lid,
      decision: decision
    }).done(function(res) {
      row.fadeOut(1000);
    }).fail(function(err) {
      console.log(err);
    });

  });

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
      console.log(err);
      btn.append('<span class="badge badge-danger">failed to process</span>');
    });

  });

  $('#addGoal #time').on('blur', function() {
    var n = $(this).next();
    if ($(this).val() == 45 || $(this).val() == 90) {
      n.attr('disabled', null);
    } else {
      n.attr('disabled', 'disabled');
    }
  });

  $('#confirm-submit').attr('disabled', 'disabled');

  var user = $('#confirmAccount #username'),
      email = $('#confirmAccount #email'),
      pwd = $('#confirmAccount #password'),
      rpt = $('#confirmAccount #repeat'),
      uid_err = $('#confirmAccount #user-not-valid'),
      email_err = $('#confirmAccount #email-not-valid'),
      rpt_err = $('#confirmAccount #password-not-repeated');

  var checkConfirm = function() {
    var state = (uid_err.hasClass('success') && !email_err.hasClass('error') && rpt_err.hasClass('success') && user.val().length >= 3);
    if (state) {
      $('#confirm-submit').removeAttr('disabled');
    } else {
      $('#confirm-submit').attr('disabled', 'disabled');
    }
  };

  rpt.on('blur', function() {
    if (rpt.val() != pwd.val()) {
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
    } else {
      uid_err.hide();
    }
  });

  email.on('keyup', function() {
    var add = $(this).val(),
        re = /\S+@\S+\.\S+/;

    if (add.match(re)) {
      $.get('/users/available/' + add)
        .done(function(res) {
          if (res) {
            email_err
              .removeClass('error')
              .addClass('success')
              .html('&#10003;')
              .show();
          } else {
            email_err
              .addClass('error')
              .removeClass('success')
              .html('taken')
              .show();
          }
        });
    } else {
      email_err.show().addClass('error').html('<span class="fas fa-exclamation"></span>');
    }
    checkConfirm();

  });

  $('#postPreview').on('click', function() {
    $.post({
      url: '/preview/',
      data: { text: $('#leagueDesc').val() }
    }).done(function(res) {
      $('#postPreviewPane').html(res);
    }).fail(function(e) {
      $('#postPreviewPane').text('Could not render text');
    });
  });

});


