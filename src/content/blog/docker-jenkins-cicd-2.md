---
title: Construire un pipeline CI/CD Docker-Jenkins pour une application Python (Partie 2)
description: Déployer une application Python à l'aide d'un pipeline CI/CD
pubDate: 2022-12-13
author: Nyukeit
image: https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Ffq1afbyaoyfsakpjn8ya.png
tags: ['docker', 'devops']
draft: false
lang: fr
---

> [!note] Ceci est la suite du tutoriel pour construire un pipeline Docker Jenkins pour déployer une application Python simple en utilisant Git et GitHub. La première partie du tutoriel se trouve [ici](/blog/docker-jenkins-cicd-1).

## Installation de Jenkins

Nous avons maintenant les bases pour déployer notre application. Installons les logiciels restants pour compléter notre pipeline.

Nous commençons par importer la clé GPG qui vérifiera l'intégrité du paquet.

```bash
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null
```
Ensuite, nous ajoutons le dépôt Jenkins softwarey à la liste des sources et fournissons la clé d'authentification.

```bash
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
```

```bash
sudo apt update
```

![Jenkins Key and Source](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/qzjzig2xt2wyggha61nc.png)

Maintenant, nous installons Jenkins

```bash
sudo apt-get install -y jenkins
```
Attendez que le processus d'installation soit terminé et que vous repreniez le contrôle du terminal.

![Installing Jenkins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hr00dwb0dc30gqrjazdo.png)

Pour vérifier que Jenkins a été installé correctement, nous allons vérifier si le service Jenkins est en cours d'exécution.

```bash
sudo systemctl status jenkins.service
```

![Verifying Jenkins Installation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/8agoj9tenlsyyhputiwp.png)

Appuyez sur **Q** pour reprendre le contrôle.

## Configuration de Jenkins

Nous avons vérifié que le service Jenkins est maintenant en cours d'exécution. Cela signifie que nous pouvons aller de l'avant et le configurer à l'aide de notre navigateur.

Ouvrez votre navigateur et tapez ceci dans la barre d'adresse :

```bash
localhost:8080
```
La page Débloquer Jenkins devrait s'afficher.

![Unlocking Jenkins for First Use](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/xr31blr90a8rg1lmlpjk.png)

Jenkins a généré un mot de passe par défaut lors de son installation. Pour localiser ce mot de passe, nous allons utiliser la commande :

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

![Jenkins first unlock password](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/30rie9q95b5pealtszgr.png)

Copiez ce mot de passe et collez-le dans la case de la page d'accueil.

Sur la page suivante, sélectionnez « Installer les plugins suggérés ».

![Jenkins Suggested Plugins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/776iko4eo3x5hpl4xx2q.png)

Vous devriez voir Jenkins installer les plugins.

![Jenkins Plugins Installation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/tyzdrwm37shogfuyaug5.png)

Une fois l'installation terminée, cliquez sur Continuer.

Sur la page Create Admin User (Créer un utilisateur administrateur), cliquez sur Skip and Continue as Admin (Ignorer et continuer en tant qu'administrateur). Vous pouvez également créer un utilisateur Admin distinct, mais veillez à l'ajouter au groupe Docker.

Cliquez sur « Save and Continue

Sur la page **Instance Configuration**, Jenkins indiquera l'URL à laquelle il est possible d'accéder. Laissez-la et cliquez sur « Save and Finish ».

Cliquez sur « Start Using Jenkins ». Vous arriverez sur une page de bienvenue comme celle-ci :

![Jenkins Landing Page](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/00lzd66vt8mb5adq9bfx.png)

Nous avons maintenant configuré Jenkins avec succès. Revenons au terminal pour installer Docker.

## Installation de Docker

Tout d'abord, nous devons désinstaller tous les éléments Docker précédents, s'il y en a.

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```
Il est probable que rien ne sera supprimé puisque nous travaillons avec une nouvelle installation d'Ubuntu.

Nous utiliserons la ligne de commande pour installer Docker.

```bash
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

![Docker Pre-requisites](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/doj5urwkt6c5izfigv47.png)

Ensuite, nous allons ajouter la clé GPG de Docker, comme nous l'avons fait avec Jenkins.

```bash
sudo mkdir -p /etc/apt/keyrings
```
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```
Nous allons maintenant configurer le repository.

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```
Ensuite, nous allons installer le Docker Engine.

```bash
sudo apt-get update
```

```bash
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

![Docker Installation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/yjiuh0d4n2ulnh2tnea8.png)

Vérifiez maintenant l'installation en tapant

```bash
docker version
```

![Docker version](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mqrqygtvd69gq7vsmmwk.png)

Notez que vous obtiendrez une erreur de permission refusée lors de la connexion au daemon socket de Docker. C'est parce qu'il nécessite un utilisateur root. Cela signifie que vous devrez préfixer sudo à chaque fois que vous voudrez exécuter des commandes Docker. Ce n'est pas idéal. Nous pouvons y remédier en créant un groupe Docker.

```bash
sudo groupadd docker
```
Le groupe `docker` peut déjà exister. Ajoutons maintenant l'utilisateur à ce groupe.

```bash
sudo usermod -aG docker $USER
```
Appliquez les modifications aux groupes Unix en tapant ce qui suit :

```bash
newgrp docker
```
> [!warning] Si vous suivez ce tutoriel sur une VM, il se peut que vous deviez redémarrer votre instance pour que les changements prennent effet.

Vérifions que nous pouvons maintenant nous connecter au moteur Docker.

```bash
docker version
```

![Docker Engine Version](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/8wgyv4q0upawpblc7awv.png)

Comme nous pouvons le voir, Docker est maintenant pleinement fonctionnel avec une connexion au moteur Docker.

Nous allons maintenant créer le fichier Docker qui construira l'image Docker.

## Création du fichier Docker

Dans votre terminal, dans votre dossier, créez le Dockerfile en utilisant l'éditeur nano.

```bash
sudo nano Dockerfile
```
Tapez ce texte dans l'éditeur :

```bash
FROM python:3.8
WORKDIR /src
COPY . /src
RUN pip install flask
RUN pip install flask_restful
EXPOSE 3333
ENTRYPOINT ["python"]
CMD ["./src/helloworld.py"]
```

## Construire l'image Docker

A partir du fichier Docker, nous allons maintenant construire une image Docker.

```bash
docker build -t helloworldpython .
```

![Building the Docker Image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4f7520scdh9tmypvnscg.png)

Créons maintenant un conteneur de test et lançons-le dans un navigateur pour vérifier que notre application s'affiche correctement.

```bash
docker run -p 3333:3333 helloworldpython
```

Ouvrez votre navigateur et allez sur ``localhost:3333`` pour voir notre application python en action.

![Python Webapp Running](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/z7kys0xb3jft1nt15wa9.png)

Voyons maintenant comment automatiser cette impression à chaque fois que nous apportons une modification à notre code python.

## Création du fichier Jenkins

Nous allons créer un fichier Jenkins qui élaborera un processus étape par étape de construction de l'image à partir du fichier Docker, en la poussant vers le registre, en la récupérant du registre et en l'exécutant en tant que conteneur.

Chaque modification apportée au dépôt GitHub déclenchera cette chaîne d'événements.

```bash
sudo nano Jenkinsfile
```
Dans l'éditeur nano, nous utiliserons le code suivant comme fichier Jenkins.

```bash
node {
	def application = "pythonapp"
	def dockerhubaccountid = "nyukeit"
	stage('Clone repository') {
		checkout scm
	}

	stage('Build image') {
		app = docker.build("${dockerhubaccountid}/${application}:${BUILD_NUMBER}")
	}

	stage('Push image') {
		withDockerRegistry([ credentialsId: "dockerHub", url: "" ]) {
		app.push()
		app.push("latest")
	}
	}

	stage('Deploy') {
		sh ("docker run -d -p 3333:3333 ${dockerhubaccountid}/${application}:${BUILD_NUMBER}")
	}

	stage('Remove old images') {
		// remove old docker images
		sh("docker rmi ${dockerhubaccountid}/${application}:latest -f")
   }
}
```

## Explication du fichier Jenkins

Notre pipeline Jenkins est divisé en 5 étapes comme vous pouvez le voir dans le code.

- Etape 1 - Clone notre repo Github
- Etape 2 - Construit notre image Docker à partir du fichier Docker
- Etape 3 - Pousse l'image vers Docker Hub
- Étape 4 - Déploie l'image en tant que conteneur en l'extrayant de Docker Hub
- Étape 5 - Supprime l'ancienne image pour mettre fin à l'empilement d'images.

Maintenant que notre fichier Jenkins est prêt, poussons tout notre code source sur GitHub.

## Pousser des fichiers sur GitHub

Tout d'abord, vérifions le statut de notre repo local.

```bash
git status
```

![Git not tracking files](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/alrbtwkbapk4xxq6f0kh.png)

Comme nous pouvons le voir, il n'y a pas encore de commits et il y a des fichiers et des dossiers non suivis. Demandons à Git de les suivre afin que nous puissions les pousser vers notre dépôt distant.

```bash
git add *
```
Cela ajoutera tous les fichiers présents dans le scope git.

Git suit maintenant nos fichiers et ils sont prêts à être livrés. La fonction commit pousse les fichiers vers la zone de stockage où ils seront prêts à être poussés.

```bash
git commit -m "First push of the python app"
```

![First commit to Git](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/46p7ylx28irecq2q7xir.png)

Il est maintenant temps de pousser nos fichiers.

```bash
git push -u origin main
```
Accédons à notre repo sur GitHub pour vérifier que notre push s'est bien déroulé.

![Verifying the first push to GitHub](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/o9vym4llb8395wcd0rwo.png)

## Création des identifiants Jenkins

Dans le tableau de bord Jenkins, allez dans **Manage Jenkins**.

![Manage Jenkins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ihv661bppiuz4dpusm3l.png)

Dans la section Sécurité, cliquez sur **Gérer les informations d'identification**.

![Manage Credentials in Jenkins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/q71u42owjlyt6nii777l.png)

Dans la section des informations d'identification, cliquez sur **Système**. Sur la page qui s'ouvre, cliquez sur **Global Credentials Unrestricted** (informations d'identification globales non restreintes)

![System Credentials](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/27pszc6dp7lk2dz3kv9z.png)

![Global Credentials](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/aqz53lq8ud4kxwuiz7fl.png)

Cliquez maintenant sur **Add Credentials**.

Gardez 'Kind' comme 'Username and Password' (nom d'utilisateur et mot de passe)

Dans 'username' tapez votre nom d'utilisateur Docker Hub.

Dans 'password' tapez votre mot de passe Docker Hub.

> Si vous avez activé 2FA dans votre compte Docker Hub, vous devez créer un jeton d'accès et l'utiliser comme mot de passe ici.

Dans 'ID', tapez 'dockerHub'

Enfin, cliquez sur **Create**

![Docker credentials in Jenkins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zto67qzg1lvvvka5z7jt.png)

## Création d'un job Jenkins

Pour fermer notre pipeline, nous allons créer un job Jenkins qui sera déclenché lorsqu'il y aura des changements sur notre repo GitHub.

> Dans Jenkins, si ce n'est pas déjà fait, installez les plugins Docker et Docker Pipeline. Redémarrez votre instance Jenkins après l'installation.

Cliquez sur **New Item** dans votre tableau de bord Jenkins. Entrez le nom de votre choix. Sélectionnez **Pipeline** et cliquez sur OK.

![Jenkins New Project Pipeline](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g5jhye8pbuqx1pr70tox.png)

Dans la page de configuration, saisissez la description que vous souhaitez.

![Configuring a Jenkins Project](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/s896yrwsd1yatnm0lr9k.png)

Dans 'Build Triggers', sélectionnez **Poll SCM**.

![Jenkins Poll SCM & Schedule](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/fg45fgw73ojm7a7qtb64.png)

Dans 'Schedule', tapez ```* * * * * *``` (avec des espaces entre les deux). Ceci va interroger notre repo GitHub toutes les minutes pour vérifier s'il y a des changements. C'est souvent trop rapide pour un projet, mais nous ne faisons que tester notre code.

Dans la section 'Pipeline', dans 'definition' sélectionnez **Pipeline Script from SCM**. Ceci recherchera le fichier Jenkins que nous avons téléchargé dans notre repo sur GitHub et l'appliquera.

Ensuite, dans SCM, dans la section 'Repositories', copiez et collez votre repo GitHub **HTTPS URL**.

![Jenkins Poll SCM Config](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kj0q43aaro1jf6y0iy1i.png)

Dans 'Branches à construire', par défaut, il y aura master. Changez-la en main, puisque notre branche s'appelle main.

Assurez-vous que le 'Script Path' contient déjà 'Jenkinsfile'. Si ce n'est pas le cas, vous pouvez le taper.

![Jenkins SCM Branch](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/uqmwyh3jfx3yju90eceb.png)

Cliquez sur **Save**.

Notre job Jenkins est maintenant créé. Il est temps de voir l'ensemble du pipeline en action.

Cliquez sur 'Build Now'. Cela va déclencher toutes les étapes et si toutes les configurations sont correctes, notre conteneur devrait fonctionner avec l'application python et notre image personnalisée téléchargée sur Docker Hub. Vérifions cela.

![Jenkins Console Output](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cnideutqzxks3iac50r5.png)

![Verifying our image on Docker Hub](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hqbnxryw458mgdbrug7n.png)

Comme nous pouvons le voir, notre image personnalisée est maintenant disponible dans notre compte Docker Hub.

Vérifions maintenant que le conteneur fonctionne.

```bash
docker ps
```

## Transmettre les changements à l'application Python

Pour voir le flux automatisé complet en action, modifions un peu l'application Python et retournons dans notre navigateur pour voir les changements se refléter automatiquement.

Nous avons changé le texte de sortie de *Bonjour le monde!* à *Bonjour le monde ! J'apprends le DevOps!*

Sauvegardez le fichier et envoyez-le sur GitHub.

Comme nous pouvons le voir, cette action a déclenché la création d'un job automatique sur Jenkins, qui a abouti à la Build No. 2 de notre application.

![Jenkins build auto-trigger](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/2ln44h4oaxbffamxd500.png)

Nous pouvons maintenant voir que notre application a 2 builds. Dans le premier build, nous pouvons voir 'no changes' parce que nous avons déclenché manuellement le premier build après avoir créé notre dépôt. Toutes les modifications ultérieures donneront lieu à une nouvelle compilation.

Nous pouvons voir que la Build No 2 mentionne qu'il y a eu 1 commit.

![Jenkins 2nd Build Successfull](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bc3ysr6md1oe6czjxyuy.png)

En ce qui concerne notre application web, le message affiché a maintenant changé.

![Python App updated](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/nlfhhwhq9tedy03lxhzc.png)

C'est ainsi que nous pouvons créer une automatisation Docker-Jenkins.


## Resources

[Installing Jenkins](https://www.jenkins.io/doc/book/installing/linux/#debianubuntu)

[Installing Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

[Fix Docker Socket Permission Denied](https://www.digitalocean.com/community/questions/how-to-fix-docker-got-permission-denied-while-trying-to-connect-to-the-docker-daemon-socket)

[Dockerize your Python Application](https://runnable.com/docker/python/dockerize-your-python-application)

[Containerize A Python Application](https://www.section.io/engineering-education/how-to-containerize-a-python-application/)
