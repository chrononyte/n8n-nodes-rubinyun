import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { rubinyunFields } from './RubinyunDescription';

const API_URL = 'https://www.chrononyte.com/rubinyun/api.php';

/**
 * Programmatic node, on purpose. The Rubinyun API takes its parameters as
 * form-urlencoded POST fields (not JSON), answers refusals with a stable
 * `code` next to an English `error`, and some operations need a small
 * amount of shaping (one item per post, media URLs split one per line).
 * A declarative node would need the same code spread over routing hooks.
 */
export class Rubinyun implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Rubinyun',
		name: 'rubinyun',
		icon: { light: 'file:rubinyun.svg', dark: 'file:rubinyun.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule and publish Instagram and Facebook posts with Rubinyun',
		defaults: {
			name: 'Rubinyun',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'rubinyunApi',
				required: true,
			},
		],
		properties: rubinyunFields,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;

				const query: IDataObject = {};
				const body: IDataObject = {};
				let method: 'GET' | 'POST' = 'GET';
				let splitKey = '';

				const channel = String(options.channel ?? '').trim();
				if (channel) query.channel = channel;

				if (resource === 'post') {
					if (operation === 'create') {
						method = 'POST';
						query.action = 'add';
						const type = this.getNodeParameter('type', i) as string;
						body.type = type;
						body.caption = this.getNodeParameter('caption', i, '') as string;
						body.scheduled_at = this.getNodeParameter('scheduledAt', i) as string;
						if (type === 'carousel') {
							body.media_urls = mediaList(this.getNodeParameter('mediaUrls', i) as string);
						} else {
							body.media_url = String(this.getNodeParameter('mediaUrl', i)).trim();
						}
						const extra = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						if (extra.project) body.project = extra.project;
					} else if (operation === 'update') {
						method = 'POST';
						query.action = 'update';
						body.id = this.getNodeParameter('postId', i) as string;
						const fields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
						if (fields.caption !== undefined) body.caption = fields.caption;
						if (fields.scheduledAt) body.scheduled_at = fields.scheduledAt;
						if (fields.type) {
							body.type = fields.type;
							if (fields.type === 'carousel') {
								body.media_urls = mediaList(String(fields.mediaUrls ?? ''));
							} else {
								body.media_url = String(fields.mediaUrl ?? '').trim();
							}
						}
					} else if (operation === 'delete' || operation === 'retry') {
						method = 'POST';
						query.action = operation;
						body.id = this.getNodeParameter('postId', i) as string;
					} else if (operation === 'getAll') {
						query.action = 'list';
						splitKey = 'posts';
					}
				} else if (resource === 'channel') {
					query.action = 'channels';
					splitKey = 'channels';
				} else if (resource === 'bestTime') {
					query.action = 'besttime';
					query.when = (this.getNodeParameter('when', i, 'tomorrow') as string) || 'tomorrow';
					if (this.getNodeParameter('keepDay', i, false) as boolean) query.keep_day = 1;
				} else if (resource === 'queue') {
					method = 'POST';
					query.action = 'runmine';
				} else if (resource === 'insights') {
					query.action = 'insights';
					const by = this.getNodeParameter('by', i) as string;
					if (by === 'mediaId') query.media_id = this.getNodeParameter('mediaId', i) as string;
					else query.post_id = this.getNodeParameter('postId', i) as string;
				} else if (resource === 'account') {
					query.action = 'ping';
				}

				if (!query.action) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				const request: IHttpRequestOptions = {
					method,
					url: API_URL,
					qs: query,
					json: true,
					// a refusal comes back as 4xx with a body that says why:
					// the body is what we want, so status errors are read, not thrown
					ignoreHttpStatusErrors: true,
				};
				if (method === 'POST') {
					// the API reads $_POST: the body goes as a form, never as JSON
					request.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
					request.body = formEncode(body);
				}

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'rubinyunApi',
					request,
				)) as IDataObject;

				if (!response || response.ok !== true) {
					// a refusal: the stable code goes in front of the message
					const code = String(response?.code ?? 'error');
					const message = String(response?.error ?? 'Rubinyun refused the request');
					const refusal = new NodeApiError(this.getNode(), (response ?? {}) as JsonObject, {
						message: `${code}: ${message}`,
						description: `Rubinyun answered with the code "${code}". The code is stable: branch on it, not on the English text.`,
						itemIndex: i,
					});
					if (this.continueOnFail()) {
						returnData.push({ json: { error: refusal.message, code }, pairedItem: { item: i } });
						continue;
					}
					throw refusal;
				}

				const split = this.getNodeParameter('splitItems', i, true) as boolean;
				if (splitKey && split && Array.isArray(response[splitKey])) {
					for (const row of response[splitKey] as IDataObject[]) {
						returnData.push({ json: row, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: response, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

/** One URL per line (commas work too), blanks dropped, the way the API wants them. */
function mediaList(raw: string): string {
	return raw
		.split(/[\r\n,]+/)
		.map((u) => u.trim())
		.filter((u) => u !== '')
		.join('\n');
}

/** application/x-www-form-urlencoded, with every value sent as text. */
function formEncode(fields: IDataObject): string {
	const pairs: string[] = [];
	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined || value === null) continue;
		pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
	}
	return pairs.join('&');
}
