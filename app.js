var express = require('express');
var app = express();

var fs = require('fs');
var request = require('sync-request');
var shortid = require('shortid');
var bodyParser = require('body-parser');

var config_mongo;
var config_redis = {};
var config_oxford = {};
var config_azure = {};

try {
  console.log('Read settings from config.json')
  var config = JSON.parse(fs.readFileSync('config.json'));
  config_mongo = config.mongo;
  config_redis = {
    port: config.redis_port,
    server: config.redis_servername,
    pass: config.redis_auth_pass,
  };
  config_oxford = {
    face: config.oxford_face,
    vision: config.oxford_vision,
    emotion: config.oxford_emotion
  };
  config_azure = {
    id: config.azure_id,
    key: config.azure_key
  };
} catch (e) {
   console.log('Read settings from env')
   config_mongo = process.env.mongo;
   config_redis = {
     port: process.env.redis_port,
     server: process.env.redis_servername,
     pass: process.env.redis_auth_pass,
   };
   config_oxford = {
     face: process.env.oxford_face,
     vision: process.env.oxford_vision,
     emotion: process.env.oxford_emotion
   };
   config_azure = {
     id: process.env.azure_id,
     key: process.env.azure_key
   };
}

var _redis = require("redis");
var redis =  _redis.createClient(config_redis.port, config_redis.server, {auth_pass: config_redis.pass, tls: {servername: config_redis.server}});

var mongoose = require('mongoose');
mongoose.connect(config_mongo);

var Red = require('./models/red');
var oxford = require('project-oxford');

var client_emotion = new oxford.Client(config_oxford.emotion);
var client_face = new oxford.Client(config_oxford.face);
var client_vision = new oxford.Client(config_oxford.vision);

var azure = require('azure-storage');
var blobService = azure.createBlobService(config_azure.id, config_azure.key);
blobService.createContainerIfNotExists('images', {
  publicAccessLevel: 'blob'
}, function(){});

app.use(bodyParser({limit: '5000mb'}));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', function(req, res) {
  redis.get("red", function(err, last) {
      Red.find().sort({_id:-1}).limit(3).exec(function(err, reds) {
        res.render('index', {reds: reds, last: ((last) ? JSON.parse(last) : null)});
      });
  });
});

app.post('/snap', function(req, res) {
  console.log('NEW SNAP');
  var snap = req.body.snap;
  var id = shortid.generate();

  var rawdata = snap;
  var matches = rawdata.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  var type = matches[1];
  var buffer = new Buffer(matches[2], 'base64');

  blobService.createBlockBlobFromText('images', id + '.png', buffer, {contentType:type}, function(error, result, response) {
    var img_url = blobService.getUrl('images', id + '.png');
    client_emotion.emotion.analyzeEmotion({
      url: img_url
    }).then(function (response) {
      try {
        var happy = response[0]['scores']['happiness'];
      } catch (e) {
        var happy = 0;
      }
      client_face.face.detect({
          url: img_url,
          analyzesAge: true,
          analyzesGender: true
      }).then(function (response) {
          try {
            var age = response[0].faceAttributes.age;
            var gender = response[0].faceAttributes.gender;
          } catch (e) {
            var age = 0;
            var gender = "-";
          }
          client_vision.vision.analyzeImage({
              url: img_url,
              Description: true,
              Color: true
          }).then(function (response) {
            try {
              var color = response.color.dominantColors[0];
              var trust = response.description.captions[0].confidence;
              var trust_context = response.description.captions[0].text;
            } catch (e) {
              var color = "-";
              var trust = 0;
              var trust_context = 0;
            }
            var red = {
              trust: trust,
              trust_context: trust_context,
              gender: gender,
              age: age,
              color: color,
              happy: happy,
              img: img_url
            };
            res.json(red);
            var new_red = new Red(red);
            new_red.save();

            redis.set("red", JSON.stringify(red), redis.print);
          });
      });
    });
  });
});

app.listen(process.env.PORT || 1337, function() {
  console.log('Listening on port' + process.env.PORT || 1337);
});