'use strict'

const { WebClient } = require('@slack/web-api')
const config = require('../config')

exports.postMessageToSlack = async (text) => {
  const token = 'slack-bot-token'
  const web = new WebClient(token)
  const conversationID = 'C021BGBSMFY'
  try {
    const res = await web.chat.postMessage({ channel: conversationID, text })
  } catch (err) {
    console.error(err)
  }
}
