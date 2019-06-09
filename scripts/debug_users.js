//first drop the original database (inside mongo client):
//use procurement
//db.dropDatabase()
//then run this (outside mongo client):
//mongo scripts/debug_users.js

conn = new Mongo();
db = conn.getDB("music");
db.dropDatabase();

db.playlists.insert({
    "name": "playlist1",
    "date": new Date("2019-03-01T09:00:00"),
    "contents": ["0", "1", "2"]
})

db.playlists.insert({
    "name": "playlist2",
    "date": new Date("2019-05-02T09:00:00"),
    "contents": ["1", "3"]
});


db.music.insert({
    "url": "https://www.youtube.com/watch?v=Q2bDD6u1fL8",
    "type": "youtube",
    "vol": 100,
    "name": "So What",
    "artist": "P!NK",
    "start": 0,
    "end": 0,
    "_id": "0"
});

db.music.insert({
    "url": "https://www.youtube.com/watch?v=0uljg5nLzWU",
    "type": "youtube",
    "vol": 100,
    "name": "Raise Your Glass",
    "artist": "P!NK",
    "start": 0,
    "end": 0,
    "_id": "1"
});

db.music.insert({
    "url": "https://www.youtube.com/watch?v=0uljg5nLzWU",
    "type": "youtube",
    "vol": 100,
    "name": "Raise Your Glass",
    "artist": "P!NK",
    "start": 0,
    "end": 0,
    "_id": "1"
});

db.music.insert({
    "url": "https://www.youtube.com/watch?v=DTtb9rt1tnk",
    "type": "youtube",
    "vol": 100,
    "name": "Complicated",
    "artist": "Avril Lavigne",
    "start": 0,
    "end": 0,
    "_id": "2"
});

db.music.insert({
    "url": "https://www.youtube.com/watch?v=MhkPWV97GQU",
    "type": "youtube",
    "vol": 100,
    "name": "Bohemian Rhapsody",
    "artist": "Queen",
    "start": 0,
    "end": 0,
    "_id": "3"
});

