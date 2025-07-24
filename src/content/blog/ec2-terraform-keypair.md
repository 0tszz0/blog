---
title: Provisionnement d'une instance EC2 avec Terraform et keypair
description: Lancer une instance EC2 à partir de votre CLI
pubDate: 2023-02-15
author: Nyukeit
image: https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F0puyz7dg4be5onisb1x3.png
tags: ['aws', 'devops']
draft: false
lang: fr
---

Ce tutoriel décrit de manière très basique les étapes à suivre pour utiliser Terraform afin de démarrer une instance d'AWS EC2 et de s'y connecter en SSH. Veuillez noter que ce tutoriel s'adresse aux débutants absolus.

## Installer Terraform

Pour commencer, nous devons installer gnupg et software-properties-common, s'ils ne sont pas déjà présents. Cette étape suit les instructions mentionnées dans la documentation officielle de Terraform.

```bash
sudo apt-get update
```
```bash
sudo apt-get install -y gnupg software-properties-common
```

Après les avoir installés, nous devons ajouter la clé GPG de HashiCorp au système Ubuntu.

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | \
gpg --dearmor | \
sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
```

Maintenant, ajoutons le dépôt HashiCorp à Ubuntu. Ce dépôt nous permettra de trouver le logiciel Terraform sur Internet.

```bash
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
sudo tee /etc/apt/sources.list.d/hashicorp.list
```

Enfin, il est temps d'installer Terraform lui-même.

```bash
sudo apt-get update
```
```bash
sudo apt-get install terraform
```

Une fois l'installation terminée, vérifions si elle s'est déroulée correctement à l'aide de cette commande :

```bash
terraform --version
```

![Verify Terraform installation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ekvd344omshla90i5lkn.png)

Maintenant que Terraform est installé, il est temps d'installer AWSCLI, l'utilitaire pour configurer notre AWS avec des identifiants.

## Installer AWSCLI

Bien qu'il y ait plusieurs façons d'installer AWSCLI, nous utiliserons la méthode prescrite dans la documentation officielle d'Amazon.

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

Une fois de plus, nous vérifions l'installation réussie d'AWSLI en vérifiant sa version en tapant la commande suivante :

```bash
aws --version
```

![Verify AWS CLI Installation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/jbzaz4ww4agt95vkm1ev.png)

## Références AWS

Créez un compte AWS avec un niveau gratuit si vous n'en avez pas encore. Allez ensuite dans votre profil et cherchez Credentials. Nous utiliserons ces informations d'identification pour nous connecter à AWS à partir du CLI.

Maintenant, dans le terminal, nous tapons la commande suivante

```bash
aws configure
```

![Configuring AWS with Credentials](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bcddyezxldphtkue6lae.png)

AWS nous propose de coller ou de taper les éléments suivants un par un. Appuyez sur la touche « Entrée » après avoir collé chaque ligne. Notez que [none] signifie qu'il n'y a pas encore de données configurées pour cette touche.

```bash
Access Key [none]: <paste access key here>

Secret Key [none]: <paste secrete key here>

Region [none]: us-east-1

Output format [none]: <leave this blank>
```

Nous avons maintenant configuré notre AWSCLI pour accéder au compte AWS, mais ce n'est pas suffisant pour lancer une instance EC2. Pour cela, nous avons besoin d'une paire de clés.

Sidenote : Cet article utilise le compte root dans AWS et ne prend en compte aucun point de vue de sécurité. Il est généralement conseillé de créer un compte utilisateur IAM et d'utiliser des limites de permission.

Une fois encore, nous confirmons que tout est en place en procédant à une vérification. Voir, c'est croire.

```bash
cd /.aws
```
```bash
cat credentials
```

![Verifying AWS Credentials](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ksp5fmlqsvr2d95s8xtc.png)

## EC2 Keypair

Dans le tableau de bord AWS, allez à EC2 et dans la navigation de gauche, allez à Keypair. Cliquez sur **Create**.

Donnez un nom approprié au fichier de la paire de clés, sélectionnez RSA et PEM et cliquez sur Save. Cela téléchargera le fichier PEM sur le système.

Dans le terminal, créez un dossier pour votre projet.

```bash
mkdir projectfolder
```

Si vous ne pouvez pas accéder au fichier PEM téléchargé pour une raison quelconque (par exemple, si vous êtes dans une machine virtuelle à l'intérieur d'une machine hôte), vous pouvez le créer dans le terminal.

```bash
sudo nano keyfile.pem
```

Copiez-collez le contenu du fichier de paires de clés téléchargé dans la fenêtre nano du terminal. Appuyez sur **ctrl + x + y** pour enregistrer le fichier.

Nous allons maintenant changer les permissions de ce fichier clé, sans quoi EC2 rejettera notre connexion.

```bash
sudo chmod 400 keyfile.pem
```
Nous utiliserons ce fichier de paires de clés pour nous connecter en mode ssh à l'instance EC2 nouvellement créée.

## Création de scripts Terraform

Maintenant que les prérequis sont en place, créons un plan Terraform et appliquons-le pour créer notre instance.

```bash
cd projectfolder
```

Une fois dans le dossier, créez le fichier Terraform creds qui contiendra les mêmes informations d'identification que celles utilisées pour AWSCLI.

```bash
sudo nano creds.tf
```

```yaml
provider "aws" {
	access_key = "<your aws access key>"
	secret_key = "<your aws secret key"
	region = "<your aws region>"
}
```

Il est maintenant temps de créer le script Terraform principal qui exécutera les commandes pour lancer notre instance EC2.

```bash
sudo nano main.tf
```

```yaml
resource "aws_instance" "myproject" {
	ami = "ami-2757f631"
	instance_type = "t2.micro"
	key_name = "ec2tf"
}
```

Le plan Terraform est maintenant prêt et nous devons le lancer.

```bash
terraform init
```

![Initializing Terraform](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ztxc5objk6r2dqd8ccxo.png)

Une fois la configuration initialisée, nous devons l'appliquer pour que Terraform crée notre instance EC2.

```bash
terraform apply
```

![Creating the EC2 instance](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/u8mwjhpxcy1b57619vcs.png)

Lorsque vous y êtes invité, tapez **yes**

Terraform va maintenant commencer à créer l'instance EC2. Cela peut prendre un certain temps en fonction de l'image.

Pour vérifier la création de l'instance, allez sur le tableau de bord EC2 et voyez l'instance nouvellement créée en cours d'exécution.

![Verify EC2 instance running](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kn2qzyg62qa3oisc426b.png)

## Connexion à l'instance EC2 à l'aide de SSH

La raison pour laquelle j'ai initié mon instance à l'aide d'un fichier de paires de clés était de pouvoir m'y connecter en SSH après sa création. Et nous allons voir comment cela devient très facile maintenant.

La première étape est d'aller sur le tableau de bord EC2 et de cliquer sur **Security Groups**.

Sélectionnez le groupe de sécurité et cliquez sur l'onglet **Inbound Rules**. Cliquez sur **Editer les règles de réception**.

Une règle par défaut a déjà été ajoutée.

Cliquez sur **Ajouter une règle** et sélectionnez le protocole **SSH** et la source **Custom**. Cliquez sur le champ de recherche à côté de Custom et sélectionnez **0.0.0.0/0** et enregistrez la règle.

L'instance EC2 est maintenant prête à accepter les connexions SSH entrantes.

Avant de continuer, nous avons besoin de l'adresse DNS IPv4 publique de l'instance. Sélectionnez votre instance dans **Instances** dans le menu latéral.

Maintenant, pour se connecter à l'instance EC2, nous tapons ce qui suit

```bash
sudo ssh -i "keyfile.pem" ubuntu@ip4-public-dns
```

> [!tip] Amazon AWS a des noms d'utilisateur par défaut pour les AMIs en fonction du type d'image qui peut être trouvé sur [ici](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs.html)

Lorsque vous y êtes invité, tapez **yes**.

![Succesfull SSH into the EC2 instance](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/e7sqykm0zm2p0vz9fwgm.png)

Nous avons ainsi réussi à nous connecter à notre nouvelle instance EC2 à l'aide de SSH.

## Resources

[AWS EC2 User Guides - Connection Prerequisites](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs.html
)

[AWS EC2 User Guides - Accessing Instances using SSH](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AccessingInstancesLinux.html#AccessingInstancesLinuxSSHClient)

[Provisioning EC2 Keypairs with Terraform](https://ifritltd.com/2017/12/06/provisioning-ec2-key-pairs-with-terraform/)

[How To Launch An EC2 Instance Using Terraform](https://www.techtarget.com/searchcloudcomputing/tip/How-to-launch-an-EC2-instance-using-Terraform)

[Unable to Connect to Your EC2 Instance Using SSH](https://medium.com/tensult/unable-to-connect-your-ec2-instance-using-ssh-842f6f6f0d04)
