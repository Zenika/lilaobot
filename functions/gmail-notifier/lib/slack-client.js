'use strict'

const { WebClient } = require('@slack/web-api')
const config = require('../config')
const gcpSecrets = require('./gcp-secrets')

exports.postMessageToSlack = async (text) => {
  const slackBotToken = await gcpSecrets.get('slack-bot-token')
  const slackChannel = await gcpSecrets.get('slack-channel')
  const web = new WebClient(slackBotToken)
  try {
    const res = await web.chat.postMessage({ channel: slackChannel, text })
  } catch (err) {
    console.error(err)
  }
}
