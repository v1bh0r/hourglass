/* add-on script */

$(function () {
  var opts = {
    lines: 7 // The number of lines to draw
    , length: 9 // The length of each line
    , width: 7 // The line thickness
    , radius: 7 // The radius of the inner circle
    , scale: 1 // Scales overall size of the spinner
    , corners: 1 // Corner roundness (0..1)
    , color: '#000' // #rgb or #rrggbb or array of colors
    , opacity: 0.25 // Opacity of the lines
    , rotate: 0 // The rotation offset
    , direction: 1 // 1: clockwise, -1: counterclockwise
    , speed: 1 // Rounds per second
    , trail: 60 // Afterglow percentage
    , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
    , zIndex: 2e9 // The z-index (defaults to 2000000000)
    , className: 'spinner' // The CSS class to assign to the spinner
    , top: '50%' // Top position relative to parent
    , left: '50%' // Left position relative to parent
    , shadow: false // Whether to render a shadow
    , hwaccel: false // Whether to use hardware acceleration
    , position: 'absolute' // Element positioning
  };
  var target = document.getElementById('spinner');
  var spinner = new Spinner(opts).spin(target);
});

var setLoaderVisibility = function (visible) {
  if (visible) {
    $("#spinner").show();
  } else {
    $("#spinner").hide();
  }
};

var worklogItemsTemplate = Handlebars.compile('<tr><td headers="key">{{key}}</td><td headers="hours">{{value}}</td></tr>');

var $sinceDate = $("#since-date");
$sinceDate.attr("max", moment().format('YYYY-MM-DD'));

$sinceDate.change(function () {
  var since = moment($sinceDate.val());
  setLoaderVisibility(true);

  AP.require('request', function (request) {
    request({
      url: '/rest/api/2/worklog/updated?since=' + (since.unix() * 1000),
      type: 'GET',
      success: function (responseText) {
        var parsedBody = JSON.parse(responseText);
        var worklogIds = _.map(parsedBody.values, 'worklogId');

        AP.require('request', function (request) {
          request({
            url: '/rest/api/2/worklog/list',
            data: JSON.stringify({ids: worklogIds}),
            contentType: "application/json",
            type: 'POST',
            success: function (workloadItemsResBody) {
              workloadItemsResBody = JSON.parse(workloadItemsResBody);
              var authorTimeAggregate = {};
              var workloadItemsByAuthors = _.groupBy(workloadItemsResBody, "author.key");
              _.forEach(workloadItemsByAuthors, function (workloadItemsByAuthor, authorKey) {
                var totalTimeSeconds = _.reduce(workloadItemsByAuthor, function (sum, item) {
                  return sum + item.timeSpentSeconds;
                }, 0);
                authorTimeAggregate[authorKey] = totalTimeSeconds / 3600.0;
              });

              var $reportBody = $("#report-body");
              $reportBody.html("");

              _.forEach(authorTimeAggregate, function (value, key) {
                var data = {
                  value: value,
                  key: key
                };

                $reportBody.append(worklogItemsTemplate(data));
              });
              setLoaderVisibility(false);
              $("#report").show();
            }
          });
        });

      }
    });
  });
});