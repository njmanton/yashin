/* eslint-env browser, jquery */
/* eslint prefer-template: 0 */
'use strict';

// called on GET /match/:id
$(function() {

  var cht = {
      chart: {
        type: 'heatmap',
        marginTop: 40,
        marginBottom: 80,
        backgroundColor: 'none',
        plotBorderWidth: 1
      },
      credits: { enabled: false },
      title: { text: null },
      xAxis: {
        title: { text: 'Home Goals' },
        tickInterval: 1,
        min: 0,
        max: 5
      },
      yAxis: {
        title: { text: 'Away Goals' },
        gridLineWidth: 0,
        tickInterval: 1,
        min: 0,
        max: 5
      },
      colorAxis: {
        min: 0,
        max: 10,
        minColor: '#ccf',
        maxColor: '#66f'
      },
      tooltip: {
        formatter: function() {
          var text = '';
          if (this.series.name == 'Goals predicted') {
            var plural = (this.point.value == 1) ? '' : 's';
            text = '<b>' + this.point.value + '</b> prediction' + plural + ' for ' + this.point.x + '-' + this.point.y;
          } else {
            text = '<b>' + this.series.name + '</b>: ' + this.point.x + '-' + this.point.y;
          }
          return text;
        }
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        series: {
          point: {
            events: {
              mouseOver: function() {
                var score = this.x + '-' + this.y;
                $('td:contains("' + score + '")').prev().addClass('hc-hilite');
              },
              mouseOut: function() {
                $('td').removeClass('hc-hilite');
              }
            }
          }

        }
      },
      series: [{
        name: 'Goals predicted',
        borderWidth: 1
      }, {
        type: 'scatter',
        marker: { symbol: 'circle', radius: 6 },
        color: '#0f0',
        name: 'Mean Prediction',
        tooltip: { formatter: function() { return 'Mean Prediction: '; } }
      }, {
        type: 'scatter',
        marker: { symbol: 'circle', radius: 6 },
        color: '#f00',
        name: 'Result',
        tooltip: { formatter: function() { return 'Result: '; } }
      }]

    };

  var mid = $('h2').data('mid');
  $.get('/matches/' + mid + '/goalmap').done(function(data) {
    if (data) {
      cht.series[0].data = data.counts;
      cht.series[1].data = [data.mean];
      cht.series[2].data = [data.result];
      $('#container').highcharts(cht);
    }
  });

});
