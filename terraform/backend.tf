terraform {
  backend "gcs" {
    bucket = "lilaobot-terraform-state"
    prefix = "terraform/state"
  }
}
