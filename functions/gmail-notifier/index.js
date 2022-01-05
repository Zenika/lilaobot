'use strict'

const querystring = require('querystring')
const config = require('./config')
const oauth = require('./lib/oauth')
const gmailAPIClient = require('./lib/gmail-api-client')
const slackClient = require('./lib/slack-client')

/**
 * Request an OAuth 2.0 authorization code
 * Only new users (or those who want to refresh
 * their auth data) need visit this page
 */
exports.oauth2init = async (req, res) => {
  // Define OAuth2 scopes
  const scopes = ['https://www.googleapis.com/auth/gmail.readonly']

  // Generate + redirect to OAuth2 consent form URL
  const lilaobotOAuthClient = await oauth.getOAuth2Client()
  const authUrl = lilaobotOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Required in order to receive a refresh token every time
  })
  return res.redirect(authUrl)
}

/**
 * Get an access token from the authorization code and store token in Datastore
 */
exports.oauth2callback = async (req, res) => {
  // Get authorization code from request
  const code = req.query.code
  try {
    const lilaobotOAuthClient = await oauth.getOAuth2Client()

    const userAccountTokenResponse = await lilaobotOAuthClient.getToken(code)
    lilaobotOAuthClient.setCredentials(userAccountTokenResponse.tokens)

    // Get user email (to use as a Datastore key)
    const emailAddress = await gmailAPIClient.getEmailAddress(
      lilaobotOAuthClient
    )
    await oauth.saveToken(emailAddress, lilaobotOAuthClient)
    // Respond to request
    return res.redirect(
      `/initWatch?emailAddress=${querystring.escape(emailAddress)}`
    )
  } catch (err_1) {
    // Handle error
    console.error(err_1)
    return res.status(500).send('Something went wrong; ' + err_1)
  }
}

/**
 * Initialize a watch on the user's inbox
 */
exports.initWatch = async (req, res) => {
  // Require a valid email address
  if (!req.query.emailAddress) {
    return res.status(400).send('No emailAddress specified.')
  }
  const email = querystring.unescape(req.query.emailAddress)
  if (!email.includes('@')) {
    return res.status(400).send(`Invalid emailAddress, it was: ${email}`)
  }

  console.info(`starting initWatch for email: ${email}`)

  // Retrieve the stored OAuth 2.0 access token
  const oauthClient = await oauth.fetchToken(email)
  await gmailAPIClient.watchGmailInbox(oauthClient)

  // Respond with status
  return res.send(`Watch initialized on gmail inbox: ${email}`)
}

/**
 * Ends a watch on the user's inbox
 */
exports.endWatch = async (req, res) => {
  // Require a valid email address
  if (!req.query.emailAddress) {
    return res.status(400).send('No emailAddress specified.')
  }
  const email = querystring.unescape(req.query.emailAddress)
  if (!email.includes('@')) {
    return res.status(400).send(`Invalid emailAddress, it was: ${email}`)
  }

  console.info(`starting endWatch for email: ${email}`)

  // Retrieve the stored OAuth 2.0 access token
  const oauthClient = await oauth.fetchToken(email)
  // Stop PubSub connection for given email account
  await gmailAPIClient.unwatchGmailInbox(oauthClient)
  await oauth.deleteToken(email)

  // Respond with status
  return res.send(`Watch ended on gmail inbox: ${email}`)

}
/**
 * Process new PubSub messages as they are received
 * WIP, not implemented
 */
// eslint-disable-next-line no-unused-vars
exports.onNewMessage = async (message, context) => {
  // Parse the Pub/Sub message
  const dataStr = Buffer.from(message.data, 'base64').toString()
  const dataObj = JSON.parse(dataStr)
  const emailAddress = dataObj.emailAddress
  console.info(`incoming message: ${dataStr}`)

  try {
    const oauth2Client = await oauth.fetchToken(emailAddress)
    const res = await gmailAPIClient.listMessages(oauth2Client)
    const messageResponse = await gmailAPIClient.getMessageById(
      oauth2Client,
      res.data.messages[0].id
    ) // TODO: foreach

    const mailSubject = messageResponse.data.payload.headers.filter(
      (e) => e.name == 'Subject'
    )[0].value

    const textPart = messageResponse.data.payload.parts.filter(
      (e) => e.mimeType == 'text/plain'
    )[0]

    const bodyPlain = Buffer.from(textPart.body.data, 'base64').toString('utf8')

    await slackClient.postMessageToSlack(
      `Mail de ${emailAddress}:\nObjet: ${mailSubject}\n${bodyPlain}`
    )

    return messageResponse
  } catch (err) {
    // Handle unexpected errors
    if (!err.message || err.message !== config.NO_LABEL_MATCH) {
      console.error(err)
    }
  }
}
