#!/usr/bin/env node
'use strict';
const {access, mkdir, writeFile} = require('fs/promises');
const fs = require('fs');
const path = require('path');
const Meteoblue = require('../');


if (!process.argv[2]) {
  throw new Error('argument for location path is needed');
}

(async () => {
  const meteoblue = new Meteoblue();

  const result = await meteoblue.get(process.argv[2]);
  const lines = result.toString().split('\n');
  const grouped = {};

  // Extract location name from first line
  const [, location] = lines[0].split(',');

  // Data starts at 11th line
  for (let i = 10; i < lines.length; ++i) {
    let [date, value] = lines[i].split(',');
    let time;
    let day;

    [day, time] = date.split('T');

    value = parseFloat(value);

    day = [
      day.substring(0, 4),
      day.substring(4, 6),
      day.substring(6, 8),
    ].join('-');

    const dateObj = new Date(
        `${day}T${time.substring(0, 2)}:${time.substring(2, 4)}:00.000Z`,
    );

    grouped[day] = grouped[day] || [];
    grouped[day].push({
      value,
      date: dateObj.toISOString(),
    });
  }

  // Create directory if not exists
  const targetDir = path.join(__dirname, `../data/${location.toLowerCase()}`);
  try {
    await access(targetDir, fs.constants.F_OK);
  } catch (err) {
    await mkdir(targetDir, {recursive: true});
  }

  const days = Object.keys(grouped);
  for (const day of days) {
    const file = `${day}.json`;
    const targetFile = path.join(targetDir, file);

    console.log(`Write to ${targetFile}`);

    await writeFile(targetFile, JSON.stringify(grouped[day], null, 2) + '\n');
  }

  console.log(`Write data for ${days[days.length - 1]}`);
})();
