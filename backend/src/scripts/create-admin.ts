import * as readline from 'readline';
import * as bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { initializeFirebase, db, admin } from '../config/firebase';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('=== NikkahConnect Admin Account Creator ===');

  try {
    initializeFirebase();

    const email = (await askQuestion('Enter Admin Email: ')).toLowerCase().trim();
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address.');
      rl.close();
      return;
    }

    // Check if admin already exists
    const existing = await db.collection('admins').where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      console.error('❌ An admin account with this email already exists.');
      rl.close();
      return;
    }

    const displayName = (await askQuestion('Enter Display Name (e.g. John Doe): ')).trim();
    if (!displayName) {
      console.error('❌ Display name cannot be empty.');
      rl.close();
      return;
    }

    const password = await askQuestion('Enter Password: ');
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long.');
      rl.close();
      return;
    }

    console.log('\nAvailable Roles:');
    console.log('1. super_admin');
    console.log('2. moderator');
    console.log('3. support');
    console.log('4. verification_officer');
    
    const roleChoice = (await askQuestion('Select Role (1-4): ')).trim();
    let role = 'moderator';
    if (roleChoice === '1') role = 'super_admin';
    else if (roleChoice === '2') role = 'moderator';
    else if (roleChoice === '3') role = 'support';
    else if (roleChoice === '4') role = 'verification_officer';
    else {
      console.warn('⚠️ Invalid choice, defaulting to "moderator"');
    }

    console.log('\nCreating account...');

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save to Firestore
    const docRef = await db.collection('admins').add({
      email,
      displayName,
      role,
      passwordHash,
      isActive: true,
      createdAt: new Date(),
    });

    console.log('──────────────────────────────────────────────────');
    console.log('✅ Admin Account Registered Successfully!');
    console.log(`Email: ${email}`);
    console.log(`Name: ${displayName}`);
    console.log(`Role: ${role}`);
    console.log(`ID: ${docRef.id}`);
    console.log('──────────────────────────────────────────────────');

  } catch (error) {
    console.error('❌ Failed to register admin account:', error);
  } finally {
    rl.close();
  }
}

main();
