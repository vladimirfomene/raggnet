const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const config = require('./models/config');

const auth = require('./controllers/auth');
const users = require('./controllers/users');
const resources = require('./controllers/resources');
const admins = require('./controllers/admins')

mongoose.connect(config.dbUrl, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true)
mongoose.set('useFindAndModify', false);

var app = express();
var router = express.Router();

// log if in dev mode
if (app.get('env') !== 'production')
  app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

//==============================================
// Middleware
//==============================================

router.param('id', (req, res, next, id) => {
  if (!id.match(/^[0-9a-fA-F]{24}$/))
    return res.status(400).send('Invalid ID');
  next();
});

router.param('phone', (req, res, next, phone) => {
    if (!(+phone) || phone.length !== 10)
        return res.status(400).send('Invalid phone');
    next();
});

router.param('email', (req, res, next) => {
  if (!(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(req.body.email)))
    return res.status(400).send('Invalid email');
  next();
});

router.param('url', (req, res, next) => {
  if (!(/^((https?)|(ftp)):\/\/.+/.test(this.url)))
    this.url = 'http://' + this.url;
  next();
});

//==============================================
// Routes
//==============================================

app.use('/', router);

router.route('/users')
  .get(auth.adminRequired, users.getUsers)
  .post(users.createUser);
router.route('/users/:id')
  .get(auth.adminRequired, users.getUserById)
  .put(auth.loginRequired, auth.verifyUser, users.updateUser)
  .delete(auth.loginRequired, auth.verifyUser, users.deleteUser);

router.route('/resources')
  .get(resources.getResources)
  .post(auth.adminRequired, resources.createResource);
router.route('/resources/books')
  .get(resources.getBooks);
router.route('/resources/courses')
  .get(resources.getCourses);
router.route('/resources/:id')
  .get(resources.getResourceById)
  .put(auth.adminRequired, resources.updateResource)
  .post(auth.superAdminRequired, resources.approveResource)
  .delete(auth.superAdminRequired, resources.deleteResource);
router.route('/resources/:id/other-resources')
  .get(resources.getOtherResources);

router.route('/admins')
  .post(auth.superAdminRequired, admins.createAdmin);

router.route('/admins/resources')
  .get(auth.superAdminRequired, resources.getUnapprovedResources);

router.route('/auth/token')
  .post(auth.loginUser)
  .put(auth.logoutUser);

// TODO: Add or update comment routes

// handle 404
app.use((req, res, next) => {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  if (app.get('env') === 'dev')
    console.log(err);
  res.status(err.status || 500).send();
});

var server = app.listen(config.port);
console.log('Listening at http://localhost:%s in %s mode',
  server.address().port, app.get('env'));

module.exports = app;
