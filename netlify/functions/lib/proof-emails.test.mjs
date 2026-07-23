import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCustomerEmail, buildOperatorEmail, resolveProofEmailConfig } from './proof-emails.mjs';

const representativeProject = {
  project_id: 'project-123',
  proof_ref: 'MP-ABCD',
  created_at: '2026-07-22T20:00:00.000Z',
  name: 'Sam Rivera',
  email: 'sam@example.com',
  photo_category: 'baby-kids',
  style_preset_label: 'True Color',
  palette_tier: 'Gallery',
  palette_colors: 52,
  palette_mode: 'adaptive',
  grid_size: 48,
  finished_size_in: 19.2,
  quoted_price_usd: 119,
  bg_mode: 'flatten',
  optimize_fixes: ['balanced skin tones', 'calmed the background'],
  tile_map: Array.from({ length: 48 * 48 }, (_, index) => index % 52),
  assets: {
    preview: { key: 'projects/project-123/preview.png' },
    cropped_source: { key: 'projects/project-123/cropped-source.jpg' }
  }
};

const previewImage = {
  mime: 'image/png',
  base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
};

test('proof email builders include the representative v7 request details', () => {
  const operator = buildOperatorEmail(representativeProject);
  const customer = buildCustomerEmail(representativeProject);

  assert.equal(operator.to, 'hello@mosapack.com');
  assert.equal(operator.subject, 'New proof request MP-ABCD — baby-kids · 19.2″ · $119');
  for (const value of ['$119', '19.2″', '2304']) {
    assert.match(operator.text, new RegExp(value.replace('$', '\\$')));
    assert.match(operator.html, new RegExp(value.replace('$', '\\$')));
  }
  for (const header of ['Customer', 'Design', 'Order']) {
    assert.match(operator.text, new RegExp(header));
    assert.match(operator.html, new RegExp(`<h2>${header}</h2>`));
  }
  assert.equal(operator.text.split('\n')[0], '19.2″ · 2304 stickers · $119');
  assert.match(operator.html, /<strong>19\.2″ · 2304 stickers · \$119<\/strong>/);
  assert.equal(customer.to, 'sam@example.com');
  assert.equal(customer.subject, 'Your mosaic is being checked — ref MP-ABCD');
  assert.match(customer.text, /within 1 business day/i);
  assert.match(customer.text, /MP-ABCD/);
  assert.match(customer.text, /Nothing is made and nothing is charged until you say so\./);
  assert.doesNotMatch(`${operator.subject} ${operator.text} ${operator.html} ${customer.subject} ${customer.text} ${customer.html}`, /LEGO|brick/i);
});

test('missing optional values degrade without null or undefined output', () => {
  const sparseProject = {
    ...representativeProject,
    name: '',
    quoted_price_usd: null,
    finished_size_in: null,
    palette_colors: null,
    adaptive_palette: null,
    tile_map: null,
    optimize_fixes: null,
    assets: null
  };

  for (const email of [buildOperatorEmail(sparseProject), buildCustomerEmail(sparseProject)]) {
    const output = `${email.to} ${email.subject} ${email.text} ${email.html}`;
    assert.doesNotMatch(output, /\b(?:null|undefined)\b/);
  }
  assert.match(buildOperatorEmail(sparseProject).text, /Optimize fixes: None/);
});

test('both builders return non-empty text and HTML parts', () => {
  for (const email of [buildOperatorEmail(representativeProject), buildCustomerEmail(representativeProject)]) {
    assert.ok(email.text.trim());
    assert.ok(email.html.trim());
  }
});

test('environment overrides configure the operator recipient and reply-to', () => {
  const config = resolveProofEmailConfig({
    PROOF_OPERATOR_EMAIL: ' proofs@ops.example ',
    PROOF_REPLY_TO: ' support@example.com '
  });
  const operator = buildOperatorEmail(representativeProject, config);
  const customer = buildCustomerEmail(representativeProject, config);

  assert.deepEqual(config, {
    operatorEmail: 'proofs@ops.example',
    replyTo: 'support@example.com'
  });
  assert.equal(operator.to, 'proofs@ops.example');
  assert.match(customer.html, /mailto:support@example\.com/);
  assert.deepEqual(resolveProofEmailConfig({ PROOF_OPERATOR_EMAIL: ' ', PROOF_REPLY_TO: '' }), {
    operatorEmail: 'hello@mosapack.com',
    replyTo: 'hello@mosapack.com'
  });
});

test('preview images are inline attachments with an attachment fallback', () => {
  for (const email of [
    buildOperatorEmail(representativeProject, resolveProofEmailConfig(), previewImage),
    buildCustomerEmail(representativeProject, resolveProofEmailConfig(), previewImage)
  ]) {
    assert.deepEqual(email.attachments, [{
      content: previewImage.base64,
      filename: 'mosaic-MP-ABCD.png',
      content_id: 'mosaic-preview',
      content_type: 'image/png'
    }]);
    assert.match(email.html, /src="cid:mosaic-preview"/);
  }

  for (const email of [buildOperatorEmail(representativeProject), buildCustomerEmail(representativeProject)]) {
    assert.equal('attachments' in email, false);
    assert.doesNotMatch(email.html, /cid:mosaic-preview/);
  }
});

test('customer copy falls back to a nameless greeting and escapes interpolations', () => {
  const customer = buildCustomerEmail({
    ...representativeProject,
    name: '<Sam>',
    proof_ref: 'MP-<&>'
  });
  const nameless = buildCustomerEmail({ ...representativeProject, name: '' });

  assert.match(customer.text, /^Hi <Sam>,/);
  assert.match(customer.html, /Hi &lt;Sam&gt;,/);
  assert.doesNotMatch(customer.html, /MP-<&>/);
  assert.match(nameless.text, /^Hi,/);
});
