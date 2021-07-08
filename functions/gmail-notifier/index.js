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

const querystring = require('querystring');
const oauth = require('./lib/oauth');

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

  const oAuth2Client = await oauth.getOAuth2Client();

  // Generate + redirect to OAuth2 consent form URL
  const authUrl = oAuth2Client.generateAuthUrl({
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
  const oAuth2Client = await oauth.getOAuth2Client();


  // OAuth2: Exchange authorization code for access token
  return new Promise((resolve, reject) => {
    oAuth2Client.getToken(code, (err, token) =>
      (err ? reject(err) : resolve(token))
    );
  })
    .then((token) => {
      // Get user email (to use as a Datastore key)
      oAuth2Client.credentials = token;
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
