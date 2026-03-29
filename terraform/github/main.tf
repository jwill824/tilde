terraform {
  cloud {
    organization = "thingstead"
    workspaces {
      name = "tilde-github"
    }
  }
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
  required_version = ">= 1.6"
}

provider "github" {
  owner = var.github_owner
  # GITHUB_TOKEN env var set in TFC workspace variables
}

resource "github_repository" "tilde" {
  name                   = "tilde"
  allow_squash_merge     = true
  allow_merge_commit     = false
  allow_rebase_merge     = false
  delete_branch_on_merge = true
  has_issues             = true
}

resource "github_branch_protection" "main" {
  repository_id = github_repository.tilde.node_id
  pattern       = "main"

  enforce_admins        = true
  require_linear_history = true

  required_status_checks {
    strict   = true
    contexts = var.required_status_check_contexts
  }

  required_pull_request_reviews {
    required_approving_review_count = 0
  }
}
