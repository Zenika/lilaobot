resource "google_storage_bucket" "functions_bucket" {
  name = "lilaobot-functions-storage"
  force_destroy = true
}

data "archive_file" "function_archive" {
  type        = "zip"
  source_dir  = "../src"
  output_path = var.bucket_archive_filepath
}

# https://github.com/hashicorp/terraform-provider-google/issues/1938 dynamic name, otherwise the Function cannot be updated
resource "google_storage_bucket_object" "archive" {
  name = format("%s#%s", var.bucket_archive_filepath, data.archive_file.function_archive.output_md5)
  bucket = google_storage_bucket.functions_bucket.name
  source = data.archive_file.function_archive.output_path
}

resource "google_cloudfunctions_function" "function" {
  name        = "slack-publisher"
  description = "Receives messages from Pub/sub and send them to Slack"
  runtime     = "python39"

  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.functions_bucket.name
  source_archive_object = google_storage_bucket_object.archive.name
  timeout               = 60
  entry_point           = var.function_entrypoint
  event_trigger {
    event_type = "providers/cloud.pubsub/eventTypes/topic.publish"
    resource = "projects/${var.gcp_project}/topics/${var.function_topic}"
  }
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "invoker" {
  project        = google_cloudfunctions_function.function.project
  region         = google_cloudfunctions_function.function.region
  cloud_function = google_cloudfunctions_function.function.name

  role   = "roles/cloudfunctions.invoker"
#  member = "user:myFunctionInvoker@example.com" TODO maybe be more precise ?
  member = "allUsers"
}


