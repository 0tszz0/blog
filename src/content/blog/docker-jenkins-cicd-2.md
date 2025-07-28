---
title: Building a Docker-Jenkins CI/CD Pipeline for a Python App (Part 2)
description: Deploy a Python app using a CI/CD pipeline
pubDate: 2022-12-13
author: Nyukeit
image: https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Ffq1afbyaoyfsakpjn8ya.png
tags: ['docker', 'devops']
draft: false
lang: en
---

> [!note] This is a continuation of the tutorial for building a Docker Jenkins pipeline to deploy a simple Python app using Git and GitHub. The first part of the tutorial can be found [here](/blog/docker-jenkins-cicd-1).

## Installing Jenkins

We now have the basics ready for deploying our app. Let's install the remaining software to complete our pipeline.

We begin by importing the GPG key which will verify the integrity of the package.

```bash
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null
```
Next, we add the Jenkins softwarey repository to the sources list and provide the authentication key.

```bash
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
```

```bash
sudo apt update
```

![Jenkins Key and Source](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/qzjzig2xt2wyggha61nc.png)

Now, we install Jenkins

```bash
sudo apt-get install -y jenkins
```
Wait till the entire installation process is over and you get back control of the terminal.

![Installing Jenkins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hr00dwb0dc30gqrjazdo.png)

To verify if Jenkins was installed correctly, we will check if the Jenkins service is running.

```bash
sudo systemctl status jenkins.service
```

![Verifying Jenkins Installation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/8agoj9tenlsyyhputiwp.png)

Press **Q** to regain control.

## Jenkins Configuration

We have verified that the Jenkins service is now running. This means we can go ahead and configure it using our browser.

Open your browser and type this in the address bar:

```bash
localhost:8080
```
You should see the Unlock Jenkins page.

![Unlocking Jenkins for First Use](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/xr31blr90a8rg1lmlpjk.png)

Jenkins generated a default password when we installed it. To locate this password we will use the command:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

![Jenkins first unlock password](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/30rie9q95b5pealtszgr.png)

Copy this password and paste it into the box on the welcome page.

On the next page, select 'Install Suggested plugins'

![Jenkins Suggested Plugins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/776iko4eo3x5hpl4xx2q.png)

You should see Jenkins installing the plugins.

![Jenkins Plugins Installation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/tyzdrwm37shogfuyaug5.png)

Once the installation has completed, click on Continue.

On the Create Admin User page, click 'Skip and Continue as Admin'. You can alternatively create a separate Admin user, but be sure to add it to Docker group.

Click on 'Save and Continue'

On the **Instance Configuration** page, Jenkins will show the URL where it can be accessed. Leave it and click 'Save and Finish'

Click on 'Start Using Jenkins'. You will land on a welcome page like this:

![Jenkins Landing Page](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/00lzd66vt8mb5adq9bfx.png)

We have now successfully setup Jenkins. Let's go back to the terminal to install Docker.

## Installing Docker

First we need to uninstall any previous Docker stuff, if any.

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```
Most likely, nothing will be removed since we are working with a fresh install of Ubuntu.

We will use the command line to install Docker.

```bash
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

![Docker Pre-requisites](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/doj5urwkt6c5izfigv47.png)

Next, we will add Docker's GPG key, just like we did with Jenkins.

```bash
sudo mkdir -p /etc/apt/keyrings
```
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```
Now, we will setup the repository

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```
Next we will install the Docker Engine.

```bash
sudo apt-get update
```

```bash
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

![Docker Installation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/yjiuh0d4n2ulnh2tnea8.png)

Now verify the installation by typing

```bash
docker version
```

![Docker version](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mqrqygtvd69gq7vsmmwk.png)

Notice that you will get an error for permission denied while connecting to Docker daemon socket. This is because it requires a root user. This means you would need to prefix sudo every time you want to run Docker commands. This is not ideal. We can fix this by making a docker group.

```bash
sudo groupadd docker
```
The docker group may already exist. Now let's add the user to this group.

```bash
sudo usermod -aG docker $USER
```
Apply changes to Unix groups by typing the following:

```bash
newgrp docker
```
> [!warning] If you are following this tutorial on a VM, you may need to restart your instance for changes to take effect.

Let's verify that we can now connect to the Docker Engine.

```bash
docker version
```

![Docker Engine Version](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/8wgyv4q0upawpblc7awv.png)

As we can see, Docker is now fully functional with a connection to the Docker Engine.

We will now create the Dockerfile that will build the Docker image.

## Creating the Dockerfile

Inside your terminal, within your folder, create the Dockerfile using the nano editor.

```bash
sudo nano Dockerfile
```
Type this text inside the editor:

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

## Building the Docker Image

From the Dockerfile, we will now build a Docker image.

```bash
docker build -t helloworldpython .
```

![Building the Docker Image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4f7520scdh9tmypvnscg.png)

Now let's create a test container and run it a browser to check if our app is displaying correctly.

```bash
docker run -p 3333:3333 helloworldpython
```

Open your browser and go to ```localhost:3333``` to see our python app in action.

![Python Webapp Running](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/z7kys0xb3jft1nt15wa9.png)

Now let's see how we can automate this printing every time we make a change to our python code.

## Creating the Jenkinsfile

We will create a Jenkinsfile which will elaborate a step-by-step process of building the image from the Dockerfile, pushing it to the registry, pulling it back from the registry and running it as a container.

Every change pushed to the GitHub repository will trigger this chain of events.

```bash
sudo nano Jenkinsfile
```
In the nano editor, we will use the following code as our Jenkinsfile.

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

## Explaining the Jenkinsfile

Our Jenkins pipeline is divided in 5 stages as you can see from the code.

- Stage 1 - Clones our Github repo
- Stage 2 - Builds our Docker image from the Docker File
- Stage 3 - Pushes the image to Docker Hub
- Stage 4 - Deploys the image as a container by pulling it from Docker Hub
- Stage 5 - Removes the old image to stop image pile up.

Now that our Jenkinsfile is ready, let's push all of our source code to GitHub.

## Pushing files to GitHub

First, let's check the status of our local repo.

```bash
git status
```

![Git not tracking files](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/alrbtwkbapk4xxq6f0kh.png)

As we can see, there are no commits yet and there are untracked files and folders. Let's tell Git to track them so we can push them to our remote repo.

```bash
git add *
```
This will add all the files present in the git scope.

Git is now tracking our files and they are ready to be commit. The commit function pushes the files to the staging area where they will be ready to be pushed.

```bash
git commit -m "First push of the python app"
```

![First commit to Git](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/46p7ylx28irecq2q7xir.png)

Now, it's time to push our files.

```bash
git push -u origin main
```
Let's go to our repo on GitHub to verify that our push was successful.

![Verifying the first push to GitHub](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/o9vym4llb8395wcd0rwo.png)

## Creating Jenkins Credentials

In the Jenkins dashboard, go to **Manage Jenkins**.

![Manage Jenkins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ihv661bppiuz4dpusm3l.png)

In the Security section, go to **Manage Credentials**.

![Manage Credentials in Jenkins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/q71u42owjlyt6nii777l.png)

In the credentials section, click on **System**. On the page that opens, click on **Global Credentials Unrestricted**

![System Credentials](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/27pszc6dp7lk2dz3kv9z.png)

![Global Credentials](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/aqz53lq8ud4kxwuiz7fl.png)

Now click on **Add Credentials**.

Keep 'Kind' as 'Username and Password'

In 'username' type your Docker Hub username.

In 'password' type your Docker Hub password.

> [!info] If you have enabled 2FA in your Docker Hub account, you need to create an access token and use it as a password here.

In 'ID', type 'dockerHub'

Finally, click on **Create**

![Docker credentials in Jenkins](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zto67qzg1lvvvka5z7jt.png)

## Creating a Jenkins Job

To close our pipeline, we will create a Jenkins job which will be triggered when there are changes to our GitHub repo.

> [!tip] In Jenkins, if not already installed, install the plugins Docker and Docker Pipeline. Restart your Jenkins instance after installation.

Click on **New Item** in your Jenkins dashboard. Enter any name you like. Select **Pipeline** and click okay.

![Jenkins New Project Pipeline](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g5jhye8pbuqx1pr70tox.png)

In the configuration page, type in any description that you want.

![Configuring a Jenkins Project](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/s896yrwsd1yatnm0lr9k.png)

In 'Build Triggers' select **Poll SCM**.

![Jenkins Poll SCM & Schedule](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/fg45fgw73ojm7a7qtb64.png)

In 'Schedule', type ```* * * * *``` (with spaces in between. This will poll our GitHub repo every minute to check if there any changes. This is mostly too quick for any project, but we are just testing our code.

In the 'Pipeline' section, in 'definition' select **Pipeline Script from SCM**. This will look for the Jenkinsfile that we uploaded to our repo in GitHub and apply it.

Next, in SCM in the Repositories section, copy and paste your GitHub repo **HTTPS URL**.

![Jenkins Poll SCM Config](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kj0q43aaro1jf6y0iy1i.png)

In 'Branches to Build', by default, it will have master. Change it to main, since our branch is called main.

Make sure the 'Script Path' has 'Jenkinsfile' already populated. If not, you can type it out.

![Jenkins SCM Branch](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/uqmwyh3jfx3yju90eceb.png)

Click on **Save**.

Now our Jenkins job is created. It is time to see the whole pipeline in action.

Click on 'Build Now'. This will trigger all the steps and if we have all the configurations correct, it should have our container running with the python app and our custom image uploaded on Docker Hub. Let's verify this.

![Jenkins Console Output](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/cnideutqzxks3iac50r5.png)

![Verifying our image on Docker Hub](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hqbnxryw458mgdbrug7n.png)

As we can see, our custom built image is now available in our Docker Hub account.

Now let's verify if the container is running.

```bash
docker ps
```

## Committing changes to Python App

To see the full automated flow in action, let's change the python app a bit and go back to our browser to see the changes being reflected automatically.

We have changed the output text from *Hello World!* to *Hello World! I am learning DevOps!*

Save the file and push the file to GitHub.

As we can see, this action triggered an automatic job creation on Jenkins, which resulted in Build No. 2 of our app.

![Jenkins build auto-trigger](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/2ln44h4oaxbffamxd500.png)

We can now see that our app has 2 builds. In the first build, we can see 'no changes' because we manually triggered the first build after creating our repository. All subsequent commits will result in a new build.

We can see that Build No 2 mentions there was 1 commit.

![Jenkins 2nd Build Successfull](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/bc3ysr6md1oe6czjxyuy.png)

As for our webapp, the message displayed has now changed.

![Python App updated](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/nlfhhwhq9tedy03lxhzc.png)

This is how we can create a Docker-Jenkins automation.


## Resources

[Installing Jenkins](https://www.jenkins.io/doc/book/installing/linux/#debianubuntu)

[Installing Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

[Fix Docker Socket Permission Denied](https://www.digitalocean.com/community/questions/how-to-fix-docker-got-permission-denied-while-trying-to-connect-to-the-docker-daemon-socket)

[Dockerize your Python Application](https://runnable.com/docker/python/dockerize-your-python-application)

[Containerize A Python Application](https://www.section.io/engineering-education/how-to-containerize-a-python-application/)
