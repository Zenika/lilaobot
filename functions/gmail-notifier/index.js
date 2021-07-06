/**
 * Copyright 2021, Zenika
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var { google } = require('googleapis');
const gmail = google.gmail('v1');
const querystring = require('querystring');
const config = require('./config');
const oauth = require('./lib/oauth');
const helpers = require('./lib/helpers');
const { PubSub } = require('@google-cloud/pubsub');

// Instantiates a client
const pubsub = new PubSub();

/**
 * Request an OAuth 2.0 authorization code
 * Only new users (or those who want to refresh
 * their auth data) need visit this page
 */
exports.oauth2init = (req, res) => {
  // Define OAuth2 scopes
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  // Generate + redirect to OAuth2 consent form URL
  const authUrl = oauth.client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Required in order to receive a refresh token every time
  });
  return res.redirect(authUrl);
};

/**
 * Get an access token from the authorization code and store token in Datastore
 */
exports.oauth2callback = (req, res) => {
  // Get authorization code from request
  const code = req.query.code;

  // OAuth2: Exchange authorization code for access token
  return new Promise((resolve, reject) => {
    oauth.client.getToken(code, (err, token) =>
      (err ? reject(err) : resolve(token))
    );
  })
    .then((token) => {
      // Get user email (to use as a Datastore key)
      oauth.client.credentials = token;
      return Promise.all([token, oauth.getEmailAddress()]);
    })
    .then(([token, emailAddress]) => {
      // Store token in Datastore
      return Promise.all([
        emailAddress,
        oauth.saveToken(emailAddress)
      ]);
    })
    .then(([emailAddress]) => {
      // Respond to request
      res.redirect(`/initWatch?emailAddress=${querystring.escape(emailAddress)}`);
    })
    .catch((err) => {
      // Handle error
      console.error(err);
      res.status(500).send('Something went wrong; check the logs.');
    });
};

/**
 * Initialize a watch on the user's inbox
 */
exports.initWatch = (req, res) => {
  // Require a valid email address
  if (!req.query.emailAddress) {
    return res.status(400).send('No emailAddress specified.');
  }
  const email = querystring.unescape(req.query.emailAddress);
  if (!email.includes('@')) {
    return res.status(400).send('Invalid emailAddress.');
  }

  // Retrieve the stored OAuth 2.0 access token
  return oauth.fetchToken(email)
    .then(() => {
      // Initialize a watch
      gmail.users.watch({
        auth: oauth.client,
        userId: 'me',
        resource: {
          labelIds: ['INBOX'],
          topicName: config.TOPIC_GMAIL_NEW_MESSAGE_NAME
        }
      });
    })
    .then(() => {
      // Respond with status
      res.write('Watch initialized!');
      res.status(200).end();
    })
    .catch((err) => {
      // Handle errors
      if (err.message === config.UNKNOWN_USER_MESSAGE) {
        res.redirect('/oauth2init');
      } else {
        console.error(err);
        res.status(500).send('Something went wrong; check the logs.');
      }
    });
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
    .then(res => {
      console.log(res);
      const topic = pubsub.topic(config.TOPIC_CALL_FOR_OFFER_NAME);

      const messageObject = {
        data: {
          message: res.payload.body.data,
        },
      };
      const messageBuffer = Buffer.from(JSON.stringify(messageObject), 'utf8');

      // Publishes a message
      try {
        await topic.publish(messageBuffer);
        res.status(200).send('Message published.');
      } catch (err) {
        console.error(err);
        res.status(500).send(err);
        return Promise.reject(err);
      }
    })
    .catch((err) => {
      // Handle unexpected errors
      if (!err.message || err.message !== config.NO_LABEL_MATCH) {
        console.error(err);
      }
    });
};
