/* jshint node:true */
'use strict';

const ssdp = require('node-ssdp').Client;
var http = require('http');

var ssdpClient = new ssdp({
	explicitSocketBind: true
});
/*ssdpClient.on('notify', function () {
	console.log('Got a notification.');
}).on('end', function() {
	console.log('stop ssdpcli');
});*/

var searches = {};
ssdpClient.findServices = function(name, callback) {
	if(!searches[name]) {
		searches[name] = {
			callback: callback,
			result: {},
			tmrResolve: null
		};
	}
	this.search(name);
	searches[name].tmrResolve = setTimeout(()=>{
		console.log('Resolve search');
	}, 1000);
};
ssdpClient.on('response', function inResponse(headers, code, rinfo) {
	//console.log('Got a response to an m-search:\n', code, headers, rinfo);
	Object.keys(searches).forEach((key) => {
		if(headers.USN.match(new RegExp(key.replace(/\*/g, '.*'), "g")) !== null) {
			var tmp = headers.ADDRESS + ':' + headers.PORT + '/' + headers.SERVICENAME;			

			if(!searches[key].result[headers.SERVICENAME]) {
				searches[key].result[headers.SERVICENAME] = [];
			}
			searches[key].result[headers.SERVICENAME].push(Array.prototype.slice.call(arguments));

			clearTimeout(searches[key].tmrResolve);
			searches[key].tmrResolve = setTimeout(()=>{
				//console.log('Hidden timer triggered!', searches[key].result[headers.SERVICENAME]);
				searches[key].result[headers.SERVICENAME].forEach((args) => {
					searches[key].callback.apply(this, args);
				});
			}, 400);
		}
	});
});

ssdpClient.findServices('urn:schemas-upnp-org:device:*', function(headers, code, rinfo) {
	//console.log('Got a response to an m-search: ', headers, code, rinfo);
	console.log('Got a response to an m-search: ', headers.SERVICENAME + "\t" + headers.ADDRESS + ':' + headers.PORT + "\thttp://" + headers.LOCATION);

	var options = {
		host: headers.ADDRESS,
		port: headers.PORT,
		path: '/stats'
	};

	/*http.request(options, function(response) {
		var str = '';

		//another chunk of data has been recieved, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
		});

		//the whole response has been recieved, so we just print it out here
		response.on('end', function () {
			console.log((headers.ADDRESS + ':' + headers.PORT + '/' + headers.SERVICENAME + (new Array(51)).join(' ')).substr(0, 50), str);
		});
	}).end();*/

});