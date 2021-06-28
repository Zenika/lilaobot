terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "3.5.0"
    }
  }
}

provider "google" {
  credentials = var.gcp_credentials
  project = var.gcp_project
  region  = var.gcp_region
  zone    = var.gcp_zone
}
