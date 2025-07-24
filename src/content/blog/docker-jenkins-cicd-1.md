---
title: Construire un pipeline CI/CD Docker-Jenkins pour une application Python (Partie 1)
description: Déployer une application Python à l'aide d'un pipeline CI/CD
pubDate: 2022-12-13
author: Nyukeit
image: https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Ffq1afbyaoyfsakpjn8ya.png
tags: ['cicd', 'devops', 'docker']
draft: false
lang: fr
---

## Introduction

Dans cet article, nous allons voir comment déployer une application en utilisant un pipeline CI/CD impliquant git, GitHub, Jenkins, Docker et DockerHub. Le principe de base est que lorsqu'une mise à jour de code est poussée sur git, elle est mise à jour sur GitHub. Jenkins récupère alors cette mise à jour, construit l'image Docker à partir d'un fichier Dockerfile et d'une configuration Jenkinsfile, la pousse vers Docker Hub en tant que registre, puis la récupère et l'exécute en tant que conteneur pour déployer notre application.

## Prérequis

1. Nous utiliserons une application Python pour ce tutoriel. L'exemple d'application sera inclus dans le repo GitHub.
2. Un compte GitHub pour synchroniser notre repo local et se connecter à Jenkins.
3. Compte Docker Hub. Si vous n'en avez pas encore, vous pouvez le créer sur hub.docker.com.

## Installation/mise à jour de Java

Nous allons d'abord vérifier si Java est installé et quelle est sa version.

```bash
java -version
```

![Java Not Installed](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ol667ng36lew3964gy0a.png)

Comme vous pouvez le voir, Java n'est pas installé.

Puisque Jenkins nécessite Java 11, nous allons l'installer en utilisant la documentation officielle de Jenkins.

```bash
sudo apt-get install -y openjdk-11-jre
```

![Java Install](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/i8sjki685pguv2ipp3j7.png)

Une fois l'installation terminée, vous pouvez à nouveau vérifier la version de Java.

```bash
java -version
```

![Java Installed](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cnubx1thgn716cevqo4q.png)

Comme nous pouvons le voir, Java est maintenant installé avec succès avec la version 11.0.17.

Maintenant, installons Git.

## Installation de Git

Git nous aidera à maintenir et à versionner notre code de manière efficace.

Tout d'abord, vérifions si Git est déjà disponible dans notre système ou non.

```bash
git --version
```

![Git Version](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/gh596kpct6ydslyaelh6.png)

Comme nous pouvons le voir, Git était déjà installé sur le système avec la version 2.17.1. Si vous ne l'avez pas encore installé, vous pouvez le faire en utilisant cette commande :

```bash
sudo apt-get install -y git
```

## Configuration de Git (Repo local)

Créons d'abord un dossier pour notre projet. Nous travaillerons dans ce dossier tout au long du tutoriel.

```bash
mkdir pythonapp
```
Nous allons initialiser notre dépôt Git local dans ce dossier.

```bash
cd pythonapp
```
Mais avant d'initialiser notre dépôt local, nous devons apporter quelques modifications à la configuration par défaut de Git.

```bash
git config --global init.defaultBranch main
```
Par défaut, Git utilise 'master' comme branche par défaut. Cependant, GitHub et la plupart des développeurs préfèrent utiliser « main » comme branche par défaut.

Par ailleurs, nous allons également configurer notre nom et notre adresse électronique pour Git.

```bash
git config --global user.name "your_name"
git config --global user.email "your@email.com"
```

Pour vérifier les modifications apportées à la configuration de Git, vous pouvez utiliser cette commande :

```bash
git config --list
```

![Git Configurations](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/lwvzmdgr3v96u5pp1sed.png)

Il est maintenant temps d'initialiser notre dépôt local.

```bash
git init
```

![Initialising Git](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/5wggvxbbg868khybe9im.png)

Cela créera un dépôt vide dans le dossier. Vous pouvez également créer un dépôt sur GitHub puis le cloner sur votre système local.

## Configuration de GitHub (Dépôt distant)

Notre dépôt Git local n'est pas configuré et initialisé. Nous allons maintenant créer un dépôt distant sur GitHub pour le synchroniser avec le dépôt local.

Connectez-vous à votre compte GitHub et cliquez sur votre image de profil. Cliquez sur 'Your Repositories'.

Sur la page qui s'ouvre, cliquez sur le bouton vert 'New'.

Nommons notre dépôt 'pythonapp' pour qu'il soit identique au nom de notre dossier. Ce n'est pas nécessaire mais cela simplifiera les choses.


![Creating GitHub Repository](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bi13m9c1fn8dczjjwpl6.png)

Gardez le dépôt comme 'Public' et cliquez sur 'Créer un dépôt'

## Connexion à GitHub

Pour ce tutoriel, nous utiliserons SSH pour connecter le dépôt local à notre dépôt distant. Veuillez noter que GitHub n'autorise plus les combinaisons nom d'utilisateur/mot de passe pour les connexions. Si vous souhaitez utiliser https à la place, vous pouvez consulter le tutoriel [this](https://www.edgoad.com/2021/02/using-personal-access-tokens-with-git-and-github.html) pour vous connecter en utilisant des jetons d'accès personnels.

Tout d'abord, nous allons créer une clé SSH dans notre système Ubuntu.

```bash
ssh-keygen
```
Appuyez trois fois sur la touche « Entrée » sans rien saisir.

![Generating an SSH Keypair](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/tv5zw2cg1m6axq7f5og0.png)

Cela créera une clé SSH dans votre système. Nous utiliserons cette clé dans notre compte GitHub. Pour accéder à la clé, utilisez la commande suivante

```bash
cat ~/.ssh/id_rsa.pub
```
Copiez la clé entière.

Sur GitHub, allez dans votre dépôt et cliquez sur « Settings ».

Sur la gauche, dans la section 'Security', cliquez sur 'Deploy Keys'.

![GitHub SSH Key Addition](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/o7lgeprfn2afirm6ecwf.png)

Donnez à la clé le nom que vous souhaitez. Collez la clé que vous avez copiée depuis le terminal dans la case « Clé ». Veillez à cocher la case « Autoriser l'accès en écriture ».

Cliquez maintenant sur 'Add Key'. Nous avons maintenant accès au push de notre repo distant en utilisant SSH.

Nous allons maintenant ajouter le remote qui nous permettra d'effectuer des opérations sur le repo distant.

```bash
git remote add origin git@github.com:nyukeit/pythonapp.git
```
Pour vérifier votre télécommande

```bash
git remote
```

![Verifying our Git Remotes](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bqyunotlgo9schttiwzp.png)

Pour vérifier et connecter notre configuration, nous ferons

```bash
ssh -T git@github.com
```
Lorsque l'on vous le demande, tapez 'yes'. Vous devriez voir apparaître un message disant « Vous vous êtes authentifié avec succès, mais GitHub ne fournit pas d'accès shell ».

![GitHub SSH Connection Verifiction](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/7gsweicvz9t0u33gjeq3.png)

## Python App

Créons une application Python qui affichera Hello World ! dans le navigateur lorsqu'elle sera exécutée.

Dans votre terminal, assurez-vous d'être dans le dossier du projet. Créez un dossier nommé 'src' et créez un fichier nommé 'helloworld.py' à l'intérieur de ce dossier comme ceci :

```bash
mkdir src
cd src
```

```bash
sudo nano helloworld.py
```
Maintenant, écrivons un script Python ! Dans l'éditeur nano, tapez ceci :

```python
from flask import Flask, request
from flask_restful import Resource, Api

app = Flask(__name__)
api = Api(app)

class Greeting (Resource):
    def get(self):
        return 'Hello World!'

api.add_resource(Greeting, '/') # Route_1

if __name__ == '__main__':
    app.run('0.0.0.0','3333')
```
Appuyez sur **ctrl + x + y** pour sauvegarder le fichier.

Rendez-vous à la [Partie 2](/blog/docker-jenkins-cicd-2) où nous verrons l'installation et la configuration de Jenkins, Docker et la création des scripts pour terminer notre pipeline.
