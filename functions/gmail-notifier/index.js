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
  // Initialize PubSub connection for given email account (which means the onNewMessage function will be called for each new mail of user)
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
  const currentHistoryId = dataObj.historyId
  console.info(`Processing messages for account ${emailAddress} with current history ${currentHistoryId}`)

  try {
    const oauth2Client = await oauth.fetchToken(emailAddress)

    const historyIdKind = 'GmailHistory'
    const lastHistoryKey = 'lastHistoryId'
    let historyIdToStartFrom
    const histories = await oauth.getEntities(historyIdKind, lastHistoryKey)
    console.log(`retrieved lastHistoryId: ${histories}}`)
    if(histories && histories.length > 0){
      historyIdToStartFrom = histories[0].value
    }else{
      historyIdToStartFrom = currentHistoryId
      console.log(`initializing lastHistoryId ${historyIdToStartFrom} for first time`)
    }

    const messages = await gmailAPIClient.listMessages(oauth2Client, historyIdToStartFrom)
    console.info(`There are ${messages.length} messages in recent history, since historyId: ${historyIdToStartFrom}`)
    console.info(`messages: ${JSON.stringify(messages)}`)

    const returned = []
    messages.forEach(async message => {
      console.info(`Extracting real GMail message from ${JSON.stringify(message)}`)
      const messageResponse = await gmailAPIClient.getMessageById(
        oauth2Client,
        message.id
      )
  
      let sentMessage = processMessage(emailAddress, messageResponse)
      returned.push({message:message, sentMessage:sentMessage, messageResponse:messageResponse, status:'OK'})
    })
    await oauth.saveEntity(historyIdKind, lastHistoryKey, currentHistoryId)
    return returned
  } catch (err) {
    // Handle unexpected errors
    if (!err.message || err.message !== config.NO_LABEL_MATCH) {
      console.error(err)
    }
  }
}

async function processMessage(emailAddress, messageResponse) {
  console.info(`Processing message\n${JSON.stringify(messageResponse)}`)
  const mailSubjectResult = messageResponse.data.payload.headers.filter((e) => e.name == 'Subject')
  
  const mailSubject = mailSubjectResult.length>0 ? mailSubjectResult[0].value : "NO SUBJECT FOUND"
  
  const textPartResult = messageResponse.data.payload.parts.filter((e) => e.mimeType == 'text/plain')
  
  const textPart = textPartResult[0]
  
  const bodyPlain = Buffer.from(textPart.body.data, 'base64').toString('utf8')
  
  const slackMessage = `Mail de ${emailAddress}:\nObjet: ${mailSubject}\n${bodyPlain}`

  console.info(`Sending slack message for ${messageResponse.data.id} (subject is ${mailSubject})`)
  await slackClient.postMessageToSlack(slackMessage)
  console.info(`Sent! slack message for ${messageResponse.data.id} (subject is ${mailSubject}).\nFull message is \n"""${slackMessage}"""`)
  return slackMessage
}