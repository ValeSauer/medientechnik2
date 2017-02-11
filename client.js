/**
 * Created by vales on 05.02.2017.
 */
//(function () {

var app = {
    location: "",
    playlists: []
}

var button_load = $("#button_load");
var playlist_master = $("#playlist_master");
var select_playlist = $("#playlists");
var select_segment = $("#segments");
var player = $("#player");


function parse_master(url, lines) {
    // masterplaylist
    console.log("Parsing masterplaylist " + url);

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
            load_playlist(playlist.url, parse_variant);
            playPlaylist(url);
        }
    });
}

function parse_variant(url, lines) {
    // variantplaylist
    console.log("Parsing variantplaylist " + url);
    var currentTime = 0;

    for (var i = 0; i < app.playlists.length; i++) {
        if (app.playlists[i].url == url) {
            var duration = 0.0;
            $.each(lines, function () {
                var line = this.valueOf();
                if (line.indexOf("#EXTINF") != -1) {
                    duration = line.substr(8);
                    if(duration.substr(-1) == ","){
                        duration = duration.substr(0, duration.length -1);
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
                    currentTime += parseFloat(duration);
                }
            });
        }
    }
}

function load_playlist(url, callback) {

    console.log("Fetching playlist: " + url);

    $.get(url, function (data) {

        var lines = data.split("\n");
        if (lines[0].valueOf().indexOf("#EXTM3U") !== 0) {
            alert("A valid playlist file must begin with #EXTM3U");
        } else {
            if (data.indexOf("#EXT-X-STREAM-INF") != -1) {
                // MASTER
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

function playPlaylist(url) {
    player[0].src = url;
    player[0].load();
    player[0].play();
    console.log("Playing " + player[0].currentSrc);
}

function setCurrentTime(time){
    player[0].currentTime = time;
    player[0].play();
}

select_playlist.on('change', function () {
    playPlaylist(this.value);
});

select_segment.on('change', function () {
    setCurrentTime(this.value);
});

button_load.click(function () {
    app.location = playlist_master.val();
    load_playlist(playlist_master.val(), parse_master);
});
//})
//();

