/**
 * Created by pl on 6/1/15.
 */

var express = require('express');
var twilio = require('twilio');
var bodyParser = require ('body-parser');
var mongoose = require('mongoose');
mongoose.connect('mongodb://project:seven@ds043022.mongolab.com:43022/project7', function(err){
    if (err) throw err;
});
var userSchema=new mongoose.Schema({
    name:String,
    email:String,
    password:String,
    phone:String,
    pin:String,
    addresses:[{}]
});
var User = mongoose.model('User', userSchema);
var accountSid = "ACe701a4e2c6cf998a6e4330f367e5e54a";
var authToken = "0cda74fdde03eaa48bcc82ccec986880";
var geocoderProvider = 'google';
var httpAdapter= 'http';
var extra ={
    apiKey: '',
    formatter: null
};
var geocoder = require('node-geocoder')(geocoderProvider, httpAdapter, extra);
var address = null;
var userAccount = null;


var app = express();

app.use(bodyParser.urlencoded({extended:true}));

var client = twilio(accountSid, authToken);


app.post('/', function (req, res){
    var twiml = new twilio.TwimlResponse();

    twiml.gather({
        action: '/getAccount',
        numDigits: '10',
        timeout: 20
    }, function(){
        this.say('Thank you for calling Checkmate Uber. To log in, please enter your phone number.');
    });
    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());

});

app.post('/getAccount', function(req, res){
    var twiml = new twilio.TwimlResponse();
    User.findOne({phone: req.body.Digits}, function(err, result){
        if (err)throw err;
        else {
            console.log(result);
            userAccount = result;
        }
    });
    twiml.redirect('/enterpw');

    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
    // run callback f
});

app.post('/enterpw', function(req, res){
    var twiml = new twilio.TwimlResponse();
    if (userAccount) {
        twiml.gather({
            action: '/account',
            numDigits: '4',
            timeout: '10'
        }, function(){
            this.say('Please enter your pin number');
        });
    } else if (userAccount == null){
        twiml.say('You have entered a wrong phone number.').redirect('/');
    }
    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
});

app.post('/account', function(req, res){
    var twiml = new twilio.TwimlResponse();
    if (userAccount && req.body.Digits == userAccount.pin){
        twiml.say('Welcome ' + userAccount.name).redirect('/mainmenu');
    } else {
        twiml.say('You have entered the wrong pin, please try again').redirect('/enterpw');
    }


    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
    // run callback fn
});

app.post('/mainmenu', function(req, res){
    var twiml = new twilio.TwimlResponse();
    twiml.gather({
        action: '/getLocation',
        finishOnKey: '*',
        numDigits: '1',
        timeout: '5'
    }, function(){
        this.say("Main menu.");
        this.say("Press 1 to say your location.");
        for (var i = 0; i < userAccount.addresses.length; i++){
            this.say('Press '+(i+2)+' for '+userAccount.addresses[i].name);
        }
    });
    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
    // run callback fn
});

app.post('/getLocation', function(req, res){
    var twiml = new twilio.TwimlResponse();
    if (req.body.Digits == '1'){
        twiml.say ({'voice': 'man', language:'en'}, "After the beep, please say your address. Press 9 when you're finished");
        twiml.record({
            action: '/queue',
            transcribe: true,
            timeout:'60',
            transcribeCallback: '/transcriptionArrived'
        });
    }
    for (var i = 0; i < userAccount.addresses.length; i++){
        if (req.body.Digits == (i+2)){
            address = userAccount.addresses[i].address;
            twiml.redirect('/directagain');
        }
    }

    /*else if (req.body.Digits == '2'){
        geocoder.geocode(address, function(err, res){
            console.log("latitude: " +res[0].latitude);
            console.log("longitude: " + res[0].longitude);
        });
    } else {
        twiml.say("Invalid command")
            .redirect('/');
    }*/

    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());

});

app.post('/confirmation', function(req, res){
    var twiml = new twilio.TwimlResponse();
    if (req.body.Digits == '9'){
        twiml.say("Thank you for using Checkmate Uber. Good bye!");
        geocoder.geocode(address, function(err, res){
            console.log("latitude: " +res[0].latitude);
            console.log("longitude: " + res[0].longitude);
        });
    } else if (req.body.Digits == '0'){
        twiml.redirect('/mainmenu');
    }

    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
});

app.post('/queue', function(req, res){
    var twiml = new twilio.TwimlResponse();
    if (req.body.Digits == '9') {
        twiml.play('http://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3');
    }
    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
});

app.post('/transcriptionArrived', function(req, res){
    var twiml = new twilio.TwimlResponse();
    client.calls(req.body.CallSid).update({
        url: "https://intense-brook-3860.herokuapp.com//directagain",
        method: "POST"
    }, function(err, call) {
        //twiml.say("You said "+req.body.TranscriptionText);
    });
    address = req.body.TranscriptionText;
    console.log(req.body.TranscriptionText);

    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
});

app.post('/directagain', function(req, res){
    var twiml = new twilio.TwimlResponse();
    if (address){
        twiml.gather({
            action: '/confirmation',
            finishOnKey: '*',
            numDigits: '1',
            timeout: '5'
        }, function(){
            this.say('We will send a driver to '+address+'. If this is correct, press 9.')
                .say('Or, press 0 to go back to the main menu');
        });
    }
    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
});

/*app.post('/record', function(req, res){
    var twiml = new twilio.TwimlResponse();
    recsID = req.body.RecordingSid;
    twiml.say("Please wait").pause({length:5});
    var lol = setInterval( function(){
        if (stopInterval=='stop'){
            clearInterval(lol);
            stopInterval = null;
        } else {
            send_recid(function(data){
                if (data){
                    console.log("Address is : "+data);
                    sendout(data);
                }
            });
        }
    }, 5000);


    function sendout(data){

    }

    res.writeHead(200, {
        'Content-type': 'text/xml'
    });
    res.end(twiml.toString());
});

var stopInterval = null;
// callback to request transcribed text
var send_recid = function(callback) {
    // request transaction ID
    client.request({
        url:'/Accounts/'+accountSid+'/Recordings/'+recsID+'/Transcriptions',
        method:'GET'
    }, function (error, responseData) {
        // handle response
        if ( ! responseData )
        {
            return null
        }
        else
        {
            console.log(responseData.transcriptions[0].status);

            if(responseData.transcriptions[0].status == 'completed')
            {
                // get transcription text obj
                client.transcriptions(responseData.transcriptions[0].sid).get(function(err, transcription) {
                    //console.log(transcription);
                    var address = transcription.transcriptionText;
                    callback(address);
                    stopInterval = 'stop';
                });
            }
        }
    });
};*/

app.listen(process.env.PORT || 8000, function(){
    console.log("PORT 8000 on");
});