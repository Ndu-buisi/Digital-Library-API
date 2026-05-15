terraform {
  required_version = ">= 0.12"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

# ── S3 ────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "documents" {
  bucket = "demo-documents-bucket"

  tags = {
    Name        = "demo-documents-bucket"
    Environment = "production"
  }
}

# FIX: Block all public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# FIX: Enable versioning to protect against accidental deletion
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# FIX: Enable S3 server access logging
resource "aws_s3_bucket_logging" "documents" {
  bucket        = aws_s3_bucket.documents.id
  target_bucket = aws_s3_bucket.documents.id
  target_prefix = "access-logs/"
}

# ── Security Group ────────────────────────────────────────────────────────────

# FIX: Restrict ingress to only required ports; remove wildcard port ranges
resource "aws_security_group" "api" {
  name_prefix = "demo-api-"
  description = "Security group for the Digital Library API"

  # Allow HTTPS only from the internet
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTP only from the internet (redirect to HTTPS at the app layer)
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "demo-api-sg"
    Environment = "production"
  }
}

# ── RDS ───────────────────────────────────────────────────────────────────────

resource "aws_db_instance" "database" {
  identifier = "demo-database"

  engine         = "postgres"
  engine_version = "11.19"
  instance_class = "db.t3.micro"

  allocated_storage = 20

  # FIX: Enable storage encryption at rest
  storage_encrypted = true

  db_name  = "library"
  username = "admin"
  # Use a secret manager or environment variable — never hardcode passwords
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.api.id]

  # FIX: Database must NOT be publicly accessible
  publicly_accessible = false

  # FIX: Enable IAM database authentication
  iam_database_authentication_enabled = true

  # FIX: Enable automated backups (retention > 0)
  backup_retention_period = 7

  # FIX: Enable enhanced monitoring / logging
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  skip_final_snapshot = true

  tags = {
    Name        = "demo-database"
    Environment = "production"
  }
}

# ── Variables ─────────────────────────────────────────────────────────────────

variable "db_password" {
  description = "Master password for the RDS instance. Supply via TF_VAR_db_password or a secrets manager."
  type        = string
  sensitive   = true
}
