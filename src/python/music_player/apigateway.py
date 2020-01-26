#!/usr/bin/env python3

from __future__ import unicode_literals

import cherrypy
import os
import threading
import glob
import zipfile
import shutil
import pymongo as pm

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

class ApiGateway(object):

	def __init__(self):
		client = pm.MongoClient()
		db = client['music']
		self.colArtist = db["artists"]
		self.colMusic = db['music']
		self.colPlaylists = db['playlists']
		self.colUsers = db['users']

	# API Functions go below. DO EXPOSE THESE

	@cherrypy.expose
	@cherrypy.tools.json_in()
	def login(self):
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
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
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
		myRequest = m_utils.createMusic(data, self.colMusic)
		myRequest["date"] = datetime.now()

		# insert the data into the database
		inserted = self.colMusic.insert(myRequest)

		#check if the artist exists; add if DNE
		for artist in myRequest["artist"]:
			if (len(list(self.colArtist.find({"name": artist}).limit(1))) == 0):
				self.colArtist.insert_one({"name": artist})

		myRequest["_id"] = str(inserted)
		return m_utils.cleanRet(myRequest)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
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
			reqSong = m_utils.createMusic(song, self.colMusic)
			reqSong["date"] = datetime.now()

			# insert the data into the database
			# inserted = self.colMusic.insert(reqSong)
			myRequest.append(reqSong)
			print(reqSong)

			#check if the artist exists; add if DNE
			for artist in reqSong["artist"]:
				if (len(list(self.colArtist.find({"name": artist}).limit(1))) == 0):
					self.colArtist.insert_one({"name": artist})

			# reqSong["_id"] = str(inserted)
		# return m_utils.cleanRet(myRequest)
		inserted = self.colMusic.insert_many(myRequest)	#this is ordered by default
		for i, song in enumerate(myRequest):
			myRequest[i]["_id"] = inserted.inserted_ids[i]
		print(myRequest)
		return m_utils.cleanRet(myRequest)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def findMusic(self):
		"""
		Returns a list of songs matching the query presented

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
				"_id": [(string)]
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		# myQuery = m_utils.createMusicQuery(data)

		# return list(self.colMusic.find(myQuery))
		return m_utils.makeMusicQuery(data, self.colMusic)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
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
			print("finding:", data["content"])
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
				res = self.colMusic.find_one({"_id": i})
				if res == None:
					raise cherrypy.HTTPError(400, "Invalid id in playlist contents")
				ret.append(res)
			return m_utils.cleanRet(ret)
			# return m_utils.cleanRet(list(self.colMusic.find({"_id": {"$in": data["content"]}})))
		raise cherrypy.HTTPError(400, "No playlist content data given")

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
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

		# myID = m_utils.checkValidID(data)
		# if self.colMusic.count({"_id": myID}) == 0:
		# # if self.colMusic.count({"_id": m_utils.checkValidID(data)}) == 0:
		# 	raise cherrypy.HTTPError(400, "Song does not exist")
		myIDList = [m_utils.checkValidID(i) for i in m_utils.checkValidData("_id", data, list)]
		for i in myIDList:
			if self.colMusic.count({"_id": i}) == 0:
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
		inserted = self.colMusic.update_many({"_id": {"$in": myIDList}}, {"$set": myQuery})
		#TODO: update artist, album, genre DBs
		print("updated music:", inserted.raw_result)
		# return m_utils.cleanRet(self.colMusic.find({"_id": {"$in": myIDList}}))
		return m_utils.makeMusicQuery({"_id": myIDList}, self.colMusic)

	@cherrypy.expose
	@cherrypy.tools.json_in()
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

		self.colMusic.remove({"_id": {"$in": myData}})
		# now remove from all playlists
		self.colPlaylists.update_many({}, {
			"$pull": {"contents": {"$in": myData}}
		});

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
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
			# if self.colMusic.count({"_id": ObjectId(song)}) > 0:
			if self.colMusic.count({"_id": m_utils.checkValidID(song)}) > 0:
				myContent.append(song)
			else:
				raise cherrypy.HTTPError(400, "Invalid song ID")
		myPlaylist["contents"] = myContent
		myPlaylist["date"] = datetime.now()

		# add to database
		inserted = self.colPlaylists.insert(myPlaylist)

		# return {"_id": str(self.colPlaylists.find(myPlaylist)["_id"])}
		# return {"_id": str(self.colPlaylists.find_one(myPlaylist)["_id"])}
		myPlaylist["_id"] = str(inserted)
		return m_utils.cleanRet(myPlaylist)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
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
		# myQuery = m_utils.createPlaylistQuery(data, self.colPlaylists, self.colMusic)
		# return m_utils.cleanRet(list(self.colPlaylists.find(myQuery)))
		return m_utils.makePlaylistQuery(data, self.colPlaylists, self.colMusic)

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def editPlaylist(self):
		"""
		Edits the name or contents of a playlist

		Expected input:
			{
				"_id": ObjectID,
				"name": (string) (optional),
				"contents": [(_id)] (optional)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		print("editing playlist")
		myID = m_utils.checkValidID(data)
		if self.colPlaylists.count({"_id": myID}) == 0:
			raise cherrypy.HTTPError(400, "Playlist does not exist")

		myPlaylist = dict()
		if "name" in data:
			myPlaylist["name"] = m_utils.checkValidData("name", data, str)
		if "contents" in data:
			contentList = m_utils.checkValidData("contents", data, list)
			myContent = []
			for song in contentList:
				if self.colMusic.count({"_id": m_utils.checkValidID(song)}) > 0:
					myContent.append(ObjectId(song))
				else:
					raise cherrypy.HTTPError(400, "Invalid song ID")
			myPlaylist["contents"] = myContent
		myPlaylist["date"] = datetime.now()
		print("updating playlist with:", myPlaylist)

		inserted = self.colPlaylists.update_one({"_id": myID}, {"$set": myPlaylist})
		print("updated playlist:", inserted.raw_result)
		return m_utils.cleanRet(self.colPlaylists.find_one({"_id": myID}))

	@cherrypy.expose
	@cherrypy.tools.json_in()
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
			self.colPlaylists.delete_many({"_id": {"$in": myQuery}})
		else:
			raise cherrypy.HTTPError(400, "No data given")

	def downloadTag(self, ytdl, dest, song, fmt):
		ytdl.download([song["url"]])
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

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
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
					print(s)
					if isinstance(s, dict):
						for u in s:
							if u in ["url", "id", "name", "album", "artistStr", "genre"]:
								print(u)
								m_utils.checkValidData(u, s, str)
						print("passed")
						for k in ["url", "id", "name"]:
							if k not in s:
								raise cherrypy.HTTPError(400, "Missing {} key".format(k))
					else:
						raise cherrypy.HTTPError(400, "Invalid data download")
		if "songs" in data and "type" in data and data["type"] in ["mp3", "mp4"]:
			randDir = str(uuid4())
			downloadDir = os.path.join(DOWNLOAD_FOLDER, randDir)
			if not os.path.exists(downloadDir):
				os.makedirs(downloadDir)
			yt_opts = {
				"format": "bestaudio",
				"postprocessors": [{
					"key": "FFmpegExtractAudio",
					"preferredcodec": data["type"],
					"preferredquality": "0"
				}],
				"outtmpl": os.path.join(downloadDir, "%(id)s.%(ext)s")
			}
			#download
			with youtube_dl.YoutubeDL(yt_opts) as ydl:
				self.multiDownloadTag(ydl, downloadDir, data["songs"], data["type"])
			# now zip if multiple
			retName = ""
			if len(data["songs"]) > 1:
				retName = os.path.join(downloadDir, "{}.zip".format(data["name"]))
				with zipfile.ZipFile(retName, "w", zipfile.ZIP_DEFLATED) as myZip:
					for f in glob.glob(os.path.join(downloadDir, "*.{}".format(data["type"]))):
						myZip.write(f, os.path.basename(f))
						os.remove(f)
			else:
				retName = os.path.join(downloadDir, "{}.{}".format(data["name"], data["type"]))
			return {"path": retName}
			# return cherrypy.lib.static.serve_download(os.path.join(absDir, retName), os.path.basename(retName))
		else:
			raise cherrypy.HTTPError(400, "Missing download data")

	@cherrypy.expose
	def download(self, *argv):
		print("DOWNLOADING", argv)
		targetPath = os.path.join(*argv)
		if argv[0] != DOWNLOAD_FOLDER or not os.path.exists(targetPath) or len(argv) != 3:	#(DOWNLOAD_FOLDER, uuid, file name)
			raise cherrypy.HTTPError(404, "File not found")
		res = cherrypy.lib.static.serve_download(os.path.join(absDir, targetPath), os.path.basename(targetPath))
		shutil.rmtree(os.path.join(argv[0], argv[1]), ignore_errors=True)
		return res