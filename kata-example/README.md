# kata-example
A simple example showing how to run Husarnet Client inside a Docker container on [Kata runtime](https://katacontainers.io/).

Tested on host system:
```
  Operating System: Ubuntu 20.04.1 LTS
            Kernel: Linux 5.4.0-62-generic
      Architecture: x86-64
    Docker version: 19.03.8, build afacb8b7f0
```

You can run a container by using `docker run` or `docker-compose` commands and both methods are covered in the sections below. 

----------

## Preparation

```
./prepare-host.sh
```

This script will install Kata containers, add it to available docker runtimes (but it won't make it a default one!) and compile special version of kernel for the Kata VMs so Husarnet Client can run. This special version of kernel will be made default for the Kata runtime on the host.

The script assumes you have Docker already present in the system.

----------

## Using `docker-compose`

### 1. Create `.env` file

And specify Husarnet JoinCode and hostname there. It could look like this:

```
JOINCODE=fc94:b01d:1803:8dd8:3333:2222:1234:1111/xxxxxxxxxxxxxxxxx
HOSTNAME=my-container-1
```
You will find your JoinCode at **https://app.husarnet.com -> choosen network -> `[Add element]` button ->  `join code` tab**


### 2. Build an image and start a container

```bash
sudo docker-compose up
```

----------

## Using `docker run`

### 1. Build an image

Make sure `init-container.sh` is executable. If not:
```bash
sudo chmod +x init-container.sh
```

Then build an image:
```bash
sudo docker build -t kata-example .
```

### 2. Start a container

Execute in a Linux terminal:

```bash
sudo docker run --rm -it \
--env HOSTNAME='my-container-1' \
--env JOINCODE='fc94:b01d:1803:8dd8:3333:2222:1234:1111/xxxxxxxxxxxxxxxxx' \
--volume husarnet-ssh-v:/var/lib/husarnet \
--volume husarnet-ssh-keys:/srv/sshd \
--device /dev/net/tun \
--cap-add NET_ADMIN \
--sysctl net.ipv6.conf.all.disable_ipv6=0 \
--runtime kata-runtime \
kata-example
```

description:
- `HOSTNAME='my-container-1'` - is an easy to use hostname, that you can use instead of Husarnet IPv6 addr to access your container over the internet
- `JOINCODE='fc94:b01d:1803:8dd8:3333:2222:1234:1111/xxxxxxxxxxxxxxxxx'` - is an unique Join Code from your Husarnet network. You will find it at **https://app.husarnet.com -> choosen network -> `[Add element]` button ->  `join code` tab**
- `--volume husarnet-ssh-v:/var/lib/husarnet` - you need to make `/var/lib/husarnet` a volume to preserve it's state. I.e. in case you would like to update the image your container is based on. If you would like to run multiple containers on your host machine remember to provide unique volume name for each container.

----------

## Result

After running a container you should see a log like this:

```bash
docker-example$ sudo docker run --rm -it --env HOSTNAME='my-container-1' --env JOINCODE='fc94:b01d:1803:8dd8:b293:5c7d:7639:1111/xxxxxxxxxxxxxxxxx' -v my-container-1-v:/var/lib/husarnet -v /dev/net/tun:/dev/net/tun --cap-add NET_ADMIN --sysctl net.ipv6.conf.all.disable_ipv6=0 docker-example

⏳ [1/2] Initializing Husarnet Client:
waiting...
waiting...
waiting...
waiting...
success

🔥 [2/2] Connecting to Husarnet network as "my-container-1":
[693849] joining...
[695852] joining...
done

*******************************************
💡 Tip
To SSH your container execute in a new terminal session:

ssh johny@fc94:2106:8423:68d7:695e:f6cf:8130:c059

(default password is "johny" as well)
*******************************************
```

This simple container runs SSH server and you can access it from a level of other devices in the same Husarnet network. You don't even have to install Husarnet Client on your host machine!
