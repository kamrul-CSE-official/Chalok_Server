# prisma-blog-server


# Application running port
PORT=5000

# PostgreSQL connection string 
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
# Connect to Postgres via the shared transaction-mode pooler (IPv4-only)
DB_PASS="W5jsJPEqOJo5lvkU"
# Connect to Postgres via the shared transaction-mode pooler (IPv4-only)
DATABASE_URL="postgresql://postgres.uqgmqipzdiytiinztnuq:W5jsJPEqOJo5lvkU@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Connect to Postgres via the shared session-mode pooler (used for migrations)
DIRECT_URL="postgresql://postgres.uqgmqipzdiytiinztnuq:W5jsJPEqOJo5lvkU@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Secret key for Better Auth 
BETTER_AUTH_SECRET="4e86d4a42fd6e8d89b4a23efc4f73f787621b6d45c145f6d1e26d43df80dea70"

# Backend auth service URL
BETTER_AUTH_URL="http://localhost:3000"

# Frontend application URL
APP_URL="http://localhost:4000"

# Email account used for sending emails (DEMO)
APP_USER="demo@gmail.com"

# App password generated from Gmail (DEMO – never commit real one)
APP_PASS="xxxx xxxx xxxx xxxx"

# Google OAuth Client ID (DEMO)
GOOGLE_CLIENT_ID="demo_google_client_id"

# Google OAuth Client Secret (DEMO)
GOOGLE_CLIENT_SECRET="demo_google_client_secret"