'use strict'

const { WebClient } = require('@slack/web-api')
const config = require('../config')
const gcpSecret = require('./gcp-secret')

exports.postMessageToSlack = async (text) => {
  const token = await gcpSecret.get('slack-bot-token')
  const channel = await gcpSecret.get('slack-channel')
  const web = new WebClient(token)
  try {
    const res = await web.chat.postMessage({ channel: channel, text })
  } catch (err) {
    console.error(err)
  }
}
