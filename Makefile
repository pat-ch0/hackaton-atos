PROJECT=hackathon/pistes_cyclables
DOCKER_ARCHIVE=$(subst /,-,$(PROJECT)).tar.gz
DOCKER_PORT=4705
DOCKER_VOLUME_SRC=./src
DOCKER_VOLUME_DEST=/hackathon

.PHONY: img run clean build

all: run

img: $(DOCKER_ARCHIVE)

$(DOCKER_ARCHIVE): build 
	docker image save $(PROJECT) | gzip > $@

run:
	docker run \
		--rm \
		-p $(DOCKER_PORT):$(DOCKER_PORT) \
		-v $(DOCKER_VOLUME_SRC):$(DOCKER_VOLUME_DEST):z \
		-it \
		$(PROJECT)

build:
	docker build -t $(PROJECT) .

clean:
	-docker rmi $(PROJECT)
