const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// --- Helper Functions ---

function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  encodedSource = encodedSource.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return encodedSource;
}

function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64');
  const encodedSignature = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signatureInput}.${encodedSignature}`;
}

// --- Main Logic ---

const envPath = path.join(process.cwd(), '.env');
const prodEnvPath = path.join(process.cwd(), '.env.production');
const targetEnvPath = fs.existsSync(prodEnvPath) ? prodEnvPath : envPath;

console.log(`Reading config from: ${targetEnvPath}`);
let envContent = fs.existsSync(targetEnvPath) ? fs.readFileSync(targetEnvPath, 'utf8') : '';

// 1. Get or Create JWT_SECRET
let jwtSecretMatch = envContent.match(/^JWT_SECRET=(.*)$/m);
let jwtSecret = jwtSecretMatch ? jwtSecretMatch[1].trim() : '';

if (!jwtSecret) {
  console.log('JWT_SECRET not found. Generating a new one...');
  jwtSecret = crypto.randomBytes(32).toString('hex');
  envContent += `\nJWT_SECRET=${jwtSecret}`;
} else {
  console.log('Found existing JWT_SECRET.');
}

// 2. Generate Keys
const now = Math.floor(Date.now() / 1000);
const exp = now + (10 * 365 * 24 * 60 * 60); // 10 years

const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: now,
  exp: exp,
};

const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: now,
  exp: exp,
};

const anonKey = signJWT(anonPayload, jwtSecret);
const serviceKey = signJWT(servicePayload, jwtSecret);

console.log('Generated new keys signed with JWT_SECRET.');

// 3. Update .env
function updateEnvVar(name, value) {
  const regex = new RegExp(`^${name}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${name}=${value}`);
  } else {
    envContent += `\n${name}=${value}`;
  }
}

updateEnvVar('ANON_KEY', anonKey);
updateEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey);
updateEnvVar('SUPABASE_SERVICE_ROLE_KEY', serviceKey);
updateEnvVar('JWT_SECRET', jwtSecret); // Ensure it's saved if it was generated

fs.writeFileSync(targetEnvPath, envContent);
console.log(`Updated ${targetEnvPath}`);

// 4. Update kong.yml
const kongPath = path.join(process.cwd(), 'supabase', 'kong.yml');
if (fs.existsSync(kongPath)) {
  let kongContent = fs.readFileSync(kongPath, 'utf8');
  
  // Replace anon key
  // Regex looks for "key: ey..." inside keyauth_credentials for anon
  // This is tricky with regex, so we'll do a simpler full replacement of the known structure or robust replacement
  // Assuming standard structure from my templates
  
  // We'll search for the block and replace the key line
  // But since we don't know the OLD key easily without parsing, we will construct the file content 
  // or use a more aggressive replace if the structure is known.
  
  // Let's use a robust replace for the specific lines if they exist, or regex that matches the key pattern

  // We expect 2 matches. First is usually anon, second service_role in the provided template.
  // But order is not guaranteed.
  
  // Safer approach: Re-write the consumers AND acls section with our new keys.
  const consumersSection = `consumers:
  - username: anon
    keyauth_credentials:
      - key: ${anonKey}
  - username: service_role
    keyauth_credentials:
      - key: ${serviceKey}

acls:
  - consumer: anon
    group: anon
  - consumer: service_role
    group: admin`;
      
  // Regex to replace the consumers block
  const consumersRegex = /consumers:[\s\S]*?services:/;
  
  if (consumersRegex.test(kongContent)) {
     kongContent = kongContent.replace(consumersRegex, `${consumersSection}\n\nservices:`);
     fs.writeFileSync(kongPath, kongContent);
     console.log(`Updated ${kongPath}`);
  } else {
     console.error('Could not find consumers section in kong.yml to replace. Manual check needed.');
  }
} else {
  console.error(`Error: ${kongPath} not found!`);
}

console.log('Done. Please restart services.');

