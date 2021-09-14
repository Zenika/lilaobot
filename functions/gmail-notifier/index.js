'use strict';

var {google} = require('googleapis');
const gmail = google.gmail('v1');
const querystring = require('querystring');
const config = require('./config');
const oauth = require('./lib/oauth');
const helpers = require('./lib/helpers');

/**
 * Request an OAuth 2.0 authorization code
 * Only new users (or those who want to refresh
 * their auth data) need visit this page
 */
exports.oauth2init = async (req, res) => {
  // Define OAuth2 scopes
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  // Generate + redirect to OAuth2 consent form URL
  const lilaobotOAuthClient = await oauth.getOAuth2Client();
  const authUrl = lilaobotOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Required in order to receive a refresh token every time
  });
  return res.redirect(authUrl);
};

/**
 * Get an access token from the authorization code and store token in Datastore
 */
exports.oauth2callback = async (req, res) => {
  // Get authorization code from request
  const code = req.query.code;
  try {
    const lilaobotOAuthClient = await oauth.getOAuth2Client();

    const userAccountTokenResponse = await lilaobotOAuthClient.getToken(code);
    
    // Get user email (to use as a Datastore key)
    const emailAddress = await oauth.getEmailAddress(lilaobotOAuthClient, userAccountTokenResponse);
    await oauth.saveToken(emailAddress);
    // Respond to request
    return res.redirect(`/initWatch?emailAddress=${querystring.escape(emailAddress)}`);
  } catch (err_1) {
    // Handle error
    console.error(err_1);
    return res.status(500).send('Something went wrong; ' + JSON.stringify(err_1));
  }
};

/**
 * Initialize a watch on the user's inbox
 */
exports.initWatch = async (req, res) => {
  // Require a valid email address
  if (!req.query.emailAddress) {
    return res.status(400).send('No emailAddress specified.');
  }
  const email = querystring.unescape(req.query.emailAddress);
  if (!email.includes('@')) {
    return res.status(400).send('Invalid emailAddress.');
  }

  // Retrieve the stored OAuth 2.0 access token
  const oatuhClient = await oauth.fetchToken(email)

  await gmail.users.watch({
    auth: oatuhClient,
    userId: 'me',
    resource: {
      labelIds: ['INBOX'],
      topicName: config.TOPIC_NAME
    }
  });
  
  // Respond with status
  res.write('Watch initialized!');
  res.status(200).end();

};

/**
* Process new messages as they are received
*/
exports.onNewMessage = (message, context) => {
  // Parse the Pub/Sub message
  const dataStr = Buffer.from(message.data, 'base64').toString();
  const dataObj = JSON.parse(dataStr);

  return oauth.fetchToken(dataObj.emailAddress)
    .then(() => helpers.listMessageIds())
    .then(res => helpers.getMessageById(res.data.messages[0].id)) // TODO: foreach
    .then(res => console.log(res))
    .catch((err) => {
      // Handle unexpected errors
      if (!err.message || err.message !== config.NO_LABEL_MATCH) {
        console.error(err);
      }
    });
};
