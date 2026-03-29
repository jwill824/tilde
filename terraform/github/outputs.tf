output "repository_url" {
  description = "GitHub repository HTML URL"
  value       = github_repository.tilde.html_url
}

output "branch_protection_id" {
  description = "Terraform resource ID for the main branch protection rule"
  value       = github_branch_protection.main.id
}

output "prod_environment_url" {
  description = "GitHub prod environment deployments URL"
  value       = "https://github.com/${var.github_owner}/${github_repository.tilde.name}/deployments/activity_log?environments=prod"
}
