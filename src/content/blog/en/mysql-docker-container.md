---
title: Using MySQL in a Docker Container for your Projects
description: A basic setup to get up and running with MySQL in a Docker Container
pubDate: 2024-08-06
author: Nyukeit
tags: ["docker", "mysql", "database"]
draft: false
lang: en
---

I am a firm believer of keeping my host system clean. And Docker containers are the perfect solution to this. Let's say you are working on a React app with a Node / Express backend and a MySQL server for your DB needs. Typically, you would install `mysql` in your host system, create a database, create a user with a password and grant the user privileges to work with that database.

Instead of wasting time in configuring this every single time for every single project, I just use a Docker image to create my MySQL database server, to be ready, up and running in a few seconds, with all the necessary setup I would ever need.

Trust me, once you figure out your workflow using this route, you will never go back to the old ways. So, here is how I go about it and a very simple, basic manner.

If you have some experience with Docker and wish to skip this tutorial and jump in with a TLDR version directly, this [Gist](https://gist.github.com/nyukeit/8ecdfbd8c3f05b015b1e8248dcc39a9d) would be much faster.

## What will we need?
To use Docker, we need Docker, duh! I will not go into the detail of installing Docker here. If you aren't comfortable with a CLI or your are on Windows/MacOS, go for Docker Desktop, it will do all the heavy lifting for you behind the scenes.

Linux users could install Docker Engine with the Docker Compose plugin or Docker Desktop too if you aren't feeling it.

You typically don't need an account on [Docker Hub](https://hub.docker.com) to download public images like`MySQL` official image that we will be using.

## Alright, what now?
There are two ways of doing this.

### Using Docker Run (Not Recommended)
To be able to directly run the container using the `docker run` command, you will have to have downloaded the MySQL image on your system first. To pull the image to your system, simply use this command:

```bash
docker pull mysql
```

> [!info] If you do not need a particular version of MySQL, then this command will download the latest one (the one with the latest tag). You could explore more tags and versions from the Docker Hub if you need.

Once Docker is done downloading, you can see your downloaded image like this:

```bash
docker image ls
```

Now, to run the container, you have to add a lot of flags with the `docker run` command. You can visit this [link](https://github.com/docker-library/docs/tree/master/mysql) to check all the options you have. And remember all the flags you need to add since missing some might throw errors or start an incapable container.

Besides, every time you wish to run your container, you will either have to fish out this long command from the terminal history, or type it out again. There is no point of that.

This is the reason why I DO NOT recommend this approach. There is a better way.
### Docker Compose
We will create a Docker Compose file which will tell Docker what we need while launching the container. Once everything is laid out in the file, launching the container becomes a piece of cake.

> [!tip] You can create your compose file with any name. If you use your own name or store your compose file in other folders, you will have to provide a flag `-f` to make it work. Alternatively, if you are running the command from the same folder as your file, then you can name the file `docker-compose.yaml`.

A Docker Compose file is a YAML file. Ours will look like this:

```yaml
# This Docker Compose YAML deploys a MySQL database
services:
  container-name:

    image: mysql # Official MySQL image from Docker Hub
    restart: always

    environment:
      # Note - Root password is mandatory for the container to run and grant privileges to our User.
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}

      MYSQL_DATABASE: ${MYSQL_DATABASE} # Same name as used in your project

      # DB User Details
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}

    ports:
      # Adjust this port as per your needs -> <hostPort>:<containerPort>
      - 3308:3306 # DB is available at localhost:3308 on the host.

    volumes:
      - ./volumes/db-mnt:/var/lib/mysql
```

This file is also available on the Gist mentioned in the beginning.

**Important To Know**
1. Port-Mapping: The first port is the host port (your system) which is mapped to the second port (the port inside the docker container). This means, in the above example, you can access the database at `localhost:3308`. Unless, you are very sure of what you are doing, keep the second port as `3306`. This is the default port for MySQL.
2. Volume Bind Mount: We are mounting a local volume to the container to persist the data inside the database. This makes it easy to backup and move around if needed. You could also let Docker manage it's own volume and create periodic backups on your host system.
#### The Environment File
To supply the necessary credentials to Docker while creating the container, we will create a `.env` file, just like how we do in our React or Backend apps.

You can either create this file in the same folder where your compose file is, or you can create it anywhere you like but will need to supply the path while calling `docker-compose`.

```sh
# Content of the Environment Variables file
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=nameofdatabase
MYSQL_USER=dbusername
MYSQL_PASSWORD=dbuserpassword
```

Once we have all this in place, we can simply use one little command and our database will be up and ready waiting for us.

```bash
docker-compose up -d
```

You are now ready to make a connection to the database using your preferred means.

And since we have configured our containers to run from a compose file, you could safely back it up in a git system in your repo. Just make sure you `.gitignore` the `.env` file.
