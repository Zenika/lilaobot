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
exports.oauth2init = async (req, res) => {
  // Define OAuth2 scopes
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  const oAuth2Client = await oauth.getOAuth2Client();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Required in order to receive a refresh token every time
  });
  res.redirect(authUrl);
};

/**
 * Get an access token from the authorization code and store token in Datastore
 */
exports.oauth2callback = async (req, res) => {
  // Get authorization code from request
  const code = req.query.code;
  
  try {
    const oAuth2Client = await oauth.getOAuth2Client();
    const token_1 = await new Promise((resolve, reject) => {
      oAuth2Client.getToken(code, (err, token) => (err ? reject(err) : resolve(token))
      );
    });
    
    // Get user email (to use as a Datastore key)
    oAuth2Client.credentials = token_1;
    const emailAddress = await oauth.getEmailAddress();
    await oauth.saveToken(emailAddress);
    // Respond to request
    res.redirect(`/initWatch?emailAddress=${querystring.escape(emailAddress)}`);
  } catch (err_1) {
    // Handle error
    console.error(err_1);
    res.status(500).send('Something went wrong; check the logs.');
  }

  // OAuth2: Exchange authorization code for access token
};
