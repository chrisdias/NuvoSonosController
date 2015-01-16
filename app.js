
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var SonosLib = require('./lib/sonoslib.js');

var app = express();
module.exports = app;

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 3000);
app.set('cache', './cache');

var sonos = new SonosLib();
module.exports.sonos = sonos;

app.use('/nuvo', require('./routes/nuvo'));
app.use('/sonos', require('./routes/sonos'));
app.use('/tts', require('./routes/sonos'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.send('error: ' + err + ' ' + err.message);
//        res.render('error', {
//            message: err.message,
//            error: err
//        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send('error: ' + err.message);
//    res.render('error', {
//        message: err.message,
//        error: {}
//    });
});


var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
