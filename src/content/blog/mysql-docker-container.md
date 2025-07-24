---
title: Utiliser MySQL dans un conteneur Docker pour vos projets
description: Une configuration de base pour démarrer avec MySQL dans un conteneur Docker
pubDate: 2024-08-06
author: Nyukeit
tags: ["docker", "mysql", "database"]
draft: false
lang: fr
---

Je suis un fervent partisan de la propreté de mon système hôte. Et les conteneurs Docker sont la solution parfaite pour cela. Disons que vous travaillez sur une application React avec un backend Node / Express et un serveur MySQL pour vos besoins de base de données. Typiquement, vous installez `mysql` dans votre système hôte, créez une base de données, créez un utilisateur avec un mot de passe et accordez à l'utilisateur des privilèges pour travailler avec cette base de données.

Au lieu de perdre du temps à configurer cela à chaque fois pour chaque projet, j'utilise simplement une image Docker pour créer mon serveur de base de données MySQL, pour qu'il soit prêt, opérationnel en quelques secondes, avec toute la configuration nécessaire dont j'aurais besoin.

Croyez-moi, une fois que vous aurez compris votre flux de travail en utilisant cette méthode, vous ne reviendrez jamais aux anciennes méthodes. Voici donc comment je procède de manière très simple et basique.

Si vous avez une certaine expérience de Docker et que vous souhaitez sauter ce tutoriel et vous lancer directement dans une version TLDR, voici [Gist](https://gist.github.com/nyukeit/8ecdfbd8c3f05b015b1e8248dcc39a9d) would be much faster.

## De quoi avons-nous besoin ?
Pour utiliser Docker, nous avons besoin de Docker, duh ! Je n'entrerai pas dans les détails de l'installation de Docker ici. Si vous n'êtes pas à l'aise avec un CLI ou si vous êtes sous Windows/MacOS, optez pour Docker Desktop, il fera tout le travail pour vous dans les coulisses.

Les utilisateurs de Linux peuvent installer Docker Engine avec le plugin Docker Compose ou Docker Desktop si vous ne vous sentez pas à l'aise.

Vous n'avez généralement pas besoin d'un compte sur [Docker Hub](https://hub.docker.com) pour télécharger des images publiques comme l'image officielle de MySQL que nous allons utiliser.

## Très bien, et maintenant ?
Il y a deux façons de procéder.

### Utiliser Docker Run (non recommandé)
Pour pouvoir lancer directement le conteneur en utilisant la commande `docker run`, vous devrez d'abord avoir téléchargé l'image MySQL sur votre système. Pour télécharger l'image sur votre système, utilisez simplement cette commande :

```bash
docker pull mysql
```

> [!info] Si vous n'avez pas besoin d'une version particulière de MySQL, cette commande téléchargera la dernière version (celle avec le dernier tag). Vous pouvez explorer plus de tags et de versions à partir du Docker Hub si vous en avez besoin.

Une fois que Docker a terminé le téléchargement, vous pouvez voir votre image téléchargée comme ceci :

```bash
docker image ls
```

Maintenant, pour lancer le conteneur, vous devez ajouter beaucoup de drapeaux avec la commande `docker run`. Vous pouvez visiter ce [lien](https://github.com/docker-library/docs/tree/master/mysql) pour vérifier toutes les options dont vous disposez. Et souvenez-vous de tous les drapeaux que vous devez ajouter, car l'absence de certains drapeaux peut provoquer des erreurs ou lancer un conteneur incapable.

De plus, à chaque fois que vous voudrez lancer votre conteneur, vous devrez soit retrouver cette longue commande dans l'historique du terminal, soit la retaper. Cela n'a aucun intérêt.

C'est la raison pour laquelle je ne recommande PAS cette approche. Il existe une meilleure solution.
### Docker Compose
Nous allons créer un fichier Docker Compose qui indiquera à Docker ce dont nous avons besoin lors du lancement du conteneur. Une fois que tout est mis en place dans le fichier, le lancement du conteneur devient un jeu d'enfant.

> Vous pouvez créer votre fichier compose avec n'importe quel nom. Si vous utilisez votre propre nom ou si vous stockez votre fichier de composition dans d'autres dossiers, vous devrez fournir le drapeau `-f` pour que cela fonctionne. Alternativement, si vous exécutez la commande depuis le même dossier que votre fichier, alors vous pouvez nommer le fichier `docker-compose.yaml`.

Un fichier Docker Compose est un fichier YAML. Le nôtre ressemblera à ceci :

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

Ce fichier est également disponible sur le Gist mentionné au début.

**Important à savoir**
1. Port-Mapping : Le premier port est le port de l'hôte (votre système) qui est mappé au second port (le port à l'intérieur du conteneur docker). Cela signifie que, dans l'exemple ci-dessus, vous pouvez accéder à la base de données à `localhost:3308`. A moins que vous ne soyez très sûr de ce que vous faites, gardez le second port à `3306`. C'est le port par défaut de MySQL.
2. Montage du volume Bind : Nous montons un volume local sur le conteneur pour conserver les données à l'intérieur de la base de données. Cela facilite les sauvegardes et les déplacements en cas de besoin. Vous pouvez également laisser Docker gérer son propre volume et créer des sauvegardes périodiques sur votre système hôte.
#### Le fichier d'environnement
Pour fournir les informations nécessaires à Docker lors de la création du conteneur, nous allons créer un fichier `.env`, tout comme nous le faisons dans nos applications React ou Backend.

Vous pouvez créer ce fichier dans le même dossier que votre fichier de composition, ou vous pouvez le créer n'importe où, mais vous devrez fournir le chemin lors de l'appel à `docker-compose`.

```sh
# Content of the Environment Variables file
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=nameofdatabase
MYSQL_USER=dbusername
MYSQL_PASSWORD=dbuserpassword
```

Une fois que tout cela est en place, il suffit d'utiliser une petite commande pour que notre base de données soit prête à l'emploi.

```bash
docker-compose up -d
```

Vous êtes maintenant prêt à établir une connexion à la base de données en utilisant votre moyen préféré.

Et puisque nous avons configuré nos conteneurs pour fonctionner à partir d'un fichier de composition, vous pouvez le sauvegarder en toute sécurité dans un système git dans votre repo. Assurez-vous simplement que vous `.gitignore` le fichier `.env`.
