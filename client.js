/**
 * Created by vales on 05.02.2017.
 */
//(function () {

var app = {
    location: "",
    playlists: [],
    currentPlaylist: null,
    currentSegment: null,
    cache: []
}

var button_load = $("#button_load");
var playlist_master = $("#playlist_master");
var select_playlist = $("#playlists");
var select_segment = $("#segments");
var player = $("#player")[0];

/**
 * Parse a master playlist
 * @param url
 * @param lines
 */
function parseMaster(url, lines) {
    console.log("Parsing masterplaylist " + url);

    app.currentPlaylist = null;
    app.currentSegment = null;

    var playlist = {
        bandwidth: "",
        url: "",
        segments: []
    };
    $.each(lines, function () {
        var line = this.valueOf();
        if (line.indexOf("#EXT-X-STREAM-INF") != -1) {
            playlist = {
                bandwidth: "",
                url: "",
                segments: []
            };
            var params = line.split(",");
            $.each(params, function () {
                param = this.valueOf();
                if (param.indexOf("BANDWIDTH=") != -1) {
                    playlist.bandwidth = param.substr(10);
                }
            })
        } else if (line.indexOf("m3u8") != -1) {
            varianturl = line;
            playlist.url = getPath(url) + varianturl;
            app.playlists.push(playlist);
            $("#playlists").append("<option value='" + playlist.url + "'>" + varianturl + " | " + "Bandwidth: " + playlist.bandwidth + "</option>");
            loadPlaylist(playlist.url, parseVariant);
        }
    });
}

/**
 * Parse a variant stream Playlist
 * @param url
 * @param lines
 */
function parseVariant(url, lines) {
    console.log("Parsing variantplaylist " + url);
    var currentTime = 0;

    for (var i = 0; i < app.playlists.length; i++) {
        if (app.playlists[i].url == url) {
            var duration = 0.0;
            $.each(lines, function () {
                var line = this.valueOf();
                if (line.indexOf("#EXTINF") != -1) {
                    duration = line.substr(8);
                    if (duration.substr(-1) == ",") {
                        duration = duration.substr(0, duration.length - 1);
                    }
                } else if (line.indexOf(".mp4") != -1) {
                    var segment = {
                        duration: parseFloat(duration),
                        currentTime: parseFloat(currentTime),
                        url: getPath(url) + line
                    }
                    app.playlists[i].segments.push(segment);
                    if (i == 0) {
                        $("#segments").append("<option value='" + currentTime + "'>" + line + " | " + "Duration: " + parseFloat(duration) + "</option>");
                    }
                    if(app.currentSegment === null && app.currentPlaylist === null){
                        app.currentPlaylist = 0;
                        app.currentSegment = 0;
                        playPlaylist(0);
                    }
                    currentTime += parseFloat(duration);
                }
            });
        }
    }
}

function loadPlaylist(url, callback) {

    console.log("Fetching playlist: " + url);

    $.get(url, function (data) {

        var lines = data.split("\n");
        if (lines[0].valueOf().indexOf("#EXTM3U") !== 0) {
            alert("A valid playlist file must begin with #EXTM3U");
        } else {
            if (data.indexOf("#EXT-X-STREAM-INF") != -1) {
                // MASTER
                app.location = playlist_master.val();
                callback(url, lines);
            } else if (data.indexOf("#EXTINF")) {
                // VARIANT
                callback(url, lines, 1);
            }
        }
    })
        .fail(function () {
            console.log("error");
        });

}

function getPath(url) {
    var parts = url.split("/");
    var path = "";
    for (var i = 0; i < parts.length - 1; i++) {
        path += parts[i] + "/";
    }
    return path;
}

function playPlaylist(id) {
    console.log("Playing playlist " + id);
    app.currentPlaylist = id;
    preloadSegment(id, true);
}

function setCurrentTime(time) {
    player[0].currentTime = time;
    player[0].play();
}

function getSegmentUrl(id){
    if(!app.playlists[app.currentPlaylist]){
        console.log("Playlist does not exist");
    }
    if(!app.playlists[app.currentPlaylist].segments[id]){
        console.log("Segment does not exist");
    }
    return app.playlists[app.currentPlaylist].segments[id].url;
}

function preloadSegment(id, forceplay) {
    console.log("Preloading Segment " + id);
    var url = getSegmentUrl(id);
    if (app.cache[url]) {
        callback(app.cache[url]);
    }
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'blob';
    req.onload = function () {
        if (this.status === 200) {
            var Blob = this.response;
            var bloburl = URL.createObjectURL(Blob);
            app.cache[url] = bloburl;
            if(player.ended || forceplay){
                console.log("I was forced to play");
                playSegment(id);
            }
        }
    }
    req.onerror = function () {
        // Error
    }
    req.send();
}

function playSegment(id) {
    console.log("Playing Segment " + id);
    app.currentSegment = id;
    var url = getSegmentUrl(id);
    player.src = app.cache[url];
    //player.load();
    player.play();
}

function isLastSegment(){
    if(app.currentSegment <= app.playlists[app.currentPlaylist].segments.length - 1){
        return false;
    }
    return true;
}

player.onended = function() {
    if(!isLastSegment()){
        playSegment(app.currentSegment + 1);
    }
};

player.onplay = function() {
    if(!isLastSegment()){
        preloadSegment(app.currentSegment + 1, false);
    }
};

select_playlist.on('change', function () {
    preloadSegment(id + 1, true);
});

select_segment.on('change', function () {
    setCurrentTime(this.value);
});

button_load.click(function () {
    loadPlaylist(playlist_master.val(), parseMaster);
});



//})
//();

