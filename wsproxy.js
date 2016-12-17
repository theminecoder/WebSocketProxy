var socket = require("socket.io"),
    socketClient = require("socket.io-client"),
    path = require('path'),
    url = require('url');

if (process.argv.length < 3) {
    console.error("Usage: " + (path.parse(process.argv[1]).base) + " <remote websocket address> <port>");
    process.exit(1);
    return;
}

if (url.parse(process.argv[2]).hostname == null) {
    console.error("No valid websocket address found!");
    process.exit(1);
    return;
}

var port = parseInt(process.argv[3]) || 8080;
var server = socket(port);
server.on('connection', function (client) {
    console.log("New proxy connection started!")
    var remoteClient = socketClient(process.argv[2]);

    // Add catch all listeners! Does all the magic.
    var oneventRemote = remoteClient.onevent;
    remoteClient.onevent = function (packet) {
        var args = packet.data || [];
        oneventRemote.call(this, packet);
        packet.data = ["*"].concat(args);
        oneventRemote.call(this, packet);
    };
    var oneventLocal = client.onevent;
    client.onevent = function (packet) {
        var args = packet.data || [];
        oneventLocal.call(this, packet);
        packet.data = ["*"].concat(args);
        oneventLocal.call(this, packet);
    };

    remoteClient.on('connect', function () {
        console.log("Connected")
    });
    remoteClient.on('connect_error', console.error);
    remoteClient.on('*', function (channel, data) {
        console.log("> " + channel + ": " + (data ? JSON.stringify(data) : "null"));
        client.emit(channel, data)
    });

    client.on('*', function (channel, data) {
        console.log("< " + channel + ":" + (data ? JSON.stringify(data) : "null"));
        remoteClient.emit(channel, data);
    });
    client.on('disconnect', function () {
        remoteClient.close();
        console.log("Disconnecting remote proxy")
    });
});
console.log("Server started on " + port);