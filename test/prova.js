// Cold tests of the node, without n8n: the built node runs with a fake
// execution context that records the HTTP request it would make, and answers
// with a canned body. Run `npm run build` first, then `npm test`.
//
// With RUBINYUN_TEST_KEY and RUBINYUN_TEST_SECRET set, the same tests also hit
// the real API with a test profile (not connected to Meta): a post is
// scheduled and deleted right after.
'use strict';

const path = require('path');
const { Rubinyun } = require(path.join(__dirname, '..', 'dist', 'nodes', 'Rubinyun', 'Rubinyun.node.js'));
const { RubinyunApi } = require(path.join(__dirname, '..', 'dist', 'credentials', 'RubinyunApi.credentials.js'));

let ok = 0;
let ko = 0;
function check(name, cond) {
	if (cond) {
		ok++;
		console.log('ok  ' + name);
	} else {
		ko++;
		console.log('KO  ' + name);
	}
}

/** A fake IExecuteFunctions: parameters per item, one canned answer, the request recorded. */
function contesto(params, answer, opts = {}) {
	const requests = [];
	const ctx = {
		requests,
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, _i, fallback) => (name in params ? params[name] : fallback),
		continueOnFail: () => !!opts.continueOnFail,
		getNode: () => ({ name: 'Rubinyun', type: 'rubinyun', typeVersion: 1, position: [0, 0], parameters: {} }),
		helpers: {
			httpRequestWithAuthentication: async function (credName, request) {
				requests.push({ credName, request });
				if (typeof answer === 'function') return answer(request);
				return answer;
			},
		},
	};
	return ctx;
}

async function run(params, answer, opts) {
	const node = new Rubinyun();
	const ctx = contesto(params, answer, opts);
	const out = await node.execute.call(ctx, ctx);
	return { out: out[0], req: ctx.requests[0] && ctx.requests[0].request, cred: ctx.requests[0] && ctx.requests[0].credName };
}

function decode(body) {
	const o = {};
	for (const pair of String(body).split('&')) {
		const [k, v] = pair.split('=');
		o[decodeURIComponent(k)] = decodeURIComponent(v);
	}
	return o;
}

(async () => {
	// ── the credential ──
	const cred = new RubinyunApi();
	check('credential: two headers from the two fields', cred.authenticate.properties.headers['X-WS-Key'] === '={{$credentials.key}}' && cred.authenticate.properties.headers['X-WS-Secret'] === '={{$credentials.secret}}');
	check('credential: the test is action=ping', cred.test.request.qs.action === 'ping' && cred.test.request.url === '/api.php');
	check('credential: the secret is a password field', cred.properties.find((p) => p.name === 'secret').typeOptions.password === true);

	// ── Post → Create (image) ──
	let r = await run(
		{ resource: 'post', operation: 'create', type: 'image', mediaUrl: ' https://x/a.jpg ', caption: 'Ciao', scheduledAt: '2026-09-10 18:30', additionalFields: { project: 'demo' }, options: {} },
		{ ok: true, post: { id: 'p1' } },
	);
	let body = decode(r.req.body);
	check('create image: POST action=add, form body with type, media_url trimmed, caption, scheduled_at, project', r.req.method === 'POST' && r.req.qs.action === 'add' && body.type === 'image' && body.media_url === 'https://x/a.jpg' && body.caption === 'Ciao' && body.scheduled_at === '2026-09-10 18:30' && body.project === 'demo');
	check('create: form content type, status errors not thrown, json', r.req.headers['Content-Type'] === 'application/x-www-form-urlencoded' && r.req.ignoreHttpStatusErrors === true && r.req.json === true);
	check('create: the credential name is rubinyunApi', r.cred === 'rubinyunApi');
	check('create: the answer is the output item', r.out.length === 1 && r.out[0].json.post.id === 'p1');

	// ── Post → Create (carousel): URLs one per line, commas too, blanks dropped ──
	r = await run(
		{ resource: 'post', operation: 'create', type: 'carousel', mediaUrls: 'https://x/1.jpg\n\nhttps://x/2.jpg, https://x/3.jpg\n', caption: '', scheduledAt: '2026-09-10 18:30', additionalFields: {}, options: { channel: 'c9' } },
		{ ok: true, post: { id: 'p2' } },
	);
	body = decode(r.req.body);
	check('create carousel: media_urls one per line, cleaned; channel in the query', body.media_urls === 'https://x/1.jpg\nhttps://x/2.jpg\nhttps://x/3.jpg' && !('media_url' in body) && r.req.qs.channel === 'c9');

	// ── Post → Update: only the fields given ──
	r = await run({ resource: 'post', operation: 'update', postId: 'p1', updateFields: { caption: 'Nuova' }, options: {} }, { ok: true });
	body = decode(r.req.body);
	check('update: action=update, id and caption only', r.req.qs.action === 'update' && body.id === 'p1' && body.caption === 'Nuova' && !('scheduled_at' in body) && !('type' in body));
	r = await run({ resource: 'post', operation: 'update', postId: 'p1', updateFields: { type: 'reel', mediaUrl: 'https://x/v.mp4' }, options: {} }, { ok: true });
	body = decode(r.req.body);
	check('update media: type and media_url travel together', body.type === 'reel' && body.media_url === 'https://x/v.mp4');

	// ── Post → Delete / Retry ──
	r = await run({ resource: 'post', operation: 'delete', postId: 'p1', options: {} }, { ok: true });
	check('delete: POST action=delete with id', r.req.method === 'POST' && r.req.qs.action === 'delete' && decode(r.req.body).id === 'p1');
	r = await run({ resource: 'post', operation: 'retry', postId: 'p1', options: {} }, { ok: true });
	check('retry: POST action=retry with id', r.req.qs.action === 'retry' && decode(r.req.body).id === 'p1');

	// ── Post → Get Many: one item per post, or the whole answer ──
	r = await run({ resource: 'post', operation: 'getAll', splitItems: true, options: {} }, { ok: true, posts: [{ id: 'a' }, { id: 'b' }], now: 'x' });
	check('get many: GET action=list, split into items', r.req.method === 'GET' && r.req.qs.action === 'list' && r.out.length === 2 && r.out[1].json.id === 'b');
	r = await run({ resource: 'post', operation: 'getAll', splitItems: false, options: {} }, { ok: true, posts: [{ id: 'a' }], now: 'x' });
	check('get many: unsplit keeps the whole answer', r.out.length === 1 && r.out[0].json.now === 'x');

	// ── Channel, Best Time, Queue, Insight, Account ──
	r = await run({ resource: 'channel', operation: 'getAll', splitItems: true, options: {} }, { ok: true, channels: [{ id: 'c1' }] });
	check('channel: action=channels, split', r.req.qs.action === 'channels' && r.out[0].json.id === 'c1');
	r = await run({ resource: 'bestTime', operation: 'get', when: '2026-09-12', keepDay: true, options: {} }, { ok: true, slot: { at: '2026-09-12 18:00' } });
	check('best time: action=besttime, when and keep_day in the query', r.req.qs.action === 'besttime' && r.req.qs.when === '2026-09-12' && r.req.qs.keep_day === 1 && r.out[0].json.slot.at === '2026-09-12 18:00');
	r = await run({ resource: 'bestTime', operation: 'get', when: '', keepDay: false, options: {} }, { ok: true, slot: {} });
	check('best time: empty when falls back to tomorrow, no keep_day', r.req.qs.when === 'tomorrow' && !('keep_day' in r.req.qs));
	r = await run({ resource: 'queue', operation: 'runNow', options: {} }, { ok: true, result: {} });
	check('queue: POST action=runmine', r.req.method === 'POST' && r.req.qs.action === 'runmine');
	r = await run({ resource: 'insights', operation: 'get', by: 'mediaId', mediaId: 'm1', options: {} }, { ok: true, likes: 3 });
	check('insight by media id', r.req.qs.action === 'insights' && r.req.qs.media_id === 'm1' && !('post_id' in r.req.qs));
	r = await run({ resource: 'insights', operation: 'get', by: 'postId', postId: 'p9', options: {} }, { ok: true, likes: 3 });
	check('insight by post id', r.req.qs.post_id === 'p9');
	r = await run({ resource: 'account', operation: 'get', options: {} }, { ok: true, email: 'e' });
	check('account: action=ping', r.req.qs.action === 'ping' && r.out[0].json.email === 'e');

	// ── refusals: the stable code in front, continue on fail keeps the message ──
	let thrown = null;
	try {
		await run({ resource: 'post', operation: 'delete', postId: 'zz', options: {} }, { ok: false, code: 'id_not_found', error: 'id not found: zz', value: 'zz' });
	} catch (e) {
		thrown = e;
	}
	check('refusal: NodeApiError with "code: message"', thrown && /^id_not_found: id not found: zz/.test(thrown.message));
	r = await run({ resource: 'post', operation: 'delete', postId: 'zz', options: {} }, { ok: false, code: 'id_not_found', error: 'id not found: zz' }, { continueOnFail: true });
	check('refusal with continue on fail: the item carries the error', r.out.length === 1 && /id_not_found/.test(r.out[0].json.error));

	// ── the real API, only with the test keys in the environment ──
	const key = process.env.RUBINYUN_TEST_KEY;
	const secret = process.env.RUBINYUN_TEST_SECRET;
	if (key && secret) {
		const live = async (request) => {
			const url = new URL(request.url);
			for (const [k, v] of Object.entries(request.qs || {})) url.searchParams.set(k, String(v));
			const res = await fetch(url, {
				method: request.method,
				headers: { 'X-WS-Key': key, 'X-WS-Secret': secret, ...(request.headers || {}) },
				body: request.method === 'POST' ? request.body : undefined,
			});
			return res.json();
		};
		r = await run({ resource: 'account', operation: 'get', options: {} }, live);
		check('LIVE account: the keys are accepted and the channel comes back', r.out[0].json.ok === true && r.out[0].json.channel && r.out[0].json.channel.id);
		r = await run({ resource: 'channel', operation: 'getAll', splitItems: true, options: {} }, live);
		check('LIVE channels: at least one', r.out.length >= 1 && r.out[0].json.id);
		r = await run({ resource: 'bestTime', operation: 'get', when: 'tomorrow', keepDay: false, options: {} }, live);
		const slot = r.out[0].json.slot && r.out[0].json.slot.at;
		check('LIVE best time: a slot in the form YYYY-MM-DD HH:MM', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(slot)));
		r = await run(
			{ resource: 'post', operation: 'create', type: 'image', mediaUrl: 'https://www.chrononyte.com/assets/demo/rubinyun-demo.jpg', caption: 'n8n-nodes-rubinyun test, deleted right away', scheduledAt: slot, additionalFields: { project: 'n8n-node-test' }, options: {} },
			live,
		);
		const id = r.out[0].json.post && r.out[0].json.post.id;
		check('LIVE create: a post is scheduled', !!id);
		r = await run({ resource: 'post', operation: 'update', postId: id, updateFields: { caption: 'n8n-nodes-rubinyun test, updated, deleted right away' }, options: {} }, live);
		check('LIVE update: accepted', r.out[0].json.ok === true);
		r = await run({ resource: 'post', operation: 'getAll', splitItems: true, options: {} }, live);
		check('LIVE get many: the test post is in the list', r.out.some((it) => it.json.id === id));
		r = await run({ resource: 'post', operation: 'delete', postId: id, options: {} }, live);
		check('LIVE delete: the test post is gone', r.out[0].json.ok === true);
		thrown = null;
		try {
			await run({ resource: 'post', operation: 'delete', postId: id, options: {} }, live);
		} catch (e) {
			thrown = e;
		}
		check('LIVE refusal: deleting it twice fails with id_not_found', thrown && /^id_not_found/.test(thrown.message));
		thrown = null;
		try {
			await run({ resource: 'post', operation: 'create', type: 'carousel', mediaUrls: 'https://www.chrononyte.com/assets/demo/rubinyun-demo.jpg', caption: '', scheduledAt: slot, additionalFields: {}, options: {} }, live);
		} catch (e) {
			thrown = e;
		}
		check('LIVE refusal: a one-image carousel fails with carousel_needs_2', thrown && /^carousel_needs_2/.test(thrown.message));
	} else {
		console.log('(live tests skipped: set RUBINYUN_TEST_KEY and RUBINYUN_TEST_SECRET to run them)');
	}

	console.log(`\n${ok} ok, ${ko} ko`);
	process.exit(ko ? 1 : 0);
})();
