# Native HLS Video Client

A very simple HLS Client in ES5 that uses the HTML5 video tag. It is able to process remote m3u8 masterplaylists to offer streams in different qualities. As the video tag can handle m3u8 playlists in modern browsers natively it is just an experiment.
Demo: http://files.sauer-medientechnik.de/medientechnik2/ 

## Installation
1. `git clone https://github.com/ValeSauer/medientechnik2.git`
2. Open `index.html` in your browser

## Open Issues
* It can only handle mp4-files yet. It can not handle .ts-files yet.
* Switching video sources (segments) takes some time, so there are ugly lags between the segments.

