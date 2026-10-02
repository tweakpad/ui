#!/usr/bin/env node
import process from 'node:process';
import console from 'node:console';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const statuses = new Set(['pending', 'passed', 'failed', 'blocked', 'not applicable']);
const stages = new Set(['implement', 'verify', 'complete']);
const empty = (value = '') => !value.trim() || /^(\[[^\]]+\]|TBD|TODO)$/i.test(value.trim());
const unattested = (value = '') =>
  empty(value) || /^(not run|not checked|none)$/i.test(value.trim());

// This checks the evidence record, not the truth of its claims. Semantic source,
// dependency and visual review remain required by the skill.
function table(source, title, errors) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => /^#{1,6} /.test(line) && line.replace(/^#+ /, '').trim() === title,
  );
  if (start < 0) {
    errors.push(`Missing section: ${title}`);
    return [];
  }
  const level = lines[start].match(/^#+/)[0].length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(
    (line) => /^#{1,6} /.test(line) && line.match(/^#+/)[0].length <= level,
  );
  const section = end < 0 ? rest : rest.slice(0, end);
  const first = section.findIndex((line) => line.trim().startsWith('|'));
  if (first < 0) {
    errors.push(`Missing table: ${title}`);
    return [];
  }
  const rows = [];
  for (const line of section.slice(first)) {
    if (!line.trim().startsWith('|')) break;
    const cells = line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split(/(?<!\\)\|/)
      .map((cell) => cell.trim());
    rows.push(cells);
  }
  const columns = rows[0]?.length;
  const data = rows.slice(2);
  if (!data.length) errors.push(`No evidence rows: ${title}`);
  for (const row of data)
    if (row.length !== columns)
      errors.push(`Malformed row in ${title}; escape literal pipes inside cells`);
  return data;
}

export function checkGates(source, stage) {
  if (!stages.has(stage)) return [`Unknown stage: ${stage}; use implement, verify or complete`];
  const errors = [];
  for (const label of ['Requested work / claim', 'Scope source']) {
    const line = source.split(/\r?\n/).find((entry) => entry.startsWith(`- ${label}:`));
    if (!line || empty(line.slice(line.indexOf(':') + 1))) errors.push(`Missing concrete ${label}`);
  }
  const gates = table(source, 'Gate record', errors);
  const capabilities = table(source, 'Capability and interface mapping', errors);
  const scenarios = table(source, 'Verification scenarios', errors);
  const integration = table(source, 'Early integration checkpoint', errors);
  const families = table(source, 'Family dependency map', errors);
  const presentation = table(source, 'Presentation source map', errors);
  const composition = table(source, 'Implementation and composition reuse map', errors);

  for (const [name, rows] of [
    ['family dependency', families],
    ['presentation source', presentation],
    ['composition reuse', composition],
  ]) {
    for (const row of rows)
      if (row.some(empty)) errors.push(`Incomplete ${name} mapping: ${row[0]}`);
  }
  const resolved = (status) => status === 'passed' || status === 'not applicable';
  function checkStatus(label, status, evidence, mustResolve) {
    if (!statuses.has(status)) errors.push(`${label}: invalid status ${JSON.stringify(status)}`);
    else if (mustResolve && !resolved(status)) errors.push(`${label}: ${status} blocks ${stage}`);
    if (resolved(status) && unattested(evidence))
      errors.push(
        `${label}: ${status} requires concrete evidence or non-applicability justification`,
      );
  }
  const seenGates = new Set();
  for (const row of gates) {
    const id = row[0].match(/^([0-8])\./)?.[1];
    if (!id || seenGates.has(id)) errors.push(`Invalid or duplicate gate: ${row[0]}`);
    if (id) seenGates.add(id);
    checkStatus(`Gate ${id ?? row[0]}`, row[1], row[2], stage === 'complete' || Number(id) <= 2);
  }
  for (let id = 0; id < 9; id++) if (!seenGates.has(String(id))) errors.push(`Missing gate ${id}`);

  const seenIntegration = new Set();
  for (const row of integration) {
    if (!/^I-0[1-3]$/.test(row[0]) || seenIntegration.has(row[0]))
      errors.push(`Invalid or duplicate integration check: ${row[0]}`);
    seenIntegration.add(row[0]);
    checkStatus(row[0], row[2], row[3], stage !== 'implement');
  }
  for (const id of ['I-01', 'I-02', 'I-03'])
    if (!seenIntegration.has(id)) errors.push(`Missing integration check ${id}`);

  function uniqueIds(rows, prefix) {
    const ids = new Set();
    for (const row of rows) {
      if (!new RegExp(`^${prefix}-\\d+$`).test(row[0]) || ids.has(row[0]))
        errors.push(`Invalid or duplicate ${prefix} ID: ${row[0]}`);
      ids.add(row[0]);
    }
    return ids;
  }
  const capabilityIds = uniqueIds(capabilities, 'C');
  const scenarioIds = uniqueIds(scenarios, 'V');
  function references(label, value, pattern, known) {
    const ids = value?.match(pattern) ?? [];
    if (!ids.length || ids.some((id) => !known.has(id)))
      errors.push(`${label}: missing or unknown capability/scenario links`);
  }
  for (const row of capabilities) {
    if (row.slice(1, 7).some(empty)) errors.push(`${row[0]}: incomplete capability mapping`);
    checkStatus(row[0], row[7], row[8], stage === 'complete');
    references(row[0], row[6], /V-\d+/g, scenarioIds);
  }
  for (const row of scenarios) {
    if ([row[1], row[2], row[3], row[5]].some(empty))
      errors.push(`${row[0]}: incomplete scenario plan`);
    checkStatus(row[0], row[6], row[7], stage === 'complete');
    if (row[6] === 'passed' && (empty(row[4]) || row[4] === 'not run'))
      errors.push(`${row[0]}: passed requires an observed result`);
    references(row[0], row[1], /C-\d+/g, capabilityIds);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [path, flag, stage, ...extra] = process.argv.slice(2);
  if (!path || flag !== '--stage' || extra.length || !stages.has(stage)) {
    console.error(
      'Usage: node check-gates.mjs <implementation-checklist.md> --stage implement|verify|complete',
    );
    process.exitCode = 2;
  } else {
    try {
      const errors = checkGates(readFileSync(path, 'utf8'), stage);
      if (errors.length) {
        console.error(`BLOCKED ${stage}:\n${errors.map((error) => `- ${error}`).join('\n')}`);
        process.exitCode = 1;
      } else
        console.log(
          `Record permits ${stage}; source, dependency and visual evidence still require review.`,
        );
    } catch (error) {
      console.error(error.message);
      process.exitCode = 2;
    }
  }
}
