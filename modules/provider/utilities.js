'use strict'

var async = require('async')
var _ = require('lodash')

module.exports = function(getData, getRaw) {
  var data = {}

  function getHosts(stream) {
    data = getData()
    async.forEachOf(data, function(n, k, finished1) {
      if (_.has(n, 'nodeinfo.hostname')) {
        var hostname = _.get(n, 'nodeinfo.hostname', 'unknown').toLowerCase().replace(/[^0-9a-z-_]/g,'')
        async.forEachOf(n.nodeinfo.network.addresses, function(a,l,finished2) {
          if (a.slice(0,4) != 'fe80')
            stream.write((a + ' ' + hostname) + '\n')
          finished2()
        }, finished1)
      } else
        finished1()
    }, function(err) {
      stream.end()
    })
  }

  function getWifiAliases(stream) {
    data = getData()
    function write(mac, hostname, primaryMac) {
      stream.write(mac + '|' + hostname + ' (' + primaryMac + ')\n')
    }
    function getAPMac(mac, offset) {
      //thanks to pixelistik
      var parts = mac.split(":").map(function(d) {
        return parseInt(d, 16)
      })
  
      parts[0] = parts[0] + 2 % 255
      parts[1] = parts[1] + 2 % 255
      parts[2] = parts[2] + offset % 255
  
      return parts.map(function(d) {
        var i = d.toString(16)
        return ("0" + i).substr(i.length-1)
      }).join(":")
    }
    async.forEachOf(_.filter(data, 'nodeinfo.network.mac'), function(n, k, finished1) {
      var hostname = _.get(n, 'nodeinfo.hostname', 'unknown')
      var mac = _.get(n, 'nodeinfo.network.mac')
      write(getAPMac(mac, 1), hostname, mac)
      write(getAPMac(mac, 2), hostname + " (5GHz)", mac)
      finished1()
    }, function() {
      stream.end()
    })
  }

  function getDataJson(stream) {
    stream.write(JSON.stringify(getData()))
  }

  function getRawJson(stream) {
    stream.write(JSON.stringify(getRaw()))
  }

  var exports = {}
  exports['WifiAnalyzer_Alias.txt'] = getWifiAliases
  exports['wifi-aliases.txt'] = getWifiAliases
  exports['data.json'] = getDataJson
  exports['raw.json'] = getRawJson
  exports['hosts'] = getHosts
  return exports
}
