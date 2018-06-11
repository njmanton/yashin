/* eslint-env browser, jquery */
/* eslint prefer-template: 0 */
'use strict';

$(function() {

  $.get('/matches/points').done(function(pts) {
    var n = pts.labels.length;
    $('#hc').highcharts({
      colors: ['#00db74', '#280661'],
      chart: {
        type: 'bar',
        height: n * 60
      },
      title: {
        text: null
      },
      xAxis: {
        categories: pts.labels,
        step: 1
      },
      yAxis: {
        title: {
          text: 'points'
        }
      },
      plotOptions: {
        bar: {
          animation: false,
          grouping: false,
          dataLabels: {
            enabled: true
          }
        }
      },
      series: [{
        name: 'points',
        data: pts.points,
        pointWidth: 30,
        //pointPadding: 0.3,
        point: {
          events: {
            click: function() {
              window.location.href = '/matches/' + this.id;
            }
          }
        }
      }, {
        name: 'jokers',
        data: pts.jokers,
        pointWidth: 12,
        borderWidth: 0
      }]
    });
  });
});
