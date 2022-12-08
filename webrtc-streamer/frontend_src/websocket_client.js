var ws;

feed_options={};

selected_size = '320x240';
selected_fps = '30.000';
protocol = null;


window.addEventListener('beforeunload', (event) => {
    ws.close();
    // Cancel the event as stated by the standard.
    event.preventDefault();
    // Older browsers supported custom message
    event.returnValue = '';
});



function setUpListeners(){
    $('#audio_btn').click(function(evt){     
        console.log("audio click");
        if(document.getElementById("remotevideo").mute==true) {                               
            document.getElementById("remotevideo").mute=false;
            document.getElementById("remotevideo").volume=1.0;
            document.getElementById("audio_btn").innerHTML = "<i class=\"fas fa-volume-up\"></i>";
            console.log("unmute");
        } else {
            document.getElementById("remotevideo").mute=true;
            document.getElementById("remotevideo").volume=0.0;
            document.getElementById("audio_btn").innerHTML = "<i class=\"fas fa-volume-mute\"></i>";
            console.log("mute");
        }
    })

    var $select_s = $('#size_select');
    $select_s.val(selected_size);
    var $select = $('#fps_select');
    fps = feed_options["options"][" "+selected_size];
    $select.find('option').remove();
    for(var fp in fps){
        $select.append('<option value=' + fps[fp] + '>' + fps[fp]+ '</option>');
    }
    $select.val(selected_fps);

    $('#size_select').change(function(evt) {
        var $select = $('#fps_select');
        fps = feed_options["options"][" "+evt.target.value];
        $select.find('option').remove();
        selected_size = evt.target.value;
        selected_fps = null;
        for(var fp in fps){
            $select.append('<option value=' + fps[fp] + '>' + fps[fp]+ '</option>');
        }
        selected_fps=fps[0];
    });
    $('#fps_select').change(function(evt){
        selected_fps = evt.target.value;
    });
    $('#submit_btn').click(function(evt){
        evt.preventDefault();
        if(selected_size==null||selected_fps==null){
            alert("You need to chose desired size and fps to change stream parameters!");
        }else{
            stopStream();
            ws.send(`{"change_feed":{"size": \"${selected_size}\"  ,  "fps": \"${selected_fps}\" , "protocol" : \"${protocol}\" }}`);
        }
    })
}


function WebSocketBegin() {
    if ("WebSocket" in window) {

        // Let us open a web socket
        ws = new WebSocket(
            location.hostname.match(/\.husarnetusers\.com$/) ? "wss://" + location.hostname + "/__port_8001/" : "ws://" + location.hostname + ":8001"
        );

        ws.onopen = function () {
            // Web Socket is connected
            console.log("Websocket connected!");

            // check whether ENV CODEC=H264 or ENV CODEC=VP8 - there is no way to directly access ENV in .js file
            ws.send('{"check_compression": 1}');

            // check if connection is p2p or tunnelled
            ws.send('{"check_connection": 1}');
            setInterval(function(){
                ws.send('{"check_connection": 1}');
            },2000)
        };

        ws.onmessage = function (evt) {
            //create a JSON object
            var jsonObject = JSON.parse(evt.data);
            console.log(jsonObject);
            if(jsonObject.hasOwnProperty("connection")){
                $('#p2p_connection').find('span').remove();
                $('#p2p_connection').find('br').remove();
                if(jsonObject['connection']==0){
                    if(jsonObject['allow_base']==0){
                        stopStream();
                    }
                    $('#p2p_connection').append('<span>😬 <b>No Peer-to-Peer connection</b></span>');
                    $('#p2p_connection').append('<br>')
                    $('#p2p_connection').append('<span>👉 Visit <a href="https://husarnet.com/docs/tutorial-troubleshooting" style="position: relative; z-index: 20px;"a>a troubleshooting guide</a> to solve the issues.</span>');
                    $('#p2p_connection').append('<br>')
                    $('#p2p_connection').append('<span>👉 Most common reason: you are behind Carrier-Grade NAT (CGN or CGNAT) or other kind of "double NAT".</span>');
                    $('#p2p_connection').append('<br>')
                    $('#p2p_connection').append('<span>👉 Web server is available thanks to failover proxy connection over Husarnet Base Server. Only WebRTC stream is turned off. </span>')
                }else{
                    $('#p2p_connection').append('<span>🚀 <b>Peer-to-peer connection established</b></span>')
                }
                $('#p2p_connection').removeClass('invisible');
            }else if(jsonObject.hasOwnProperty("env_codec")){
                // get available camera resolutions and FPS options
                ws.send('{"get_feed_options": 1}');

                if(jsonObject['env_codec']=='h264'){
                    // from utils.js
                    selected_stream=10;
                    protocol = "H264";
                    start(selected_stream);
                }else {
                    // from utils.js
                    selected_stream=11;
                    protocol = "VP8";
                    start(selected_stream);
                }
            }else if(jsonObject.hasOwnProperty("options")){
                var $select = $('#size_select')
                feed_options = jsonObject;
                sizes = Object.keys(jsonObject["options"])
                $select.find('option').remove();
                for (var i=0;i<sizes.length;i++) {
                    $select.append('<option value=' + sizes[i] + '>' + sizes[i]+ '</option>');
                }
                setUpListeners();
            }else if(jsonObject.hasOwnProperty("error")){
                alert(jsonObject["error"])
            }else if(jsonObject.hasOwnProperty("stream_start")){
                 start(selected_stream);
            }
        };

        ws.onclose = function (evt) {
            if (evt.wasClean) {
                console.log(`[close] Connection closed cleanly, code=${evt.code} reason=${evt.reason}`);
            } else {
                // e.g. server process killed or network down
                // event.code is usually 1006 in this case
                console.log('[close] Connection died');
            }
        };

        ws.onerror = function (error) {
            alert(`[error] ${error.message}`);
        }

    } else {
        // The browser doesn't support WebSocket
        alert("WebSocket NOT supported by your Browser!");
    }
}