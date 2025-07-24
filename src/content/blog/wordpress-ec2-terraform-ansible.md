---
title: Déployer Wordpress sur AWS EC2 avec Terraform et Ansible
description: Déployer une pile WordPress sur AWS en une seule commande
pubDate: 2023-02-07
author: Nyukeit
image: https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fb3gkpi58acrgpbal4723.png
tags: ['wordpress', 'devops']
draft: false
lang: fr
---

> [!warning] Cet article a été écrit en février 2023. Des choses peuvent avoir changé depuis, comme les dépendances, les versions, etc.

Le code complet est disponible à cette adresse [GitHub Repo](https://github.com/codenamenuke/wordpress-ansible-setup).

Si vous souhaitez n'utiliser que le rôle Ansible, il se trouve à [Ansible Galaxy](https://galaxy.ansible.com/codenamenuke/wordpress).

## Introduction
Dans ce projet, nous allons provisionner une instance EC2 en utilisant Terraform et utiliser Ansible pour déployer une pile WordPress complète et fonctionnelle qui peut ensuite être configurée et installée en utilisant l'interface web. Comme toujours avec nos projets, nous utiliserons un système basé sur Ubuntu.

## Pré-requis
Puisque nous utilisons Terraform, Ansible et AWS, nous aurons besoin des éléments suivants avant de continuer.

1. Installer la dernière version de Terraform en utilisant le guide ici.
2. Installer et configurer Ansible en utilisant le guide ici
3. Si vous n'avez pas de compte AWS, créez-en un à partir d'AWS.

Tout d'abord, nous allons créer le matériel Ansible et nous assurer que notre playbook peut déployer un serveur WordPress. Une fois cela fait, nous pouvons automatiser ce déploiement sur une instance EC2 avec Terraform.

## Création du Playbook Ansible & Rôles
Nous allons créer manuellement les rôles Ansible à utiliser dans ce tutoriel. Vous pouvez trouver de nombreux rôles WordPress prêts à l'emploi sur Ansible-Galaxy mais la plupart d'entre eux ont tendance à devenir trop compliqués très rapidement.

Dans cette méthode, nous allons créer les rôles Ansible suivants pour gérer les différents aspects du processus d'installation de WordPress et avant cela, l'installation des dépendances.

### Quels rôles allons-nous créer ?
**WordPress** → Rôle principal qui exécutera les tâches importantes.
**MySQL** → Pour configurer notre utilisateur MySQL et notre base de données.
**PHP** → Pour installer les dépendances nécessaires à WP.
**Server** → Pour s'assurer que notre serveur est configuré avec les bonnes dépendances.

```bash
git clone https://github.com/nyukeit/wordpress-ansible-setup.git
```
Create Folder, you can name it whatever you want.

```bash
mkdir wordpress-ansible-setup
```

Inside this folder, we will create the Ansible Roles structure.

```bash
mkdir roles
```

Inside the roles folder execute the following commands one by one.

```
ansible-galaxy init php
ansible-galaxy init server
ansible-galaxy init mysql
ansible-galaxy init wordpress
```
Your roles folder should look similar to this. Don’t worry if there are many more files and folders, this screenshot is from the git repository where the unused folders were removed.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zqgoy4z5v2254bsszu8a.png)

## Creating YAML files for each role
Let’s now go through all the files we need to create.

### Server
From the main project folder, open the main.yml file inside the tasks folder of the server role.

```bash
nano roles/server/tasks/main.yml
```

```yaml
---
# Tasks file for Server Role

- name: Update apt cache
  apt: update_cache=yes cache_valid_time=3600
  become: yes

- name: Install required software
  apt:
    name: ['apache2', 'python3-dev', 'python3-pip', 'mysql-server', 'php-mysql', 'php', 'libapache2-mod-php', 'python3-mysqldb']
    state: present
  become: yes
```

### MySQL

```bash
nano roles/mysql/tasks/main.yml
```

```yaml
---
# Tasks file for MySQL Role

- name: Create mysql database
  mysql_db:
    name: '{{ wp_mysql_db }}'
    state: present
  become: yes

- name: Create mysql user
  mysql_user:
    name: '{{ wp_mysql_user }}'
    password: '{{ wp_mysql_password }}'
    priv: '*.*:ALL'
  become: yes
```

The MySQL role will also have the defaults stored which will be used when there are no variables passed.

```bash
nano roles/mysql/defaults/main.yml
```

```yaml
---
# Defaults file for MySQL Role

wp_mysql_db: wordpress
wp_mysql_user: wordpress
wp_mysql_password: randompassword
```

Now, let’s create the PHP role which will install some dependencies for our WordPress server.

### PHP

```bash
nano roles/php/tasks/main.yml
```

```yaml
---
# Tasks file for PHP Role
- name: Install php extensions
  apt:
    pkg: ['php-gd', 'php-ssh2']
    state: present
  become: yes
```

And finally, let’s create our main role, Wordpress.

### Wordpress

```bash
nano roles/wordpress/tasks/main.yml
```

```yaml
---
# Tasks file for WordPress Role
- name: Download WordPress
  get_url:
    url: 'https://wordpress.org/latest.tar.gz'
    dest: '/tmp/wordpress.tar.gz'
    validate_certs: no

- name: Extract WordPress
  unarchive:
    src: '/tmp/wordpress.tar.gz'
    dest: '/var/www/html'
    copy: no
  become: yes

- name: Update default Apache site
  become: yes
  lineinfile:
    dest=/etc/apache2/sites-enabled/000-default.conf
    regexp="(.)+DocumentRoot /var/www/html"
    line="DocumentRoot /var/www/html/wordpress"
  notify:
    - restart apache

- name: Copy sample config file
  command: mv /var/www/html/wordpress/wp-config-sample.php /var/www/html/wordpress/wp-config.php creates=/var/www/html/wordpress/wp-config.php
  become: yes

- name: Wordpress | Copy wp-config.php file content
  become: yes
  template:
    src: wp-config.php.j2
    dest: "/var/www/html/wordpress/wp-config.php"
```

We will create a handler that will restart the apache2 server after updating the default Apache site

```bash
nano roles/wordpress/handlers/main.yml
```

```yaml
---
# handlers file for wordpress

- name: restart apache
  service:
    name: 'apache2'
    state: restarted
  become: yes
```

And finally, we will create a Jinja2 template exactly like the default WordPress `wp-config.php` file. We will pass our MySQL variable data through this template into our final WP installation.

```bash
nano roles/wordpress/templates/wp-config.php.j2
```

This is a replica of the entire `wp-config.php` default file, so for the sake of brevity, we will just show the initial part where we will replace our variables.

```php
// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', '{{ wp_mysql_db }}' );

/** Database username */
define( 'DB_USER', '{{ wp_mysql_user }}' );

/** Database password */
define( 'DB_PASSWORD', '{{ wp_mysql_password }}' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );
```
Please make sure you copy the entire `wp-config.php` file contents into the templates file and only change the Database name, user and password.

This concludes our Ansible setup that will install and configure WordPress and the required dependencies and the MySQL server.

## AWS Setup

To be able to use Terraform, we will need an EC2 Keypair which we will create from the EC2 dashboard. It is a very simple process and should take less than a minute.

Go to the EC2 Dashboard and scroll down on the left menu and click on Key Pairs. Click on Create Key Pair. You should see a page like this.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ujlnslk5jrxdfz9m2gpo.png)

Keep the default settings. Name your key pair file as `wpserver` (this is the name we have used in the TF script. You can name it anything, just make sure you replace it in the TF script) and click on Create Key Pair at the bottom. This will download a file called `wpserver.pem`. This is your key pair file.

If you are working on the same machine, you can give the path of this key pair file in the Terraform configuration. If you are working on a VM or a lab machine, do as follows:

Open the `wpserver.pem` file in a text editor like Notepad or Text Edit.

Copy the contents ENTIRELY. Including the BEGINNING OF RSA KEY and END OF RSA KEY.

In your VM/lab machine, inside the main project folder, create a new file with the same name.

```bash
nano wpserver.pem
```

Paste the contents inside the nano editor and save the file. (ctrl + x + y to save files in nano.)

### Setting Permissions for the key pair file
This is an important step. Without this, AWS will reject the SSH connection to the EC2 instance.

While inside your main project folder, change the file permissions of the `wpserver.pem` file to **400**.

```bash
sudo chmod 400 wpserver.pem
```

We are now ready to setup Terraform.

## Setting Up Terraform

Create a new file in the project directory called main.tf in which we will write the Terraform code.

```bash
nano main.tf
```

```
# Main Terraform configuration file

# Define the local variables for the root module
locals {
  ami_id = "ami-08fdec01f5df9998f"
  vpc_id = "<your_vpc_id>"
  ssh_user = "ubuntu"
  key_name = "wpserver"
  private_key_path = "${path.module}/wpserver.pem"
}

# Uses the AWS provider to setup access
provider "aws" {
  access_key = "<your_access_key>"
  secret_key = "<your_secret_key>"
  token = ""
  region = ""
}

# Creates the EC2 Security Group with Inbound and Outbound rules.
resource "aws_security_group" "wpserversg" {
  name = "wpserversg"
  vpc_id = local.vpc_id

	# This will allow us to access the HTTP server on Port 80, where our WP will be accessible.
  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

	# This will allow us to SSH into the instance for Ansible to do it's magic.
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# This creates the EC2 instance and makes an initial SSH connection.
resource "aws_instance" "ec2wpserver" {
  ami = local.ami_id
  instance_type = "t2.micro"
  associate_public_ip_address = true
  vpc_security_group_ids = [aws_security_group.wpserversg.id]
  key_name = local.key_name

  tags = {
    Name = "WordPress Server"
  }

  connection {
    type = "ssh"
    host = self.public_ip
    user = local.ssh_user
    private_key = file(local.private_key_path)
    timeout = "4m"
  }

  provisioner "remote-exec" {
    inline = [
      "touch /home/ubuntu/demo-file-from-terraform.txt"
    ]
  }
}

# Creating a local hosts file for Ansible to use
resource "local_file" "hosts" {
  content = templatefile("${path.module}/templates/hosts",
    {
      public_ipaddr = aws_instance.ec2wpserver.public_ip
      key_path = local.private_key_path
      ansible_user = local.ssh_user
    }
  )
  filename = "${path.module}/hosts"
}

# We will use a null resource to execute the playbook with a local-exec provisioner.

resource "null_resource" "run_playbook" {
  depends_on = [

    # Running of the playbook depends on the successfull creation of the EC2
    # instance and the local inventory file.

    aws_instance.ec2wpserver,
    local_file.hosts,
  ]

  provisioner "local-exec" {
    command = "ansible-playbook -i hosts playbook.yml"
  }
}
```

This Terraform script will create the EC2 instance and get the public IP of the instance and populate it in an Ansible hosts file called hosts which will reside in the main project folder.

For this file to be formatted in the Ansible readable inventory, we will use templating. In the main project folder, create a directory called `templates`.

```bash
mkdir templates
```

Now, let’s create the hosts inventory template inside this directory.

```bash
nano templates/hosts
```

And this is what our hosts file will look like.

```ini
[wordpress]
${public_ipaddr}

[wordpress:vars]
ansible_ssh_user = ubuntu
ansible_ssh_private_key_file = ${key_path}
```

Since we have used the host as wordpress in our playbooks, we will use the same hostgroup name here.

We now have the Terraform setup ready to provision. The only things left now are to complete the Terraform flow.

## Terraform Flow

The first step is to do terraform init. This will initiate all the plugins required by Terraform to execute our resources. We execute these commands in the main project folder.

```bash
terraform init
```

If all the configuration is correct, you should see a message like this.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/9ccbjsjw2p33wd5a0wgi.png)

As we can see, Terraform has installed the plugins local, null and aws.

The next step is to validate our configuration. To do this we will do terraform validate. Terraform will parse through our code and verify if all the syntax and dependencies check out.

```bash
terraform validate
```

We should now see a success message from Terraform.


![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/jck31xgcgnkjwoj456os.png)

You could further check your configuration by performing `terraform plan`. This will show you what changes will be made and what resources will be provisioned, without actually applying the changes. For this tutorial, we will skip this step and go directly to the final step.

```bash
terraform apply
```

Terraform will now begin provisioning the resources.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/li6qj3uo3vmfpcs0olit.png)

Once Terraform is done provisioning the EC2 instance and populating our local inventory file, it will execute the Ansible playbook which will then do what is required to deploy our WordPress server on the EC2 instance.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/j4qoa4zntmxn6rz3kwek.png)

And once all the executions are complete, we should see a screen like this.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/u6ek7jdx5qgrok3b5z7j.png)

The above screenshot shows what is the IP address of our new instance. 52.201.170.42. This is the address where we will find our WordPress initial setup screen.

Go to the browser and type the IP inside the address bar and press enter. You should see the WordPress setup screen.

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ucsazahvkyt38slndozy.png)

WordPress can now be setup with the options you choose.
