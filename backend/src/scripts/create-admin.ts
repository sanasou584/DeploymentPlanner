/* eslint-disable no-console -- CLI script: stdout/stderr IS the output */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { User } from '../models/entities/index.js';
import { UserRepository } from '../repositories/user.repository.js';

async function main(): Promise<void> {
  const env = getEnv();
  const users = new UserRepository();
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    await connectDatabase(env.mongodbUri, { autoIndex: true });

    const name = (await rl.question('Nom admin : ')).trim();
    const email = (await rl.question('Email admin : ')).trim().toLowerCase();

    // Attention : la saisie est visible dans le terminal.
    // Exécuter uniquement dans un terminal privé.
    const password = await rl.question('Mot de passe : ');

    const existing = await users.findByEmail(email, {
      withDeleted: true,
    });

    if (existing) {
      throw new Error(
        'Cet email existe déjà. Aucun rôle ne sera modifié.',
      );
    }

    const admin = await User.register({
      name,
      email,
      password,
      role: 'ADMIN',
    });

    // PENDING -> ACTIVE : le bootstrapping admin doit pouvoir se connecter.
    await admin.approve();

    console.log('Administrateur créé (actif) :', admin.email);
  } finally {
    rl.close();
    await disconnectDatabase();
  }
}

void (async (): Promise<void> => {
  try {
    await main();
  } catch (error: unknown) {
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
})();
