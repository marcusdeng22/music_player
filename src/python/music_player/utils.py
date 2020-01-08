#!/usr/bin/env python3

import cherrypy
import hashlib
import os
# import re
import math
import functools
import datetime
import operator

from bson.objectid import ObjectId
from bson.regex import Regex

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
			if coerce and dataType == datetime.datetime:
				try:
					return datetime.datetime.strptime(localVar, "%m/%d/%Y") if dataType == datetime.datetime else dataType(localVar)
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
			return ObjectId(myID)
		else:
			raise cherrypy.HTTPError(400, 'Object id not valid')
	else:
		# raise cherrypy.HTTPError(400, 'data needs object id')
		if (ObjectId.is_valid(data)):
			return ObjectId(data)
		else:
			raise cherrypy.HTTPError(400, "Object id not valid")

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

# #expects a name of a song and returns a list of _ids with a similar name, sorted by relevance
# def findMusicByName(name, musicDB):
# 	ret = []
# 	musicDB.find()

def makeMusicQuery(data, musicDB, fast=False):
	myMusic = dict()
	myProjection = {"relev": {"$meta": "textScore"}}

	# string fields
	for key in ["url", "name", "type", "artist_names", "start_date", "end_date", "_id"]:
		if key in data:
			if key in "url":
				myMusic[key] = checkValidData(key, data, str)
			if key == "name":
				myMusic[key] = {"$regex": r".*" + checkValidData(key, data, str) + r".*", "$options": "i"}
				# myMusic["$text"] = {"$search": '"' + checkValidData(key, data, str).strip() + '"'}
			if key == "type":
				if checkValidData("type", data, str) in supportedTypes:
					myMusic["type"] = checkValidData("type", data, str)
				else:
					raise cherrypy.HTTPError(400, "Bad file type")
			if key == "artist_names":		#TODO: replace this with a check against artist db?
				print("finding artists")
				artistList = checkValidData(key, data, list)
				myArtists = []
				for artist in artistList:
					print(artist)
					if isinstance(artist, str):
						reg = Regex(r".*" + artist.strip() + r".*", "i")	#TODO: replace this with a direct check if we use an artist db
						# myArtists.append(artist)
						myArtists.append(reg)
					else:
						raise cherrypy.HTTPError(400, "Bad artist name")
				myMusic["artist"] = {"$in": myArtists}
			if key == "start_date":
				if "date" not in myMusic:
					myMusic["date"] = {"$gte": checkValidData(key, data, datetime.datetime, coerce=True)}
				else:
					myMusic["date"]["$gte"] = checkValidData(key, data, datetime.datetime, coerce=True)
			if key == "end_date":
				if "date" not in myMusic:
					myMusic["date"] = {"$lte": checkValidData(key, data, datetime.datetime, coerce=True) + datetime.timedelta(days=1)}
				else:
					myMusic["date"]["$lte"] = checkValidData(key, data, datetime.datetime, coerce=True) + datetime.timedelta(days=1)
			if key == "_id":
				myMusic["_id"] = checkValidID(data)

	# int fields
	for key in ("vol", "start", "end"):
		if key in data:
			myMusic[key] = checkValidData(key, data, int)
			if myMusic[key] < 0: myMusic[key] = 0
			if key == "vol" and myMusic[key] > 100: myMusic[key] = 100
	# return myMusic
	print("music query:", myMusic)
	if fast:
		return list(musicDB.find(myMusic))
	return cleanRet(musicDB.find(myMusic, myProjection).sort([("relev", {"$meta": "textScore"})]))	#this returns a relev score of 0 even if text search not used

def makePlaylistQuery(data, playlistDB, musicDB):
	print("creating query")
	myPlaylist = dict()
	musicList = set()

	for key in ["name", "start_date", "end_date", "song_names", "artist_names", "_id"]:
		if key in data:
			if key == "name":
				# myPlaylist[key] = r"/.*" + checkValidData(key, data, str) + r".*/i"
				myPlaylist[key] = {"$regex": r".*" + checkValidData(key, data, str) + r".*", "$options": "i"}
			if key == "start_date":
				print("checking start")
				print(checkValidData(key, data, datetime.datetime, coerce=True))
				print("passed")
				if "date" not in myPlaylist:
					myPlaylist["date"] = {"$gte": checkValidData(key, data, datetime.datetime, coerce=True)}
				else:
					myPlaylist["date"]["$gte"] = checkValidData(key, data, datetime.datetime, coerce=True)
			if key == "end_date":
				if "date" not in myPlaylist:
					myPlaylist["date"] = {"$lte": checkValidData(key, data, datetime.datetime, coerce=True) + datetime.timedelta(days=1)}
				else:
					myPlaylist["date"]["$lte"] = checkValidData(key, data, datetime.datetime, coerce=True) + datetime.timedelta(days=1)
			if key == "song_names":
				print("querying for song names")
				for n in checkValidData(key, data, list):
					for v in makeMusicQuery({"name": n}, musicDB, fast=True):
						musicList.add(v["_id"])
				print("done with song name query")
			if key == "artist_names":
				for v in makeMusicQuery({"artist": data[key]}, musicDB, fast=True):
					musicList.add(v["_id"])
			if key == "_id":
				myPlaylist[key] = checkValidID(data)
	if len(musicList) > 0:
		myPlaylist["contents"] = {"$in": list(musicList)}
	print("myPlaylist.contents:", musicList)
	print("playlist query:", myPlaylist)
	ret = list(playlistDB.find(myPlaylist))
	#add relevance markers in
	if len(musicList) > 0:
		for r in ret:
			r["relev"] = len([val for val in r["contents"] if val in musicList])
	else:
		for r in ret:
			r["relev"] = 0
	#sort by relevance
	ret.sort(key=operator.itemgetter("relev"), reverse=True)
	return cleanRet(ret)

def cleanRet(dataList):
	ret = list()
	for data in dataList:
		if "_id" in data:
			data["_id"] = str(data["_id"])
		if "date" in data:
			data["date"] = data["date"].isoformat()[:19]    # gets only up to seconds; add "Z" for UTC?
			data["dateStr"] = data["date"][:10]
		if "contents" in data:
			data["contents"] = [str(c) for c in data["contents"]]
		ret.append(data)
	print("returning:", ret)
	return ret

