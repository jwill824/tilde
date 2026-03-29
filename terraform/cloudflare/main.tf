terraform {
  cloud {
    organization = "thingstead"
    workspaces {
      name = "tilde-cloudflare"
    }
  }
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_pages_project" "thingstead" {
  account_id        = var.cloudflare_account_id
  name              = "thingstead"
  production_branch = "main"
}

resource "cloudflare_pages_domain" "thingstead_io" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.thingstead.name
  name         = "thingstead.io"
}

# DNS CNAME is not auto-created by cloudflare_pages_domain — must be explicit
resource "cloudflare_dns_record" "thingstead_io" {
  zone_id = var.zone_id
  name    = "thingstead.io"
  type    = "CNAME"
  content = "${cloudflare_pages_project.thingstead.name}.pages.dev"
  proxied = true
  ttl     = 1
}
