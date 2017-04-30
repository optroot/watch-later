
var watchLaterURL = 'https://www.youtube.com/playlist?list=WL';

function request(data) {
    var req = new XMLHttpRequest();
    req.open(data.method?data.method:'GET', data.url, true);
    if (data.token) req.setRequestHeader('Authorization', 'Bearer ' + data.token);
    req.setRequestHeader('Content-type', 'application/json');
    if (data.callback) req.onreadystatechange = data.callback;
    if (data.content) req.send(JSON.stringify(data.content));
    else req.send();
}

function getVideoId(url) {
	var match;
  url = decodeURIComponent(url);
  console.log("getVideoId", url);
  if ((match = url.match(/youtube\.com.*\/watch\?v=([^&]+)/))) return match[1];
	if ((match = url.match(/youtu.be\/([^&?]+)/))) return match[1];
  if ((match = url.match(/watch\?v=([^&]+)/))) return match[1];
  if ((match = url.match(/[\?\&]v=([^&]+)/))) return match[1];
	return false;
}

function getVideoTitle(id, callback) {
  chrome.identity.getAuthToken({'interactive': true}, function (token) {
    request({
      'url': 'https://www.googleapis.com/youtube/v3/videos?part=snippet&id='+id,
      'method': 'GET',
      'token': token,
      'callback': function() {

        if (this.readyState == 4) {

          if (this.status == 200) {
            var response = JSON.parse(this.response);
            if (response.items.length > 0) {
              // callback(response.items[0].snippet.title);
              callback(response.items[0].snippet.localized.title);
              return;
            }
          }
          callback('Watch Later ('+id+')');
        }
      },
    });
  });
}

function notification(id, title, message) {
  if (!id || !title) return;

  chrome.notifications.create(id, {
    iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
    title: title,
    type: 'basic',
    message: message,
    isClickable: true,
    priority: 2,
  }, function() {});
}

function notify(id, status) {
  switch (status) {

    // OK
    case 200:
      getVideoTitle(id, function (title) {
        notification(id, 'Added to Watch Later Playlist', title);
      });
      return;

    // Errors
    case 400: 
      notification(id, 'Error!', 'Bad request url');
      break;
    case 401: 
      notification(id, 'Error!', 'Authentication Error');
      break;
    case 403:
      notification(id, 'Error!', 'Access is forbidden, or API overused');
      break;
    case 404:
      notification(id, 'Error!', 'This video does not exist');
      break;
    case 409: 
      getVideoTitle(id, function (title) {
        notification(id, 'Video already in Watch Later Playlist', title);
      });
      break;
    default:
      notification(id, 'Error!', 'Unknown error code: '+status);
      break;

  }
  console.error('Could not add to Watch Later Playlist ('+status+')');
}

// function watchLater(info, tab) {
function watchLater(url, callback) {
	var id = getVideoId(url);
	if (!id) return;
	console.log('Parsed video id from url:', id);

  chrome.identity.getAuthToken({'interactive': true}, function (token) {
    request({
      'url': 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
      'method': 'POST',
      'token': token,
      'content': {
        'snippet' : {
              'playlistId': 'WL',
              'resourceId': {
                  'kind': 'youtube#video',
                  'videoId': id,
              },
        },
      },
      'callback': function() {
        // console.log('callback', this);
        if (this.readyState == 4) {
          callback(id, this.status);
          // notify(id, this.status);
          // TODO mark url read?
        }
      },
    });
  });
}

function watchLaterContext(info, tab) {
	if (info.linkUrl) watchLater(info.linkUrl, function (id, status) {
    notify(id, status);
    if (status == 200) {
      console.log('adding to history');
      chrome.history.addUrl({ url: info.linkUrl });
    }
  });
}

function addAllTabs() {
  chrome.tabs.getAllInWindow(null, function (tabs) {
    tabs.forEach(function(tab) {
      watchLater(tab.url, function (id, status) {
        if (status == 200) chrome.tabs.remove(tab.id);
        if (status == 409) chrome.tabs.remove(tab.id);
      });
    });
  });
}


chrome.contextMenus.create({
    'title': 'Watch Later',
    'contexts': [
	    'link',
    ],
    'targetUrlPatterns': [
       '*://youtu.be/*',
       '*://*/*watch*',
       '*://*/*v=*',
    ],
    'onclick': watchLaterContext,
});

chrome.contextMenus.create({
    'title': 'Add all to Watch Later',
    'contexts': [ 'browser_action' ],
    'onclick': addAllTabs,
});

chrome.notifications.onClicked.addListener(function(id) {
  chrome.tabs.create({ url: watchLaterURL });
  chrome.notifications.clear(id);
});

chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.create({ url: watchLaterURL });
});
