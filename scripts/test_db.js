//first drop the original database (inside mongo client):
//use procurement
//db.dropDatabase()
//then run this (outside mongo client):
//mongo scripts/debug_users.js

conn = new Mongo();
db = conn.getDB("music");
db.dropDatabase();

db.music.insert({
	"_id": 0,
	"url": "https://www.youtube.com/watch?v=YnmEePUXLRs",
	"type": "youtube",
	"vol": 100,
	"name": "The Less I Know the Better",
	"artist": "Tame Imapla",
	"start": 0,
	"end": 0
}, {}, function(e, r) {
	print(r)
	s1 = r[0]._id
})

db.music.insert({
	"_id": 1,
	"url": "https://www.youtube.com/watch?v=eNtK6jx9y4A",
	"type": "youtube",
	"vol": 100,
	"name": "Bad Ideas",
	"artist": "Tessa Violet",
	"start": 0,
	"end": 0
}, {}, function(e, r) {
	s2 = r[0]._id
})

db.music.insert({
	"_id": 2,
	"url": "https://www.youtube.com/watch?v=JCd9Z6cc_6Y",
	"type": "youtube",
	"vol": 100,
	"name": "Haze",
	"artist": "Tessa Violet",
	"start": 0,
	"end": 0
}, {}, function(e, r) {
	s3 = r[0]._id
})

db.music.update({"url": "https://www.youtube.com/watch?v=ZXbmsaVVWoI"}, {
	"_id": 3,
	"url": "https://www.youtube.com/watch?v=ZXbmsaVVWoI",
	"type": "youtube",
	"vol": 100,
	"name": "Party Tatoos",
	"artist": "Dodie",
	"start": 0,
	"end": 0
}, {"upsert": true})

db.playlists.insert({
	"name": "play1",
	"date": ISODate("2019-07-31T16:00:00.000Z"),
	"contents": [0, 1, 2, 3]
})

db.playlists.insert({
	"name": "playlist2",
	"date": ISODate("2019-08-01T16:00:00.000Z"),
	"contents": [3, 2, 1]
})

db.playlists.insert({
	"name": "list3",
	"date": ISODate("2019-08-02T16:00:00.000Z"),
	"contents": [3, 0, 1]
})
