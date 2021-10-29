const nconf = require('nconf')

nconf.env().file({ file: 'config.json' })

// Configuration constants
const GCF_REGION = nconf.get('GCF_REGION')
const GCLOUD_PROJECT = nconf.get('GCLOUD_PROJECT')
const TOPIC_ID = nconf.get('TOPIC_ID')

// Computed values
exports.GCF_BASE_URL = `https://${GCF_REGION}-${GCLOUD_PROJECT}.cloudfunctions.net`
exports.TOPIC_NAME = `projects/${GCLOUD_PROJECT}/topics/${TOPIC_ID}`
exports.GCF_REGION = GCF_REGION
exports.GCLOUD_PROJECT = GCLOUD_PROJECT

// Constants
exports.NO_LABEL_MATCH = "Message doesn't match label"
exports.UNKNOWN_USER_MESSAGE = 'Uninitialized email address'
