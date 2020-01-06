//first drop the original database (inside mongo client):
//use procurement
//db.dropDatabase()
//then run this (outside mongo client):
//mongo scripts/debug_users.js

conn = new Mongo();
db = conn.getDB("music");
db.dropDatabase();

print("resetting db to debug data");

db.music.insert({
	// "_id": 0,
	"url": "https://www.youtube.com/watch?v=YnmEePUXLRs",
	"type": "youtube",
	"vol": 100,
	"name": "The Less I Know the Better",
	"artist": ["Tame Impala"],
	"start": 0,
	"end": 0,
	"date": ISODate("2019-07-31T16:00:00.000Z")
})

s1 = db.music.findOne({"url": "https://www.youtube.com/watch?v=YnmEePUXLRs"})["_id"]
// printjson(s1)
// print(s1["_id"])

db.music.insert({
	// "_id": 1,
	"url": "https://www.youtube.com/watch?v=eNtK6jx9y4A",
	"type": "youtube",
	"vol": 100,
	"name": "Bad Ideas",
	"artist": ["Tessa Violet"],
	"start": 0,
	"end": 0,
	"date": ISODate("2019-07-30T16:00:00.000Z")
}, {}, function(e, r) {
	s2 = r[0]._id
})

s2 = db.music.findOne({"url": "https://www.youtube.com/watch?v=eNtK6jx9y4A"})["_id"]
// print(s2["_id"])

db.music.insert({
	// "_id": 2,
	"url": "https://www.youtube.com/watch?v=JCd9Z6cc_6Y",
	"type": "youtube",
	"vol": 100,
	"name": "Haze",
	"artist": ["Tessa Violet"],
	"start": 0,
	"end": 0,
	"date": ISODate("2019-07-20T16:00:00.000Z")
})

s3 = db.music.findOne({"url": "https://www.youtube.com/watch?v=JCd9Z6cc_6Y"})["_id"]
// print(s3["_id"])

db.music.update({"url": "https://www.youtube.com/watch?v=ZXbmsaVVWoI"}, {
	// "_id": 3,
	"url": "https://www.youtube.com/watch?v=ZXbmsaVVWoI",
	"type": "youtube",
	"vol": 100,
	"name": "Party Tatoos",
	"artist": ["Dodie"],
	"start": 0,
	"end": 0,
	"date": ISODate("2019-12-31T16:00:00.000Z")
}, {"upsert": true})

s4 = db.music.findOne({"url": "https://www.youtube.com/watch?v=ZXbmsaVVWoI"})["_id"]
// print(s4["_id"])

db.artists.insert({"name": "Dodie"})
db.artists.insert({"name": "Tessa Violet"})
db.artists.insert({"name": "Tame Impala"})

db.playlists.insert({
	"name": "play1",
	"date": ISODate("2019-07-31T16:00:00.000Z"),
	// "contents": [0, 1, 2, 3]
	"contents": [s1, s2, s3, s4]
})

db.playlists.insert({
	"name": "playlist2",
	"date": ISODate("2019-08-01T16:00:00.000Z"),
	// "contents": [3, 2, 1]
	"contents": [s4, s3, s2]
})

db.playlists.insert({
	"name": "list3",
	"date": ISODate("2019-08-02T16:00:00.000Z"),
	// "contents": [3, 0, 1]
	"contents": [s4, s1, s2]
})

db.music.createIndex({"name": "text"})