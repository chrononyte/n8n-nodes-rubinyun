import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Rubinyun authenticates every call with two headers, X-WS-Key and X-WS-Secret.
 * Both values come from the Rubinyun console (API keys). A channel's own key
 * pair works too: then the calls act on that channel only.
 */
export class RubinyunApi implements ICredentialType {
	name = 'rubinyunApi';

	displayName = 'Rubinyun API';

	icon: Icon = { light: 'file:rubinyun.svg', dark: 'file:rubinyun.dark.svg' };

	documentationUrl = 'https://www.chrononyte.com/projects/rubinyun/docs.html';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'key',
			type: 'string',
			default: '',
			placeholder: 'rby_live_…',
			description: 'The key shown in the Rubinyun console under API keys',
		},
		{
			displayName: 'API Secret',
			name: 'secret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'rby_sk_…',
			description: 'The secret shown once, when the key is created',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-WS-Key': '={{$credentials.key}}',
				'X-WS-Secret': '={{$credentials.secret}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.chrononyte.com/rubinyun',
			url: '/api.php',
			method: 'GET',
			qs: {
				action: 'ping',
			},
		},
	};
}
