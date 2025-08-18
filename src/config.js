// Configuration file with embedded secrets

const config = {
  database: {
    host: 'localhost',
    port: 5432,
    user: 'admin',
    password: 'HardcodedDatabasePassword123!', // SECRET DETECTED
    ssl: false
  },
  
  jwt: {
    secret: 'jwt-secret-key-1234567890abcdef', // SECRET DETECTED
    expiresIn: '24h'
  },
  
  apis: {
    stripe: {
      secretKey: 'sk_test_51234567890abcdefghijklmnopqrstuvwxyz', // SECRET DETECTED
      publishableKey: 'pk_test_51234567890abcdefghijklmnopqrstuvwxyz'
    },
    aws: {
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE', // SECRET DETECTED
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', // SECRET DETECTED
      region: 'us-west-2'
    }
  },
  
  encryption: {
    key: 'my-encryption-key-1234567890abcdef', // SECRET DETECTED
    algorithm: 'aes-256-cbc'
  }
};

module.exports = config;
