var rTorrent = require('./rtorrent');
var util = require('util');
var clientUtil = require('./util/clientUtil');
var formatUtil = require('./util/formatUtil');

var client = {
  add: function(data, callback) {
    var multicall = [
      []
    ];

    if (data.destination !== null && data.destination !== '') {
      multicall[0].push({
        methodName: 'execute',
        params: [
          'mkdir',
          '-p',
          data.destination
        ]
      });
    }

    var torrentsAdded = 0;

    while (torrentsAdded < data.urls.length) {
      var parameters = [
        '',
        data.urls[torrentsAdded]
      ];

      if (data.destination !== null && data.destination !== '') {
        parameters.push('d.directory.set="' + data.destination + '"');
      }

      parameters.push('d.custom.set=addtime,' + Math.floor(Date.now() / 1000));

      multicall[0].push({
        methodName: 'load.start',
        params: parameters
      });

      torrentsAdded++;
    }

    console.log(multicall);

    rTorrent.get('system.multicall', multicall).then(function(data) {
      callback(null, data);
    }, function(error) {
      callback(error, null);
    });
  },

  getTorrentDetails: function(hash, callback) {
    var params = [hash, ''].concat(clientUtil.defaults.peerPropertyMethods);
    rTorrent.get('p.multicall', params)
      .then(function(data) {
        var peers = clientUtil.mapClientProps(
          clientUtil.defaults.peerProperties,
          data
        );
        callback(null, peers);
      }, function(error) {
        callback(error, null);
      });
  },

  getTorrentList: function(callback) {
    rTorrent.get('d.multicall', clientUtil.defaults.torrentPropertyMethods)
      .then(function(data) {
        try {
          // create torrent array, each item in the array being
          // an object with human-readable property values
          var torrents = clientUtil.mapClientProps(
            clientUtil.defaults.torrentProperties,
            data
          );
          // Calculate extra properties.
          torrents = torrents.map(function(torrent) {
            torrent.percentComplete = formatUtil.percentComplete(
              torrent.bytesDone,
              torrent.sizeBytes
            );

            torrent.eta = formatUtil.eta(
              torrent.downloadRate,
              torrent.bytesDone,
              torrent.sizeBytes
            );

            torrent.status = formatUtil.status(
              torrent.isHashChecking,
              torrent.isComplete,
              torrent.isOpen,
              torrent.uploadRate,
              torrent.downloadRate,
              torrent.state
            );

            return torrent;
          });
        } catch (error) {
          console.log(error);
        }

        callback(null, torrents);
      }, function(error) {
        console.log(error);
        callback(error, null)
      });
  },

  stopTorrent: function(hash, callback) {
    if (!util.isArray(hash)) {
      hash = [hash];
    } else {
      hash = String(hash).split(',');
    }

    for (i = 0, len = hash.length; i < len; i++) {
      rTorrent.get('d.close', [hash[i]]).then(function(data) {
        callback(null, data);
      }, function(error) {
        callback(error, null);
      });
    }
  },

  startTorrent: function(hash, callback) {
    if (!util.isArray(hash)) {
      hash = [hash];
    } else {
      hash = String(hash).split(',');
    }

    for (i = 0, len = hash.length; i < len; i++) {
      rTorrent.get('d.resume', [hash[i]]).then(function(data) {
        callback(null, data);
      }, function(error) {
        callback(error, null);
      });

      rTorrent.get('d.start', [hash[i]]).then(function(data) {
        callback(null, data);
      }, function(error) {
        callback(error, null);
      });
    }
  },

  getTransferStats: function(callback) {
    try {
      var request = clientUtil.createMulticallRequest(
        clientUtil.defaults.clientPropertyMethods
      );

      request = [request];

      rTorrent.get('system.multicall', request)
        .then(function(data) {
          callback(null, clientUtil.mapClientProps(
            clientUtil.defaults.clientProperties, data)
          );
        }, function(error) {
          callback(error, null);
        });
    } catch(err) {
      console.log(err);
    }
  }
};

module.exports = client;