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
  required_version = ">= 1.5"
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

resource "github_repository_environment" "production" {
  repository  = github_repository.tilde.name
  environment = "production"
}

resource "github_actions_environment_secret" "cloudflare_api_token" {
  repository      = github_repository.tilde.name
  environment     = github_repository_environment.production.environment
  secret_name     = "CLOUDFLARE_API_TOKEN"
  plaintext_value = var.cloudflare_api_token
}

resource "github_actions_environment_secret" "cloudflare_account_id" {
  repository      = github_repository.tilde.name
  environment     = github_repository_environment.production.environment
  secret_name     = "CLOUDFLARE_ACCOUNT_ID"
  plaintext_value = var.cloudflare_account_id
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
