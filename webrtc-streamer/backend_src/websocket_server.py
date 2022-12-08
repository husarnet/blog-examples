#!/usr/bin/env python

import asyncio
import websockets
import json
import argparse
import os
import subprocess
import re
import ipaddress

from time import sleep

event = asyncio.Event()
loop = asyncio.get_event_loop()

device = '/dev/video0'


import os
ENV_test = os.environ['TEST']
ENV_audio = os.environ['AUDIO']
ENV_audio_channels = os.environ['CAM_AUDIO_CHANNELS']


def check_if_webcam_outputs_h264_feed():
    result = subprocess.run(['v4l2-ctl', '-d', device, '--list-formats-ext', ],capture_output=True,text=True)
    to_find = "(H.264, compressed)"
    index = result.stdout.find(to_find)
    if index==-1:
        return False
    return True


is_h264_supported = check_if_webcam_outputs_h264_feed()


def check_if_conection_p2p(addr):
    result = subprocess.run(["sudo husarnet status"], capture_output=True, shell=True, text=True)
    addr = ipaddress.ip_address(addr)
    start = result.stdout.find(str(addr.exploded))
    end = result.stdout.find("Peer ", start)
    if start == -1:
        return False
    if end != -1:
        found = result.stdout.find("tunnelled", start,end)
    else:
        found = result.stdout.find("tunnelled",start)
    if found ==-1:
        return True
    return False


def kill_ffmpeg():
    try:
        res =  str(subprocess.check_output(["pidof","ffmpeg"]))
        pids = re.findall(r'\d+', res)
        print("here")
        print(pids)
        for pid in pids:
            print("killed:"+pid)
            subprocess.run(["kill",pid])

    except subprocess.CalledProcessError as e:
        print("Error killing ffmpeg!")

def run_ffmpeg_h264(size, fps):
    subprocess.Popen(['ffmpeg', '-f', 'v4l2', '-framerate', fps, '-video_size', size, '-codec:v', 'h264', '-i', device, '-an', '-c:v', 'copy', '-f', 'rtp', 'rtp://localhost:8005' ])

def run_ffmpeg_vp8(size,fps):
    subprocess.Popen(['ffmpeg', '-f', 'v4l2', '-framerate', fps, '-video_size', size,  '-i', device, '-codec:v', 'libvpx',  '-preset', 'ultrafast',  '-s', size, '-b:v', '1000k', '-f', 'rtp', 'rtp://localhost:8006'])

def run_ffmpeg_vp8_test(size,fps):
    subprocess.Popen(['ffmpeg', '-re', '-f', 'lavfi',  '-i', 'testsrc=size='+size.lstrip()+':rate='+fps.lstrip(), '-c:v', 'libvpx', '-b:v', '1600k', '-preset', 'ultrafast',   '-b', '1000k', '-f', 'rtp', 'rtp://localhost:8006'])

def run_ffmpeg_audio(card_num):
    # more about '-ac' options: https://trac.ffmpeg.org/wiki/AudioChannelManipulation
    # all ffmpeg flags: https://gist.github.com/tayvano/6e2d456a9897f55025e25035478a3a50
    # good article about ALSA: https://trac.ffmpeg.org/wiki/Capture/ALSA 
    subprocess.Popen(['ffmpeg',  '-f', 'alsa', '-ac', ENV_audio_channels, '-i', 'hw:'+card_num, '-acodec', 'libopus', '-ab', '16k',  '-f', 'rtp', 'rtp://localhost:8007'])
    
def get_audiocard_id():
    result = subprocess.run([ 'arecord', '-l'],capture_output=True,text=True)
    string = result.stdout
    string = string[string.find('card')+4:string.find('card')+6]
    return string

audio_card_id = get_audiocard_id()

def find_between_strs( s, first, last ):
    try:
        start = s.rindex( first ) + len( first )
        end = s.rindex( last, start )
        return s[start:end]
    except ValueError:
        if start!=-1: 
            return s[start:]

def get_feed_options_supported():
    result = subprocess.run(['v4l2-ctl', '-d', device, '--list-formats-ext', ],capture_output=True,text=True)
    found = find_between_strs(result.stdout,"(H.264, compressed)","[")
    chunks = found.split("Size: Discrete")
    parsed = {"options":{}}
    for chunk in chunks[1:]:
        size = chunk.split('\n')[0]
        i=0
        parsed["options"][size] = {}
        for line in chunk.split('\n')[1:]:
            res = re.search(r'\((.*?) fps\)',line)
            if res != None:
                parsed["options"][size][i]=res.group(1)
                i+=1
                
    return parsed

def get_feed_options_not_supported():
    result = subprocess.run(['v4l2-ctl', '-d', device, '--list-formats-ext', ],capture_output=True,text=True)
    found = find_between_strs(result.stdout,"(Motion-JPEG, compressed)","[")
    chunks = found.split("Size: Discrete")
    parsed = {"options":{}}
    for chunk in chunks[1:]:
        size = chunk.split('\n')[0]
        i=0
        parsed["options"][size] = {}
        for line in chunk.split('\n')[1:]:
            res = re.search(r'\((.*?) fps\)',line)
            if res != None:
                parsed["options"][size][i]=res.group(1)
                i+=1    

    return parsed

def initial_feed_setup(size,fps):
    if ENV_test=="false":
        if is_h264_supported:
            print("h264_supp")
            run_ffmpeg_h264(size,fps)
        else:
            print("vp8_not_supp")
            run_ffmpeg_vp8(size,fps)
    else:
        print("vp8_test")
        run_ffmpeg_vp8_test(size,fps)
    
    if ENV_audio=='true':
        run_ffmpeg_audio(audio_card_id)


initial_feed_setup("320x240","30.000")    


async def ws_handler(websocket, path):
    while(True):
        data = await websocket.recv()
        data = json.loads(data)
        if 'check_connection' in data.keys():
            addr, port, a, b = websocket.remote_address
            if check_if_conection_p2p(addr):
                await websocket.send(json.dumps({"connection":1,"allow_base":os.environ['ENABLE_BASE_SERVER_FORWARDING']}))
            else:
                await websocket.send(json.dumps({"connection":0,"allow_base":os.environ['ENABLE_BASE_SERVER_FORWARDING']}))
        elif 'get_feed_options' in data.keys():
            if is_h264_supported:
                await websocket.send(json.dumps(get_feed_options_supported()))
            else:
                await websocket.send(json.dumps(get_feed_options_not_supported()))
        elif 'check_compression' in data.keys():
            if is_h264_supported:
                await websocket.send(json.dumps({'env_codec':'h264'}))
            else:
                await websocket.send(json.dumps({'env_codec':'vp8'}))
        elif 'change_feed' in data.keys():
            kill_ffmpeg()
            sleep(2)
            if ENV_audio=='true':
                run_ffmpeg_audio(audio_card_id)
            if ENV_test=="false":
                if is_h264_supported:  
                    run_ffmpeg_h264(data['change_feed']['size'],data['change_feed']['fps'])
                    await websocket.send(json.dumps({'stream_start':1}))
                else:
                    run_ffmpeg_vp8(data['change_feed']['size'],data['change_feed']['fps'])
                    await websocket.send(json.dumps({'stream_start':1}))
            else:
                run_ffmpeg_vp8_test(data['change_feed']['size'],data['change_feed']['fps'])
                await websocket.send(json.dumps({'stream_start':1}))

start_server = websockets.serve(ws_handler, port=8001)

loop.run_until_complete(start_server)
loop.run_forever()