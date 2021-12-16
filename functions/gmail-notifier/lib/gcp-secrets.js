'use strict'

const config = require('../config')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
const secretManagerServiceClient = new SecretManagerServiceClient()

const cache = new Map()

exports.get = async (secretName) => {
  if (cache.get(secretName) === undefined) {
    const request = { name: `projects/${config.GCLOUD_PROJECT}/secrets/${secretName}/versions/latest` }
    let response
    try {
      response = await secretManagerServiceClient.accessSecretVersion(request)
      cache.put(secretName, response[0].payload.data.toString('utf8'))
    } catch (e) {
      console.error('Could not access project secret, error: ' + e)
      throw e
    }
  }
  return cache.get(secretName);
}
