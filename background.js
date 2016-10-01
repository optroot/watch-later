

// required path, token
//function request(path, token, object, callback) {
function request(data) {
    var req = new XMLHttpRequest();
    req.open(data.method?data.method:'GET', data.url, true);
    req.setRequestHeader('Authorization', 'Bearer ' + data.token);
    req.setRequestHeader('Content-type', 'application/json');
    if (data.callback) req.onreadystatechange = data.callback;
    if (data.content) req.send(JSON.stringify(data.content));
    else req.send();
}

function getVideoId(url) {
	var match;
	if (match = url.match(/youtube\.com\/watch\?v=([^&]+)/)) return match[1];
	if (match = url.match(/youtu.be\/([^&]+)/)) return match[1];
	return false;
}

function watchLater(info, tab) {
	var id;
	if (info.linkUrl)  id = getVideoId(info.linkUrl);
	if (!id) return;

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
				if (this.readyState == 4) {
					//console.log('status', this.status);
				}
				if (this.readyState == 4 && this.status == 200) {
				}
				if (this.readyState == 4 && this.status == 401) {
				}
				if (this.readyState == 4 && this.status != 200) {
					//var json = JSON.parse(this.response);
					//console.log('json', json);
					console.error('Could not add to Wait Later', this.status);
				}
    		},
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
    	'*://*.youtube.com/watch?v=*',
    ],
    'onclick': watchLater,
});

chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.create({ url: 'https://www.youtube.com/playlist?list=WL' });
});