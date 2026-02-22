# Readwise Retro

Pocket updated their design recently. I love it but it has affected my main usecase for Pocket.

This simple application fetches article links and archives them when you open the original article in a new tab.
Powered by a Python service using Bottle and a Typescript React frontend. PRs and issues are welcome!

```shell
docker run -d -p 127.0.0.1:3210:8080 --name pocket_retro seanbe/pocket_retro
```

Check out [seanbe/pocket_retro](https://hub.docker.com/r/seanbe/pocket_retro) for other tagged images.

![alt text](docs/preview.png "Pocket Retro UI Preview")

*Project does not follow best practices for Docker, Python, Typescript, etc.*
