FROM alpine
ENV PYTHONUNBUFFERED True
ENV PROJ_DIR=/usr
RUN apk update --no-cache
RUN apk add --no-cache musl-dev linux-headers python3-dev gcc py3-pip py3-pandas py3-gdal py3-fiona py3-shapely py3-matplotlib proj-util proj-dev
RUN pip install --disable-pip-version-check --no-cache-dir --break-system-packages notebook geopandas 
WORKDIR /
CMD jupyter notebook --port=4705 --allow-root --ip 0.0.0.0 --no-browser hackathon/pistes_cyclables.ipynb
