import base64
import os
from google.cloud import secretmanager
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


def publishToSlack(event, context):
    """Triggered from a message on a Cloud Pub/Sub topic.
    Args:
         event (dict): Event payload.
         context (google.cloud.functions.Context): Metadata for the event.
    """

    client = secretmanager.SecretManagerServiceClient()
    secret_name = "slack-bot-token"
    project_id = "lilaobot"
    request = {"name": f"projects/{project_id}/secrets/{secret_name}/versions/latest"}
    response = client.access_secret_version(request)
    secret_string = response.payload.data.decode("UTF-8")

    slack_token = secret_string
    client = WebClient(token=slack_token)

    pubsub_message = base64.b64decode(event['data']).decode('utf-8')

    try:
      print("Message received from Pub/sub: " + str(pubsub_message))
      # FIXME temporary disable sending to slack, for dev tests
      #response = client.chat_postMessage(
      #    channel="C021BGBSMFY",
      #    text="Message received from Pub/sub: " + str(pubsub_message)
      #)
    except SlackApiError as e:
        # You will get a SlackApiError if "ok" is False
        assert e.response["error"]  # str like 'invalid_auth', 'channel_not_found'
