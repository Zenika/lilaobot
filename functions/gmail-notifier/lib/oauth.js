'use strict'

const config = require('../config')
const { Datastore } = require('@google-cloud/datastore')
const datastore = new Datastore()
const { google } = require('googleapis')
const gcpSecrets = require('./gcp-secrets')

// Retrieve current GCP project OAuth2 id
const getOAuth2Client = async () => {
  const oauth2ClientId = await gcpSecrets.get('oauth2-client-id')
  const oauth2ClientSecret = await gcpSecrets.get('oauth2-client-secret')
  return new google.auth.OAuth2(
    oauth2ClientId,
    oauth2ClientSecret,
    `${config.GCF_BASE_URL}/oauth2callback`
  )
}
exports.getOAuth2Client = getOAuth2Client

/**
 * Helper function to fetch a user's OAuth 2.0 access token
 * Can fetch current tokens from Datastore, or create new ones
 */
exports.fetchToken = async (emailAddress) => {
  const oauth2Client = await getOAuth2Client()
  const tokens = await datastore.get(
    datastore.key(['oauth2Token', emailAddress])
  )
  console.debug(`fetched token from datastore: ${JSON.stringify(tokens)}`)
  const token = tokens[0]

  // Check for new users
  if (!token) {
    throw new Error(config.UNKNOWN_USER_MESSAGE)
  }
  // // Validate token
  // if (!token.expiry_date || token.expiry_date < Date.now() + 60000) {
  //   oauth2Client.credentials.refresh_token =
  //     oauth2Client.credentials.refresh_token || token.refresh_token

  //   await oauth2Client.refreshAccessToken()
  //   await exports.saveToken(emailAddress, token)
  //   return oauth2Client
  // } else {
  //   oauth2Client.credentials = token
  //   return oauth2Client
  // }
  oauth2Client.credentials = token
  return oauth2Client
}

/**
 * Helper function to save an OAuth 2.0 access token to Datastore
 */
exports.saveToken = async (emailAddress, oauth2Client) => {
  return datastore.save({
    key: datastore.key(['oauth2Token', emailAddress]),
    data: oauth2Client.credentials,
  })
}

// TODO we probalby want to refactor by extracting this and de deplucating code 
exports.saveEntity = async (kind, key, value) => {
  return datastore.save({
    key: datastore.key([kind, key]),
    data: {value: value},
  })
}

exports.getEntities = async (kind, key) => {
  return datastore.get(
    datastore.key([kind, key])
  )
}

/**
 * Helper function to delete an OAuth 2.0 access token from Datastore
 */
exports.deleteToken = async (emailAddress, oauth2Client) => {
  return datastore.delete({
    key: datastore.key(['oauth2Token', emailAddress])
  })
}
