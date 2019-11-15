
const fs = require('fs');
const path= require('path');
const DataWriter = require(path.join(__dirname, '../DataWriter'));
const MiningStation = require(path.join(__dirname, '../Stations/MiningStation'));

exports.createMiningStation = function(player) {
    await player.msg("Setting this station as a mining platform...");
    try {
        let stationType = "mining";
        let playerEntity = await player.currentEntity();
        if(playerEntity) {
            var entityType = await playerEntity.type();
            if(entityType == "station") {
                let playerFaction = await player.faction();
                if(playerFaction) {
                    await DataWriter.addStation(playerEntity, stationType, function(err, result) {
                        if (err){
                            console.log("There was an error adding the station: ", err);
                            return player.msg("There was an error adding the station!  Please try again!");
                        } else {
                            return player.msg("Set the station's type to " + stationType + " !") 
                        }
                    }); 
                } else {
                    await player.msg("You must be in a faction to designate a station's type!  Please join a faction first!");
                }
            } else {
                await player.msg(`Error:  You are in a ${entityType} which is not a station!`);
                await player.msg("Please enter a build block for the station you would like to designate.");    
            }
        } else {
            await player.msg("To designate a station's type, you must be in control of the station.  Please enter a build block for the station you would like to designate.");
        }
    } catch(err) {
        console.log("An error happened when attempting to set station for player: " + player.toString(), err);
        console.dir(err);
    }
}