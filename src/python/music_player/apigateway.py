#!/usr/bin/env python3

from __future__ import unicode_literals

import cherrypy
import os
import pymongo as pm

from bson.objectid import ObjectId
from io import BytesIO
from uuid import uuid4

import music_player.utils as m_utils

from datetime import datetime, timedelta

import youtube_dl

absDir = os.getcwd()
playlistFields = ["_id", "date", "dateStr", "contents", "name"]
musicFields = ["_id", "url", "type", "vol", "name", "artist", "start", "end"]

class ApiGateway(object):

	def __init__(self):
		client = pm.MongoClient()
		db = client['music']
		self.colArtist = db["artists"]
		self.colMusic = db['music']
		self.colPlaylists = db['playlists']

	# API Functions go below. DO EXPOSE THESE

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

			{
				"_id": (string),
			}

		:return: a dict containing the MongoDB objectId
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		myRequest = m_utils.createMusic(data)
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
	def findMusic(self):
		"""
		Returns a list of songs matching the query presented

		Expected input (no field present -> return all):
			{
				"url": (string),
				"type": (string),
				"song_names": [(string)],
				"artist_names": [(string)],
				"album_names": [(string)],
				"genre_names": [(string)],
				"start_date": (datetime),
				"end_date": (datetime),
				"_id": (string)
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
		Edits a song

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
				"_id": (string)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		myID = m_utils.checkValidID(data)
		if self.colMusic.count({"_id": myID}) == 0:
		# if self.colMusic.count({"_id": m_utils.checkValidID(data)}) == 0:
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
		inserted = self.colMusic.update_one({"_id": myID}, {"$set": myQuery})
		#TODO: update artist, album, genre DBs
		print("updated music:", inserted.raw_result)
		return m_utils.cleanRet(self.colMusic.find_one({"_id": myID}))

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


	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def download(self):
		"""
		Downloads a lists of songs from youtube

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
				for u in m_utils.checkValidData(key, data, dict):
					if u in ["url", "title", "album", "artistStr", "genre"]:
						m_utils.checkValidData(u, data[key], str)
				for k in ["url", "title"]:
					if k not in data[key]:
						raise cherrypy.HTTPError(400, "Missing {} key".format(k))
		if "songs" in data and "type" in data:
			if data["type"] in ["mp3", "mp4"]:
				class MyLogger(object):
					def debug(self, msg):
						print("debug:", msg)
					def warning(self, msg):
						print("warning:", msg)
					def error(self, msg):
						print("error:", msg)

				# def my_hook(d):
				# 	# print("HOOK")
				# 	# print(d)
				# 	if d["status"] == "finished":
				# 		print("done downloading!")
				randDir = uuid4()
				yt_opts = {
					"format": "bestaudio",
					"postprocessors": [{
						"key": "FFmpegExtractAudio",
						"preferredcodec": data["type"],
						"preferredquality": "0"
					}],
					"outtmpl": "download/{}/%(id)s.%(ext)s".format(randDir),		#TODO: replace this with a combination of artist-title; from input
					"logger": MyLogger(),
					# "progress_hooks": [my_hook]
				}
				#download
				with youtube_dl.YoutubeDL(yt_opts) as ydl:
					print(ydl.params)
					print(ydl.download([s["url"] for s in data["songs"]]))	#TODO: output to a randomly named folder, and provide this link
