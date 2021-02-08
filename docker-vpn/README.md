# docker-vpn
A simple example showing how to install and configure VPN client directly inside a docker container instead of host system.

Tested on host system:
```
  Operating System: Ubuntu 20.04.1 LTS
            Kernel: Linux 5.4.0-62-generic
      Architecture: x86-64
    Docker version: 19.03.8, build afacb8b7f0
```

## Build an image

Make sure `init-container.sh` is executable. If not:
```bash
sudo chmod +x init-container.sh
```

Then build an image:
```bash
sudo docker build -t docker-vpn .
```

## Start a container

Execute in a Linux terminal:

```bash
sudo docker run --rm -it \
--env HOSTNAME='docker-vpn-1' \
--env JOINCODE='fc94:b01d:1803:8dd8:3333:2222:1234:1111/xxxxxxxxxxxxxxxxx' \
-v docker-vpn-v:/var/lib/husarnet \
-v /dev/net/tun:/dev/net/tun \
--cap-add NET_ADMIN \
--sysctl net.ipv6.conf.all.disable_ipv6=0 \
docker-vpn
```

description:
- `HOSTNAME='docker-vpn-1'` - is an easy to use hostname, that you can use instead of Husarnet IPv6 addr to access your container over the internet
- `JOINCODE='fc94:b01d:1803:8dd8:3333:2222:1234:1111/xxxxxxxxxxxxxxxxx'` - is an unique Join Code from your Husarnet network. You will find it at **https://app.husarnet.com -> choosen network -> `[Add element]` button ->  `join code` tab**
- `-v my-container-1-v:/var/lib/husarnet` - you need to make `/var/lib/husarnet` as a volume to preserve it's state for example if you would like to update the image your container is based on. If you would like to run multiple containers on your host machine remember to provide unique volume name for each container (in our case `HOSTNAME-v`).

If you also want to modify `index.html` file in your IDE, and see changes in your container, create a bind mount by adding also this flag in the `docker run command`: ```bash
-v "/home/blog-examples/docker-vpn/src:/var/www/html/:ro" \
```
remember to provide a full path to your `src` folder! 


## Result

After running a container you should see a log like this:

```bash
blog-examples/docker-vpn$ sudo docker run --rm -it \
> --env HOSTNAME='docker-vpn-1' \
> --env JOINCODE='fc94:b01d:1803:8dd8:b293:5c7d:7639:932a/xxxxxxxxxxxxxxxxxxxxxx' \
> -v docker-vpn-v:/var/lib/husarnet \
> -v "/home/blog-examples/docker-vpn/src:/var/www/html/:ro" \
> -v /dev/net/tun:/dev/net/tun \
> --cap-add NET_ADMIN \
> --sysctl net.ipv6.conf.all.disable_ipv6=0 \
> docker-vpn
sysctl: setting key "net.ipv6.conf.lo.disable_ipv6": Read-only file system

⏳ [1/2] Initializing Husarnet Client:
waiting...
waiting...
waiting...
waiting...
success

🔥 [2/2] Connecting to Husarnet network as "docker-vpn-1":
[101617015] joining...
[101619016] joining...
done

*******************************************
💡 Tip
To access a webserver visit:
👉 http://[fc94:5e70:7ab8:5880:79d6:119d:c65e:fd3f]:80 👈
in your web browser 💻
*******************************************

root@3fb1b9a13cba:/# 
```

