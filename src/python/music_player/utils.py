#!/usr/bin/env python3

import cherrypy
import hashlib
import os
import re
import math
import functools
import datetime

from bson.objectid import ObjectId

supportedTypes = ["youtube", "mp3"]

# checks if key value exists and is the right type
def checkValidData(key, data, dataType, optional=False, default="", coerce=False):
    """
    This function takes a data dict, determines whether a key value exists
    and is the right data type. Returns the data if it is, raises an
    HTTP error if it isn't.

    :param key: the key of the data dict
    :param data: a dict of data
    :param dataType: a data type
    :param optional: True if the data did not need to be provided
    :param default: default string is ""
    :return: data, if conditions are met
    """
    if key in data:
        localVar = data[key]
        if isinstance(localVar, dataType):
            return localVar
        else:
            if coerce:
                try:
                    return dataType(localVar)
                except:
                    raise cherrypy.HTTPError(400, "Could not coerce to type %s. See: %s" % (dataType, localVar))
            else:
                cherrypy.log("Expected %s of type %s. See: %s" %
                (key, dataType, localVar))
                raise cherrypy.HTTPError(400, 'Invalid %s format. See: %s' % (key, data[key]))
    else:
        if not optional:
            raise cherrypy.HTTPError(400, 'Missing %s' % key)
        else:
            return default

# checks if key value exists and is the right type (Number)
def checkValidNumber(key, data, optional=False, default=""):
    """
    This function takes a data dict, determines whether a key value exists
    and is a number. Returns the data if it is, raises an
    HTTP error if it isn't.

    :param key:
    :param data:
    :param optional:
    :param default:
    :return:
    """
    if key in data:
        localVar = data[key]
        if isinstance(localVar, (float, int)):
            return float(localVar)
        else:
            cherrypy.log(
                "Expected %s to be a number. See: %s" % (key, localVar))
            raise cherrypy.HTTPError(400, 'Invalid %s format' % key)
    else:
        if not optional:
            raise cherrypy.HTTPError(400, 'Missing %s' % key)
        else:
            return default

# checks if data has valid object ID
def checkValidID(data):
    """
    This function takes a data dict, determines whether it has a MongoDB
    ObjectId and that the ID is valid.

    :param data: data dict
    :return: data, if conditions are met
    """
    if '_id' in data:
        myID = data['_id']
        if ObjectId.is_valid(myID):
            return myID
        else:
            raise cherrypy.HTTPError(400, 'Object id not valid')
    else:
        raise cherrypy.HTTPError(400, 'data needs object id')

def createMusic(data):
    myMusic = dict()

    # string fields
    for key in ("url", "name"):
        myMusic[key] = checkValidData(key, data, str)
    if data["type"] in supportTypes:
        myMusic["type"] = checkValidData("type", data, str)
    else:
        raise cherrypy.HTTPError(400, "Bad file type")
    artistList = checkValidData("artist", data, list)
    myArtists = []
    for artist in artistList:
        if isinstance(artist, str):
            myArtists.append(artist)
        else:
            raise cherrypy.HTTPError(400, "Bad artist name")
    myMusic["artist"] = myArtists

    # int fields
    for key in ("vol", "start", "end"):
        myMusic[key] = checkValidData(key, data, int)
        if myMusic[key] < 0: myMusic[key] = 0
        if key == "vol" and myMusic[key] > 100: myMusic[key] = 100

    return myMusic

def createMusicQuery(data):
    myMusic = dict()

    # string fields
    for key in ["url", "name", "type", "artist", "_id"]:
        if key in data:
            if key in ["url", "name"]:
                myMusic[key] = checkValidData(key, data, str)
            if key == "type":
                if data["type"] in supportedTypes:
                    myMusic["type"] = checkValidData("type", data, str)
                else:
                    raise cherrypy.HTTPError(400, "Bad file type")
            if key == "artist":
                artistList = checkValidData("artist", data, list)
                myArtists = []
                for artist in artistList:
                    if isinstance(artist, str):
                        myArtists.append(artist)
                    else:
                        raise cherrypy.HTTPError(400, "Bad artist name")
                myMusic["artist"] = myArtists
            if key == "_id":
                myMusic["_id"] = checkValidID(data)

    # int fields
    for key in ("vol", "start", "end"):
        if key in data:
            myMusic[key] = checkValidData(key, data, int)
            if myMusic[key] < 0: myMusic[key] = 0
            if key == "vol" and myMusic[key] > 100: myMusic[key] = 100
    return myMusic

def createPlaylistQuery(data):
    myPlaylist = dict()

    for key in ["name", "start_date", "end_date", "content", "_id"]:
        if key in data:
            if key == "name":
                myPlaylist[key] = checkValidData(key, data, str)
            if key in ["start_date", "end_date"]:
                myPlaylist[key] = checkValidData(key, data, datetime)
            if key == "content":
                myPlaylist[key] = checkValidData(key, data, list)   # change this query to search for inclusive ($in?)
            if key == "_id":
                myPlaylist[key] = checkValidID(data)

    return myPlaylist

def cleanRet(dataList):
    ret = list()
    for data in dataList:
        if "_id" in data:
            data["_id"] = str(data["_id"])
        if "date" in data:
            data["date"] = data["date"].isoformat()[:19]    # gets only up to seconds; add "Z" for UTC?
        ret.append(data)
    print("returning:", ret)
    return ret

