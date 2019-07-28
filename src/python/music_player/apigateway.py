#!/usr/bin/env python3

import cherrypy
import os
import pymongo as pm

from bson.objectid import ObjectId
from io import BytesIO
from uuid import uuid4

import music_player.utils as m_utils

from datetime import datetime, timedelta

absDir = os.getcwd()
playlistFields = ["_id", "date", "contents", "name"]
musicFields = ["_id", "url", "type", "vol", "name", "artist", "start", "end"]

class ApiGateway(object):

	def __init__(self):
		client = pm.MongoClient()
		db = client['music']
		self.colMusic = db['music']
		self.colPlaylists = db['playlists']

	# API Functions go below. DO EXPOSE THESE

	@cherrypy.expose
	@cherrypy.tools.json_in()
	#@cherrypy.tools.json_out()
	def addMusic(self):
		"""
		Add a song to the database

		Expected input:

			{
				"url": (string),
				"type": (string) ("youtube" or "mp3"),
				"vol": (int) (0-100),
				"name": (string),
				"artist": [(string)],
				"start": (int) (in seconds,
				"end": (int) (number of seconds from the end of video to stop")
			}

		Returns::

			{
				"_id": (string),
			}

		:return: a dict containing the MongoDB objectId     ?
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		myRequest = m_utils.createMusic(data)

		# insert the data into the database
		self.colMusic.insert(myRequest)

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
				"name": (string),
				"artist": [(string)],
				"_id": (string)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		myQuery = m_utils.createMusicQuery(data)

		return list(self.colMusic.find(myQuery))

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
			# for x in data["content"]:
			#     if not ObjectId.is_valid(x):
			#         raise cherrypy.HTTPError(400, "Bad song id")
			#return in order requested
			stack = []
			i = len(data["content"]) - 1
			while i > 0:
				rec = {
					"$cond": [{
						"$eq": ["$_id", data["content"][i - 1]]
					},
					i]
				}
				if len(stack) == 0:
					rec["$cond"].append(i + 1)
				else:
					rec["$cond"].append(stack.pop())
				stack.append(rec)
				i -= 1
			projectStage = {"$project": {"order": stack[0]}}
			for f in musicFields:
				projectStage["$project"][f] = 1
			pipeline = [
				{"$match": {"_id": {"$in": data["content"]}}},
				# {"$project": {"order": stack[0]}},
				projectStage,
				{"$sort": {"order": 1}}
			]
			return m_utils.cleanRet(list(self.colMusic.aggregate(pipeline)))
			# return m_utils.cleanRet(list(self.colMusic.find({"_id": {"$in": data["content"]}})))
		raise cherrypy.HTTPError(400, "No playlist content data given")

	@cherrypy.expose
	@cherrypy.tools.json_in()
	def editMusic(self):
		"""
		Edits a song

		Expected input:
			{
				"url": (string) (optional),
				"type": (string) (optional),
				"name": (string) (optional),
				"artist": [(string)] (optional),
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
			raise cherrypy.HTTPError(400, "Song does not exist")

		# sanitize the input
		myQuery = m_utils.createMusicQuery(data)

		self.colMusic.update_one({"_id": myID}, {"$set": {myQuery}})

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
			if ObjectId.is_valid(myID):
				myData.append(myID)

		self.colMusic.remove({"_id": {"$in": myData}})

	@cherrypy.expose
	@cherrypy.tools.json_in()
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
		myPlaylist = dict()

		myPlaylist["name"] = m_utils.checkValidData("name", data, str)
		myPlaylist["date"] = datetime.datetime.now()
		contentList = m_utils.checkValidData("contents", data, list)
		myContent = []
		for song in contentList:
			if self.colMusic.count({"_id": song}) > 0:
				myContent.append(song)
			else:
				raise cherrypy.HTTPError(400, "Invalid song ID")
		myPlaylist["contents"] = myContent

		# add to database
		self.colPlaylists.insert(myRequest)

		return {"_id": str(self.colPlaylists.find(myRequest)["_id"])}

	@cherrypy.expose
	@cherrypy.tools.json_in()
	@cherrypy.tools.json_out()
	def findPlaylist(self):
		"""
		Returns a list of playlists matching the query

		Expected input (no field present -> return all):
			{
				"name": (string),
				"start_date": (datetime),
				"end_date": (datetime),
				"content": [(_id)],
				"_id": (string)
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		myQuery = m_utils.createPlaylistQuery(data)
		return m_utils.cleanRet(list(self.colPlaylists.find(myQuery)))

	@cherrypy.expose
	@cherrypy.tools.json_in()
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

		myID = m_utils.checkValidID(data)
		if self.colPlaylists.count({"_id": myID}) == 0:
			raise cherrypy.HTTPError(400, "Playlist does not exist")

		myPlaylist = dict()
		if "name" in data:
			myPlaylist["name"] = m_utils.checkValidData("name", data, str)
			myPlaylist["date"] = datetime.datetime.now()
		if "contents" in data:
			contentList = m_utils.checkValidData("contents", data, list)
			myContent = []
			for song in contentList:
				if self.colMusic.count({"_id": song}) > 0:
					myContent.append(song)
				else:
					raise cherrypy.HTTPError(400, "Invalid song ID")
			myPlaylist["contents"] = myContent
			myPlaylist["date"] = datetime.datetime.now()

		self.colPlaylists.update_one({"_id": myID}, {"$set": myPlaylist})

	@cherrypy.expose
	@cherrypy.tools.json_in()
	def removePlaylist(self):
		"""
		Removes a list of playlists

		Expected input:
			{
				"playlist": [(_id)]
			}
		"""
		# check that we actually have json
		if hasattr(cherrypy.request, 'json'):
			data = cherrypy.request.json
		else:
			raise cherrypy.HTTPError(400, 'No data was given')

		# sanitize the input
		#TODO implement

