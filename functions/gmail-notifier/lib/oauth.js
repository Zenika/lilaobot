'use strict';

const config = require('../config');
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const secretManagerServiceClient = new SecretManagerServiceClient();
const path = require('path');
const fs = require('fs');
const {google} = require('googleapis');
const gmail = google.gmail('v1');

// Retrieve current GCP project OAuth2 id
exports.getOAuth2Client = async () => {
  const oauth2ClientId = "oauth2-client-id";
  const [secrets] = await secretManagerServiceClient.listSecrets({
    parent: "projects/lilaobot",
  });
  secrets.forEach(secret => {
      const policy = secret.replication.userManaged
        ? secret.replication.userManaged
        : secret.replication.automatic;
      console.log(`${secret.name} (${policy})`);
  });
  const oauth2ClientSecret = await accessSecretVersion("projects/"+config.GCLOUD_PROJECT+"/secrets/"+oauth2ClientId+"/versions/latest");
  console.info("oauth2ClientSecret: " + oauth2ClientSecret);
  return new google.auth.OAuth2(
    oauth2ClientId,
    oauth2ClientSecret,
    `${config.GCF_BASE_URL}/oauth2callback`
  );
}
exports.getOAuth2Client();
async function accessSecretVersion(secretName) {
  const request    = {"name": secretName};
  let response;
  try{
    response   = await secretManagerServiceClient.accessSecretVersion(request);
  } catch (e){
    console.info("could not access project oauthid version, error: "+e);
    throw e;
  }
  console.info("payload: "+response);
  return response[0].payload.data.toString('utf8');
}


/**
 * Helper function to get the current user's email address
 */
exports.getEmailAddress = async (t) => {
  return gmail.users.getProfile({
    auth: oauth2Client,
    userId: 'me'
  })
  .then((res) => res.data.emailAddress);
};

/**
 * Helper function to fetch a user's OAuth 2.0 access token
 * Can fetch current tokens from Datastore, or create new ones
 */
exports.fetchToken = (emailAddress) => {
  return datastore.get(datastore.key(['oauth2Token', emailAddress]))
    .then((tokens) => {
      const token = tokens[0];

      // Check for new users
      if (!token) {
        throw new Error(config.UNKNOWN_USER_MESSAGE);
      }

      // Validate token
      if (!token.expiry_date || token.expiry_date < Date.now() + 60000) {
        oauth2Client.credentials.refresh_token =
          oauth2Client.credentials.refresh_token || token.refresh_token;
        return new Promise((resolve, reject) => { // Pify and oauth2client don't mix
          oauth2Client.refreshAccessToken((err, response) => {
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        })
          .then(() => {
            return exports.saveToken(emailAddress);
          });
      } else {
        oauth2Client.credentials = token;
        return Promise.resolve();
      }
    });
};

/**
 * Helper function to save an OAuth 2.0 access token to Datastore
 */
exports.saveToken = (emailAddress) => {
  return datastore.save({
    key: datastore.key(['oauth2Token', emailAddress]),
    data: oauth2Client.credentials
  });
};
