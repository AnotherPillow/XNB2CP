#!/usr/bin/env bun

random=$(
    head -c 100 /dev/urandom \
    | tr -dc 'A-Za-z0-9' \
    | head -c 8
)

sed "s|src/index\.css|src/index.$random.css|g" index.html > index.html.tmp
mv index.html.tmp index.html

cp src/index.css src/index.$random.css