/**
 * Created by vales on 05.02.2017.
 */
//(function () {

var app = {
    location: "",
    playlists: [],
    currentPlaylist: null,
    currentSegment: null,
    currentPreload: null,
    cache: []
}

var button_load = $("#button_load");
var playlist_master = $("#playlist_master");
var select_playlist = $("#playlists");
var player = $("#player")[0];
var tempvideo = $("#tempvideo")[0];
tempvideo.defaultMuted = true;

ajax_loader = document.createElement("img");
ajax_loader.setAttribute("src", "ajax-loader.gif");
ajax_loader.setAttribute("class", "ajax_loader");

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
            var newPlaylist = app.playlists.length - 1;
            var selected = "";
            if(newPlaylist == 0){
                var selected = " selected ";
            }
            $("#playlists").append("<option value='" + newPlaylist + "'" + selected + ">" + varianturl + " | " + "Bandwidth: " + formatBandwidth(playlist.bandwidth) + "</option>");
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
                    var newsegment = app.playlists[i].segments.length - 1;
                    if (i == 0) {
                        $("#segments").append("<div onclick='preloadSegment(" + newsegment + ", true)' class='segment' data-time='" + currentTime + "' data-url='" + segment.url + "' id='segment_" + newsegment + "'><div class='segment_caption'>" + line + "<br><small>Duration: " + parseFloat(duration) + " s<br>Cached Bandwidth: <span class='bandwidth'></span></small></div></div>");
                    }
                    if (app.currentSegment === null && app.currentPlaylist === null) {
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
                app = {
                    location: "",
                    playlists: [],
                    currentPlaylist: null,
                    currentSegment: null,
                    currentPreload: null,
                    cache: []
                }
                player.src = null;
                select_playlist.html("");
                $('#segments').html("");
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
    app.currentPlaylist = id;
    preloadSegment(id, true);
}

function setCurrentTime(time) {
    player.currentTime = time;
    player.play();
}

function getSegmentUrl(id) {
    if (!app.playlists[app.currentPlaylist]) {
        console.log("Playlist does not exist");
    }
    if (!app.playlists[app.currentPlaylist].segments[id]) {
        console.log("Segment does not exist");
    }
    return app.playlists[app.currentPlaylist].segments[id].url;
}

function preloadSegment(id, forceplay) {
    app.currentPreload = id;
    var url = getSegmentUrl(id);
    if (app.cache[url]) {
        if (player.ended || forceplay) {
            playSegment(id);
        }
        preloadSegment(id + 1, false);
        return true;
    }
    $("#segment_" + id).append(ajax_loader);
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'blob';
    req.onload = function () {
        if (this.status === 200) {
            var Blob = this.response;
            var bloburl = URL.createObjectURL(Blob);
            app.cache[url] = bloburl;
            getPreview(id);
            $("#segment_" + id + " .bandwidth").html(formatBandwidth(app.playlists[app.currentPlaylist].bandwidth));
            if (player.ended || forceplay) {
                playSegment(id);
            }
        } else {
            console.log("Something went wrong");
        }
    }
    req.onerror = function () {
        // Error
    }
    req.send();
}

function getPreview(id) {
    var url = getSegmentUrl(id);
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = 160;
    canvas.height = 90;

    tempvideo.src = app.cache[url];
    tempvideo.load();
    tempvideo.play();

    tempvideo.onplay = function () {
        setTimeout(function () {
            context.fillRect(0, 0, 160, 90);
            context.drawImage(tempvideo, 0, 0, 160, 90);
            $('#segment_' + id).css("background-image", "url('" + canvas.toDataURL() + "'");
            $("#segment_" + id + " > .ajax_loader").remove();
            if (app.currentPreload == id) {
                preloadSegment(id + 1, false);
            }
        }, 1000);
    }
}

function playSegment(id) {
    var url = getSegmentUrl(id);
    if (app.cache[url]) {
        app.currentSegment = id;
        player.src = app.cache[url];
        //player.load();
        player.play();
        $(".redborder").removeClass("redborder");
        $("#segment_" + id).addClass("redborder");
    } else {

        console.log("I would love to play your segment, but it's not downloaded yet");
    }
}

function isLastSegment() {
    if (app.currentSegment <= app.playlists[app.currentPlaylist].segments.length - 1) {
        return false;
    }
    return true;
}

function formatBandwidth(bytes){
    bytes = bytes / 1000000;
    bytes = bytes + " Mbps";
    return bytes;
}

player.onended = function () {
    if (!isLastSegment()) {
        playSegment(app.currentSegment + 1);
    }
};

select_playlist.on('change', function () {
    app.currentPlaylist = this.value;
});


button_load.click(function () {
    loadPlaylist(playlist_master.val(), parseMaster);
});


//})
//();

