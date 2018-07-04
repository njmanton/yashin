/* eslint-env browser, jquery */
/* eslint prefer-template: 0 */
'use strict';

$(function() {

  $.get('/goals/means').done(function(pts) {
    //pts;
    $('#hc').highcharts({
      chart: {
        type: 'scatter',
        zoomType: 'xy',
        height: '100%',
      },
      title: {
        text: 'Prediction Accuracy'
      },
      plotOptions: {
        scatter: {
          marker: { radius: 4 },
          point: {
            events: {
              click: function() {
                window.location.href = '/matches/' + this.options.mid;
              }
            }
          }
        }
      },
      legend: {
        enabled: false
      },
      xAxis: {
        labels: {
          formatter: function() {
            return ((this.value > 0) ? '+' : '') + this.value;
          }
        },
        gridLineWidth: 1,
        min: -4,
        max: 4,
        title: {
          text: 'home goals, compared to prediction'
        }
      },
      yAxis: {
        labels: {
          formatter: function() {
            return ((this.value > 0) ? '+' : '') + this.value;
          }
        },
        min: -4,
        max: 4,
        title: {
          text: 'away goals, compared to prediction'
        }
      },
      tooltip: {
        formatter: function() {
          return (this.series.name == 'Preds') ? this.point.label : null;
        }
      },
      series: [{
        name: 'Preds',
        data: pts
      }, {
        type: 'scatter',
        data: [[0, 0], [0, 0]],
        color: '#f00',
        enableMouseTracking: false
      }, {
        type: 'line',
        data: [[0, -4], [0, 4]],
        color: '#222',
        marker: {
          enabled: false
        },
        enableMouseTracking: false
      }, {
        type: 'line',
        data: [[-4, 0], [4, 0]],
        color: '#222',
        marker: {
          enabled: false
        },
        enableMouseTracking: false
      }]
    });
  });
});
