resource "google_pubsub_topic" "default" {
  name = var.function_topic
}

resource "google_storage_bucket" "functions_bucket" {
  name          = "lilaobot-functions-storage"
  force_destroy = true
}

data "archive_file" "slack_publisher_archive" {
  type        = "zip"
  source_dir  = "../functions/slack-publisher"
  output_path = "slack_publisher.zip"
}

data "archive_file" "gmail_notifier_archive" {
  type        = "zip"
  source_dir  = "../functions/gmail-notifier"
  output_path = "gmail_notifier.zip"
}

# https://github.com/hashicorp/terraform-provider-google/issues/1938 dynamic name, otherwise the Function cannot be updated
resource "google_storage_bucket_object" "slack_publisher_archive_bucket_object" {
  name   = format("%s#%s", "slack_publisher.zip", data.archive_file.slack_publisher_archive.output_md5)
  bucket = google_storage_bucket.functions_bucket.name
  source = data.archive_file.slack_publisher_archive.output_path
}

resource "google_storage_bucket_object" "gmail_notifier_archive_bucket_object" {
  name   = format("%s#%s", "gmail_notifier.zip", data.archive_file.gmail_notifier_archive.output_md5)
  bucket = google_storage_bucket.functions_bucket.name
  source = data.archive_file.gmail_notifier_archive.output_path
}

resource "google_cloudfunctions_function" "slack_publisher_function" {
  name        = "slack-publisher"
  description = "Receives messages from Pub/sub and send them to Slack"
  runtime     = "python39"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.slack_publisher_archive_bucket_object.name
  timeout               = 60
  entry_point           = "publishToSlack"
  event_trigger {
    event_type = "providers/cloud.pubsub/eventTypes/topic.publish"
    resource   = "projects/${var.gcp_project}/topics/${var.function_topic}"
  }
}

resource "google_cloudfunctions_function" "gmail_notifier_oauth2init_function" {
  name        = "oauth2init"
  description = "gmail-notifier entry point"
  runtime     = "nodejs14"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.gmail_notifier_archive_bucket_object.name
  timeout               = 60
  entry_point           = "oauth2init"
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "invoker" {
  project        = google_cloudfunctions_function.slack_publisher_function.project
  region         = google_cloudfunctions_function.slack_publisher_function.region
  cloud_function = google_cloudfunctions_function.slack_publisher_function.name

  role = "roles/cloudfunctions.invoker"
  #  member = "user:myFunctionInvoker@example.com" TODO maybe be more precise ?
  member = "allUsers"
}


