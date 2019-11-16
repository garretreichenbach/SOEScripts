const fs = require('fs');
const path= require('path');
const stationsFolder = path.join(__dirname, "../data/stations");

exports.addStation = function(stationObj, factionObj, cb) {
    console.log("addMiningStation function ran..");
    let stationType = "mining";
    let factionNumber = factionObj.toString();
    let storedResources = [];
    let upgrades = [];
    return writeStationData(stationObj.fullUID, stationType, factionNumber, storedResources, upgrades, cb);
}

function writeStationData(stationUID, stationType, faction, storedResources, upgrades, cb) {
    let station = {
        "UID": stationUID,
        "type": stationType,
        "faction": faction,
        "upgrades": upgrades,
        "storage": storedResources
    };
    let stationFile=path.join(stationsFolder,stationUID + ".json");
    try { // This may not catch errors since we are using asyncronous functions below.
        return fs.writeFile(stationFile, JSON.stringify(station, null, 4), cb);
    } catch (err){
        return cb(err,null);
    }
}