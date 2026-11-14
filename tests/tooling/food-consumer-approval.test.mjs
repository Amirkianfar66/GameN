import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, symlinkSync, unlinkSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import test from 'node:test';
import {FOOD_PRODUCTION_CONSUMER_APPROVAL, readFoodProductionConsumerApproval} from '../../scripts/food-consumer-approval.mjs';

function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'gamen-food-acceptance-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  mkdirSync(dirname(resolve(root, FOOD_PRODUCTION_CONSUMER_APPROVAL)), {recursive:true});
  return root;
}

test('absence of native acceptance cannot be promoted from source registration', t => {
  assert.equal(readFoodProductionConsumerApproval(fixture(t)), null);
});

test('a self-issued acceptance record is rejected before it can authorize production', t => {
  const root = fixture(t);
  writeFileSync(resolve(root, FOOD_PRODUCTION_CONSUMER_APPROVAL), JSON.stringify({
    schema:'mothership.food-production-consumer-approval/1', status:'approved-production-consumer',
    designerReview:{verdict:'accepted',url:'https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-1'},
  }));
  assert.throws(() => readFoodProductionConsumerApproval(root), /independent acceptance hash differs/);
});

test('acceptance cannot be substituted through a file or parent-directory symlink', t => {
  const root = fixture(t), path = resolve(root, FOOD_PRODUCTION_CONSUMER_APPROVAL);
  const external = resolve(root, 'external.json');
  writeFileSync(external, '{}'); symlinkSync(external, path);
  assert.throws(() => readFoodProductionConsumerApproval(root), /regular file required/);
  unlinkSync(path);
  rmSync(dirname(path), {recursive:true});
  const outside = resolve(root, 'outside'); mkdirSync(outside);
  writeFileSync(resolve(outside, 'food-production-consumer-approval-2026-11-13.json'), '{}');
  symlinkSync(outside, dirname(path));
  assert.throws(() => readFoodProductionConsumerApproval(root), /regular file required/);
});
