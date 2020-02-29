#!/usr/bin/env python3

from __future__ import unicode_literals

import cherrypy
import os
import threading
import glob
import zipfile
import shutil
import pymongo as pm
import functools
import time

from bson.objectid import ObjectId
from io import BytesIO
from uuid import uuid4

import music_player.utils as m_utils

from datetime import datetime, timedelta

import youtube_dl
import eyed3

absDir = os.getcwd()
playlistFields = ["_id", "date", "dateStr", "contents", "name"]
musicFields = ["_id", "url", "type", "vol", "name", "artist", "start", "end"]

DOWNLOAD_FOLDER = "download"
downloadThreads = {}
avgDelay = 75	#expect about 75 ms to execute per second of the video
alpha = 0.05
networkDelay = 500	#expect 500ms between client and server

def authUser(func):
	'''
	Verify user is logged in; redirect if not
	'''
	@functools.wraps(func)
	def decorated_function(*args, **kwargs):
		user = cherrypy.session.get('name', None)

		# no user means force a login
		if user is None:
			# raise cherrypy.HTTPRedirect('/login')
			# raise cherrypy.HTTPRedirect('/')
			raise cherrypy.HTTPError(403, "Not logged in")
		return func(*args, **kwargs)

	return decorated_function

	# return decorator

class ApiGateway(object):

	def __init__(self):
		client = pm.MongoClient()
		self.db = client['music']
		# self.colArtist = db["artists"]	#this will be shared across users; same with genres: albums will be personal
		# self.colMusic = db['music']
		# self.colPlaylists = db['playlists']
		self.colUsers = self.db['users']
		self.colLast = self.db["lastPlay"]

	@authUser
	def getUser(self):
		return cherrypy.session.get("name")

	@authUser
	def musicDB(self):
		# user = cherrypy.session.get("name")
		return self.db[self.getUser() + "-music"]

	@authUser
	def playlistDB(self):
		# user = cherrypy.session.get("name")
		return self.db[self.getUser() + "-playlist"]

	# @authUser
	# def lastDB(self):
	# 	# user = cherrypy.session.get("name")
	# 	return self.db[self.getUser() + "-last"]

	# API Functions go below. DO EXPOSE THESE

	@cherrypy.expose
	@cherrypy.tools.json_in()
	def doLogin(self):
		"""
		Logs the user into the system

		Expected input:

			{
				"username": (string),
				"password": (string)
			}
		"""
		if hasattr(cherrypy.request, "json"):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, "No data was given")

		for k in ["username", "password"]:
			m_utils.checkValidData(k, data, str)
		user = self.colUsers.find_one({"username": data["username"]})
		if user is not None and m_utils.verifyUser(user, data["password"]):
			#set the session name
			cherrypy.session["name"] = data["username"]
			return
		else:
			raise cherrypy.HTTPError(403, "Invalid login credentials")

	@cherrypy.expose
	@cherrypy.tools.json_in()
	def changePassword(self):
		"""
		Changes the password for a user

		Expected input:

			{
				"username": (string),
				"old": (string),
				"new": (string)
			}
		"""
		if hasattr(cherrypy.request, "json"):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, "No data was given")

		for k in ["username", "old", "new"]:
			m_utils.checkValidData(k, data, str)
		user = self.colUsers.find_one({"username": data["username"]})
		if user is not None:
			newHash, newSalt = m_utils.changePassword(user, data["old"], data["new"])
			self.colUsers.update_one({"username": data["username"]}, {"$set": {"hash": newHash, "salt": newSalt}})
			return
		else:
			raise cherrypy.HTTPError(403, "Invalid login credentials")

	@cherrypy.expose
	@authUser
	def logout(self):
		"""
		Logs user out of system
		"""
		cherrypy.lib.sessions.expire()

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def addMusic(self):
		"""
		Add a song to the database

		Expected input:

			{
				"url": (string),
				"type": (string) ("youtube" or "mp3"),	//TODO: add other sources
				"vol": (int) (0-100),
				"name": (string),
				"artist": [(string)],
				"album": (string),
				"genre": (string),
				"start": (int) (in seconds),
				"end": (int) (number of seconds from the end of video to stop)
			}

		Returns::

			Added MongoDB object

		:return: the MongoDB object
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		myRequest = m_utils.createMusic(data, self.musicDB())
		myRequest["date"] = datetime.now()

		# insert the data into the database
		inserted = self.musicDB().insert(myRequest)

		#TODO: check if the artist exists; add if DNE
		# for artist in myRequest["artist"]:
		# 	if (len(list(self.colArtist.find({"name": artist}).limit(1))) == 0):
		# 		self.colArtist.insert_one({"name": artist})

		myRequest["_id"] = str(inserted)
		return m_utils.cleanRet(myRequest)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def addManyMusic(self):
		"""
		Add many songs to the database

		Expected input:

			[{
				"url": (string),
				"type": (string) ("youtube" or "mp3"),	//TODO: add other sources
				"vol": (int) (0-100),
				"name": (string),
				"artist": [(string)],
				"album": (string),
				"genre": (string),
				"start": (int) (in seconds),
				"end": (int) (number of seconds from the end of video to stop)
			},
			...]

		Returns::

			[{<MongoDB object>}, ...]

		:return: a list containing the inserted objects
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		myRequest = [];
		if not isinstance(data, list) or len(data) == 0:
			raise cherrypy.HTTPError(400, "Invalid data given")
		for song in data:
			if not isinstance(song, dict):
				raise cherrypy.HTTPError(400, "Invalid song data given")
			reqSong = m_utils.createMusic(song, self.musicDB())
			reqSong["date"] = datetime.now()

			# insert the data into the database
			myRequest.append(reqSong)
			# print(reqSong)

			#TODO: check if the artist exists; add if DNE
			# for artist in reqSong["artist"]:
			# 	if (len(list(self.colArtist.find({"name": artist}).limit(1))) == 0):
			# 		self.colArtist.insert_one({"name": artist})

			# reqSong["_id"] = str(inserted)
		# return m_utils.cleanRet(myRequest)
		inserted = self.musicDB().insert_many(myRequest)	#this is ordered by default
		for i, song in enumerate(myRequest):
			myRequest[i]["_id"] = inserted.inserted_ids[i]
		# print(myRequest)
		return m_utils.cleanRet(myRequest)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def findMusic(self):
		"""
		Returns a list of songs matching the query presented; limits to 25

		Expected input (no field present -> return all):
			{
				"url": [(string)],
				"type": [(string)],
				"song_names": [(string)],
				"artist_names": [(string)],
				"album_names": [(string)],
				"genre_names": [(string)],
				"start_date": (datetime),
				"end_date": (datetime),
				"_id": [(string)],
				"sortby": (string, default "date", ["date", "relev", "name"]),
				"descend": (boolean, default True, True=descending),
				# "page": (integer, default 0)
			}

		Returns: {
			"results": [{results}],
			"count": (int)
		}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		return m_utils.makeMusicQuery(data, self.musicDB())

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def findMusicList(self):
		"""
		Returns a list of songs matching the ids specified in a list. To be used in conjunction with playlist contents

		Expected input:
			{
				"content": [(_id)]
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		if "content" in data:
			# print("finding:", data["content"])
			# idList = [ObjectId(i) for i in data["content"]]
			idList = [m_utils.checkValidID(i) for i in m_utils.checkValidData("content", data, list)]
			# for x in idList:
			#     if not ObjectId.is_valid(x):
			#         raise cherrypy.HTTPError(400, "Bad song id")
			#return in order requested: from https://stackoverflow.com/questions/22797768/does-mongodbs-in-clause-guarantee-order/22800784
			# stack = []
			# i = len(idList) - 1
			# if i <= 0:
			# 	return []
			# while i > 0:
			# 	rec = {
			# 		"$cond": [{
			# 			"$eq": ["$_id", idList[i - 1]]
			# 		},
			# 		i]
			# 	}
			# 	if len(stack) == 0:
			# 		rec["$cond"].append(i + 1)
			# 	else:
			# 		rec["$cond"].append(stack.pop())
			# 	stack.append(rec)
			# 	i -= 1
			# projectStage = {"$project": {"order": stack[0]}}
			# for f in musicFields:
			# 	projectStage["$project"][f] = 1
			# pipeline = [
			# 	{"$match": {"_id": {"$in": idList}}},
			# 	# {"$project": {"order": stack[0]}},
			# 	projectStage,
			# 	{"$sort": {"order": 1}}
			# ]
			# return m_utils.cleanRet(self.colMusic.aggregate(pipeline))
			ret = []
			for i in idList:
				res = self.musicDB().find_one({"_id": i})
				if res == None:
					raise cherrypy.HTTPError(400, "Invalid id in playlist contents")
				ret.append(res)
			return m_utils.cleanRet(ret)
			# return m_utils.cleanRet(list(self.colMusic.find({"_id": {"$in": data["content"]}})))
		raise cherrypy.HTTPError(400, "No playlist content data given")

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def editMusic(self):
		"""
		Edits a list of songs

		Expected input:
			{
				"url": (string) (optional),
				"type": (string) (optional),
				"name": (string) (optional),
				"artist": [(string)] (optional),
				"album": (string) (optional),
				"genre": (string) (optional),
				"vol": (int) (optional),
				"start": (int) (optional),
				"end": (int) (optional),
				"_id": [(string)]
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		myIDList = [m_utils.checkValidID(i) for i in m_utils.checkValidData("_id", data, list)]
		for i in myIDList:
			if self.musicDB().count({"_id": i}) == 0:
				raise cherrypy.HTTPError(400, "Song does not exist")

		# sanitize the input
		myQuery = {}
		for key in ["url", "type", "name", "artist", "album", "genre", "vol", "start", "end"]:
			if key in data:
				if key == "artist":
					myQuery[key] = []
					for artist in m_utils.checkValidData(key, data, list):
						if isinstance(artist, str):
							myQuery[key].append(artist)
						else:
							raise cherrypy.HTTPError(400, "Invalid artist provided")
				elif key == "type":
					if m_utils.checkValidData(key, data, str) in m_utils.supportedTypes:
						myQuery[key] = data[key]
					else:
						raise cherrypy.HTTPError(400, "Invalid data type provided")
				elif key in ["vol", "start", "end"]:
					myQuery[key] = m_utils.checkValidData(key, data, int)
				else:
					myQuery[key] = m_utils.checkValidData(key, data, str)

		myQuery["date"] = datetime.now()
		inserted = self.musicDB().update_many({"_id": {"$in": myIDList}}, {"$set": myQuery})
		#TODO: update artist, album, genre DBs
		print("updated music:", inserted.raw_result)
		return m_utils.makeMusicQuery({"_id": myIDList}, self.musicDB())

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@authUser
	def removeMusic(self):
		"""
		Removes a list of songs from the database

		Expected input:
			{
				"music": [(string of _id)]
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		data = m_utils.checkValidData("music", data, list)
		myData = []
		for myID in data:
			myData.append(m_utils.checkValidID(myID))

		self.musicDB().remove({"_id": {"$in": myData}})
		# now remove from all playlists
		self.playlistDB().update_many({}, {
			"$pull": {"contents": {"$in": myData}}
		});

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def addPlaylist(self):
		"""
		Add a playlist to the database

		Expected input:
			{
				"name": (string),
				"contents": [(_id)]
			}

		Returns:
			{
				"_id": (_id)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		print("adding playlist");
		myPlaylist = dict()

		myPlaylist["name"] = m_utils.checkValidData("name", data, str)
		myPlaylist["date"] = datetime.now()
		contentList = m_utils.checkValidData("contents", data, list)
		myContent = []
		for song in contentList:
			if self.musicDB().count({"_id": m_utils.checkValidID(song)}) > 0:
				myContent.append(song)
			else:
				raise cherrypy.HTTPError(400, "Invalid song ID")
		myPlaylist["contents"] = myContent
		myPlaylist["date"] = datetime.now()

		# add to database
		inserted = self.playlistDB().insert(myPlaylist)

		myPlaylist["_id"] = str(inserted)
		return m_utils.cleanRet(myPlaylist)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def findPlaylist(self):
		"""
		Returns a list of playlists matching the query

		Expected input (no field present -> return all):
			{
				"playlist_names": [(string)],
				"start_date": (datetime),
				"end_date": (datetime),
				"artist_names": [(string)],
				"song_names": [(string)],
				"album_names": [(string)],
				"genre_names": [(string)],
				"_id": (string)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		return m_utils.makePlaylistQuery(data, self.playlistDB(), self.musicDB())

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def editPlaylist(self):
		"""
		Edits the name or contents of a playlist

		Expected input:
			{
				"_id": ObjectID,
				"name": (string) (optional),
				"contents": [(_id)] (optional)
			}

		Returns the resolved contents of the updated playlist
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		print("editing playlist")
		myID = m_utils.checkValidID(data)
		if self.playlistDB().count({"_id": myID}) == 0:
			raise cherrypy.HTTPError(400, "Playlist does not exist")

		myPlaylist = dict()
		if "name" in data:
			myPlaylist["name"] = m_utils.checkValidData("name", data, str)
		if "contents" in data:
			contentList = m_utils.checkValidData("contents", data, list)
			myContent = []
			for song in contentList:
				if self.musicDB().count({"_id": m_utils.checkValidID(song)}) > 0:
					myContent.append(ObjectId(song))
				else:
					raise cherrypy.HTTPError(400, "Invalid song ID")
			myPlaylist["contents"] = myContent
		myPlaylist["date"] = datetime.now()
		# print("updating playlist with:", myPlaylist)

		inserted = self.playlistDB().update_one({"_id": myID}, {"$set": myPlaylist})
		print("updated playlist:", inserted.raw_result)
		return m_utils.cleanRet(self.playlistDB().find_one({"_id": myID}))

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@authUser
	def removePlaylists(self):
		"""
		Removes a list of playlists

		Expected input:
			{
				"playlists": [(_id)]
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		if "playlists" in data:
			myQuery = []
			for i in data["playlists"]:
				myQuery.append(m_utils.checkValidID(i))
			self.playlistDB().delete_many({"_id": {"$in": myQuery}})
		else:
			raise cherrypy.HTTPError(400, "No data given")

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def checkStatus(self):
		"""
		Checks if the download thread is complete

		Expected input:
			{
				"name": (string)
			}

		Output:
			{
				"completed": (boolean)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		threadName = m_utils.checkValidData("name", data, str)

		if threadName not in downloadThreads:
			return {"completed": True}	#is this correct?
		if downloadThreads[threadName].isAlive():
			return {"completed": False}
		#else thread is done, remove it and return true
		downloadThreads[threadName].join()
		del downloadThreads[threadName]
		return {"completed": True}

	def downloadTag(self, ytdl, dest, song, fmt):
		ytdl.download([song["url"]])
		# songInfo = ytdl.extract_info(song["url"], download=True)
		# print("SONG DURATION:", songInfo["duration"])
		targFile = os.path.join(dest, "{}.{}".format(song["name"], fmt))
		os.rename(os.path.join(dest, "{}.{}".format(song["id"], fmt)), targFile)
		toTag = eyed3.load(targFile)
		toTag.tag.title = song["name"]
		if "album" in song:
			toTag.tag.album = song["album"]
		if "artistStr" in song:
			toTag.tag.artist = song["artistStr"]
		if "genre" in song:
			toTag.tag.genre = song["genre"]
		toTag.tag.save()

	def multiDownloadTag(self, ytdl, dest, songs, fmt):
		threads = []
		for s in songs:
			t = threading.Thread(target=self.downloadTag, args=(ytdl, dest, s, fmt))
			threads.append(t)
			t.start()
		for t in threads:
			t.join()

	def setupDownload(self, randDir, name, songs, type, totalDuration):
		#start measuring for time to download, convert, and package
		start = time.perf_counter()
		downloadDir = os.path.join(DOWNLOAD_FOLDER, randDir)
		if not os.path.exists(downloadDir):
			os.makedirs(downloadDir)
		yt_opts = {
			"format": "bestaudio",
			"postprocessors": [{
				"key": "FFmpegExtractAudio",
				"preferredcodec": type,
				"preferredquality": "0"
			}],
			"outtmpl": os.path.join(downloadDir, "%(id)s.%(ext)s")
		}
		#download
		with youtube_dl.YoutubeDL(yt_opts) as ydl:
			self.multiDownloadTag(ydl, downloadDir, songs, type)
		# now zip if multiple
		if len(songs) > 1:
			retName = os.path.join(downloadDir, "{}.zip".format(name))
			with zipfile.ZipFile(retName, "w", zipfile.ZIP_DEFLATED) as myZip:
				for f in glob.glob(os.path.join(downloadDir, "*.{}".format(type))):
					myZip.write(f, os.path.basename(f))
					os.remove(f)
		#calculate exponential moving average
		exec_time = round((time.perf_counter() - start) * 1000 / totalDuration)
		print("Average time of execution per second of video:", exec_time)
		global avgDelay
		avgDelay = round(alpha * exec_time + (1 - alpha) * avgDelay)
		print("New average delay:", avgDelay)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	@authUser
	def generate(self):
		"""
		Downloads a lists of songs from youtube and prepares them for client side download

		Expected input:
			{
				"name": (string),
				"songs": [(Music dict)],
				"type": "mp3" or "mp4"
			}

		Output:
			{
				"path": (path to file or zipfile)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		for key in ["name", "songs", "type"]:
			if key not in data:
				raise cherrypy.HTTPError(400, "Invalid download parameters")
			if key != "songs":
				m_utils.checkValidData(key, data, str)
			else:
				for s in m_utils.checkValidData(key, data, list):
					# print(s)
					if isinstance(s, dict):
						for u in s:
							if u in ["url", "id", "name", "album", "artistStr", "genre"]:
								# print(u)
								m_utils.checkValidData(u, s, str)
						# print("passed")
						for k in ["url", "id", "name"]:
							if k not in s:
								raise cherrypy.HTTPError(400, "Missing {} key".format(k))
					else:
						raise cherrypy.HTTPError(400, "Invalid data download")
		if data["type"] in ["mp3", "mp4"]:
			randDir = str(uuid4())
			#precompute the return paths
			downloadDir = os.path.join(DOWNLOAD_FOLDER, randDir)
			if len(data["songs"]) > 1:
				fileName = os.path.join(downloadDir, "{}.zip".format(data["name"]))
			else:
				fileName = os.path.join(downloadDir, "{}.{}".format(data["name"], data["type"]))
			#get the total song duration
			totalDuration = 0	#in seconds
			for s in data["songs"]:
				songInfo = youtube_dl.YoutubeDL({"format": "worst"}).extract_info(s["url"], process=False, download=False)
				print("SONG DURATION:", songInfo["duration"])
				totalDuration += songInfo["duration"]
			#start the download process
			t = threading.Thread(target=self.setupDownload, args=(randDir, data["name"], data["songs"], data["type"], totalDuration))
			downloadThreads[fileName] = t
			t.start()
			#return the info
			return {"path": fileName, "expected": totalDuration * avgDelay + networkDelay}
		# if "songs" in data and "type" in data and data["type"] in ["mp3", "mp4"]:
		# 	randDir = str(uuid4())
		# 	downloadDir = os.path.join(DOWNLOAD_FOLDER, randDir)
		# 	if not os.path.exists(downloadDir):
		# 		os.makedirs(downloadDir)
		# 	yt_opts = {
		# 		"format": "bestaudio",
		# 		"postprocessors": [{
		# 			"key": "FFmpegExtractAudio",
		# 			"preferredcodec": data["type"],
		# 			"preferredquality": "0"
		# 		}],
		# 		"outtmpl": os.path.join(downloadDir, "%(id)s.%(ext)s")
		# 	}
		# 	#download
		# 	with youtube_dl.YoutubeDL(yt_opts) as ydl:
		# 		self.multiDownloadTag(ydl, downloadDir, data["songs"], data["type"])
		# 	# now zip if multiple
		# 	retName = ""
		# 	if len(data["songs"]) > 1:
		# 		retName = os.path.join(downloadDir, "{}.zip".format(data["name"]))
		# 		with zipfile.ZipFile(retName, "w", zipfile.ZIP_DEFLATED) as myZip:
		# 			for f in glob.glob(os.path.join(downloadDir, "*.{}".format(data["type"]))):
		# 				myZip.write(f, os.path.basename(f))
		# 				os.remove(f)
		# 	else:
		# 		retName = os.path.join(downloadDir, "{}.{}".format(data["name"], data["type"]))
		# 	return {"path": retName}
		# 	# return cherrypy.lib.static.serve_download(os.path.join(absDir, retName), os.path.basename(retName))
		else:
			raise cherrypy.HTTPError(400, "Missing download data")

	@cherrypy.expose
	@authUser
	def download(self, *argv):
		print("DOWNLOADING", argv)
		targetPath = os.path.join(*argv)
		if argv[0] != DOWNLOAD_FOLDER or not os.path.exists(targetPath) or len(argv) != 3:	#(DOWNLOAD_FOLDER, uuid, file name)
			raise cherrypy.HTTPError(404, "File not found")
		res = cherrypy.lib.static.serve_download(os.path.join(absDir, targetPath), os.path.basename(targetPath))
		shutil.rmtree(os.path.join(argv[0], argv[1]), ignore_errors=True)
		return res

	@cherrypy.expose
	@authUser
	@cherrypy.tools.json_in()
	def setLast(self):
		"""
		Sets the last played playlist

		Expected input:
			{
				"unset": (boolean, optional),
				"_id": (_id, optional),
				"name": (string, optional),
				"contents": [(dict)] (optional),	#order is important; will store the shuffled order
				"startIndex": (int, optional),
				"touched": (boolean, optional),
				"loop": (boolean, optional),
				"shuffle": (boolean, optional)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		myQuery = {
			"user": self.getUser(),
			# "playlist": {}
		}
		unset = {}

		if "unset" in data:
			unset = {"playlist._id": ""}
		if "_id" in data:
			myQuery["playlist._id"] = m_utils.checkValidID(data, False)		#don't store as ObjectId
		if "name" in data:
			myQuery["playlist.name"] = m_utils.checkValidData("name", data, str)
		if "contents" in data:
			myQuery["playlist.contents"] = m_utils.checkValidData("contents", data, list)
		if "startIndex" in data:
			myQuery["playlist.startIndex"] = m_utils.checkValidData("startIndex", data, int)
		if "touched" in data:
			myQuery["playlist.touched"] = m_utils.checkValidData("touched", data, bool)
		if "loop" in data:
			myQuery["loop"] = m_utils.checkValidData("loop", data, bool)
		if "shuffle" in data:
			myQuery["shuffle"] = m_utils.checkValidData("shuffle", data, bool)

		updateQ = {}
		if len(unset) > 0:
			updateQ["$unset"] = unset
		if len(myQuery) > 1:
			updateQ["$set"] = myQuery
		if len(updateQ) > 0:
			self.colLast.update_one({"user": self.getUser()}, updateQ, upsert=True)

	@cherrypy.expose
	@authUser
	@cherrypy.tools.json_out()
	def getLast(self):
		"""
		Gets the last played playlist
		"""
		result = self.colLast.find_one({"user": self.getUser()})
		if result is None:
			return
		# result = result["playlist"]
		if "name" not in result["playlist"] or "contents" not in result["playlist"]:
			return

		del result["_id"]
		return result