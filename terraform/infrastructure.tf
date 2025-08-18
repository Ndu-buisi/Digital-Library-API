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

# S3 bucket with security issues
resource "aws_s3_bucket" "documents" {
  bucket = "demo-documents-bucket"
}

# Publicly readable S3 bucket (security issue)
resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = false
  block_public_policy     = false  
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Security group with overly permissive rules
resource "aws_security_group" "api" {
  name_prefix = "demo-api-"
  
  # Allow all inbound traffic (security issue)
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS instance without encryption
resource "aws_db_instance" "database" {
  identifier = "demo-database"
  
  engine         = "postgres"
  engine_version = "11.19"
  instance_class = "db.t3.micro"
  
  allocated_storage = 20
  storage_encrypted = false
  
  db_name  = "library"
  username = "admin"
  password = "password123"
  
  vpc_security_group_ids = [aws_security_group.api.id]
  publicly_accessible = true
  
  skip_final_snapshot = true
}
