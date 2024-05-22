# Hackathon - Pistes Cyclables

A simple docker image builder exposing an _ipynb_ Jupyter notebook present in `./src` at `http://127.0.0.1:4705`.

Dependencies for parsing geojson datasets are already satisfied.

## Requirements:

- Docker

## HOWTO

1. Build *hackathon/pistes_cyclables* 
    
    `make build`

2. Run *hackathon/pistes_cyclables* 
    
    `make run`
    
    It automatically mounts ./src into /hackathon within the container.
    
    Once the container is running, browse the outputted URI which starts with `http://127.0.0.1:4705/`

3. Clean *hackathon/pistes_cyclables*
    
    `make clean`
