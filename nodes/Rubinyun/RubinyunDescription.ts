import type { INodeProperties } from 'n8n-workflow';

const postTypeOptions = [
	{ name: 'Image', value: 'image' },
	{ name: 'Carousel', value: 'carousel', description: 'From 2 to 10 images' },
	{ name: 'Reel', value: 'reel', description: 'One video (mp4 or mov)' },
	{ name: 'Story', value: 'story' },
];

export const rubinyunFields: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Account', value: 'account' },
			{ name: 'Best Time', value: 'bestTime' },
			{ name: 'Channel', value: 'channel' },
			{ name: 'Insight', value: 'insights' },
			{ name: 'Post', value: 'post' },
			{ name: 'Queue', value: 'queue' },
		],
		default: 'post',
	},

	// ── Post ──
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Schedule a post on the channel',
				action: 'Schedule a post',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a post from the queue',
				action: 'Delete a post',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List the scheduled and published posts of the channel',
				action: 'Get many posts',
			},
			{
				name: 'Retry',
				value: 'retry',
				description: 'Put a failed post back in the queue',
				action: 'Retry a post',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Change a post that is still scheduled',
				action: 'Update a post',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: postTypeOptions,
		default: 'image',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
	},
	{
		displayName: 'Media URL',
		name: 'mediaUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com/photo.jpg',
		description:
			'Public URL of the image (or the video, for a reel). If you only have a file, upload it first: see the README.',
		displayOptions: {
			show: { resource: ['post'], operation: ['create'], type: ['image', 'reel', 'story'] },
		},
	},
	{
		displayName: 'Media URLs',
		name: 'mediaUrls',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		placeholder: 'https://example.com/1.jpg\nhttps://example.com/2.jpg',
		description: 'Public URLs of the images, one per line, from 2 to 10',
		displayOptions: { show: { resource: ['post'], operation: ['create'], type: ['carousel'] } },
	},
	{
		displayName: 'Caption',
		name: 'caption',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'The text of the post, hashtags included',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
	},
	{
		displayName: 'Scheduled At',
		name: 'scheduledAt',
		type: 'string',
		required: true,
		default: '',
		placeholder: '2026-09-10 18:30',
		description:
			'When to publish, in the channel\'s own timezone: YYYY-MM-DD HH:MM. The field slot.at returned by Best Time goes straight in here.',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		options: [
			{
				displayName: 'Project',
				name: 'project',
				type: 'string',
				default: '',
				description: 'A free label saved with the post, for your own bookkeeping',
			},
		],
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'p_20260910_183000_ab12cd',
		description: 'The ID returned when the post was scheduled (also in Get Many)',
		displayOptions: { show: { resource: ['post'], operation: ['update', 'delete', 'retry'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
		options: [
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{
				displayName: 'Media URL',
				name: 'mediaUrl',
				type: 'string',
				default: '',
				description: 'New media, for image, reel or story. Set Type as well.',
			},
			{
				displayName: 'Media URLs',
				name: 'mediaUrls',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'New images for a carousel, one per line. Set Type to Carousel as well.',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'string',
				default: '',
				placeholder: '2026-09-10 18:30',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: postTypeOptions,
				default: 'image',
				description: 'Only needed when you change the media',
			},
		],
	},
	{
		displayName: 'Split Into Items',
		name: 'splitItems',
		type: 'boolean',
		default: true,
		description: 'Whether to output one item per post instead of a single item with the whole list',
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
	},

	// ── Channel ──
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['channel'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List the channels of the account, with their ID and whether they are connected',
				action: 'Get many channels',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Split Into Items',
		name: 'splitItems',
		type: 'boolean',
		default: true,
		description: 'Whether to output one item per channel instead of a single item with the whole list',
		displayOptions: { show: { resource: ['channel'] } },
	},

	// ── Best Time ──
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['bestTime'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'The best time to post next, from the channel\'s own data, stepping around the posts already queued',
				action: 'Get the best time to post',
			},
		],
		default: 'get',
	},
	{
		displayName: 'When',
		name: 'when',
		type: 'string',
		default: 'tomorrow',
		placeholder: 'tomorrow',
		description: 'Today, tomorrow, or a date as YYYY-MM-DD',
		displayOptions: { show: { resource: ['bestTime'] } },
	},
	{
		displayName: 'Keep the Day',
		name: 'keepDay',
		type: 'boolean',
		default: false,
		description:
			'Whether to keep the requested day even if its best hour is already past (only the hour changes; otherwise the answer may slide to the next day)',
		displayOptions: { show: { resource: ['bestTime'] } },
	},

	// ── Queue ──
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['queue'] } },
		options: [
			{
				name: 'Run Now',
				value: 'runNow',
				description: 'Publish right away the posts of the channel whose time has come, without waiting for the scheduler',
				action: 'Run the queue now',
			},
		],
		default: 'runNow',
	},

	// ── Insights ──
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['insights'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Likes, comments, reach and permalink of a published post',
				action: 'Get the insights of a post',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Look Up By',
		name: 'by',
		type: 'options',
		options: [
			{ name: 'Post ID', value: 'postId', description: 'The Rubinyun ID of the post' },
			{ name: 'Media ID', value: 'mediaId', description: 'The Instagram media ID' },
		],
		default: 'postId',
		displayOptions: { show: { resource: ['insights'] } },
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['insights'], by: ['postId'] } },
	},
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['insights'], by: ['mediaId'] } },
	},

	// ── Account ──
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Check the keys and read the balance: free posts left, tokens, the channel these keys act on',
				action: 'Get the account',
			},
		],
		default: 'get',
	},

	// ── shared ──
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Channel ID',
				name: 'channel',
				type: 'string',
				default: '',
				description:
					'Act on this channel instead of the main one (the ID comes from Channel → Get Many). Not needed when the credential is a channel\'s own key pair.',
			},
		],
	},
];
