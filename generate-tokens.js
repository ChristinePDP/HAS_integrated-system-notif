import jwt from 'jsonwebtoken';

// PALITAN MO ITO NG TOTOONG JWT_SECRET MO GALING SA .env
const JWT_SECRET = 'project_namin_ito_123'; 

// Generate tokens for different roles
const patientToken = jwt.sign(
  { role: 'Patient', email: 'john@hospital.com', userId: 'P-12345' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const doctorToken = jwt.sign(
  { role: 'Doctor', email: 'drsmith@hospital.com', userId: 'D-67890' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const adminToken = jwt.sign(
  { role: 'Admin', email: 'admin@hospital.com', userId: 'A-00001' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('============= MGA TOKENS PARA SA THUNDER CLIENT =============\n');
console.log('🧑‍⚕️ PATIENT TOKEN (john@hospital.com):');
console.log(patientToken + '\n');

console.log('🩺 DOCTOR TOKEN (drsmith@hospital.com):');
console.log(doctorToken + '\n');

console.log('👑 ADMIN TOKEN (admin@hospital.com):');
console.log(adminToken + '\n');