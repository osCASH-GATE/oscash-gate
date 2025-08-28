-- osCASH.me GATE PostgreSQL Initialization Script
-- Creates required databases for GATE components

-- Create BTCPay Server database
CREATE DATABASE btcpayserver;

-- Create NBXplorer database  
CREATE DATABASE nbxplorer;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE btcpayserver TO postgres;
GRANT ALL PRIVILEGES ON DATABASE nbxplorer TO postgres;

-- Create additional schema if needed
\c btcpayserver;
CREATE SCHEMA IF NOT EXISTS btcpayserver AUTHORIZATION postgres;

\c nbxplorer;  
CREATE SCHEMA IF NOT EXISTS nbxplorer AUTHORIZATION postgres;