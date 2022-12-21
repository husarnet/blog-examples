#!/bin/bash
function print_instruction() {
    echo "*******************************************"
    echo "💡 Tip"
    echo "To access a live video stream visit:"
    echo "👉 http://${HOSTNAME} 👈"
    echo "in your web browser 💻" 
    echo "*******************************************"
    echo ""
}


if [[ ${JOINCODE} == "" ]]; then
    echo ""
    echo "ERROR: no JOINCODE provided in \"docker run ... \" command. Visit https://app.husarnet.com to get a JOINCODE"
    echo ""
    /bin/bash
    exit
fi

echo ""
echo "🔥 Connecting to Husarnet network as \"${HOSTNAME}\":"
(husarnet-daemon 2>/dev/null &) && husarnet daemon wait joinable && husarnet join ${JOINCODE} ${HOSTNAME}
echo "done"
echo ""

# start a web server
nginx
print_instruction < <(husarnet status)

SUPPORTED=$( python3 check_support.py) 


if [[ ${SUPPORTED} == 'True' ]];
then
echo "H264"
mv -f  /opt/janus/etc/janus/janus.plugin.streaming.h264.jcfg  /opt/janus/etc/janus/janus.plugin.streaming.jcfg 
else
echo "VP8"
mv -f  /opt/janus/etc/janus/janus.plugin.streaming.vp8.jcfg  /opt/janus/etc/janus/janus.plugin.streaming.jcfg 
fi

python3 websocket_server.py &
/opt/janus/bin/janus --nat-1-1=${DOCKER_IP}


/bin/bash
