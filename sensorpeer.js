configfile = './config.json';
//Enable full path
config = require(configfile);

_ = require('underscore/underscore.js')._
Promise = require('es6-promise').Promise;
Events = require('./events.js');
http = require('http'),
Cam = require('onvif').Cam;

WebSocket = require('websocket').client;
pg = require('pg').native;
//Set global dbUrl
GLOBAL.dbUrl = config.dbUrl;
//Set env var to accept all certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//Cow = require('./bower_components/cow/dist/cow.node.js');
Cow = require('/var/data/sites/cow/dist/cow.nodb.js');

core = new Cow.core({
    herdname: config.herdname,
    maxage: 1000 * 60 * 60 * 24 * 365 //one year 
});
if (!core.socketservers('default')){
   core.socketservers({
        _id: 'default', 
        data: {
        	protocol: config.protocol,
        	ip: config.ip, 
        	port: config.port,
        	dir: config.dir}
      });
};
core.socketserver('default');
core.connect();
core.userStore().loaded.then(function(){
	console.log(core.users().length, ' users loaded');
});

core.projectStore().loaded.then(function(){
	console.log(core.projects().length, ' projects loaded');
	core.peer().data('superpeer', true).sync();
	console.log('My peerid: ', core.peerid());
	
	core.projects().forEach(function(p){
		p.itemStore().on('datachange',function(){
			var cambait = p.items().filter(function(item){
				return item.data('type') == 'cambait';
			});
			if (cambait.lenght > 0){
				console.log('start following ',cambait[0].id());
			}
		});
	});
	
});



var entrancecam = new Cam({
  hostname: '192.168.26.104',
  username: 'onvifuser',
  password: 'onvifuser',
}, function(err) {
  this.absoluteMove({x: 1, y: 1, zoom: 1});
  this.getStatus(function(req,res){
  	console.log(req,res);
  });
  
  
  
  /*
  this.getStreamUri({protocol:'RTSP'}, function(err, stream) {
    http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end('<html><body>' +
        '<embed type="application/x-vlc-plugin" target="' + stream.uri + '"></embed>' +
        '</body></html>');
    }).listen(3389);
  });*/
});