import subprocess
import os
import signal
from time import sleep
import re

def kill_ffmpeg():
    pid = int(subprocess.check_output(["pidof","ffmpeg"]))
    subprocess.run(["kill",str(pid)])

def run_ffmpeg(size, fps):
    subprocess.Popen(['ffmpeg', '-f', 'v4l2', '-framerate', fps, '-video_size', size, '-codec:v', 'h264', '-i', '/dev/video2', '-an', '-c:v', 'copy', '-f', 'rtp', 'rtp://localhost:8005' ])


def find_between_strs( s, first, last ):
    try:
        start = s.rindex( first ) + len( first )
        end = s.rindex( last, start )
        return s[start:end]
    except ValueError:
        return ""

def get_feed_options():
    result = subprocess.run(['v4l2-ctl', '-d', '2', '--list-formats-ext', ],capture_output=True,text=True)
    found = find_between_strs(result.stdout,"(H.264, compressed)","[2]")
    chunks = found.split("Size: Discrete")
    parsed = {}
    for chunk in chunks[1:]:
        size = chunk.split('\n')[0]
        i=0
        parsed[size] = {}
        for line in chunk.split('\n')[1:]:
            res = re.search(r'\((.*?) fps\)',line)
            if res != None:
                parsed[size][i]=res.group(1)
                i+=1
        

    return parsed

def find_between_strs( s, first, last ):
    try:
        start = s.rindex( first ) + len( first )
        end = s.rindex( last, start )
        return s[start:end]
    except ValueError:
        if start!=-1 and end==-1:
            return s[start:]

def get_feed_options():
    result = subprocess.run(['cat', 'testing.txt'],capture_output=True,text=True)
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

addr = 'fc94:eaa2:5adf:91d4:d0ec:b14f:3968:f519'

def check_if_conection_p2p(addr):
    result = subprocess.run("sudo husarnet status", capture_output=True, shell=True, text=True)
    start = result.stdout.find("Peer "+addr)
    end = result.stdout.find("Peer ", start)
    if start == -1:
        return False
    if end != -1:
        found = result.stdout.find("tunnelled", start,end)
    else:
        found = result.stdout.find("tunnelled",start)
    if found == -1:
        return True
    return False    

device = '/dev/video0'

def check_if_webcam_outputs_h264_feed():
    result = subprocess.run(['v4l2-ctl', '-d', device, '--list-formats-ext', ],capture_output=True,text=True)
    to_find = "(H.264, compressed)"
    index = result.stdout.find(to_find)
    if index==-1:
        return False
    return True




def run_ffmpeg_h264_not_supported(size, fps):
    subprocess.Popen(['ffmpeg','-f', 'v4l2',   '-framerate', fps, '-video_size', size, '-i', device, '-an', '-c:v', 'libx264',  '-preset', 'ultrafast', '-tune', 'zerolatency', '-s', size, '-b:v', '1000k', '-f', 'rtp', 'rtp://localhost:8005' ])

def run_ffmpeg_vp8_not_supported(size,fps):
    subprocess.Popen(['ffmpeg', '-f', 'v4l2',  '-framerate', fps, '-video_size', size, '-i', device, '-codec:v', 'libvpx',  '-preset', 'ultrafast',  '-s', size, '-b:v', '1000k', '-f', 'rtp', 'rtp://localhost:8006'])


def run_ffmpeg_h264_test(size, fps):
    subprocess.Popen(['ffmpeg', '-re', '-f', 'lavfi',  '-i', 'testsrc=size='+size.lstrip()+':rate='+fps.lstrip(), '-c:v', 'libx264', '-b:v', '1600k', '-preset', 'ultrafast',  '-tune', 'zerolatency',   '-b', '1000k', '-f', 'rtp', 'rtp://localhost:8005'])

def run_ffmpeg_vp8_test(size,fps):
    subprocess.Popen(['ffmpeg', '-re', '-f', 'lavfi',  '-i', 'testsrc=size='+size.lstrip()+':rate='+fps.lstrip(), '-c:v', 'libvpx', '-b:v', '1600k', '-preset', 'ultrafast',   '-b', '1000k', '-f', 'rtp', 'rtp://localhost:8006'])

def run_ffmpeg_audio(card_num):
    subprocess.Popen(['ffmpeg',  '-f', 'alsa', '-i', 'hw:'+card_num, '-acodec', 'libopus', '-ab', '16k',  '-f', 'rtp', 'rtp://localhost:8007'])

def get_audiocard_id():
    result = subprocess.run([ 'arecord', '-l'],capture_output=True,text=True)
    string = result.stdout
    string = string[string.find('card')+4:string.find('card')+6]
    return string

#kill_ffmpeg()
#run_ffmpeg_h264_not_supported(' 320x240',' 30.000')
run_ffmpeg_audio(get_audiocard_id())
