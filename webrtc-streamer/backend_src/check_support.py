import os
import subprocess

device = '/dev/video0'

def check_if_webcam_outputs_h264_feed():
    result = subprocess.run(['v4l2-ctl', '-d', device, '--list-formats-ext', ],capture_output=True,text=True)
    to_find = "(H.264, compressed)"
    index = result.stdout.find(to_find)
    if index==-1:
        return False
    return True

print(check_if_webcam_outputs_h264_feed())
