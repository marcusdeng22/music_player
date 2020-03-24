#updates the DB with the following:
#	-normalizes all volumes around 50 (from 100)
#	-adds the "renamed" attribute to the lastPlay: sets it to the current name

import pymongo as pm

client = pm.MongoClient()
db = client["music"]

userList = [x["username"] for x in list(db["users"].find())]
print("Users: ", userList)

#normalize volume
for user in userList:
	db[user + "-music"].update_many({}, {"$mul": {"vol": 0.5}})

print("Normalized music library")

#normalize volume and add renamed attribute to lastPlay
db["lastPlay"].update_many({}, {"$mul": {"playlist.contents.$[].vol": 0.5}})

db["lastPlay"].aggregate([
	{
		"$addFields": {
			"playlist.renamed": "$playlist.name"
		}
	},
	{
		"$out": "lastPlay"
	}
])

print("Normalized and updated last played")