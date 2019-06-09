#!/usr/bin/env bash

if [ -d venvMusic ]; then
    source venvMusic/bin/activate
fi

cd src/python
python3 -m music_player
