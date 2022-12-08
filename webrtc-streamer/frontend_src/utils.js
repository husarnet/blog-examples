var server = null;
if(window.location.protocol === 'http:')
	server = "http://" + window.location.hostname + ":8088/janus";
else
	server = "https://" + window.location.hostname + ":8089/janus";

var janus = null;
var streaming = null;
var opaqueId = "streamingtest-"+Janus.randomString(12);

var bitrateTimer = null;
var spinner = null;

var selectedStream = null;

function  start(streamNum) {
    selectedStream=streamNum;
    console.clear();
    Janus.init({debug: "all", callback: function() {
        if(!Janus.isWebrtcSupported()) {
            bootbox.alert("No WebRTC support... ");
            return;
        }
        janus = new Janus(
            {
                server: server,
                success: function() {
                    // Attach to Streaming plugin
                    janus.attach(
                        {
                            plugin: "janus.plugin.streaming",
                            opaqueId: opaqueId,
                            success: function(pluginHandle) {
                                streaming = pluginHandle;
                                console.log("Plugin attached! (" + streaming.getPlugin() + ", id=" + streaming.getId() + ")");
                                updateStreamsList();
                                startStream();
                            },
                            error: function(error) {
                                console.error("  -- Error attaching plugin... ", error);
                                bootbox.alert("Error attaching plugin... " + error);
                            },
                            iceState: function(state) {
                                console.log("ICE state changed to " + state);
                            },
                            webrtcState: function(on) {
                                console.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
                            },
                            onmessage: function(msg, jsep) {
                                Janus.debug(" ::: Got a message :::", msg);
                                var result = msg["result"];
                                if(result) {
                                    if(result["status"]) {
                                        var status = result["status"];
                                        if(status === 'starting')
                                            $('#status').removeClass('hide').text("Starting, please wait...").show();
                                        else if(status === 'started')
                                            $('#status').removeClass('hide').text("Started").show();
                                        else if(status === 'stopped')
                                            stopStream();
                                    } else if(msg["streaming"] === "event") {
                                        // Is simulcast in place?
                                        var substream = result["substream"];
                                        var temporal = result["temporal"];
                                        if((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
                                            if(!simulcastStarted) {
                                                simulcastStarted = true;
                                                addSimulcastButtons(temporal !== null && temporal !== undefined);
                                            }
                                            // We just received notice that there's been a switch, update the buttons
                                            updateSimulcastButtons(substream, temporal);
                                        }
                                        // Is VP9/SVC in place?
                                        var spatial = result["spatial_layer"];
                                        temporal = result["temporal_layer"];
                                        if((spatial !== null && spatial !== undefined) || (temporal !== null && temporal !== undefined)) {
                                            if(!svcStarted) {
                                                svcStarted = true;
                                                addSvcButtons();
                                            }
                                            // We just received notice that there's been a switch, update the buttons
                                            updateSvcButtons(spatial, temporal);
                                        }
                                    }
                                } else if(msg["error"]) {
                                    bootbox.alert(msg["error"]);
                                    stopStream();
                                    return;
                                }
                                if(jsep) {
                                    Janus.debug("Handling SDP as well...", jsep);
                                    var stereo = (jsep.sdp.indexOf("stereo=1") !== -1);
                                    // Offer from the plugin, let's answer
                                    streaming.createAnswer(
                                        {
                                            jsep: jsep,
                                            // We want recvonly audio/video and, if negotiated, datachannels
                                            media: { audioSend: false, videoSend: false, data: true },
                                            customizeSdp: function(jsep) {
                                                if(stereo && jsep.sdp.indexOf("stereo=1") == -1) {
                                                    // Make sure that our offer contains stereo too
                                                    jsep.sdp = jsep.sdp.replace("useinbandfec=1", "useinbandfec=1;stereo=1");
                                                }
                                            },
                                            success: function(jsep) {
                                                Janus.debug("Got SDP!", jsep);
                                                var body = { request: "start" };
                                                streaming.send({ message: body, jsep: jsep });
                                                $('#watch').html("<i class=\"fas fa-video\"></i>").removeAttr('disabled').click(stopStream);
                                            },
                                            error: function(error) {
                                                Janus.error("WebRTC error:", error);
                                                bootbox.alert("WebRTC error... " + error.message);
                                            }
                                        });
                                }
                            },
                            onremotestream: function(stream) {
                                Janus.debug(" ::: Got a remote stream :::", stream);
                                var addButtons = false;
                                if($('#remotevideo').length === 0) {
                                    addButtons = true;
                                    $('#stream').append('<video class="rounded centered hide" id="remotevideo" width="100%" height="100%" playsinline/>');
                                    $('#remotevideo').get(0).volume = 0;
                                    // Show the stream and hide the spinner when we get a playing event
                                    $("#remotevideo").bind("playing", function () {
                                        $('#waitingvideo').remove();
                                        if(this.videoWidth)
                                            $('#remotevideo').removeClass('hide').show();
                                        if(spinner)
                                            spinner.stop();
                                        spinner = null;
                                        var videoTracks = stream.getVideoTracks();
                                        if(!videoTracks || videoTracks.length === 0)
                                            return;
                                        var width = this.videoWidth;
                                        var height = this.videoHeight;
                                        $('#curres').removeClass('hide').text(width+'x'+height).show();
                                        if(Janus.webRTCAdapter.browserDetails.browser === "firefox") {
                                            // Firefox Stable has a bug: width and height are not immediately available after a playing
                                            setTimeout(function() {
                                                var width = $("#remotevideo").get(0).videoWidth;
                                                var height = $("#remotevideo").get(0).videoHeight;
                                                $('#curres').removeClass('hide').text(width+'x'+height).show();
                                            }, 2000);
                                        }
                                    });
                                }
                                Janus.attachMediaStream($('#remotevideo').get(0), stream);
                                $("#remotevideo").get(0).volume = 0;
                                $("#remotevideo").get(0).play();
                                var videoTracks = stream.getVideoTracks();
                                if(!videoTracks || videoTracks.length === 0) {
                                    // No remote video
                                    $('#remotevideo').hide();
                                    if($('#stream .no-video-container').length === 0) {
                                        $('#stream').append(
                                            '<div class="no-video-container">' +
                                                '<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
                                                '<span class="no-video-text">No remote video available</span>' +
                                            '</div>');
                                    }
                                } else {
                                    $('#stream .no-video-container').remove();
                                    $('#remotevideo').removeClass('hide').show();
                                }
                                if(!addButtons)
                                    return;
                                if(videoTracks && videoTracks.length &&
                                        (Janus.webRTCAdapter.browserDetails.browser === "chrome" ||
                                            Janus.webRTCAdapter.browserDetails.browser === "firefox" ||
                                            Janus.webRTCAdapter.browserDetails.browser === "safari")) {
                                    $('#curbitrate').removeClass('hide').show();
                                    bitrateTimer = setInterval(function() {
                                        // Display updated bitrate, if supported
                                        var bitrate = streaming.getBitrate();
                                        $('#curbitrate').text(bitrate);
                                        // Check if the resolution changed too
                                        var width = $("#remotevideo").get(0).videoWidth;
                                        var height = $("#remotevideo").get(0).videoHeight;
                                        if(width > 0 && height > 0)
                                            $('#curres').removeClass('hide').text(width+'x'+height).show();
                                    }, 1000);
                                }

                                //TODO: added temporary
                                document.getElementById("remotevideo").mute=true;
                                document.getElementById("remotevideo").volume=0.0;
                            },
                            ondataopen: function(data) {
                                Janus.log("The DataChannel is available!");
                                $('#waitingvideo').remove();
                                $('#stream').append(
                                    '<input class="form-control" type="text" id="datarecv" disabled></input>'
                                );
                                if(spinner)
                                    spinner.stop();
                                spinner = null;
                            },
                            ondata: function(data) {
                                Janus.debug("We got data from the DataChannel!", data);
                                $('#datarecv').val(data);
                            },
                            oncleanup: function() {
                                Janus.log(" ::: Got a cleanup notification :::");
                                $('#waitingvideo').remove();
                                $('#remotevideo').remove();
                                $('#datarecv').remove();
                                $('.no-video-container').remove();
                                $('#bitrate').attr('disabled', true);
                                $('#bitrateset').html('Bandwidth<span class="caret"></span>');
                                $('#curbitrate').hide();
                                if(bitrateTimer)
                                    clearInterval(bitrateTimer);
                                bitrateTimer = null;
                                $('#curres').hide();
                                $('#simulcast').remove();
                                $('#metadata').empty();
                                $('#info').addClass('hide').hide();
                                simulcastStarted = false;
                            }
                        });
                },
                error: function(error) {
                    Janus.error(error);
                    bootbox.alert(error, function() {
                        window.location.reload();
                    });
                },
                destroyed: function() {
                    window.location.reload();
                }
            });

    }});
}

function updateStreamsList() {
	var body = { request: "list" };
	Janus.debug("Sending message:", body);
	streaming.send({ message: body, success: function(result) {
		setTimeout(function() {
			$('#update-streams').removeClass('fa-spin').click(updateStreamsList);
		}, 500);
		if(!result) {
			bootbox.alert("Got no response to our query for available streams");
			return;
		}
		if(result["list"]) {
			$('#streams').removeClass('hide').show();
			$('#streamslist').empty();
			$('#watch').attr('disabled', true).unbind('click');
			var list = result["list"];
			Janus.log("Got a list of available streams");
			if(list && Array.isArray(list)) {
				list.sort(function(a, b) {
					if(!a || a.id < (b ? b.id : 0))
						return -1;
					if(!b || b.id < (a ? a.id : 0))
						return 1;
					return 0;
				});
			}
			Janus.debug(list);
			for(var mp in list) {
				Janus.debug("  >> [" + list[mp]["id"] + "] " + list[mp]["description"] + " (" + list[mp]["type"] + ")");
				$('#streamslist').append("<li><a href='#' id='" + list[mp]["id"] + "'>" + list[mp]["description"] + " (" + list[mp]["type"] + ")" + "</a></li>");
			}
			$('#streamslist a').unbind('click').click(function() {
				selectedStream = $(this).attr("id");
				$('#streamset').html($(this).html()).parent().removeClass('open');
				return false;

			});
		}
	}});
}

function getStreamInfo() {
	$('#metadata').empty();
	$('#info').addClass('hide').hide();
	if(!selectedStream)
		return;
	// Send a request for more info on the mountpoint we subscribed to
	var body = { request: "info", id: parseInt(selectedStream) || selectedStream };
	streaming.send({ message: body, success: function(result) {
		if(result && result.info && result.info.metadata) {
			$('#metadata').html(result.info.metadata);
			$('#info').removeClass('hide').show();
		}
	}});
}

function startStream() {
    // if(Janus.webRTCAdapter.browserDetails.browser === "chrome"){
    //     selectedStream = 11;
    // }
	Janus.log("Selected video id #" + selectedStream);
	if(!selectedStream) {
		bootbox.alert("Select a stream from the list");
		return;
	}
	$('#streamset').attr('disabled', true);
	$('#streamslist').attr('disabled', true);
	$('#watch').attr('disabled', true).unbind('click');
	var body = { request: "watch", id: parseInt(selectedStream) || selectedStream};
	streaming.send({ message: body });
	// No remote video yet
	$('#stream').append('<video class="rounded centered" id="waitingvideo" width="100%" height="100%" />');
	if(spinner == null) {
		var target = document.getElementById('stream');
        // var target = document.getElementById('main-card');
		// spinner = new Spinner({top:100}).spin(target);
        spinner = new Spinner().spin(target);
	} else {
		spinner.spin();
	}
	// Get some more info for the mountpoint to display, if any
	getStreamInfo();
}

function stopStream() {
	$('#watch').attr('disabled', true).unbind('click');
	var body = { request: "stop" };
	streaming.send({ message: body });
	streaming.hangup();
	$('#streamset').removeAttr('disabled');
	$('#streamslist').removeAttr('disabled');
	$('#watch').html("<i class=\"fas fa-video-slash\"></i>").removeAttr('disabled').unbind('click').click(startStream);
	$('#status').empty().hide();
	$('#bitrate').attr('disabled', true);
	$('#bitrateset').html('Bandwidth<span class="caret"></span>');
	$('#curbitrate').hide();
	if(bitrateTimer)
		clearInterval(bitrateTimer);
	bitrateTimer = null;
	$('#curres').empty().hide();
	$('#simulcast').remove();
	simulcastStarted = false;
}
