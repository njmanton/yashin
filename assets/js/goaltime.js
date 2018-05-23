/* eslint-env browser, jquery */
/* eslint prefer-template: 0 */
'use strict';

$(function() {

  $.get('/goals/times').done(function(res) {
    $('#hc').highcharts({
      chart: {
        type: 'scatter',
        zoomType: 'x',
        plotBackgroundColor: 'rgba(128, 128, 255, 0.2)'
      },
      title: {
          text: null
      },
      legend: {
        enabled: false
      },
      subtitle: {
        align: 'right',
        text: document.ontouchstart === undefined ?
          'Click and drag to zoom in' :
          'Pinch the chart to zoom in'
      },
      tooltip: {
        formatter: function() {
          var str;
          str = this.point.scorer + ' (' + this.point.x + '\'';
          if (this.point.tao) {
            str += '+' + this.point.tao + '\'';
          }
          if (this.point.type == 'o') {
            str += ' og';
          } else if (this.point.type == 'p') {
            str += ' pen';
          }
          str += ')<br>';
          str += '<strong>' + this.point.team + '</strong> v ' + this.point.oppo;
          str += '<br>Click to select match';
          return str;
        }
      },
      xAxis: {
        title: {
          enabled: true,
          text: 'Time (mins)'
        },
        min: 0,
        startOnTick: true,
        tickInterval: 5,
        alternateGridColor: 'rgba(72, 72, 255, 0.2)'
      },
      yAxis: {
        gridLineWidth: 0,
        labels: {
          enabled: false
        },
        title: {
          enabled: false
        },
        max: 2,
      },
      plotOptions: {
        column: {
          pointPadding: 0,
          borderWidth: 0,
          groupPadding: 0,
          shadow: false,
          enableMouseTracking: false,
          animation: false
        },
        scatter: {
          cursor: 'pointer',
          point: {
            events: {
              click: function() {
                window.location.href = '/matches/' + this.match;
              }
            }
          }
        }
      },
      series: [{
        type: 'column',
        name: null,
        data: [{x: 92.5, y: 2, color: 'rgba(255, 128, 128, 0.6)'}, {x: 97.5, y: 2, color: 'rgba(255, 72, 72, 0.2)'}]
      }, {
        type: 'scatter',
        name: 'Goals',
        data: res.goals,
        marker: {
          symbol: 'url(/img/futbol.svg)'
        }
      }, {
        type: 'scatter',
        name: 'Pens',
        data: res.pens,
        marker: {
          symbol: 'url(/img/futbol.svg)'
        }
      }, {
        type: 'scatter',
        name: 'Own Goals',
        data: res.ogs,
        marker: {
          symbol: 'url(/img/futbol.svg)'
        }
      }]
    });
  });

});
