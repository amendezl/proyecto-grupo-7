#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const path = require('path');

// Usage: set environment var DYNAMODB_TABLE (or TABLE_NAME) and run:
//   DYNAMODB_TABLE=<table> node scripts/seed-dynamodb.js
// Example (PowerShell):
//   $env:DYNAMODB_TABLE='sistema-gestion-espacios-dev-table'; node .\scripts\seed-dynamodb.js

// Accept table via --table argument or env var
const argv = require('minimist')(process.argv.slice(2));
const TABLE = argv.table || argv.t || process.env.DYNAMODB_TABLE || process.env.TABLE_NAME;
if (!TABLE) {
  console.error('ERROR: set environment variable DYNAMODB_TABLE (or TABLE_NAME) to your table name');
  process.exit(1);
}

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

function pad(n, width = 3) {
  return String(n).padStart(width, '0');
}

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function isoNowPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function batchWrite(items) {
  const RequestItems = {};
  RequestItems[TABLE] = items.map(it => ({ PutRequest: { Item: it } }));
  const cmd = new BatchWriteCommand({ RequestItems });
  return ddb.send(cmd);
}

async function seed() {
  console.log('Seeding table', TABLE, 'in', REGION);

  const users = [];
  for (let i = 1; i <= 100; i++) {
    const id = `usuario${pad(i)}`;
    users.push({
      PK: `USER#${id}`,
      SK: `PROFILE#${id}`,
      type: 'user',
      userId: id,
      name: `Usuario ${pad(i, 3)}`,
      email: `${id}@example.com`,
      role: randomChoice(['user', 'admin', 'manager']),
      active: Math.random() > 0.05,
      createdAt: isoNowPlusDays(-randomInt(0, 365)),
    });
  }

  const espacios = [];
  for (let i = 1; i <= 10; i++) {
    const id = `espacio${pad(i, 3)}`;
    espacios.push({
      PK: `SPACE#${id}`,
      SK: `META#${id}`,
      type: 'space',
      spaceId: id,
      name: `Espacio ${pad(i, 3)}`,
      floor: randomInt(1, 10),
      capacity: randomInt(2, 50),
      kind: randomChoice(['aula','oficina','sala','auditorio']),
      createdAt: isoNowPlusDays(-randomInt(0, 365)),
    });
  }

  const zonas = [];
  for (let i = 1; i <= 10; i++) {
    const id = `zona${pad(i, 3)}`;
    zonas.push({
      PK: `ZONE#${id}`,
      SK: `META#${id}`,
      type: 'zone',
      zoneId: id,
      name: `Zona ${pad(i,3)}`,
      area: randomChoice(['Norte','Sur','Este','Oeste']),
      floor: randomInt(0, 12),
    });
  }

  const responsables = [];
  for (let i = 1; i <= 20; i++) {
    const id = `responsable${pad(i,3)}`;
    responsables.push({
      PK: `RESP#${id}`,
      SK: `META#${id}`,
      type: 'responsable',
      responsableId: id,
      name: `Responsable ${pad(i,3)}`,
      userRef: `USER#usuario${pad(randomInt(1,100))}`,
      active: Math.random() > 0.1,
    });
  }

  // reservas (randomized, each links a user and a space)
  const reservas = [];
  for (let i = 1; i <= 200; i++) {
    const id = `reserva${pad(i,3)}`;
    const userIndex = randomInt(1, 100);
    const spaceIndex = randomInt(1, 10);
    const startDays = randomInt(-30, 30);
    reservas.push({
      PK: `RES#${id}`,
      SK: `META#${id}`,
      type: 'reserva',
      reservaId: id,
      userId: `usuario${pad(userIndex)}`,
      spaceId: `espacio${pad(spaceIndex,3)}`,
      startsAt: isoNowPlusDays(startDays),
      endsAt: isoNowPlusDays(startDays + randomInt(0, 3)),
      status: randomChoice(['confirmed','pending','cancelled']),
      createdAt: isoNowPlusDays(-randomInt(0,365)),
    });
  }

  const items = [].concat(users, espacios, zonas, responsables, reservas);

  console.log('Total items to insert:', items.length);

  // Confirmation: require SEED=true in env or interactive 'yes' to proceed
  if (process.env.SEED !== 'true' && !argv.yes) {
    if (process.stdin.isTTY) {
      const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise(resolve => rl.question(`About to seed ${items.length} items into table ${TABLE}. Type 'yes' to continue: `, ans => { rl.close(); resolve(ans); }));
      if (answer.trim().toLowerCase() !== 'yes') {
        console.log('Aborted by user. To run non-interactively set env SEED=true');
        process.exit(0);
      }
    } else {
      console.error('SEED env var not set and no TTY available. Set SEED=true to run non-interactively.');
      process.exit(1);
    }
  }

  const chunkSize = 25; // BatchWrite limit
  for (let i = 0; i < items.length; i += chunkSize) {
    let chunk = items.slice(i, i + chunkSize);
    let attempt = 0;
    let unprocessed = null;
    do {
      try {
        const reqItems = chunk.map(it => ({ PutRequest: { Item: it } }));
        const res = await batchWrite(chunk);
        unprocessed = res && res.UnprocessedItems && res.UnprocessedItems[TABLE] ? res.UnprocessedItems[TABLE].map(u => u.PutRequest.Item) : [];
        if (unprocessed && unprocessed.length > 0) {
          chunk = unprocessed;
          attempt++;
          const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.warn(`Batch had ${unprocessed.length} unprocessed items. Retrying in ${backoff}ms (attempt ${attempt})`);
          await new Promise(r => setTimeout(r, backoff));
        } else {
          console.log(`Inserted ${Math.min(i+chunkSize, items.length)}/${items.length}`);
          break;
        }
      } catch (e) {
        attempt++;
        if (attempt > 5) {
          console.error('BatchWrite failed after retries', e);
          throw e;
        }
        const backoff = Math.min(500 * Math.pow(2, attempt), 5000);
        console.warn(`BatchWrite error, retrying in ${backoff}ms (attempt ${attempt})`, e);
        await new Promise(r => setTimeout(r, backoff));
      }
    } while (unprocessed && unprocessed.length > 0 && attempt <= 5);
  }

  console.log('Seeding finished.');
}

seed().catch(err => {
  console.error('Seeding failed', err);
  process.exit(1);
});
